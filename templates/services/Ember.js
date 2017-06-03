/**
 * Ember service
 *
 * @module Ember
 */
const _ = require('lodash');
const pluralize = require('pluralize');
const generateManyMap = require('./../util/manyMapGenerator');
let aliasMap = {};
let mapGen = false;

module.exports = {
    /**
     * Generate a COUNT query to analyze a relationship for the populate action
     *
     * @param {Model} model The parent model class to count a relationship FROM
     * @param {Associations} association Definition of the association
     * @param {ObjectID} pk The pk value of the parent record to count a relationship FROM
     * @return {Function} The returned structure is an `async` ready function
     */
    countRelationship(model, association, pk) {
        if (!mapGen) {
            aliasMap = generateManyMap(sails.models);
            mapGen = true;
        }
        if (aliasMap[model.identity] && aliasMap[model.identity][association.alias]) {
            return aliasMap[model.identity][association.alias](pk);
        }
        return function(done) {
            done(null, 0);
        };
    },
    /**
     * Prepare records and populated associations to be consumed by Ember's DS.RESTAdapter in link mode
     *
     * @param {Collection} model Waterline collection object (returned from parseModel)
     * @param {Array|Object} records A record or an array of records returned from a Waterline query
     * @return {Array} The returned structure can be consumed by DS.RESTAdapter when passed to res.json()
     */
    linkAssociations(model, records) {
        const modelPlural = pluralize(model.identity);
        const linkPrefix = sails.config.blueprints.linkPrefix ? sails.config.blueprints.linkPrefix : '';
        records = Array.isArray(records) ? records : [records];
        return records.map(record => {
            let links = {};
            model.associations.forEach(assoc => {
                if (assoc.type === 'collection') {
                    //Had to modify this code to run on app hosted at subroute
                    links[assoc.alias] = linkPrefix + '/' + modelPlural + '/' + record.id + '/' + assoc.alias;
                }
            });
            if (Object.keys(links).length > 0) {
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
    finalizeSideloads(json, documentIdentifier) {
        // filter duplicates in sideloaded records
        // @todo: prune empty association arrays
        Object.keys(json).forEach(key => {
            let array = json[key];
            if (key === documentIdentifier) return;
            if (array.length === 0) {
                delete json[key];
                return;
            }
            json[key] = _.uniq(array, record => record.id);
        });

        // add *links* for relationships to sideloaded records
        Object.keys(json).forEach(key => {
            let array = json[key];
            if (key === documentIdentifier) return;
            if (array.length > 0) {
                if (!_.isNumber(array[0]) && !_.isString(array[0])) {
                    // this is probably an array of records
                    let model = sails.models[pluralize(_.kebabCase(key).toLowerCase(), 1)];
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
    buildResponse(model, records, associations, sideload, associatedRecords) {
        let emberModelIdentity = model.globalId;
        let modelPlural = pluralize(emberModelIdentity);
        let linkPrefix = sails.config.blueprints.linkPrefix ? sails.config.blueprints.linkPrefix : '';
        let documentIdentifier = _.camelCase(modelPlural);
        const toJSON = model.customToJSON
            ? model.customToJSON
            : function() {
                  return this;
              };
        let json = {};

        json[documentIdentifier] = [];
        records = Array.isArray(records) ? records : [records];
        sideload = sideload || false;

        if (sideload) {
            // prepare for sideloading
            associations.forEach(assoc => {
                // only sideload, when the full records are to be included, more info on setup here https://github.com/Incom/incom-api/wiki/Models:-Defining-associations
                if (assoc.include === 'record') {
                    let assocModelIdentifier = pluralize(
                        _.camelCase(sails.models[assoc.collection || assoc.model].globalId)
                    );
                    // initialize jsoning object
                    if (!json.hasOwnProperty(assoc.alias)) {
                        json[assocModelIdentifier] = [];
                    }
                }
            });
        }

        records.forEach(record => {
            // get rid of the record's prototype ( otherwise the .toJSON called in res.send would re-insert embedded records)
            let links = {};
            record = Object.assign({}, toJSON.call(record));
            associations.forEach(assoc => {
                let assocModelIdentifier = pluralize(
                    _.camelCase(sails.models[assoc.collection || assoc.model].globalId)
                );
                let assocModel;
                if (assoc.type === 'collection') {
                    assocModel = sails.models[assoc.collection];
                    let via = _.kebabCase(emberModelIdentity);
                    // check if inverse is using a different name
                    if (via !== pluralize(assoc.via, 1)) {
                        via = pluralize(assoc.via, 1);
                    }
                    if (
                        sideload &&
                        assoc.include === 'record' &&
                        record[assoc.alias] &&
                        record[assoc.alias].length > 0
                    ) {
                        // sideload association records with links for 3rd level associations
                        json[assocModelIdentifier] = json[assocModelIdentifier].concat(
                            Ember.linkAssociations(assocModel, record[assoc.alias])
                        );
                        // reduce association on primary record to an array of IDs
                        record[assoc.alias] = _.reduce(
                            record[assoc.alias],
                            (filtered, rec) => {
                                filtered.push(rec.id);
                                return filtered;
                            },
                            []
                        );
                    }
                    if (assoc.include === 'index' && associatedRecords[assoc.alias]) {
                        if (assoc.through) {
                            // handle hasMany-Through associations
                            if (assoc.include === 'index' && associatedRecords[assoc.alias]) {
                                record[assoc.alias] = _.reduce(
                                    associatedRecords[assoc.alias],
                                    (filtered, rec) => {
                                        if (rec[via] === record.id) {
                                            filtered.push(rec[assoc.collection]); //is this correct??
                                        }
                                        return filtered;
                                    },
                                    []
                                );
                            }
                        } else {
                            record[assoc.alias] = _.reduce(
                                associatedRecords[assoc.alias],
                                (filtered, rec) => {
                                    if (rec[via] === record.id) {
                                        filtered.push(rec.id);
                                    }
                                    return filtered;
                                },
                                []
                            );
                        }
                    }
                    //@todo if assoc.include startsWith index: ... fill contents from selected column of join table
                    if (assoc.include === 'link') {
                        links[assoc.alias] =
                            linkPrefix + '/' + modelPlural.toLowerCase() + '/' + record.id + '/' + assoc.alias; //"/" + sails.config.blueprints.prefix
                        delete record[assoc.alias];
                    }
                    //record[assoc.alias] = _.map(record[assoc.alias], 'id');
                }
                if (assoc.type === 'model' && record[assoc.alias]) {
                    if (sideload && assoc.include === 'record') {
                        assocModel = sails.models[assoc.model];
                        let linkedRecords = Ember.linkAssociations(assocModel, record[assoc.alias]);
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
            if (Object.keys(links).length > 0) {
                record.links = links;
            }
            json[documentIdentifier].push(record);
        });
        if (sideload) {
            json = Ember.finalizeSideloads(json, documentIdentifier);
        }
        return json;
    }
};
