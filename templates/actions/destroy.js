/**
 * destroy
 * 
 * returns a function with access to an interruption context
 * 
 * @description :: Server-side logic for a generic crud controller destroy action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const actionUtil = require('./../util/actionUtil');

module.exports = function(interrupts) {
    return function(req, res) {
        const Model = actionUtil.parseModel(req);
        const pk = actionUtil.requirePk(req);
        const query = Model.findOne(pk);
        // Look up the association configuration and determine how to populate the query
        // @todo support request driven selection of includes/populate
        const associations = actionUtil.getAssociationConfiguration(Model, 'list');

        actionUtil.populateEach(query, req).exec((err, record) => {
            if (err) {
                return res.serverError(err);
            }
            if (!record) {
                return res.notFound('No record found with the specified `id`.');
            }
            Model.destroy(pk).exec(err => {
                if (err) {
                    return res.serverError(err, actionUtil.parseLocals(req));
                }
                if (sails.hooks.pubsub) {
                    Model.publishDestroy(pk, !sails.config.blueprints.mirror && req, {
                        previous: record
                    });
                    if (req.isSocket) {
                        Model.unsubscribe(req, record);
                        Model.retire(record);
                    }
                }
                interrupts.destroy.call(this, req, res, () => res.ok(null, actionUtil.parseLocals(req)), Model, record);
                // @todo --- if neccessary, destroy related records
            });
        });
    };
};
