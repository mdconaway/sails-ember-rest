/**
 * sails-json-api hook
 *
 * @description :: A hook definition.  Extends Sails by adding shadow routes, implicit actions, and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

const { kebabCase } = require('lodash');
const pluralize = require('pluralize');
const Serializer = require('json-api-serializer');

// Link the JSONAPISerializer to the global namespace
global.JSONAPISerializer = new Serializer({
  convertCase: 'kebab-case',
  unconvertCase: 'camelCase'
});

// Imported Actions
const create = require('./templates/actions/create');
const destroy = require('./templates/actions/destroy');
const find = require('./templates/actions/find');
const findone = require('./templates/actions/findone');
const hydrate = require('./templates/actions/hydrate');
const populate = require('./templates/actions/populate');
const update = require('./templates/actions/update');

module.exports = function defineSailsJsonApiHook(sails) {
  return {
    /**
     * Custom Controller
     */
    controller: require('./templates/controllers/JsonApiController'),

    /**
     * Custom Responses
     * There is not currently a binding into registering custom responses via a hook
     */
    responses: {
      created: require('./templates/responses/created'),
      noContent: require('./templates/responses/noContent'),
      notAcceptable: require('./templates/responses/notAcceptable'),
      unsupportedMediaType: require('./templates/responses/unsupportedMediaType')
    },

    /**
     * Runs when a Sails app loads/lifts.
     *
     * @param {Function} done
     */
    initialize(done) {
      sails.log.info('Initializing custom hook (`sails-json-api`)');

      // Once the ORM has loaded, dynamically register all models in the JSON API Serializer
      sails.on('hook:orm:loaded', function() {
        Object.keys(sails.models).forEach(modelName => {
          const Model = sails.models[modelName];
          const modelType = kebabCase(Model.globalId);
          const modelPlural = pluralize(modelType);
          const relationships = Model.associations.reduce((acc, { alias, collection, model, type }) => {
            return Object.assign({}, acc, {
              [alias]: {
                type: kebabCase(type === 'model' ? model : collection),
                links(data) {
                  const base = sails.helpers.generateResourceLink(modelPlural, data.id);
                  return {
                    related: `${base}/${alias}`,
                    self: `${base}/${alias}`
                  };
                }
              }
            });
          }, {});

          JSONAPISerializer.register(modelType, {
            links: {
              self(data) {
                return sails.helpers.generateResourceLink(modelPlural, data.id);
              }
            },
            relationships,
            topLevelMeta({ total }) {
              return typeof total !== 'undefined' ? { total } : {};
            },
            topLevelLinks(data, extraData) {
              return {
                self: Array.isArray(data)
                  ? sails.helpers.generateResourceLink(modelPlural)
                  : sails.helpers.generateResourceLink(modelPlural, data.id)
              };
            }
          });
        });
      });

      // Manually register JSON API actions
      return this.registerActions(done);
    },
    configure() {
      // Make helpers accessible via sails.helper.*
      sails.config.helpers.moduleDefinitions = Object.assign({}, sails.config.helpers.moduleDefinitions, {
        buildJsonApiResponse: require('./templates/helpers/build-json-api-response'),
        countRelationship: require('./templates/helpers/count-relationship'),
        generateResourceLink: require('./templates/helpers/generate-resource-link'),
        getAssociationConfig: require('./templates/helpers/get-association-config'),
        linkAssociations: require('./templates/helpers/link-associations')
      });

      // Make policies available to the policy configuration used by the policy hook
      // The policy map MUST be all lowercase as Sails' policy hook will make this assumption
      sails.config.policies.moduleDefinitions = Object.assign({}, sails.config.policies.moduleDefinitions, {
        jsonapicreate: require('./templates/policies/jsonApiCreate'),
        jsonapidestroy: require('./templates/policies/jsonApiDestroy'),
        jsonapifind: require('./templates/policies/jsonApiFind'),
        jsonapifindOne: require('./templates/policies/jsonApiFindOne'),
        jsonapihydrate: require('./templates/policies/jsonApiHydrate'),
        jsonapipopulate: require('./templates/policies/jsonApiPopulate'),
        jsonapisetheader: require('./templates/policies/jsonApiSetHeader'),
        jsonapiupdate: require('./templates/policies/jsonApiUpdate'),
        jsonapivalidateheaders: require('./templates/policies/jsonApiValidateHeaders')
      });
    },
    registerActions(done) {
      sails.registerAction(create, 'sailsJsonApi/create');
      sails.registerAction(destroy, 'sailsJsonApi/destroy');
      sails.registerAction(find, 'sailsJsonApi/find');
      sails.registerAction(findone, 'sailsJsonApi/findone');
      sails.registerAction(hydrate, 'sailsJsonApi/hydrate');
      sails.registerAction(populate, 'sailsJsonApi/populate');
      sails.registerAction(update, 'sailsJsonApi/update');

      return done();
    }
  };
};

// TODO: Move all actionUtil functions to their own helpers and register in hook
module.exports.util = require('./templates/util/actionUtil');
