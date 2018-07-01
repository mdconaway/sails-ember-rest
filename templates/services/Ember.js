/**
 * Ember service
 *
 * @module Ember
 */
const { camelCase, kebabCase, omit, pick, reduce, uniqBy } = require('lodash');
const pluralize = require('pluralize');
const generateManyMap = require('./../util/manyMapGenerator');
const actionUtil = require('./../util/actionUtil');

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
   * Prepare an individual resource's associations
   *
   */
  prepareResourceAssociations(record, associations, primaryKey, json, toJSON, associatedRecords, include) {
    let included = [];
    let links = {};

    // get rid of the record's prototype ( otherwise the .toJSON called in res.send would re-insert embedded records)
    record = Object.assign({}, toJSON.call(record));
    associations.forEach(association => {
      const { alias, collection, model, through, type, via } = association;
      let assocModelIdentifier = pluralize(camelCase(sails.models[collection || model].globalId));
      let assocModel;
      let assocType;
      let assocPK;

      if (type === 'collection') {
        assocModel = sails.models[collection];
        assocPK = assocModel.primaryKey;
        assocType = pluralize(assocModel.globalId.toLowerCase());

        // Handle populated relationships
        if (
          (association.include === 'index' || association.include === 'record') &&
          record[alias] &&
          record[alias].length > 0
        ) {
          /* XXX
                    json.data.relationships[assocModelIdentifier] = uniqBy(
                        json.data.relationships[assocModelIdentifier].concat(Ember.linkAssociations(assocModel, record[association.alias])),
                        assocPK
                    );
                    // reduce association on primary record to an array of IDs
                    
                    record[association.alias] = reduce(
                        record[association.alias],
                        (filtered, rec) => {
                            filtered.push(rec[assocPK]);
                            return filtered;
                        },
                        []
                    );
                    */
        }

        //through relations not in link mode are now covered by populate instead of index associations,
        //so they are processed in the if statement above ^
        if (!through && association.include === 'index' && associatedRecords[alias]) {
          record[alias] = reduce(
            associatedRecords[alias],
            (filtered, rec) => {
              if (rec[via] === record[primaryKey]) {
                filtered.push(rec[assocPK]);
              }
              return filtered;
            },
            []
          );
        }

        //@todo if association.include startsWith index: ... fill contents from selected column of join table
        if (association.include === 'link') {
          links[alias] = linkPrefix + '/' + modelPlural.toLowerCase() + '/' + record[model.primaryKey] + '/' + alias; //"/" + sails.config.blueprints.prefix
          delete record[alias];
        }
        //record[association.alias] = map(record[association.alias], 'id');

        // Side-load any requested relationships
        const assocAssociations = actionUtil.getAssociationConfiguration(assocModel, 'detail');
        const serializedResources = record[alias].map(r => {
          return Ember.serializeResource(r, assocType, assocAssociations);
        });
        const linkedRecords = Ember.linkAssociations(assocModel, serializedResources);
        if (include && alias === include) {
          included = uniqBy(included.concat(linkedRecords), assocPK);
        }
      }

      if (association.include === 'record' && type === 'model' && record[alias]) {
        assocModel = sails.models[model];
        assocPK = assocModel.primaryKey;
        assocType = pluralize(assocModel.globalId.toLowerCase());

        // Side-load any requested relationships
        const serializedResource = Ember.serializeResource(record[alias], assocType);
        const linkedRecords = Ember.linkAssociations(assocModel, serializedResource);
        if (include && alias === include) {
          included = uniqBy(included.concat(linkedRecords), assocPK);
        }

        /*
                // while it's possible, we should not really do this, it is more efficient to return a single model in a 1 to 1 relationship
                if (association.include === "link")
                {
                    links[ association.alias ] = sails.config.blueprints.prefix + "/" + modelPlural.toLowerCase() + "/" + record.id + "/" + association.alias;
                    delete record[ association.alias ];
                }
                */
      }
    });
    // Cleanup the relationships
    if (json.data.relationships && json.data.relationships.length > 0) {
      json.data.relationships = json.data.relationships.map(relationship => pick(relationship, ['id', 'type']));
    }

    if (included.length > 0) {
      json.included = included;
    }
  },

  /**
   * Serialize an individual resource json hash into its JSON:API equivalent
   *
   * @param {Object} json A record hash
   * @param {string} The type of resource being serialized
   * @return {Object} A JSON:API resource
   */
  // XXX serializeResource(json, type, associations = [], linkSuffix = '') {
  serializeResource(json, type, meta) {

    /*
    const { id } = json;
    const attributes = Object.keys(omit(json, ['id'])).reduce(
      (acc, key) => Object.assign({}, acc, { [kebabCase(key)]: json[key] }),
      {}
    );
    const links = {
      self: Ember.generateResourceLink(type.toLowerCase(), linkSuffix)
    };
    const relationships = associations.reduce((acc, assoc) => {
      const { alias } = assoc;
      return Object.assign({}, acc, {
        [alias]: {
          links: {
            related: `${links.self}/${alias}`,
            self: `${links.self}/relationships/${alias}`
          },
          data: Array.isArray(json[alias])
            ? json[alias].map(item => ({ type: kebabCase(alias), id: item.id }))
            : { type: kebabCase(alias), id }
        }
      });
    }, {});

    // Remove relationships from attributes
    associations.forEach(assoc => {
      delete attributes[assoc.alias];
    });
    */

    return JSONAPISerializer.serialize(kebabCase(type), json, meta);
    // return { id: String(id), type: kebabCase(type), attributes, links, relationships };
  },

  /**
   * Create an individual link for a resource
   *
   * @param {string} modelPlural The resource's (model) name pluralized
   * @param {string} linkSuffix Additional content to append to the resource's path (e.g. an alias to a relationship)
   * @return {string} The returned URL will be a fully qualified path to a resource or collection of resources
   */
  generateResourceLink(modelPlural, linkSuffix = '') {
    const isSsl = (sails.config.ssl && sails.config.ssl.key && sails.config.ssl.cert) || sails.config.proxyHostSsl;
    const protocol = isSsl ? 'https' : 'http';
    const host = sails.config.explicitHost || sails.config.proxyHost || 'localhost';
    const port = sails.config.port || (isSsl ? 443 : 80);
    const linkPrefix = sails.config.blueprints.linkPrefix ? sails.config.blueprints.linkPrefix : '';

    return `${protocol}://${host}:${port}/${linkPrefix ? '/' + linkPrefix : ''}${modelPlural}${
      linkSuffix ? '/' + linkSuffix : ''
    }`;
  },

  /**
   * Prepare records and populated associations to be consumed by Ember's DS.RESTAdapter in link mode
   *
   * @param {Collection} model Waterline collection object (returned from parseModel)
   * @param {Array|Object} records A record or an array of records returned from a Waterline query
   * @return {Array} The returned structure can be consumed by DS.JSONAPIAdapter when passed to res.json()
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
          links[assoc.alias] = linkPrefix + '/' + modelPlural + '/' + record[model.primaryKey] + '/' + assoc.alias;
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
    Object.keys(json).forEach(key => {
      let array = json[key];
      if (key === documentIdentifier) {
        return;
      }
      if (array.length === 0) {
        delete json[key];
        return;
      }
      let model = sails.models[pluralize(camelCase(key).toLowerCase(), 1)];
      Ember.linkAssociations(model, array);
    });

    return json;
  },

  /**
   * Prepare records and populated associations to be consumed by Ember's DS.JSONAPIAdapter
   *
   * @param {Collection} model Waterline collection object (returned from parseModel)
   * @param {Array|Object} records A record or an array of records returned from a Waterline query
   * @param {Associations} associations Definition of the associations, from `req.option.associations`
   * @return {Object} The returned structure can be consumed by DS.JSONAPIAdapter when passed to res.json()
   */
  // XXX buildResponse(model, records, associations, associatedRecords, include) {
  buildResponse(model, records, meta) {
    const primaryKey = model.primaryKey;
    const emberModelIdentity = model.globalId;
    const modelPlural = pluralize(emberModelIdentity);
    /* XXX
    const documentIdentifier = camelCase(modelPlural);
    const isCollection = Array.isArray(records);
    const toJSON = model.customToJSON
      ? model.customToJSON
      : function() {
          return this;
        };

    const json = { data };

    if (isCollection) {
      records.forEach(record =>
        Ember.prepareResourceAssociations(record, associations, primaryKey, json, toJSON, associatedRecords, include)
      );
    } else {
      Ember.prepareResourceAssociations(records, associations, primaryKey, json, toJSON, associatedRecords, include);
    }
    // json = Ember.finalizeSideloads(json, documentIdentifier);

    return json;
    */
    return Ember.serializeResource(records, modelPlural, meta);
  },

  /**
   * Build a 'Not Found' response body to be consumed by Ember's DS.JSONAPIAdapter
   *
   * @param {Collection} model Waterline collection object (returned from parseModel)
   * @return {Object} The returned structure can be consumed by DS.JSONAPIAdapter when passed to res.json()
   */
  buildNotFoundResponse(model) {
    const title = 'Not Found';
    const detail = `No record found with the specified ${model.primaryKey}`;

    return {
      errors: [{ status: '404', title, detail }]
    };
  }
};
