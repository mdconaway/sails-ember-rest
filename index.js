/**
 * Module dependencies
 */

const fs = require('fs');
const util = require('util');
const acceptedCommands = ['controller', 'responses', 'policies'];
const defaults = require('merge-defaults');

/**
 * INVALID_SCOPE_VARIABLE()
 *
 * Helper method to put together a nice error about a missing or invalid
 * scope variable. We should always validate any required scope variables
 * to avoid inadvertently smashing someone's filesystem.
 *
 * @param {String} varname [the name of the missing/invalid scope variable]
 * @param {String} details [optional - additional details to display on the console]
 * @param {String} message [optional - override for the default message]
 * @return {Error}
 * @api private
 */

function INVALID_SCOPE_VARIABLE(varname, details, message) {
  let DEFAULT_MESSAGE =
    'Issue encountered in generator "jsonapi":\n' +
    'Missing required scope variable: `%s`"\n' +
    'If you are the author of `sails-json-api`, please resolve this ' +
    'issue and publish a new patch release.';

  message = (message || DEFAULT_MESSAGE) + (details ? '\n' + details : '');
  message = util.inspect(message, varname);

  return new Error(message);
}
/**
 * sails-json-api
 *
 * Usage:
 * `sails generate jsonapi`
 *
 * @description Generates an jsonapi entity
 * @help See http://links.sailsjs.org/docs/generators
 */

module.exports = {
  /**
   * `before()` is run before executing any of the `targets`
   * defined below.
   *
   * This is where we can validate user input, configure default
   * scope variables, get extra dependencies, and so on.
   *
   * @param  {Object} scope
   * @param  {Function} cb    [callback]
   */

  before(scope, cb) {
    if (!scope.args[0]) {
      return cb(new Error('Please provide a type for jsonapi to generate.'));
    } else if (acceptedCommands.indexOf(scope.args[0]) === -1) {
      return cb(new Error('Please enter a valid command. Supported commands: ' + acceptedCommands.join()));
    }
    scope.generatorName = scope.args[0];

    if (!scope.rootPath) {
      return cb(INVALID_SCOPE_VARIABLE('rootPath'));
    }

    defaults(scope, {
      createdAt: new Date()
    });

    if (scope.args[0] === 'controller') {
      if (typeof scope.args[1] === 'string' && scope.args[1].trim().length > 0) {
        scope.filename = scope.args[1].trim().replace(/(^| )(\w)/g, x => x.toUpperCase()) + 'Controller';
      } else {
        return cb(new Error('Please enter a valid name for your new controller'));
      }
    } else {
      scope.filename = scope.args[0];
    }

    cb();
  },

  /**
   * The files/folders to generate.
   * @type {Object}
   */
  targets: {
    './': {
      exec: function(scope, cb) {
        if (!fs.existsSync(scope.rootPath + '/api')) {
          fs.mkdirSync(scope.rootPath + '/api');
        }
        if (!scope.force && fs.existsSync(scope.rootPath + '/api/responses/created.js')) {
          console.info('Create response detected, not overwriting. To overwrite use --force.');
        } else {
          if (!fs.existsSync(scope.rootPath + '/api/responses')) {
            fs.mkdirSync(scope.rootPath + '/api/responses');
          }
          fs.writeFileSync(
            scope.rootPath + '/api/responses/created.js',
            "const SailsEmber = require('sails-json-api');\nmodule.exports = SailsEmber.responses.created;\n"
          );
        }
        if (scope.generatorName === 'controller' || scope.generatorName === 'policies') {
          // check for previous installation
          if (!scope.force && fs.existsSync(scope.rootPath + '/api/services/Ember.js')) {
            console.info('Ember service detected, not overwriting. To overwrite use --force.');
          } else {
            if (!fs.existsSync(scope.rootPath + '/api/services')) {
              fs.mkdirSync(scope.rootPath + '/api/services');
            }
            fs.writeFileSync(
              scope.rootPath + '/api/services/Ember.js',
              "const SailsEmber = require('sails-json-api');\nmodule.exports = SailsEmber.service;\n"
            );
          }
        }
        if (scope.generatorName === 'controller') {
          if (!scope.force && fs.existsSync(scope.rootPath + '/api/controllers/' + scope.filename + '.js')) {
            return cb(
              new Error('Ember controller detected at specified path, not overwriting. To overwrite use --force.')
            );
          } else {
            if (!fs.existsSync(scope.rootPath + '/api/controllers')) {
              fs.mkdirSync(scope.rootPath + '/api/controllers');
            }
            fs.writeFileSync(
              scope.rootPath + '/api/controllers/' + scope.filename + '.js',
              "const SailsEmber = require('sails-json-api');\nconst controller = new SailsEmber.controller({\n});\n\nmodule.exports = controller;\n"
            );
            console.info('Created controller: ' + scope.rootPath + '/api/controllers/' + scope.filename + '.js');
          }
        } else {
          if (!fs.existsSync(scope.rootPath + '/api/policies')) {
            fs.mkdirSync(scope.rootPath + '/api/policies');
          }
          ['Create', 'Destroy', 'Find', 'FindOne', 'Hydrate', 'Populate', 'SetHeader', 'Update'].forEach(function(
            file
          ) {
            if (!scope.force && fs.existsSync(scope.rootPath + '/api/policies/jsonApi' + file + '.js')) {
              console.info('Policy jsonApi' + file + ' detected, skipping. To overwrite use --force.');
            } else {
              fs.writeFileSync(
                scope.rootPath + '/api/policies/jsonApi' + file + '.js',
                "const SailsEmber = require('sails-json-api');\nmodule.exports = new SailsEmber.policies.jsonApi" +
                  file +
                  '();\n'
              );
              console.info('Created policy: ' + scope.rootPath + '/api/policies/jsonApi' + file + '.js');
            }
          });
        }
        cb();
      }
    }
  },

  /**
   * The absolute path to the `templates` for this generator
   * (for use with the `template` helper)
   *
   * @type {String}
   */
  templatesDirectory: require('path').resolve(__dirname, './templates')
};

