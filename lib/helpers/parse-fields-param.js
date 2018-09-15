const pluralize = require('pluralize');

module.exports = {
  friendlyName: 'Parse fields param',
  description: "Parse the JSON API specialty query param 'fields' used for sparse fieldsets",
  sync: true,

  inputs: {
    req: {
      type: 'ref',
      description: 'A Sails request object',
      required: true
    },
    model: {
      type: 'ref',
      description: 'A Waterline Collection to derive configuration from',
      required: true
    },
    toInclude: {
      type: 'ref',
      description: '',
      defaultsTo: []
    }
  },

  exits: {
    UNSUPPORTED_INCLUDE: {
      description: 'A value for the include query param does not align to a related entity'
    }
  },

  fn: function({ model, req, toInclude }, exits) {
    const fields = req.param('fields');
    let project = {};

    if (typeof fields === 'object' && !Array.isArray(fields)) {
      project = Object.keys(fields).reduce((acc, field) => {
        return field === pluralize(model.identity) || toInclude.includes(field)
          ? Object.assign({}, acc, { [field]: { select: fields[field].split(',').filter(field => field.length > 0) } })
          : acc;
      }, {});
    }

    return exits.success(project);
  }
};
