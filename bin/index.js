/**
 * Module dependencies
 */

var sailsgen = require( 'sails-generate' ),
  path = require( 'path' );

//
// This script exists so we can run our generator
// directly from the command-line for convenience
// during development.
//

var args = Array.prototype.slice.call(process.argv, 2);
var scope = {
  generatorType: 'ember-rest',
  rootPath: process.cwd(),
  modules: {
    'ember-rest': path.resolve( __dirname, '../' )
  },
  args: args
};

sailsgen( scope, function ( err ) {
  if ( err ) {
    throw err;
  }

  // It worked.
  console.log( 'Done.' );
} );
