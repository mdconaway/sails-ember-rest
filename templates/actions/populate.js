/**
 * populate
 * 
 * returns a function with access to an interruption context
 * 
 * @description :: Server-side logic for a generic crud controller populate action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const util = require('util');
const actionUtil = require('./../util/actionUtil');
const pluralize = require('pluralize');
const _ = require('lodash');

module.exports = function(interrupts) {
    return function(req, res) {
        const Model = actionUtil.parseModel(req);
        const relation = req.options.alias;
        if (!relation || !Model) return res.serverError();
        const association = _.find(req.options.associations, {
            alias: relation
        });
        const relationIdentity = association.type === 'model' ? association.model : association.collection;
        const RelatedModel = req._sails.models[relationIdentity];
        // Allow customizable blacklist for params.
        req.options.criteria = req.options.criteria || {};
        req.options.criteria.blacklist = req.options.criteria.blacklist || ['limit', 'skip', 'sort', 'id', 'parentid'];
        let parentPk = req.param('parentid');
        let childPk = actionUtil.parsePk(req);
        // Determine whether to populate using a criteria, or the
        // specified primary key of the child record, or with no
        // filter at all.
        if (!RelatedModel) {
            throw new Error(
                util.format(
                    'Invalid route option, "model".\nI don\'t know about any models named: `%s`',
                    relationIdentity
                )
            );
        }
        // Coerce the parent/child PK to an integer if necessary
        if (Model.attributes[Model.primaryKey].type === 'number' && typeof parentPk !== 'undefined') {
            parentPk = +parentPk || 0;
        }
        if (RelatedModel.attributes[RelatedModel.primaryKey].type === 'number' && typeof childPk !== 'undefined') {
            childPk = +childPk || 0;
        }
        const where = childPk ? {} : actionUtil.parseCriteria(req);
        const skip = actionUtil.parseSkip(req);
        const limit = actionUtil.parseLimit(req);
        const sort = actionUtil.parseSort(req);
        if (childPk) {
            where[RelatedModel.primaryKey] = [childPk];
        }
        const populateOptions = {
            where: where
        };
        if (skip) populateOptions.skip = skip;
        if (limit) populateOptions.limit = limit;
        if (sort) populateOptions.sort = sort;

        async.parallel(
            {
                count: Ember.countRelationship(Model, association, parentPk),
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
                                return done(
                                    new Error(
                                        util.format(
                                            'Specified record (%s) is missing relation `%s`',
                                            parentPk,
                                            relation
                                        )
                                    )
                                );
                            }
                            done(null, { parent: matchingRecord, children: matchingRecord[relation] });
                        });
                }
            },
            (err, results) => {
                if (err) {
                    return actionUtil.negotiate(res, err, actionUtil.parseLocals(req));
                }
                const { parent, children } = results.records;
                // Subcribe to instance, if relevant
                // TODO: only subscribe to populated attribute- not the entire model
                if (sails.hooks.pubsub && req.isSocket) {
                    Model.subscribe(req, [parent[Model.primaryKey]]);
                    actionUtil.subscribeDeep(req, parent);
                }
                // find the model identity and the Collection for this relation
                const documentIdentifier = pluralize(_.kebabCase(RelatedModel.globalId));
                const json = {};

                json[documentIdentifier] = Ember.linkAssociations(RelatedModel, children);
                //BOOM! counted relationships!
                json.meta = {
                    total: results.count
                };
                interrupts.populate.call(
                    this,
                    req,
                    res,
                    () => {
                        res.ok(json, actionUtil.parseLocals(req));
                    },
                    Model,
                    children
                );
            }
        );
    };
};
