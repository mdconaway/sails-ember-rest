/**
 * create
 * 
 * returns a function with access to an interruption context
 * 
 * @description :: Server-side logic for a generic crud controller create action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const actionUtil = require('./../util/actionUtil');

module.exports = function(interrupts) {
    return function(req, res) {
        const Model = actionUtil.parseModel(req);
        const data = actionUtil.parseValues(req, Model);
        // Look up the association configuration and determine how to populate the query
        // @todo support request driven selection of includes/populate
        const associations = actionUtil.getAssociationConfiguration(Model, 'detail');
        const preppedRelations = actionUtil.prepareManyRelations(associations, data);
        // Create new instance of model using data from params
        Model.create(data).exec((err, newInstance) => {
            // Differentiate between waterline-originated validation errors
            // and serious underlying issues. Respond with badRequest if a
            // validation error is encountered, w/ validation info.
            if (err) return res.serverError(err, actionUtil.parseLocals(req));
            // If we have the pubsub hook, use the model class's publish method
            // to notify all subscribers about the created item
            const pk = newInstance[Model.primaryKey];
            const saveMany = [];
            preppedRelations.forEach(rel => {
                saveMany.push(done => {
                    Model.replaceCollection(pk, rel.collection).members(rel.values).exec(done);
                });
            });
            async.parallel(saveMany, () => {
                if (req._sails.hooks.pubsub) {
                    if (req.isSocket) {
                        Model.subscribe(req, newInstance);
                        Model.introduce(newInstance);
                    }
                    Model.publishCreate(newInstance, !req.options.mirror && req);
                }
                interrupts.create.call(
                    this,
                    req,
                    res,
                    () => {
                        // Do a final query to populate the associations of the record.
                        const query = Model.findOne(newInstance[Model.primaryKey]);
                        async.parallel({
                            populatedRecord: (done) => {
                                actionUtil.populateRecords(query, associations).exec(done);
                            },
                            associated: (done) => {
                                actionUtil.populateIndexes(Model, newInstance[Model.primaryKey], associations, done);
                            }
                        }, (err, results) => {
                            if (err) return res.serverError(err);
                            const { populatedRecord, associated } = results;
                            if (!populatedRecord) return res.serverError('Could not find record after updating!');
                            // Send JSONP-friendly response if it's supported
                            // (HTTP 201: Created)
                            res.created(
                                Ember.buildResponse(Model, populatedRecord, associations, associated),
                                actionUtil.parseLocals(req)
                            );
                        });
                    },
                    Model,
                    newInstance
                );
            });
        });
    };
};
