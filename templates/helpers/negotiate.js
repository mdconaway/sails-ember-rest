module.exports = {
  friendlyName: 'Negotiate',
  description: 'Negotiate the proper way to handle an error in an action',
  sync: true,

  inputs: {
    res: {
      type: 'ref',
      description: 'A Sails response object',
      required: true
    },
    err: {
      type: 'ref',
      description: 'An error object to negotiate',
      defaultTo: {}
    }
  },

  exits: {},

  fn: function({ res, err }, exits) {
    let errResp;
    let title = 'Server Error';

    if (err.name === 'AdapterError') {
      if (err.code === 'E_UNIQUE') {
        title = 'Uniqueness Constraint Upheld';
        errResp = res.unprocessableEntity;
      }
      errResp = res.serverError;
    } else if (err.name === 'UsageError') {
      title = 'Validation Error';
      errResp = res.unprocessableEntity;
    } else {
      errorObj.errors.push({
        title: 'Server Error',
        detail: err.details
      });
      errResp = res.serverError;
    }

    // Return the correct error type with the populated body
    return exits.success(errResp(sails.helpers.jsonifyError.with({ err, title })));
  }
};
