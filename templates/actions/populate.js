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
const { parallel, waterfall } = require('async');
const { find } = require('lodash');

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
    const isSingularAssociation = association.type === 'model';
    const relationIdentity = isSingularAssociation ? association.model : association.collection;
    const RelatedModel = req._sails.models[relationIdentity];
    // Allow customizable blacklist for params.
    req.options.criteria = req.options.criteria || {};
    req.options.criteria.blacklist = req.options.criteria.blacklist || [
      'include',
      'limit',
      'skip',
      'sort',
      'id',
      'parentid'
    ];
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

    waterfall(
      [
        cb => {
          parallel(
            {
              count: done =>
                sails.helpers.countRelationship
                  .with({ model: Model, association, pk: parentPk })
                  .then(result => done(null, result)),
              records: done => {
                const query = isSingularAssociation
                  ? Model.findOne(parentPk).populate(relation)
                  : Model.findOne(parentPk).populate(relation, populateOptions);

                query.exec((err, matchingRecord) => {
                  if (err) {
                    return done(err);
                  }
                  if (!matchingRecord) {
                    return done(new Error('No record found with the specified id.'));
                  }
                  if (!matchingRecord[relation]) {
                    return done(new Error(`Specified record (${parentPk}) is missing relation ${relation}`));
                  }
                  done(null, {
                    parent: matchingRecord,
                    children: isSingularAssociation ? [matchingRecord[relation]] : matchingRecord[relation]
                  });
                });
              }
            },
            (err, results) => {
              if (err) {
                return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
              }
              cb(null, results);
            }
          );
        },
        (results, cb) => {
          const { parent, children } = results.records;
          const include = req.param('include');
          const toInclude = include ? include.split(',') : [];
          const associations = sails.helpers.getAssociationConfig.with({
            model: RelatedModel,
            include: toInclude
          });
          const includedModels = toInclude.map(alias => {
            const assoc = associations.filter(a => a.alias === alias)[0];
            const relationIdentity = assoc.type === 'model' ? assoc.model : assoc.collection;

            return { alias: assoc.alias, model: req._sails.models[relationIdentity] };
          });
          const includedAssociations = includedModels.map(IM =>
            sails.helpers.getAssociationConfig.with({ model: IM.model })
          );

          // Sort needs to be reapplied but skip and limit do not
          const query = RelatedModel.find()
            .where({ [RelatedModel.primaryKey]: children.map(child => child[RelatedModel.primaryKey]) })
            .sort(sort);

          actionUtil.populateRecords(query, associations).exec((err, populatedResults) => {
            if (err) {
              return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
            }
            cb(
              null,
              Object.assign(
                {},
                results,
                { included: { models: includedModels, associations: includedAssociations } },
                { records: { parent, children: populatedResults } }
              )
            );
          });
        },
        (results, cb) => {
          const { included } = results;
          const { children } = results.records;

          parallel(
            Object.assign(
              {},
              RelatedModel.associations.reduce((acc, assoc) => {
                acc[assoc.alias] = next =>
                  parallel(
                    children.reduce((acc2, child) => {
                      const childId = child[RelatedModel.primaryKey];
                      return Object.assign({}, acc2, {
                        [childId]: done =>
                          sails.helpers.countRelationship
                            .with({ model: RelatedModel, association: assoc, pk: childId })
                            .then(result => done(null, result))
                      });
                    }, {}),
                    next
                  );
                return acc;
              }, {}),
              included.associations.reduce((acc, assocs, index) => {
                const IncludedModel = included.models[index];
                assocs.forEach(assoc => {
                  acc[assoc.alias] = next =>
                    parallel(
                      children.reduce((acc2, child) => {
                        const assocRecords = child[IncludedModel.alias];
                        if (Array.isArray(assocRecords)) {
                          return Object.assign(
                            {},
                            acc2,
                            assocRecords.reduce((acc3, assocRecord) => {
                              const recordId = assocRecord[IncludedModel.model.primaryKey];

                              acc3[recordId] = done =>
                                sails.helpers.countRelationship
                                  .with({ model: IncludedModel.model, association: assoc, pk: recordId })
                                  .then(result => done(null, result));

                              return acc3;
                            }, {})
                          );
                        } else {
                          const recordId =
                            typeof assocRecords === 'object' ? assocRecords[IncludedModel.model.primaryKey] : null;
                          if (!recordId) return acc2;

                          return Object.assign({}, acc2, {
                            [recordId]: done =>
                              sails.helpers.countRelationship
                                .with({ model: IncludedModel.model, association: assoc, pk: recordId })
                                .then(result => done(null, result))
                          });
                        }
                      }, {}),
                      next
                    );
                });

                return acc;
              }, {})
            ),
            (err, result) => {
              if (err) {
                return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
              }
              cb(null, Object.assign({}, results, { meta: { relationships: { count: result } } }));
            }
          );
        }
      ],
      (err, results) => {
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
            res.ok(
              sails.helpers.buildJsonApiResponse.with({
                model: RelatedModel,
                records: sails.helpers.linkAssociations(RelatedModel, children),
                meta: Object.assign(results.meta || {}, { total: results.count })
              }),
              actionUtil.parseLocals(req)
            );
          },
          Model,
          results
        );
      }
    );
  };
};
