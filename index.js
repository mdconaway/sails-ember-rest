/**
 * sails-json-api hook
 *
 * @description :: A hook definition.  Extends Sails by adding shadow routes, implicit actions, and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

const { isError, isFunction, kebabCase } = require('lodash');
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
      badRequestJsonApi: require('./templates/responses/badRequestJsonApi'),
      created: require('./templates/responses/created'),
      forbiddenJsonApi: require('./templates/responses/forbiddenJsonApi'),
      noContent: require('./templates/responses/noContent'),
      notAcceptable: require('./templates/responses/notAcceptable'),
      notFoundJsonApi: require('./templates/responses/notFoundJsonApi'),
      serverErrorJsonApi: require('./templates/responses/serverErrorJsonApi'),
      unprocessableEntity: require('./templates/responses/unprocessableEntity'),
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
          const associations = Model.associations.reduce((acc, { alias, collection, model, type }) => {
            // TODO: Implement 'self' link on relationship which allows direct manipulation
            return Object.assign({}, acc, {
              [alias]: {
                type: kebabCase(type === 'model' ? model : collection),
                links(data, { relationships = {} }) {
                  const dataId = `${data.id}`;
                  const base = sails.helpers.generateResourceLink(modelPlural, dataId);
                  const countObj = relationships && relationships.count ? relationships.count : {};
                  const count = countObj[alias] && countObj[alias][dataId] ? countObj[alias][dataId] : 0;
                  return {
                    related: {
                      href: `${base}/${alias}`,
                      meta: {
                        count
                      }
                    }
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
            relationships: associations,
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
        jsonifyError: require('./templates/helpers/jsonify-error'),
        linkAssociations: require('./templates/helpers/link-associations'),
        negotiate: require('./templates/helpers/negotiate')
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

      // Add middleware for handling unmatched urls
      sails.config.http.middleware.order.push('handleUnknownAssociation');
      sails.config.http.middleware.handleUnknownAssociation = function(req, res, next) {
        return req.path.match(/\/[A-Za-z]+\/[0-9]+\/[A-Za-z]+/)
          ? res.status(400).send({ errors: [{ title: 'Bad Request', detail: 'Unable to identify relationship' }]})
          : next();
      };

      // Once the Response hook has loaded, create new JSON API responses and decorate the built-in responses
      sails.on('hook:responses:loaded', () => {
        // Wrap default responses with the ability to return a JSON API response depending on Content-Type
        const _badRequest = sails.hooks.responses.middleware.badRequest;
        const _forbidden = sails.hooks.responses.middleware.forbidden;
        const _notFound = sails.hooks.responses.middleware.notFound;
        const _serverError = sails.hooks.responses.middleware.serverError;

        sails.hooks.responses.middleware.badRequest = function(optionalData, options) {
          return this.res.get('Content-Type') === 'application/vnd.api+json'
            ? sails.hooks.responses.middleware.badRequestJsonApi.call(this, optionalData)
            : _badRequest.call(this, optionalData, options);
        }
        sails.hooks.responses.middleware.forbidden = function(optionalData, options) {
          return this.res.get('Content-Type') === 'application/vnd.api+json'
            ? sails.hooks.responses.middleware.forbiddenJsonApi.call(this, optionalData)
            : _forbidden.call(this, optionalData, options);
        }
        sails.hooks.responses.middleware.notFound = function(optionalData, options) {
          return this.res.get('Content-Type') === 'application/vnd.api+json'
            ? sails.hooks.responses.middleware.notFoundJsonApi.call(this, optionalData)
            : _notFound.call(this, optionalData, options);
        }
        sails.hooks.responses.middleware.serverError = function(optionalData, options) {
          return this.res.get('Content-Type') === 'application/vnd.api+json'
            ? sails.hooks.responses.middleware.serverErrorJsonApi.call(this, optionalData)
            : _serverError.call(this, optionalData, options);
        }

       // Add custom responses without overwriting user supplied
       // TODO: Adding custom responses here could be dangerous in future versions, look for a more universal path
       sails.hooks.responses.middleware.badRequestJsonApi = sails.hooks.responses.middleware.badRequestJsonApi || this.responses.badRequestJsonApi;
       sails.hooks.responses.middleware.created = sails.hooks.responses.middleware.created || this.responses.created;
       sails.hooks.responses.middleware.forbiddenJsonApi = sails.hooks.responses.middleware.forbiddenJsonApi || this.responses.forbiddenJsonApi;
       sails.hooks.responses.middleware.noContent = sails.hooks.responses.middleware.noContent || this.responses.noContent;
       sails.hooks.responses.middleware.notAcceptable = sails.hooks.responses.middleware.notAcceptable || this.responses.notAcceptable;
       sails.hooks.responses.middleware.notFoundJsonApi = sails.hooks.responses.middleware.notFoundJsonApi || this.responses.notFoundJsonApi;
       sails.hooks.responses.middleware.serverErrorJsonApi = sails.hooks.responses.middleware.serverErrorJsonApi || this.responses.serverErrorJsonApi;
       sails.hooks.responses.middleware.unprocessableEntity = sails.hooks.responses.middleware.unprocessableEntity || this.responses.unprocessableEntity;
       sails.hooks.responses.middleware.unsupportedMediaType = sails.hooks.responses.middleware.unsupportedMediaType || this.responses.unsupportedMediaType;
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
