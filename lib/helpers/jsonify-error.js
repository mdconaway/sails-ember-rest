module.exports = {
  friendlyName: 'JSONify error',
  description: 'Turn an individual Sails error object into a JSON API styled error object',
  sync: true,

  inputs: {
    err: {
      type: 'ref',
      description: 'An array of error objects or an individual error object to JSONify',
      required: true
    },
    status: {
      type: 'string'
    },
    title: {
      type: 'string',
      defaultsTo: 'Error'
    }
  },

  exits: {},

  fn: function({ err, status, title }, exits) {
    let errors;

    if (Array.isArray(err)) {
      errors = err.map(e => ({
        detail: e.details || e.message || 'An error ocurred',
        title
      }));
    } else {
      errors = [
        Object.assign({ detail: err.details || err.message || 'An error ocurred', title }, status ? { status } : {})
      ];
    }

    // All done.
    return exits.success({ errors });
  }
};
