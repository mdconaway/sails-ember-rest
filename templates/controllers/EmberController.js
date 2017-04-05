/**
 * EmberController
 *
 * @description :: Server-side logic for a generic crud controller that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var util = require('util');
var actionUtil = require('./../util/actionUtil');
var pluralize = require('pluralize');
var _ = require('lodash');
var baseController = {
    setServiceInterrupt: function(name, fn){
        if(this.interrupts.hasOwnProperty(name) && typeof fn === 'function')
        {
            this.interrupts[name] = fn;
        }
        return this;
    },
    create: function (req, res) {
        var Model = actionUtil.parseModel( req );
        var data = actionUtil.parseValues( req, Model );
        // Look up the association configuration and determine how to populate the query
        // @todo support request driven selection of includes/populate
        var associations = actionUtil.getAssociationConfiguration(Model, "detail");
        // Create new instance of model using data from params
        Model.create(data).exec(function(err, newInstance){
            // Differentiate between waterline-originated validation errors
            // and serious underlying issues. Respond with badRequest if a
            // validation error is encountered, w/ validation info.
            if(err) return res.negotiate(err, actionUtil.parseLocals(req));
            // If we have the pubsub hook, use the model class's publish method
            // to notify all subscribers about the created item
            if (req._sails.hooks.pubsub)
            {
                if (req.isSocket )
                {
                    Model.subscribe( req, newInstance );
                    Model.introduce( newInstance );
                }
                Model.publishCreate( newInstance, !req.options.mirror && req );
            }
            this.interrupts.create.call(this, req, res, function(){
                // Do a final query to populate the associations of the record.
                var Q = Model.findOne(newInstance[Model.primaryKey]);
                Q = actionUtil.populateRecords(Q, associations);
                Q.exec(function(err, populatedRecord){
                    if(err) return res.serverError(err);
                    actionUtil.populateIndexes(Model, populatedRecord.id, associations, function(err, associated){
                        if(err) return res.serverError(err);
                        if(!populatedRecord) return res.serverError('Could not find record after updating!');
                        // Send JSONP-friendly response if it's supported
                        // (HTTP 201: Created)
                        res.created(Ember.buildResponse(Model, populatedRecord, associations, true, associated ), actionUtil.parseLocals(req));
                    }.bind(this));
                }.bind(this));
            }.bind(this), Model, newInstance);
        }.bind(this));
    },
    destroy: function(req, res){
        var Model = actionUtil.parseModel( req );
        var pk = actionUtil.requirePk( req );
        var query = Model.findOne( pk );
        // Look up the association configuration and determine how to populate the query
        // @todo support request driven selection of includes/populate
        var associations = actionUtil.getAssociationConfiguration(Model, "list");
        query = actionUtil.populateEach(query, req);
        query.exec(function(err, record){
            if(err)
            {
                return res.serverError( err );
            }
            if(!record)
            {
                return res.notFound( 'No record found with the specified `id`.' );
            }
            Model.destroy(pk).exec(function(err){
                if(err)
                {
                    return res.negotiate( err, actionUtil.parseLocals(req) );
                }
                if(sails.hooks.pubsub)
                {
                    Model.publishDestroy(pk, !sails.config.blueprints.mirror && req, {
                        previous: record
                    });
                    if(req.isSocket)
                    {
                        Model.unsubscribe( req, record );
                        Model.retire( record );
                    }
                }
                this.interrupts.destroy.call(this, req, res, function(){
                    return res.ok(null, actionUtil.parseLocals(req)); // Ember Data REST Adapter expects NULL after DELETE
                }.bind(this), Model, record);
                // @todo --- if neccessary, destroy related records
            }.bind(this));
        }.bind(this));
    },
    find: function(req, res){
        // Look up the model
        var Model = actionUtil.parseModel(req);
        // parse criteria from request
        var criteria = actionUtil.parseCriteria(req);
        var limit = actionUtil.parseLimit(req);
        // Look up the association configuration and determine how to populate the query
        // @todo support request driven selection of includes/populate
        var associations = actionUtil.getAssociationConfiguration( Model, "list" );
        async.parallel({
            count: function(done){
                Model.count(criteria).exec( done );
            },
            records: function (done) {
                // Lookup for records that match the specified criteria
                var query = Model.find()
                    .where( criteria )
                    .skip( actionUtil.parseSkip( req ) )
                    .sort( actionUtil.parseSort( req ) );
                if(limit)query.limit( limit );

                // populate associations according to our model specific configuration...
                query = actionUtil.populateRecords( query, associations );
                query.exec(done);
            }
        },
        function (err, results){
            if(err) return res.serverError(err);
            var matchingRecords = results.records;
            var ids = _.map(matchingRecords, 'id');
            this.interrupts.find.call(this, req, res, function(){
                actionUtil.populateIndexes(Model, ids, associations, function(err, associated){
                    if(err) return res.serverError(err);
                    // Only `.watch()` for new instances of the model if
                    // `autoWatch` is enabled.
                    if(req._sails.hooks.pubsub && req.isSocket)
                    {
                        Model.subscribe(req, matchingRecords);
                        if(req.options.autoWatch)
                        {
                            Model.watch( req );
                        }
                        // Also subscribe to instances of all associated models
                        // @todo this might need an update to include associations included by index only
                        matchingRecords.forEach(function(record){
                            actionUtil.subscribeDeep(req, record);
                        });
                    }
                    var emberizedJSON = Ember.buildResponse(Model, results.records, associations, true, associated);
                    emberizedJSON.meta = {
                        total: results.count
                    };
                    res.ok(emberizedJSON, actionUtil.parseLocals(req));
                }.bind(this))
            }.bind(this), Model, matchingRecords);
        }.bind(this));
    },
    findone: function(req, res){
        var Model = actionUtil.parseModel( req );
        var pk = actionUtil.requirePk( req );
        var query = Model.findOne( pk );
        // Look up the association configuration and determine how to populate the query
        // @todo support request driven selection of includes/populate
        var associations = actionUtil.getAssociationConfiguration( Model, "detail" );

        query = actionUtil.populateRecords(query, associations);
            query.where(actionUtil.parseCriteria(req)).exec(function(err, matchingRecord){
            if(err) return res.serverError( err );
            if(!matchingRecord) return res.notFound('No record found with the specified `id`.');
            this.interrupts.findone.call(this, req, res, function(){
                actionUtil.populateIndexes(Model, matchingRecord.id, associations, function(err, associated){
                    if(sails.hooks.pubsub && req.isSocket)
                    {
                        Model.subscribe(req, matchingRecord);
                        actionUtil.subscribeDeep(req, matchingRecord);
                    }
                    res.ok(Ember.buildResponse( Model, matchingRecord, associations, true, associated), actionUtil.parseLocals(req));
                }.bind(this));
            }.bind(this), Model, matchingRecord)
        }.bind(this));
    },
    hydrate: function(req, res){
        var Model = actionUtil.parseModel(req);
        var pk = actionUtil.requirePk(req);
        var query = Model.findOne(pk);
        var emberModelIdentity = Model.globalId;
        var modelPlural = pluralize( emberModelIdentity );
        var documentIdentifier = _.kebabCase( modelPlural );
        var response = {};
        var record;
        // Look up the association configuration and determine how to populate the query
        // @todo support request driven selection of includes/populate
        var associations = actionUtil.getAssociationConfiguration( Model, "detail" );
        query = actionUtil.populateRecords(query, associations, true);
        query.where(actionUtil.parseCriteria(req)).exec(function(err, matchingRecord){
            if(err) return res.serverError(err);
            if(!matchingRecord) return res.notFound('No record found with the specified `id`.');
            this.interrupts.hydrate.call(this, req, res, function(){
                if(req._sails.hooks.pubsub && req.isSocket)
                {
                    Model.subscribe( req, matchingRecord );
                    actionUtil.subscribeDeep( req, matchingRecord );
                }
                record = _.create({}, matchingRecord.toJSON());
                associations.forEach(function(assoc){
                    var assocModel;
                    if (assoc.type === "collection")
                    {
                        assocModel = req._sails.models[assoc.collection];
                        var via = _.kebabCase(emberModelIdentity);
                        // check if inverse is using a different name
                        if(via !== pluralize(assoc.via,1))
                        {
                            via = pluralize(assoc.via, 1);
                        }
                        if(record[assoc.alias] && record[assoc.alias].length > 0)
                        {
                            // sideload association records with links for 3rd level associations
                            record[assoc.alias] = Ember.linkAssociations(assocModel, record[assoc.alias]);
                        }
                    }
                    if(assoc.type === "model" && record[assoc.alias])
                    {
                        assocModel = req._sails.models[assoc.model];
                        var linkedRecords = Ember.linkAssociations(assocModel, record[assoc.alias]);
                        record[assoc.alias] = linkedRecords[0]; // reduce embedded record to id
                    }
                }.bind(this));
                response[documentIdentifier] = [record];
                res.ok(response, actionUtil.parseLocals(req));
            }.bind(this), Model, matchingRecord);
        }.bind(this));
    },
    populate: function(req, res){
        var Model = actionUtil.parseModel( req );
        var relation = req.options.alias;
        if ( !relation || !Model ) return res.serverError();
        // Allow customizable blacklist for params.
        req.options.criteria = req.options.criteria || {};
        req.options.criteria.blacklist = req.options.criteria.blacklist || [ 'limit', 'skip', 'sort', 'id', 'parentid' ];
        var parentPk = req.param( 'parentid' );
        // Determine whether to populate using a criteria, or the
        // specified primary key of the child record, or with no
        // filter at all.
        var childPk = actionUtil.parsePk( req );
        // Coerce the child PK to an integer if necessary
        if (childPk)
        {
            if (Model.attributes[ Model.primaryKey ].type == 'integer')
            {
                childPk = +childPk || 0;
            }
        }
        var where = childPk ? {id: [childPk]} : actionUtil.parseCriteria(req);
        var skip = actionUtil.parseSkip( req );
        var limit = actionUtil.parseLimit( req );
        var sort = actionUtil.parseSort( req );
        var populateOptions = {
            where: where
        };

        if(skip) populateOptions.skip = skip;
        if(limit) populateOptions.limit = limit;
        if(sort) populateOptions.sort = sort;

        Model
            .findOne(parentPk)
            .populate(relation, populateOptions)
            .exec(function(err, matchingRecord){
                if(err) return res.serverError(err);
                if(!matchingRecord) return res.notFound('No record found with the specified id.');
                if(!matchingRecord[relation]) return res.notFound(util.format('Specified record (%s) is missing relation `%s`', parentPk, relation));
                this.interrupts.populate.call(this, req, res, function(){
                    // Subcribe to instance, if relevant
                    // TODO: only subscribe to populated attribute- not the entire model
                    if (sails.hooks.pubsub && req.isSocket)
                    {
                        Model.subscribe(req, matchingRecord);
                        actionUtil.subscribeDeep(req, matchingRecord);
                    }
                    // find the model identity and the Collection for this relation
                    var association = _.find(req.options.associations, {
                        alias: relation
                    });
                    var relationIdentity, documentIdentifier;
                    if(association.type === "model")
                    {
                        relationIdentity = association.model;
                    }
                    else
                    {
                        relationIdentity = association.collection;
                    }
                    var RelatedModel = req._sails.models[relationIdentity];
                    if(!RelatedModel) throw new Error(util.format('Invalid route option, "model".\nI don\'t know about any models named: `%s`', relationIdentity));

                    documentIdentifier = pluralize(_.kebabCase( RelatedModel.globalId ));
                    var related = Ember.linkAssociations(RelatedModel, matchingRecord[relation]);

                    var json = {};
                    json[documentIdentifier] = related;
                    res.ok(json, actionUtil.parseLocals(req));
                }.bind(this), Model, matchingRecord[relation]);
            }.bind(this));
    },
    update: function(req, res){
        // Look up the model
        var Model = actionUtil.parseModel(req);
        // Locate and validate the required `id` parameter.
        var pk = actionUtil.requirePk(req);
        // Create `values` object (monolithic combination of all parameters)
        // But omit the blacklisted params (like JSONP callback param, etc.)
        var values = actionUtil.parseValues(req, Model);
        // Omit the path parameter `id` from values, unless it was explicitly defined
        // elsewhere (body/query):
        // var idParamExplicitlyIncluded = ( ( req.body && req.body.id ) || req.query.id );
        // if ( !idParamExplicitlyIncluded ) delete values.id;
        // Look up the association configuration and determine how to populate the query
        // @todo support request driven selection of includes/populate
        var associations = actionUtil.getAssociationConfiguration(Model, "detail");
        // Find and update the targeted record.
        //
        // (Note: this could be achieved in a single query, but a separate `findOne`
        //  is used first to provide a better experience for front-end developers
        //  integrating with the blueprint API.)
        Model.findOne(pk).exec(function(err, matchingRecord){
            if(err)
            {
                return res.serverError( err );
            }
            if(!matchingRecord)
            {
                return res.notFound();
            }
            values.id = pk;

            this.interrupts.beforeUpdate.call(this, req, res, function(){
                Model.update(pk, values).exec(function(err, records){
                    // Differentiate between waterline-originated validation errors
                    // and serious underlying issues. Respond with badRequest if a
                    // validation error is encountered, w/ validation info.
                    if(err)
                    {
                        return res.negotiate( err, actionUtil.parseLocals(req) );
                    }
                    // Because this should only update a single record and update
                    // returns an array, just use the first item.  If more than one
                    // record was returned, something is amiss.
                    if (!records || !records.length || records.length > 1)
                    {
                        req._sails.log.warn(util.format( 'Unexpected output from `%s.update`.', Model.globalId));
                    }
                    var updatedRecord = records[0];
                    this.interrupts.afterUpdate.call(this, req, res, function(){
                        // If we have the pubsub hook, use the Model's publish method
                        // to notify all subscribers about the update.
                        if(req._sails.hooks.pubsub)
                        {
                            if (req.isSocket)
                            {
                                Model.subscribe(req, records);
                            }
                            Model.publishUpdate(pk, _.cloneDeep(values), !req.options.mirror && req, {
                                previous: matchingRecord.toJSON()
                            });
                        }
                        // Do a final query to populate the associations of the record.
                        var Q = Model.findOne( updatedRecord[ Model.primaryKey ] );
                        Q = actionUtil.populateRecords( Q, associations );
                        Q.exec(function(err, populatedRecord){
                            if(err)
                            {
                                return res.serverError( err );
                            }
                            if(!populatedRecord )
                            {
                                return res.serverError( 'Could not find record after updating!' );
                            }
                            actionUtil.populateIndexes(Model, matchingRecord.id, associations, function(err, associated){
                                res.ok(Ember.buildResponse(Model, populatedRecord, associations, true, associated), actionUtil.parseLocals(req));
                            }.bind(this));
                        }.bind(this));
                    }.bind(this), Model, {before: matchingRecord, after: updatedRecord});
                }.bind(this));
            }.bind(this), Model, values);
        }.bind(this));
    }
};

function defaultInterrupt(req, res, next, Model, record){
    next();
}

module.exports = function(instanceOverrides){
    instanceOverrides = instanceOverrides ? instanceOverrides : {};
    return Object.assign({}, baseController, instanceOverrides, {
        interrupts: {
            create: defaultInterrupt,
            destroy: defaultInterrupt,
            find: defaultInterrupt,
            findone: defaultInterrupt,
            hydrate: defaultInterrupt,
            populate: defaultInterrupt,
            beforeUpdate: defaultInterrupt,
            afterUpdate: defaultInterrupt
        }
    });
};