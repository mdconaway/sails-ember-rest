/**
 * destroy
 *
 * returns a function with access to an interruption context
 *
 * @description :: Server-side logic for a generic crud controller destroy action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const actionUtil = require('./../util/actionUtil');
const shimFunction = require('./../util/shimFunction');
const defaultInterrupt = require('./../interrupts/defaultInterrupt');

module.exports = function(interrupts = {}) {
  interrupts = shimFunction(interrupts, 'destroy');
  interrupts.destroy = interrupts.destroy ? interrupts.destroy : defaultInterrupt;

  return function(req, res) {
    // Set the JSONAPI required header
    // Technically because there is no content, no content-type header is required and in fact is being
    // actively removed when calling res.send
    // res.set('Content-Type', 'application/vnd.api+json');

    const Model = actionUtil.parseModel(req);
    const pk = actionUtil.requirePk(req);
    const query = Model.findOne(pk);
    const associations = sails.helpers.getAssociationConfig.with({ model: Model });

    actionUtil.populateEach(query, req).exec((err, record) => {
      if (err) {
        return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
      }
      if (!record) {
        return res.notFound(`No record found with the specified ${Model.primaryKey}.`);
      }
      Model.destroy(pk).exec(err => {
        if (err) {
          return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
        }
        if (sails.hooks.pubsub) {
          Model._publishDestroy(pk, !sails.config.blueprints.mirror && req, {
            previous: record
          });
          if (req.isSocket) {
            Model.unsubscribe(req, [pk]);
            Model._retire(record);
          }
        }
        interrupts.destroy.call(this, req, res, () => res.noContent(null, actionUtil.parseLocals(req)), Model, record);
        // @todo --- if neccessary, destroy related records
      });
    });
  };
};