module.exports.Actions = module.exports.actions = {
  create: require('./templates/actions/create'),
  destroy: require('./templates/actions/destroy'),
  find: require('./templates/actions/find'),
  findone: require('./templates/actions/findone'),
  hydrate: require('./templates/actions/hydrate'),
  populate: require('./templates/actions/populate'),
  update: require('./templates/actions/update'),
  Create: require('./templates/actions/create'),
  Destroy: require('./templates/actions/destroy'),
  Find: require('./templates/actions/find'),
  FindOne: require('./templates/actions/findone'),
  Hydrate: require('./templates/actions/hydrate'),
  Populate: require('./templates/actions/populate'),
  Update: require('./templates/actions/update')
};
module.exports.Controller = module.exports.controller = require('./templates/controllers/JsonApiController');
module.exports.helpers = {
  buildJsonApiResponse: require('./templates/helpers/build-json-api-response'),
  countRelationship: require('./templates/helpers/count-relationship'),
  generateResourceLink: require('./templates/helpers/generate-resource-link'),
  linkAssociations: require('./templates/helpers/link-associations')
};
module.exports.Hooks = module.exports.hooks = {
  registerSerializers: require('./templates/hooks/register-serializers')
};
module.exports.Policies = module.exports.policies = {
  jsonApiCreate: require('./templates/policies/jsonApiCreate'),
  jsonApiDestroy: require('./templates/policies/jsonApiDestroy'),
  jsonApiFind: require('./templates/policies/jsonApiFind'),
  jsonApiFindOne: require('./templates/policies/jsonApiFindOne'),
  jsonApiHydrate: require('./templates/policies/jsonApiHydrate'),
  jsonApiPopulate: require('./templates/policies/jsonApiPopulate'),
  jsonApiSetHeader: require('./templates/policies/jsonApiSetHeader'),
  jsonApiUpdate: require('./templates/policies/jsonApiUpdate')
};
module.exports.Responses = module.exports.responses = {
  created: require('./templates/responses/created'),
  noContent: require('./templates/responses/noContent')
};
module.exports.Util = module.exports.util = require('./templates/util/actionUtil');
