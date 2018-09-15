const { find } = require('lodash');

module.exports = {
  friendlyName: 'Parse include param',
  description: "Parse the JSON API specialty query param 'include' and derive related associations and models",
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
    }
  },

  exits: {
    UNSUPPORTED_INCLUDE: {
      description: 'A value for the include query param does not align to a related entity'
    }
  },

  fn: function({ model, req }, exits) {
    const includeParam = req.param('include');
    const toInclude = includeParam ? includeParam.split(',') : [];
    const associations = sails.helpers.getAssociationConfig.with({ model, include: toInclude });
    const { includedModels, unsupported } = toInclude.reduce(
      (acc, alias) => {
        const assoc = find(associations, o => o.alias === alias);
        if (!assoc) {
          return Object.assign({}, acc, {
            unsupported: [].concat(acc.unsupported, alias)
          });
        }
        const relationIdentity = assoc.type === 'model' ? assoc.model : assoc.collection;

        return Object.assign({}, acc, {
          includedModels: [].concat(acc.includedModels, {
            alias: assoc.alias,
            model: req._sails.models[relationIdentity]
          })
        });
      },
      { unsupported: [], includedModels: [] }
    );
    // Handle unsupported inclusions
    if (unsupported.length > 0) {
      throw 'UNSUPPORTED_INCLUDE';
    }
    const includedAssociations = includedModels.map(m => sails.helpers.getAssociationConfig.with({ model: m.model }));

    return exits.success({ toInclude, associations, includedModels, includedAssociations });
  }
};
