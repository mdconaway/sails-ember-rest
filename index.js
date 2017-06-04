/**
 * Module dependencies
 */

const fs = require('fs');
const util = require('util');
const _ = require('lodash');
const acceptedCommands = ['controller', 'responses', 'policies'];
_.defaults = require('merge-defaults');
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
        'Issue encountered in generator "ember-rest":\n' +
        'Missing required scope variable: `%s`"\n' +
        'If you are the author of `sails-ember-rest`, please resolve this ' +
        'issue and publish a new patch release.';

    message = (message || DEFAULT_MESSAGE) + (details ? '\n' + details : '');
    message = util.inspect(message, varname);

    return new Error(message);
}
/**
 * sails-generate-ember-rest
 *
 * Usage:
 * `sails generate ember-rest`
 *
 * @description Generates an ember-rest entity
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
            return cb(new Error('Please provide a type for ember-rest to generate.'));
        } else if (acceptedCommands.indexOf(scope.args[0]) === -1) {
            return cb(new Error('Please enter a valid command. Supported commands: ' + acceptedCommands.join()));
        }
        scope.generatorName = scope.args[0];

        if (!scope.rootPath) {
            return cb(INVALID_SCOPE_VARIABLE('rootPath'));
        }

        _.defaults(scope, {
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
                // check for previous installation
                if (!scope.force && fs.existsSync(scope.rootPath + '/api/services/Ember.js')) {
                    console.info('Ember service detected, not overwriting. To overwrite use --force.');
                } else {
                    if (!fs.existsSync(scope.rootPath + '/api/services')) {
                        fs.mkdirSync(scope.rootPath + '/api/services');
                    }
                    fs.writeFileSync(
                        scope.rootPath + '/api/services/Ember.js',
                        "const SailsEmber = require('sails-ember-rest');\nmodule.exports = SailsEmber.service;\n"
                    );
                }
                if (!scope.force && fs.existsSync(scope.rootPath + '/api/responses/created.js')) {
                    console.info('Create response detected, not overwriting. To overwrite use --force.');
                } else {
                    if (!fs.existsSync(scope.rootPath + '/api/responses')) {
                        fs.mkdirSync(scope.rootPath + '/api/responses');
                    }
                    fs.writeFileSync(
                        scope.rootPath + '/api/responses/created.js',
                        "const SailsEmber = require('sails-ember-rest');\nmodule.exports = SailsEmber.responses.created;\n"
                    );
                }
                if (scope.generatorName === 'controller') {
                    if (!scope.force && fs.existsSync(scope.rootPath + '/api/controllers/' + scope.filename + '.js')) {
                        return cb(
                            new Error(
                                'Ember controller detected at specified path, not overwriting. To overwrite use --force.'
                            )
                        );
                    } else {
                        if (!fs.existsSync(scope.rootPath + '/api/controllers')) {
                            fs.mkdirSync(scope.rootPath + '/api/controllers');
                        }
                        fs.writeFileSync(
                            scope.rootPath + '/api/controllers/' + scope.filename + '.js',
                            "const SailsEmber = require('sails-ember-rest');\nmodule.exports = new SailsEmber.controller();\n"
                        );
                        console.info(
                            'Created controller: ' + scope.rootPath + '/api/controllers/' + scope.filename + '.js'
                        );
                    }
                } else if (scope.generatorName === 'responses') {
                    if (!scope.force && fs.existsSync(scope.rootPath + '/api/responses/created.js')) {
                        console.info('Create response detected, not overwriting. To overwrite use --force.');
                    } else {
                        if (!fs.existsSync(scope.rootPath + '/api/responses')) {
                            fs.mkdirSync(scope.rootPath + '/api/responses');
                        }
                        fs.writeFileSync(
                            scope.rootPath + '/api/responses/created.js',
                            "const SailsEmber = require('sails-ember-rest');\nmodule.exports = SailsEmber.responses.created;\n"
                        );
                    }
                } else {
                    if (!fs.existsSync(scope.rootPath + '/api/policies')) {
                        fs.mkdirSync(scope.rootPath + '/api/policies');
                    }
                    [
                        'Create',
                        'Destroy',
                        'Find',
                        'FindOne',
                        'Hydrate',
                        'Populate',
                        'SetHeader',
                        'Update'
                    ].forEach(function(file) {
                        if (!scope.force && fs.existsSync(scope.rootPath + '/api/policies/ember' + file + '.js')) {
                            console.info('Policy ember' + file + ' detected, skipping. To overwrite use --force.');
                        } else {
                            fs.writeFileSync(
                                scope.rootPath + '/api/policies/ember' + file + '.js',
                                "const SailsEmber = require('sails-ember-rest');\nmodule.exports = new SailsEmber.policies.ember" +
                                    file +
                                    '();\n'
                            );
                            console.info(
                                'Created policy: ' + scope.rootPath + '/api/controllers/policies/ember' + file + '.js'
                            );
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

module.exports.controller = require('./templates/controllers/EmberController');
module.exports.service = require('./templates/services/Ember');
module.exports.policies = {
    emberCreate: require('./templates/policies/emberCreate'),
    emberDestroy: require('./templates/policies/emberDestroy'),
    emberFind: require('./templates/policies/emberFind'),
    emberFindOne: require('./templates/policies/emberFindOne'),
    emberHydrate: require('./templates/policies/emberHydrate'),
    emberPopulate: require('./templates/policies/emberPopulate'),
    emberSetHeader: require('./templates/policies/emberSetHeader'),
    emberUpdate: require('./templates/policies/emberUpdate')
};
module.exports.responses = {
    created: require('./templates/responses/created')
};
module.exports.util = require('./templates/util/actionUtil');
