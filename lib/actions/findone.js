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
const { parallel, waterfall } = require('async');

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
    const include = req.param('include');
    const toInclude = include ? include.split(',') : [];
    const associations = sails.helpers.getAssociationConfig.with({ model: Model, include: toInclude });
    const includedModels = toInclude.map(alias => {
      const assoc = req.options.associations.filter(a => a.alias === alias)[0];
      const relationIdentity = assoc.type === 'model' ? assoc.model : assoc.collection;

      return { alias: assoc.alias, model: req._sails.models[relationIdentity] };
    });
    const includedAssociations = includedModels.map(IM => sails.helpers.getAssociationConfig.with({ model: IM.model }));

    delete req.query.include; // Include is no longer required

    waterfall(
      [
        cb => {
          actionUtil
            .populateRecords(query, associations)
            .where(actionUtil.parseCriteria(req))
            .exec(cb);
        },
        (record, cb) => {
          if (!cb) return record(null, { matchingRecord: null });

          parallel(
            Object.assign(
              {},
              associations.reduce((acc, association) => {
                return Object.assign({}, acc, {
                  [association.alias]: done => {
                    const recordId = record[Model.primaryKey];
                    sails.helpers.countRelationship
                      .with({ model: Model, association, pk })
                      .then(result => done(null, { [recordId]: result }));
                  }
                });
              }, {}),
              includedAssociations.reduce((acc, assocs, index) => {
                const IncludedModel = includedModels[index];
                const assocRecords = record[IncludedModel.alias];

                assocs.forEach(assoc => {
                  if (Array.isArray(assocRecords)) {
                    acc[assoc.alias] = next =>
                      parallel(
                        assocRecords.reduce((acc2, assocRecord) => {
                          const recordId = assocRecord[IncludedModel.model.primaryKey];

                          acc2[recordId] = done =>
                            sails.helpers.countRelationship
                              .with({ model: IncludedModel.model, association: assoc, pk: recordId })
                              .then(result => done(null, result));

                          return acc2;
                        }, {}),
                        next
                      );
                  } else {
                    const recordId =
                      typeof assocRecords === 'object' ? assocRecords[IncludedModel.model.primaryKey] : null;
                    if (recordId) {
                      acc[assoc.alias] = next =>
                        parallel(
                          {
                            [recordId]: done =>
                              sails.helpers.countRelationship
                                .with({ model: IncludedModel.model, association: assoc, pk: recordId })
                                .then(result => done(null, result))
                          },
                          next
                        );
                    }
                  }
                });

                return acc;
              }, {})
            ),
            (err, result) => {
              if (err) return cb(err);
              cb(null, Object.assign({}, { matchingRecord: record }, { meta: { relationships: { count: result } } }));
            }
          );
        }
      ],
      (err, results) => {
        if (err) return sails.helpers.negotiate.with({ res, err });
        const { matchingRecord, meta } = results;

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
              sails.helpers.buildJsonApiResponse.with({ model: Model, records: matchingRecord, meta }),
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
