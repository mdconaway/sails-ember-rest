/**
 * find
 *
 * returns a function with access to an interruption context
 *
 * @description :: Server-side logic for a generic crud controller find action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const actionUtil = require('./../util/actionUtil');
const shimFunction = require('./../util/shimFunction');
const defaultInterrupt = require('./../interrupts/defaultInterrupt');
const { parallel } = require('async');
const { map } = require('lodash');

module.exports = function(interrupts = {}) {
  interrupts = shimFunction(interrupts, 'find');
  interrupts.find = interrupts.find ? interrupts.find : defaultInterrupt;

  return function(req, res) {
    // Set the JSONAPI required header
    res.set('Content-Type', 'application/vnd.api+json');

    // Look up the model
    const Model = actionUtil.parseModel(req);
    // parse criteria from request
    const criteria = actionUtil.parseCriteria(req);
    const limit = actionUtil.parseLimit(req);
    // Look up the association configuration and determine how to populate the query
    // @todo support request driven selection of includes/populate
    const associations = actionUtil.getAssociationConfiguration(Model, 'list');

    parallel(
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
        if (err) {
          return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
        }
        const matchingRecords = results.records;
        const ids = matchingRecords.map(record => {
          return record[Model.primaryKey];
        });
        actionUtil.populateIndexes(Model, ids, associations, (err, associated) => {
          if (err) {
            return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
          }
          interrupts.find.call(
            this,
            req,
            res,
            () => {
              // Only `.watch()` for new instances of the model if
              // `autoWatch` is enabled.
              if (req._sails.hooks.pubsub && req.isSocket) {
                Model.subscribe(req, map(matchingRecords, Model.primaryKey));
                if (req.options.autoWatch) {
                  Model._watch(req);
                }
                // Also subscribe to instances of all associated models
                // @todo this might need an update to include associations included by index only
                matchingRecords.forEach(record => {
                  actionUtil.subscribeDeep(req, record);
                });
              }
              const specJSON = sails.helpers.buildJsonApiResponse.with({ model: Model, records: matchingRecords, meta: { total: results.count }});
              res.ok(specJSON, actionUtil.parseLocals(req));
            },
            Model,
            matchingRecords
          );
        });
      }
    );
  };
};
