/**
 * Ember service
 *
 * @module Ember
 */
var _ = require( 'lodash' );
var pluralize = require( 'pluralize' );

var Ember = {
    linkAssociations: function(model, records){
        var modelPlural = pluralize(model.identity);
        var linkPrefix = sails.config.blueprints.linkPrefix ? sails.config.blueprints.linkPrefix : '';
        records = Array.isArray(records) ? records : [records];
        return records.map(function eachRecord(record){
            var links = {};
            model.associations.forEach(function(assoc){
                if(assoc.type === "collection")
                {
                    //Had to modify this code to run on app hosted at subroute
                    links[assoc.alias] = linkPrefix + "/" + modelPlural + "/" + record.id + "/" + assoc.alias;
                }
            });
            if(Object.keys(links).length > 0)
            {
                record.links = links;
            }
            return record;
        });
    },

    /**
     * Prepare sideloaded records for final return to Ember's DS.RESTAdapter
     *
     * @param {Object} json A sideloaded record hash
     * @param {String} documentIdentifier A string that identifies the primary object queried by the user
     * @return {Object} The returned structure can be consumed by DS.RESTAdapter when passed to res.json()
     */
    finalizeSideloads: function(json, documentIdentifier){
        // filter duplicates in sideloaded records
        // @todo: prune empty association arrays
        Object.keys(json).forEach(function(key){
            var array = json[key];
            if(key === documentIdentifier) return;
            if(array.length === 0)
            {
                delete json[key];
                return;
            }
            json[key] = _.uniq(array, function(record){
                return record.id;
            });
        });

        // add *links* for relationships to sideloaded records
        Object.keys(json).forEach(function(key){
            var array = json[key];
            if(key === documentIdentifier) return;
            if(array.length > 0)
            {
                if(!_.isNumber(array[0]) && !_.isString(array[0])) // this is probably an array of records
                {
                    var model = sails.models[pluralize(_.kebabCase(key).toLowerCase(), 1)];
                    Ember.linkAssociations(model, array);
                }
            }
        });
        return json;
    },

    /**
     * Prepare records and populated associations to be consumed by Ember's DS.RESTAdapter
     *
     * @param {Collection} model Waterline collection object (returned from parseModel)
     * @param {Array|Object} records A record or an array of records returned from a Waterline query
     * @param {Associations} associations Definition of the associations, from `req.option.associations`
     * @param {Boolean} sideload Sideload embedded records or reduce them to primary keys?
     * @return {Object} The returned structure can be consumed by DS.RESTAdapter when passed to res.json()
     */
    buildResponse: function(model, records, associations, sideload, associatedRecords){
        var emberModelIdentity = model.globalId;
        var modelPlural = pluralize( emberModelIdentity );
        var linkPrefix = sails.config.blueprints.linkPrefix ? sails.config.blueprints.linkPrefix : '';
        var documentIdentifier = _.camelCase(modelPlural);
        var toJSON = model.customToJSON ? model.customToJSON : function(){return this;};
        var json = {};

        json[documentIdentifier] = [];
        records = Array.isArray(records) ? records : [records];
        sideload = sideload || false;

        if(sideload)
        {
            // prepare for sideloading
            associations.forEach(function(assoc){
                // only sideload, when the full records are to be included, more info on setup here https://github.com/Incom/incom-api/wiki/Models:-Defining-associations
                if(assoc.include === "record")
                {
                    var assocModelIdentifier = pluralize(_.camelCase( sails.models[assoc.collection || assoc.model].globalId));
                    // initialize jsoning object
                    if(!json.hasOwnProperty(assoc.alias))
                    {
                        json[assocModelIdentifier] = [];
                    }
                }
            });
        }

        records.forEach(function(record){
            // get rid of the record's prototype ( otherwise the .toJSON called in res.send would re-insert embedded records)
            var links = {};
            record = Object.assign({}, toJSON.call(record));
            associations.forEach(function(assoc){
                var assocModelIdentifier = pluralize(_.camelCase(sails.models[assoc.collection || assoc.model].globalId));
                var assocModel;
                if(assoc.type === "collection")
                {
                    assocModel = sails.models[assoc.collection];
                    var via = _.kebabCase(emberModelIdentity);
                    // check if inverse is using a different name
                    if(via !== pluralize(assoc.via, 1))
                    {
                        via = pluralize(assoc.via, 1);
                    }
                    if(sideload && assoc.include === "record" && record[assoc.alias] && record[assoc.alias].length > 0)
                    {
                        // sideload association records with links for 3rd level associations
                        json[assocModelIdentifier] = json[assocModelIdentifier].concat(Ember.linkAssociations(assocModel, record[assoc.alias]));
                        // reduce association on primary record to an array of IDs
                        record[assoc.alias] = _.reduce(record[assoc.alias], function(filtered, rec){
                            filtered.push(rec.id);
                            return filtered;
                        }, []);
                    }
                    if(assoc.include === "index" && associatedRecords[assoc.alias])
                    {
                        if(assoc.through)
                        { // handle hasMany-Through associations
                            if(assoc.include === "index" && associatedRecords[assoc.alias])
                            {
                                record[assoc.alias] = _.reduce(associatedRecords[assoc.alias], function(filtered, rec){
                                    if(rec[via] === record.id)
                                    {
                                        filtered.push(rec[assoc.collection]); //is this correct??
                                    }
                                    return filtered;
                                }, []);
                            }
                        }
                        else
                        {
                            record[assoc.alias] = _.reduce(associatedRecords[assoc.alias], function(filtered, rec){
                                if(rec[via] === record.id)
                                {
                                    filtered.push(rec.id);
                                }
                                return filtered;
                            }, []);
                        }
                    }
                    //@todo if assoc.include startsWith index: ... fill contents from selected column of join table
                    if(assoc.include === "link")
                    {
                        links[assoc.alias] = linkPrefix + "/" + modelPlural.toLowerCase() + "/" + record.id + "/" + assoc.alias; //"/" + sails.config.blueprints.prefix
                        delete record[assoc.alias];
                    }
                    //record[assoc.alias] = _.map(record[assoc.alias], 'id');
                }
                if(assoc.type === "model" && record[assoc.alias])
                {
                    if(sideload && assoc.include === "record" )
                    {
                        assocModel = sails.models[ assoc.model ];
                        var linkedRecords = Ember.linkAssociations(assocModel, record[assoc.alias]);
                        json[assocModelIdentifier] = json[assocModelIdentifier].concat(record[assoc.alias]);
                        record[assoc.alias] = linkedRecords[0].id; // reduce embedded record to id
                    }
                    /*
                    // while it's possible, we should not really do this, it is more efficient to return a single model in a 1 to 1 relationship
                    if (assoc.include === "link")
                    {
                        links[ assoc.alias ] = sails.config.blueprints.prefix + "/" + modelPlural.toLowerCase() + "/" + record.id + "/" + assoc.alias;
                        delete record[ assoc.alias ];
                    }
                    */
                }
            });
            if(Object.keys(links).length > 0)
            {
                record.links = links;
            }
            json[documentIdentifier].push(record);
        });
        if(sideload)
        {
            json = Ember.finalizeSideloads(json, documentIdentifier);
        }
        return json;
    }
};

module.exports = Ember;