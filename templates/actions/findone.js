/**
 * findone
 *
 * returns a function with access to an interruption context
 *
 * @description :: Server-side logic for a generic crud controller findone action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const actionUtil = require('./../util/actionUtil');
const shimFunction = require('./../util/shimFunction');
const defaultInterrupt = require('./../interrupts/defaultInterrupt');
const { parallel } = require('async');

module.exports = function(interrupts = {}) {
  interrupts = shimFunction(interrupts, 'findone');
  interrupts.findone = interrupts.findone ? interrupts.findone : defaultInterrupt;

  return function(req, res) {
    // Set the JSON API required header
    res.set('Content-Type', 'application/vnd.api+json');

    const Model = actionUtil.parseModel(req);
    const pk = actionUtil.requirePk(req);
    const query = Model.findOne(pk);

    // Look up the association configuration based on the reserved 'include' keyword
    const { include = '' } = req.query;
    const associations = sails.helpers.getAssociationConfig.with({ model: Model, include: include.split(',') });
    delete req.query.include; // Include is no longer required

    parallel(
      {
        matchingRecord: done => {
          actionUtil
            .populateRecords(query, associations)
            .where(actionUtil.parseCriteria(req))
            .exec(done);
        },
        associated: done => {
          actionUtil.populateIndexes(Model, pk, associations, done);
        }
      },
      (err, results) => {
        if (err) {
          return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
        }
        const { matchingRecord, associated } = results;

        if (!matchingRecord) {
          return res.notFound('No record found with the specified ' + Model.primaryKey + '.');
        }
        interrupts.findone.call(
          this,
          req,
          res,
          () => {
            if (sails.hooks.pubsub && req.isSocket) {
              Model.subscribe(req, [matchingRecord[Model.primaryKey]]);
              actionUtil.subscribeDeep(req, matchingRecord);
            }

            res.ok(
              sails.helpers.buildJsonApiResponse.with({ model: Model, records: matchingRecord }),
              actionUtil.parseLocals(req)
            );
          },
          Model,
          matchingRecord
        );
      }
    );
  };
};
