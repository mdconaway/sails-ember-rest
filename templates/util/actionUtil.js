/**
 * Module dependencies
 */
const _ = require('lodash');
const util = require('util');
// Parameter used for jsonp callback is constant, as far as
// blueprints are concerned (for now.)
const JSONP_CALLBACK_PARAM = 'callback';

// TODO:
//
// Replace the following helper with the version in sails.util:

// Attempt to parse JSON
// If the parse fails, return the error object
// If JSON is falsey, return null
// (this is so that it will be ignored if not specified)
function tryToParseJSON(json) {
    if (!_.isString(json)) return null;
    try {
        return JSON.parse(json);
    } catch (e) {
        return e;
    }
}

/**
 * Utility methods used in built-in blueprint actions.
 *
 * @type {Object}
 */
module.exports = {
    /**
     * Prepare records for create / update using Sails 1.0 relationship methods
     *
     * This method will alter the DATA object! (it must prevent many relations from directly saving)
     * 
     * @param {Associations} associations Definition of the associations, from `req.option.associations`
     * @param {Object} data The individual record that is about to be persisted
     * @return {Array} The returned structure can be utilized by controller actions create / update
     */
    prepareManyRelations(associations, data) {
        const targets = [];
        associations.forEach(assoc => {
            if (assoc.type === 'collection' && Array.isArray(data[assoc.alias])) {
                targets.push({
                    collection: assoc.alias,
                    values: data[assoc.alias]
                });
                delete data[assoc.alias];
            }
            return targets;
        });
    },

    /**
     * Extend the model's `associations` property with the presentation configuration (taken from the Model's attributes `includeIn` option or from Sails configuration)
     * @param  {Waterline Collection}  Model
     * @return {Array}                 Extended version of the Model.associations with `includeIn` defintions
     */
    getAssociationConfiguration(Model, style) {
        // get configured defaults or always embed full records
        let presentationDefaults = sails.config.models.associations || {
            list: 'record',
            detail: 'record'
        };
        let associations = Model.associations;
        let attributes = Model.attributes;
        associations.forEach(assoc => {
            assoc.include = _.extend({}, presentationDefaults, attributes[assoc.alias].includeIn)[style]; // extend association object with presentation configuration
            if (attributes[assoc.alias].through) {
                assoc.through = attributes[assoc.alias].through;
            }
        });
        return associations;
    },
    /**
     * helper function to populate a record with an array for indexes for associated models, running various Waterline queries on the join tables if neccessary ( defined as: include -> index )
     * @param  {Waterine Collection}   parentModel  [description]
     * @param  {Array|Integer}   ids          [description]
     * @param  {[type]}   associations [description]
     * @param  {Function} done         [description]
     */
    populateIndexes(parentModel, ids, associations, done) {
        const hash = {};
        associations.forEach(association => {
            if (association.include === 'index') {
                if (association.collection && !association.through) {
                    let assocCriteria = {};
                    let assocModel = sails.models[association.collection];
                    assocCriteria[association.via] = ids;
                    hash[association.alias] = done => {
                        assocModel.find(assocCriteria).exec(done); //it may be necessary to implement .limit() here at some point...
                    };
                }
            }
        });
        async.parallel(hash, done);
    },

    /**
     * helper function to populate a Waterline query according to the model definition include -> record
     * @param  {[type]} query        [description]
     * @param  {[type]} associations [description]
     * @return {[type]}              [description]
     */
    populateRecords(query, associations, force) {
        associations.forEach(assoc => {
            // if the associations is to be populated with the full records...
            if (assoc.include === 'record' || (assoc.through && assoc.include !== 'link') || force) {
                query.populate(assoc.alias);
            }
        });
        return query;
    },

    /**
     * Given a Waterline query, populate the appropriate/specified
     * association attributes and return it so it can be chained
     * further ( i.e. so you can .exec() it )
     *
     * @param   {Query} query               [waterline query object]
     * @param   {Request} req
     * @return {Query}
     */
    populateEach(query, req) {
        const DEFAULT_POPULATE_LIMIT = sails.config.blueprints.defaultLimit || 30;
        const _options = req.options;
        let aliasFilter = req.param('populate');
        let shouldPopulate = _options.populate;

        // Convert the string representation of the filter list to an Array. We
        // need this to provide flexibility in the request param. This way both
        // list string representations are supported:
        //  /model?populate=alias1,alias2,alias3
        //  /model?populate=[alias1,alias2,alias3]
        if (typeof aliasFilter === 'string') {
            aliasFilter = aliasFilter.replace(/\[|\]/g, '');
            aliasFilter = aliasFilter ? aliasFilter.split(',') : [];
        }

        return _(_options.associations).reduce((query, association) => {
            // If an alias filter was provided, override the blueprint config.
            if (aliasFilter) {
                shouldPopulate = _.contains(aliasFilter, association.alias);
            }

            // Only populate associations if a population filter has been supplied
            // with the request or if `populate` is set within the blueprint config.
            // Population filters will override any value stored in the config.
            //
            // Additionally, allow an object to be specified, where the key is the
            // name of the association attribute, and value is true/false
            // (true to populate, false to not)
            if (shouldPopulate) {
                const populationLimit =
                    _options['populate_' + association.alias + '_limit'] ||
                    _options.populate_limit ||
                    _options.limit ||
                    DEFAULT_POPULATE_LIMIT;

                return query.populate(association.alias, {
                    limit: populationLimit
                });
            } else return query;
        }, query);
    },

    /**
     * Subscribe deep (associations)
     * This likely needs to be refactored to fully support sails 1.0. 
     * @param   {[type]} associations   [description]
     * @param   {[type]} record         [description]
     * @return {[type]}                 [description]
     */
    subscribeDeep(req, record) {
        req.options.associations.forEach(assoc => {
            // Look up identity of associated model
            let ident = assoc[assoc.type];
            let AssociatedModel = sails.models[ident];
            if (req.options.autoWatch) {
                AssociatedModel.watch(req);
            }

            // Subscribe to each associated model instance in a collection
            if (assoc.type === 'collection') {
                record[assoc.alias].forEach(associatedInstance => {
                    AssociatedModel.subscribe(req, associatedInstance);
                });
            } else if (assoc.type === 'model' && record[assoc.alias]) {
                // If there is an associated to-one model instance, subscribe to it
                AssociatedModel.subscribe(req, record[assoc.alias]);
            }
        });
    },

    /**
     * Parse primary key value for use in a Waterline criteria
     * (e.g. for `find`, `update`, or `destroy`)
     *
     * @param   {Request} req
     * @return {Integer|String}
     */
    parsePk(req) {
        const pk = req.options.id || (req.options.where && req.options.where.id) || req.param('id');

        // TODO: make this smarter...
        // (e.g. look for actual primary key of model and look for it
        //  in the absence of `id`.)
        // See coercePK for reference (although be aware it is not currently in use)

        // exclude criteria on id field
        return _.isPlainObject(pk) ? undefined : pk;
    },

    /**
     * Parse primary key value from parameters.
     * Throw an error if it cannot be retrieved.
     *
     * @param   {Request} req
     * @return {Integer|String}
     */
    requirePk(req) {
        const pk = module.exports.parsePk(req);

        // Validate the required `id` parameter
        if (!pk) {
            const err = new Error(
                'No `id` parameter provided.' +
                    "(Note: even if the model's primary key is not named `id`- " +
                    '`id` should be used as the name of the parameter- it will be ' +
                    'mapped to the proper primary key name)'
            );
            err.status = 400;
            throw err;
        }
        return pk;
    },

    /**
     * Parse `criteria` for a Waterline `find` or `update` from all
     * request parameters.
     *
     * @param   {Request} req
     * @return {Object}                     the WHERE criteria object
     */
    parseCriteria(req) {
        const Model = module.exports.parseModel(req);
        // Allow customizable blacklist for params NOT to include as criteria.
        req.options.criteria = req.options.criteria || {};
        req.options.criteria.blacklist = req.options.criteria.blacklist || ['limit', 'skip', 'sort', 'populate'];
        // Validate blacklist to provide a more helpful error msg.
        const blacklist = req.options.criteria && req.options.criteria.blacklist;
        if (blacklist && !Array.isArray(blacklist)) {
            throw new Error(
                'Invalid `req.options.criteria.blacklist`. Should be an array of strings (parameter names.)'
            );
        }

        // Look for explicitly specified `where` parameter.
        let where = req.allParams().where;

        // If `where` parameter is a string, try to interpret it as JSON
        if (_.isString(where)) {
            where = tryToParseJSON(where);
        }

        // If `where` has not been specified, but other unbound parameter variables
        // **ARE** specified, build the `where` option using them.
        if (!where) {
            // Prune params which aren't fit to be used as `where` criteria
            // to build a proper where query
            where = req.allParams();

            // Omit built-in runtime config (like query modifiers)
            where = _.omit(where, blacklist || ['limit', 'skip', 'sort']);

            // Omit any params w/ undefined values
            where = _.omit(where, p => {
                if (_.isUndefined(p)) return true;
            });

            // Transform ids[ .., ..] request
            if (where.ids || where.id) {
                let key = where.ids ? 'ids' : 'id';
                let tmp = where.ids || where.id;
                delete where[key];
                where[Model.primaryKey] = tmp;
            }

            // Omit jsonp callback param (but only if jsonp is enabled)
            let jsonpOpts = req.options.jsonp && !req.isSocket;
            jsonpOpts = _.isObject(jsonpOpts)
                ? jsonpOpts
                : {
                      callback: JSONP_CALLBACK_PARAM
                  };
            if (jsonpOpts) {
                where = _.omit(where, [jsonpOpts.callback]);
            }
        }

        // Merge w/ req.options.where and return
        where = _.merge({}, req.options.where || {}, where) || undefined;

        return where;
    },

    /**
     * Parse `values` for a Waterline `create` or `update` from all
     * request parameters.
     *
     * @param   {Request} req
     * @return {Object}
     */
    parseValues(req, model) {
        // Create data object (monolithic combination of all parameters)
        // Omit the blacklisted params (like JSONP callback param, etc.)

        // Allow customizable blacklist for params NOT to include as values.
        req.options.values = req.options.values || {};

        // Validate blacklist to provide a more helpful error msg.
        const blacklist = req.options.values.blacklist;
        if (blacklist && !Array.isArray(blacklist)) {
            throw new Error('Invalid `req.options.values.blacklist`. Should be an array of strings (parameter names.)');
        }

        // Get valufunctiones using the model identity as resource identifier
        let values = req.param(_.kebabCase(model.globalId)) || {};

        // Omit built-in runtime config (like query modifiers)
        values = _.omit(values, blacklist || []);

        // Omit any params w/ undefined values
        values = _.omit(values, p => {
            if (_.isUndefined(p)) return true;
        });

        // Omit jsonp callback param (but only if jsonp is enabled)
        let jsonpOpts = req.options.jsonp && !req.isSocket;
        jsonpOpts = _.isObject(jsonpOpts)
            ? jsonpOpts
            : {
                  callback: JSONP_CALLBACK_PARAM
              };
        if (jsonpOpts) {
            values = _.omit(values, [jsonpOpts.callback]);
        }

        return values;
    },

    /**
     * Determine the model class to use w/ this blueprint action.
     * @param   {Request} req
     * @return {WLCollection}
     */
    parseModel(req) {
        // Ensure a model can be deduced from the request options.
        const model = req.options.model || req.options.controller;
        if (!model) throw new Error(util.format('No "model" specified in route options.'));

        const Model = req._sails.models[model];
        if (!Model)
            throw new Error(
                util.format('Invalid route option, "model".\nI don\'t know about any models named: `%s`', model)
            );

        return Model;
    },

    /**
     * @param   {Request} req
     */
    parseSort(req) {
        let sort = req.param('sort') || req.options.sort;
        if (_.isUndefined(sort)) {
            return undefined;
        }

        // If `sort` is a string, attempt to JSON.parse() it.
        // (e.g. `{"name": 1}`)
        if (_.isString(sort)) {
            try {
                sort = JSON.parse(sort);
            } catch (e) {
                // If it is not valid JSON, then fall back to interpreting it as-is.
                // (e.g. "name ASC")
            }
        }
        return sort;
    },

    /**
     * @param   {Request} req
     */
    parseLimit(req) {
        const DEFAULT_LIMIT = sails.config.blueprints.defaultLimit || false;
        let limit =
            req.param('limit') || (typeof req.options.limit !== 'undefined' ? req.options.limit : DEFAULT_LIMIT);
        if (limit) {
            limit = +limit;
        }
        return limit;
    },

    /**
     * @param   {Request} req
     */
    parseSkip(req) {
        const DEFAULT_SKIP = 0;
        let skip = req.param('skip') || (typeof req.options.skip !== 'undefined' ? req.options.skip : DEFAULT_SKIP);
        if (skip) {
            skip = +skip;
        }
        return skip;
    },

    /**
     * @param   {Request} req
     */
    parseLocals(req) {
        return typeof req.options.locals !== 'undefined' && req.options.locals !== null ? req.options.locals : null;
    }
};
