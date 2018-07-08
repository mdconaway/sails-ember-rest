/**
 * hydrate
 *
 * returns a function with access to an interruption context
 *
 * @description :: Server-side logic for a generic crud controller hydrate action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const actionUtil = require('./../util/actionUtil');
const shimFunction = require('./../util/shimFunction');
const defaultInterrupt = require('./../interrupts/defaultInterrupt');
const pluralize = require('pluralize');
const { camelCase } = require('lodash');

module.exports = function(interrupts = {}) {
  interrupts = shimFunction(interrupts, 'hydrate');
  interrupts.hydrate = interrupts.hydrate ? interrupts.hydrate : defaultInterrupt;

  return function(req, res) {
    const Model = actionUtil.parseModel(req);
    const pk = actionUtil.requirePk(req);
    const query = Model.findOne(pk);
    const modelIdentity = Model.globalId;
    const modelPlural = pluralize(modelIdentity);
    const documentIdentifier = camelCase(modelPlural);
    const response = {};
    const toJSON = Model.customToJSON
      ? Model.customToJSON
      : function() {
          return this;
        };
    // Look up the association configuration and determine how to populate the query
    const associations = sails.helpers.getAssociationConfig.with({ model: Model });

    actionUtil
      .populateRecords(query, associations, true)
      .where(actionUtil.parseCriteria(req))
      .exec((err, matchingRecord) => {
        if (err) {
          return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
        }
        if (!matchingRecord) {
          return res.notFound('No record found with the specified `id`.');
        }
        interrupts.hydrate.call(
          this,
          req,
          res,
          () => {
            if (req._sails.hooks.pubsub && req.isSocket) {
              Model.subscribe(req, [matchingRecord[Model.primaryKey]]);
              actionUtil.subscribeDeep(req, matchingRecord);
            }
            const record = Object.assign({}, toJSON.call(matchingRecord));
            associations.forEach(assoc => {
              let assocModel;
              if (assoc.type === 'collection') {
                assocModel = req._sails.models[assoc.collection];
                if (record[assoc.alias] && record[assoc.alias].length > 0) {
                  // sideload association records with links for 3rd level associations
                  record[assoc.alias] = sails.helpers.linkAssociations(assocModel, record[assoc.alias]);
                }
              }
              if (assoc.type === 'model' && record[assoc.alias]) {
                assocModel = req._sails.models[assoc.model];
                let linkedRecords = sails.helpers.linkAssociations(assocModel, record[assoc.alias]);
                record[assoc.alias] = linkedRecords[0];
              }
            });
            response[documentIdentifier] = [record];
            res.ok(response, actionUtil.parseLocals(req));
          },
          Model,
          matchingRecord
        );
      });
  };
};
