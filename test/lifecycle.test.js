require('babel-register')({
  presets: ['es2015'],
  plugins: ['add-module-exports']
});
const loadFixtures = require('./helpers/loadFixtures');
const sails = require('sails');
const { expect } = require('chai');
global.expect = expect;
process.env.NODE_ENV = 'test';

// Before running any tests...
before(function(done) {
  // Increase the Mocha timeout so that Sails has enough time to lift, even if you have a bunch of assets.
  this.timeout(10000);

  sails.lift(
    {
      hooks: {
        grunt: false,
        'sails-json-api': require('../index')
      },
      log: { level: 'warn' },
      policies: {
        'dummy/hello': ['jsonApiValidateHeaders']
      },
      routes: {
        'GET /dummy': {
          controller: 'DummyController',
          action: 'hello'
        }
      }
    },
    err => {
      if (err) {
        return done(err);
      }

      // here you can load fixtures, etc.
      // (for example, you might want to create some records in the database)
      return loadFixtures(sails, done);
    }
  );
});

// After all tests have finished...
after(function(done) {
  // here you can clear fixtures, etc.
  // (e.g. you might want to destroy the records you created above)

  sails.lower(done);
});
