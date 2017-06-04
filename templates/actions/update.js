/**
 * update
 * 
 * returns a function with access to an interruption context
 * 
 * @description :: Server-side logic for a generic crud controller update action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const util = require('util');
const actionUtil = require('./../util/actionUtil');
const _ = require('lodash');

module.exports = function(interrupts) {
    return function(req, res) {
        // Look up the model
        const Model = actionUtil.parseModel(req);
        const toJSON = Model.customToJSON
            ? Model.customToJSON
            : function() {
                  return this;
              };
        // Locate and validate the required `id` parameter.
        const pk = actionUtil.requirePk(req);
        // Create `values` object (monolithic combination of all parameters)
        // But omit the blacklisted params (like JSONP callback param, etc.)
        const data = actionUtil.parseValues(req, Model);
        // Look up the association configuration and determine how to populate the query
        // @todo support request driven selection of includes/populate
        const associations = actionUtil.getAssociationConfiguration(Model, 'detail');
        const preppedRelations = actionUtil.prepareManyRelations(associations, data);
        // Find and update the targeted record.
        //
        // (Note: this could be achieved in a single query, but a separate `findOne`
        //  is used first to provide a better experience for front-end developers
        //  integrating with the API.)

        Model.findOne(pk).exec((err, matchingRecord) => {
            if (err) {
                return res.serverError(err);
            }
            if (!matchingRecord) {
                return res.notFound();
            }
            //also, we gain context on what the record looks like before it is updated,
            //which will be used in the afterUpdate interrupt
            interrupts.beforeUpdate.call(
                this,
                req,
                res,
                () => {
                    Model.update(pk, data).exec((err, records) => {
                        // Differentiate between waterline-originated validation errors
                        // and serious underlying issues. Respond with badRequest if a
                        // validation error is encountered, w/ validation info.
                        if (err) {
                            return res.serverError(err, actionUtil.parseLocals(req));
                        }
                        // Because this should only update a single record and update
                        // returns an array, just use the first item.  If more than one
                        // record was returned, something is amiss.
                        if (!records || !records.length || records.length > 1) {
                            req._sails.log.warn(util.format('Unexpected output from `%s.update`.', Model.globalId));
                        }
                        const updatedRecord = records[0];
                        const saveMany = [];

                        preppedRelations.forEach(rel => {
                            saveMany.push(done => {
                                Model.replaceCollection(pk, rel.collection).members(rel.values).exec(done);
                            });
                        });
                        async.parallel(saveMany, () => {
                            interrupts.afterUpdate.call(
                                this,
                                req,
                                res,
                                () => {
                                    // If we have the pubsub hook, use the Model's publish method
                                    // to notify all subscribers about the update.
                                    if (req._sails.hooks.pubsub) {
                                        if (req.isSocket) {
                                            Model.subscribe(req, _.pluck(records, Model.primaryKey));
                                        }
                                        Model._publishUpdate(pk, _.cloneDeep(data), !req.options.mirror && req, {
                                            previous: toJSON.call(matchingRecord)
                                        });
                                    }
                                    // Do a final query to populate the associations of the record.
                                    const query = Model.findOne(updatedRecord[Model.primaryKey]);
                                    async.parallel(
                                        {
                                            populatedRecord: done => {
                                                actionUtil.populateRecords(query, associations).exec(done);
                                            },
                                            associated: done => {
                                                actionUtil.populateIndexes(Model, pk, associations, done);
                                            }
                                        },
                                        (err, results) => {
                                            if (err) {
                                                return res.serverError(err);
                                            }
                                            const { associated, populatedRecord } = results;
                                            if (!populatedRecord) {
                                                return res.serverError('Could not find record after updating!');
                                            }
                                            res.ok(
                                                Ember.buildResponse(Model, populatedRecord, associations, associated),
                                                actionUtil.parseLocals(req)
                                            );
                                        }
                                    );
                                },
                                Model,
                                { before: matchingRecord, after: updatedRecord }
                            );
                        });
                    });
                },
                Model,
                data
            );
        });
    };
};
