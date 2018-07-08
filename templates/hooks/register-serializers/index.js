/**
 * register-serializers hook
 *
 * @description :: Extend the sails object with a global serializer with all registered models
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

module.exports = function defineRegisterSerializersHook(sails) {

  return {

    /**
     * Runs when a Sails app loads/lifts.
     *
     * @param {Function} done
     */
    initialize: function (done) {

      sails.log.info('Initializing custom hook (`register-serializers`)');

      sails.on('hook:orm:loaded', function() {
        Object.keys(sails.models).forEach((modelName) => {
          const Model = sails.models[modelName];
          const modelType = kebabCase(Model.globalId);
          const modelPlural = pluralize(modelType);
          const relationships = Model.associations
            .reduce((acc, { alias, collection, model, type }) => {
              return Object.assign({}, acc, {
                [alias]: {
                  type: kebabCase(type === 'model' ? model : collection),
                  links(data) {
                    const base = sails.helpers.generateResourceLink(modelPlural, data.id);
                    return {
                      related: `${base}/${alias}`,
                      self: `${base}/${alias}`
                    }
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
              }
            }
          });
        });

      });

      return done();
    }

  };

};
