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
          const type = pluralize(kebabCase(Model.globalId));
          const relationships = Model.associations
            .reduce((acc, { alias, type }) => {
              return Object.assign({}, acc, {
                [alias]: {
                  type: kebabCase(type === 'model' ? pluralize(alias) : alias),
                  links(data) {
                    const base = Ember.generateResourceLink(type, data.id);
                    return {
                      related: `${base}/${alias}`,
                      self: `${base}/relationships/${alias}`
                    }
                  }
                }
              });
            }, {});

          JSONAPISerializer.register(type, {
            links: {
              self(data) {
                return Ember.generateResourceLink(type, data.id);
              }
            },
            relationships,
            topLevelMeta({ total }) {
              return total ? { total } : {};
            },
            topLevelLinks(data, extraData) {
              return {
                self: Array.isArray(data)
                  ? Ember.generateResourceLink(type) 
                  : Ember.generateResourceLink(type, data.id) 
              }
            }
          });
        });

      });

      return done();
    }

  };

};
