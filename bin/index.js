/**
 * Module dependencies
 */

const sailsgen = require('sails-generate');
const path = require('path');

//
// This script exists so we can run our generator
// directly from the command-line for convenience
// during development.
//

const args = Array.prototype.slice.call(process.argv, 2);
const scope = {
    generatorType: 'ember-rest',
    rootPath: process.cwd(),
    modules: {
        'ember-rest': path.resolve(__dirname, '../')
    },
    args
};

sailsgen(scope, err => {
    if (err) {
        throw err;
    }

    // It worked.
    console.log('Done.');
});
