/**
 * create
 *
 * returns a function with access to an interruption context
 *
 * @description :: Server-side logic for a generic crud controller create action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const actionUtil = require('./../util/actionUtil');
const shimFunction = require('./../util/shimFunction');
const defaultInterrupt = require('./../interrupts/defaultInterrupt');
const { parallel, waterfall } = require('async');

module.exports = function(interrupts = {}) {
  interrupts = shimFunction(interrupts, 'create');
  interrupts.create = interrupts.create ? interrupts.create : defaultInterrupt;

  return function(req, res) {
    // Set the JSON API required header
    res.set('Content-Type', 'application/vnd.api+json');

    const Model = actionUtil.parseModel(req);
    const data = actionUtil.parseValues(req, Model);
    const associations = sails.helpers.getAssociationConfig.with({ model: Model });
    const preppedRelations = actionUtil.prepareManyRelations(associations, data);

    waterfall(
      [
        done => {
          Model.create(data).exec((err, newInstance) => {
            if (err) {
              return done(err);
            }
            done(null, newInstance);
          });
        },
        (newInstance, done) => {
          const pk = newInstance[Model.primaryKey];
          const saveMany = [];
          preppedRelations.forEach(rel => {
            saveMany.push(done => {
              Model.replaceCollection(pk, rel.collection)
                .members(rel.values)
                .exec(done);
            });
          });
          parallel(saveMany, () => {
            done(null, newInstance);
          });
        },
        (newInstance, done) => {
          interrupts.create.call(
            this,
            req,
            res,
            () => {
              done(null, newInstance);
            },
            Model,
            newInstance
          );
        },
        (newInstance, done) => {
          // Do a final query to populate the associations of the record.
          const query = Model.findOne(newInstance[Model.primaryKey]);
          parallel(
            {
              populatedRecord: done => {
                actionUtil.populateRecords(query, associations).exec(done);
              },
              associated: done => {
                actionUtil.populateIndexes(Model, newInstance[Model.primaryKey], associations, done);
              }
            },
            (err, results) => {
              if (err) {
                return done(err);
              }
              const { associated, populatedRecord } = results;
              if (!populatedRecord) {
                return done(new Error('Could not find record after updating!'));
              }
              return done(null, {
                associated,
                newInstance,
                populatedRecord
              });
            }
          );
        },
        ({ newInstance, populatedRecord }, done) => {
          return done(null, {
            specJSON: sails.helpers.buildJsonApiResponse.with({ model: Model, records: populatedRecord }),
            newInstance
          });
        }
      ],
      (err, results) => {
        // Catch-all for errors
        if (err) return sails.helpers.negotiate.with({ res, err });

        const { specJSON, newInstance } = results;
        if (req._sails.hooks.pubsub) {
          if (req.isSocket) {
            Model.subscribe(req, [newInstance[Model.primaryKey]]);
            Model._introduce(newInstance);
          }
          Model._publishCreate(newInstance, !req.options.mirror && req);
        }
        res.created(specJSON, actionUtil.parseLocals(req));
      }
    );
  };
};
