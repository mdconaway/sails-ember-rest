const generateManyMap = require('./../util/manyMapGenerator');

let aliasMap = {};
let mapGen = false;

module.exports = {
  friendlyName: 'Count relationship',
  description: 'Generate a COUNT query to analyze a relationship for the populate action',
  sync: true,

  inputs: {
    association: {
      type: 'ref',
      description: 'Definition of the association',
      required: true
    },
    model: {
      type: 'ref',
      description: 'The parent model class to count a relationship FROM',
      required: true
    },
    pk: {
      type: 'ref',
      description: 'The pk value (string or integer) of the parent record to count a relationship FROM',
      required: true
    }
  },

  exits: {},

  fn: function ({ association, model, pk }, exits) {
    if (!mapGen) {
      aliasMap = generateManyMap(sails.models);
      mapGen = true;
    }

    if (aliasMap[model.identity] && aliasMap[model.identity][association.alias]) {
      return exits.success(aliasMap[model.identity][association.alias](pk));
    }

    // All done.
    return exits.success(function(done) {
      done(null, 0);
    });
  }
};
