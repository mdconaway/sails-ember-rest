/**
 * populate
 *
 * returns a function with access to an interruption context
 *
 * @description :: Server-side logic for a generic crud controller populate action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const actionUtil = require('./../util/actionUtil');
const shimFunction = require('./../util/shimFunction');
const defaultInterrupt = require('./../interrupts/defaultInterrupt');
const pluralize = require('pluralize');
const { parallel, waterfall } = require('async');
const { camelCase, find } = require('lodash');

module.exports = function(interrupts = {}) {
  interrupts = shimFunction(interrupts, 'populate');
  interrupts.populate = interrupts.populate ? interrupts.populate : defaultInterrupt;

  return function(req, res) {
    const Model = actionUtil.parseModel(req);
    const relation = req.options.alias;
    if (!relation || !Model) {
      return res.serverError(new Error('No model or relationship identified!'));
    }
    const association = find(req.options.associations, {
      alias: relation
    });
    const relationIdentity = association.type === 'model' ? association.model : association.collection;
    const RelatedModel = req._sails.models[relationIdentity];
    // Allow customizable blacklist for params.
    req.options.criteria = req.options.criteria || {};
    req.options.criteria.blacklist = req.options.criteria.blacklist || ['include', 'limit', 'skip', 'sort', 'id', 'parentid'];
    // Determine whether to populate using a criteria, or the
    // specified primary key of the child record, or with no
    // filter at all.
    if (!RelatedModel) {
      return res.serverError(
        new Error(`Invalid route option, "model".\nI don't know about any models named: ${relationIdentity}`)
      );
    }
    const parentPk = actionUtil.formatPk(Model, req.param('parentid'));
    const childPk = actionUtil.parsePk(req, RelatedModel);
    const where = childPk ? {} : actionUtil.parseCriteria(req);
    const skip = actionUtil.parseSkip(req);
    const limit = actionUtil.parseLimit(req);
    const sort = actionUtil.parseSort(req);
    const populateOptions = {
      where: where
    };
    if (childPk) {
      where[RelatedModel.primaryKey] = [childPk];
    }
    if (skip) {
      populateOptions.skip = skip;
    }
    if (limit) {
      populateOptions.limit = limit;
    }
    if (sort) {
      populateOptions.sort = sort;
    }

    waterfall([
      (cb) => {
        parallel(
          {
            count: sails.helpers.countRelationship.with({ model: Model, association, pk: parentPk }),
            records: done => {
              Model.findOne(parentPk)
                .populate(relation, populateOptions)
                .exec((err, matchingRecord) => {
                  if (err) {
                    return done(err);
                  }
                  if (!matchingRecord) {
                    return done(new Error('No record found with the specified id.'));
                  }
                  if (!matchingRecord[relation]) {
                    return done(new Error(`Specified record (${parentPk}) is missing relation ${relation}`));
                  }
                  done(null, { parent: matchingRecord, children: matchingRecord[relation] });
                });
            }
          },
          (err, results) => {
            if (err) {
              return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
            }
            cb(null, results)
          }
        );
      },
      (results, cb) => {
        const { parent, children } = results.records;
        const include = req.param('include') || '';
        const associations = sails.helpers.getAssociationConfig
          .with({ model: RelatedModel, include: include.split(',') })

        // Sort needs to be reapplied but skip and limit do not
        const query = RelatedModel.find()
          .where({ [RelatedModel.primaryKey]: children.map(child => child[RelatedModel.primaryKey])})
          .sort(sort);

        actionUtil.populateRecords(query, associations).exec((err, populatedResults) => {
          if (err) {
            return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
          }
          cb(null, Object.assign({}, results, {records: { parent, children: populatedResults }}));
        });
      }
    ], (err, results) => {
      if (err) {
        return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
      }

      const { parent, children } = results.records;
      interrupts.populate.call(
        this,
        req,
        res,
        () => {
          // Subscribe to instance, if relevant
          // TODO: only subscribe to populated attribute- not the entire model
          if (sails.hooks.pubsub && req.isSocket) {
            Model.subscribe(req, [parent[Model.primaryKey]]);
            actionUtil.subscribeDeep(req, parent);
          }

          //BOOM! counted relationships!
          res.ok(sails.helpers.buildJsonApiResponse.with({
            model: RelatedModel,
            records: sails.helpers.linkAssociations(RelatedModel, children),
            meta: { total: results.count }
          }), actionUtil.parseLocals(req));
        },
        Model,
        results
      );
    });
  };
};
