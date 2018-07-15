const { kebabCase } = require('lodash');

module.exports = {
  friendlyName: 'Build JSON API response',
  description: 'Simple interface to provide preprocessing before returning a finalized JSON API document',
  sync: true,

  inputs: {
    meta: {
      type: 'ref',
      description: 'Object to pass as metadata in the JSON API response',
      example: { count: 42 }
    },
    model: {
      type: 'ref',
      description: 'Waterline collection object (returned from parseModel)',
      required: true
    },
    records: {
      type: 'ref',
      description: 'A record or an array of records returned from a Waterline query',
      required: true
    }
  },

  exits: {},

  fn: function({ meta, model, records }, exits) {
    const modelIdentity = model.globalId;
    return exits.success(JSONAPISerializer.serialize(kebabCase(modelIdentity), records, meta));
  }
};
