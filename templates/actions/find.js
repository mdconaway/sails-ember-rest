/**
 * find
 * 
 * returns a function with access to an interruption context
 * 
 * @description :: Server-side logic for a generic crud controller find action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const actionUtil = require('./../util/actionUtil');

module.exports = function(interrupts) {
    return function(req, res) {
        // Look up the model
        const Model = actionUtil.parseModel(req);
        // parse criteria from request
        const criteria = actionUtil.parseCriteria(req);
        const limit = actionUtil.parseLimit(req);
        // Look up the association configuration and determine how to populate the query
        // @todo support request driven selection of includes/populate
        const associations = actionUtil.getAssociationConfiguration(Model, 'list');
        async.parallel(
            {
                count(done) {
                    Model.count(criteria).exec(done);
                },
                records(done) {
                    // Lookup for records that match the specified criteria
                    const query = Model.find()
                        .where(criteria)
                        .skip(actionUtil.parseSkip(req))
                        .sort(actionUtil.parseSort(req));
                    if (limit) query.limit(limit);

                    // populate associations according to our model specific configuration...
                    actionUtil.populateRecords(query, associations).exec(done);
                }
            },
            (err, results) => {
                if (err) return res.serverError(err);
                const matchingRecords = results.records;
                const ids = matchingRecords.map(record => {
                    return record[Model.primaryKey];
                });
                actionUtil.populateIndexes(Model, ids, associations, (err, associated) => {
                    if (err) return res.serverError(err);
                    // Only `.watch()` for new instances of the model if
                    // `autoWatch` is enabled.
                    if (req._sails.hooks.pubsub && req.isSocket) {
                        Model.subscribe(req, matchingRecords);
                        if (req.options.autoWatch) {
                            Model.watch(req);
                        }
                        // Also subscribe to instances of all associated models
                        // @todo this might need an update to include associations included by index only
                        matchingRecords.forEach(record => {
                            actionUtil.subscribeDeep(req, record);
                        });
                    }
                    const emberizedJSON = Ember.buildResponse(Model, matchingRecords, associations, associated);
                    emberizedJSON.meta = {
                        total: results.count
                    };
                    interrupts.find.call(
                        this,
                        req,
                        res,
                        () => {
                            res.ok(emberizedJSON, actionUtil.parseLocals(req));
                        },
                        Model,
                        matchingRecords
                    );
                });
            }
        );
    };
};
