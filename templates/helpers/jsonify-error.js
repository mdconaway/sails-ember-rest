module.exports = {
  friendlyName: 'JSONify error',
  description: 'Turn an individual Sails error object into a JSON API styled error object',
  sync: true,

  inputs: {
    err: {
      type: 'ref',
      description: 'An individual error object to JSONify',
      required: true
    },
    title: {
      type: 'string',
      defaultsTo: 'Error'
    }
  },

  exits: {},

  fn: function ({ err, title }, exits) {
    const detail = err.details || err.message || 'An error ocurred';

    // All done.
    return exits.success({
      errors: [{ title, detail }]
    });
  }
};

