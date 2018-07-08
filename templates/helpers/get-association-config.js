module.exports = {
  friendlyName: 'Get association config',
  description:
    "Extend the model's `associations` property with the presentation configuration (taken from the Model's attributes `meta` option or from Sails configuration)",
  sync: true,

  inputs: {
    include: {
      type: 'ref',
      description: 'A comma-separated (U+002C COMMA, “,”) list of relationship paths',
      defaultsTo: []
    },
    model: {
      type: 'ref',
      description: 'A Waterline collection',
      required: true
    }
  },

  exits: {
    success: {
      outputFriendlyName: 'Association config',
      outputType: 'ref'
    }
  },

  fn: function({ model, include }, exits) {
    const associations = model.associations;
    const attributes = model.attributes;
    const decoratedAssocs = associations.map(assoc => {
      const attrMeta = attributes[assoc.alias].meta ? attributes[assoc.alias].meta : {};
      const dAssoc = Object.assign({}, assoc, attrMeta);

      dAssoc.include = include.includes(dAssoc.alias) ? 'record' : 'link';
      if (attributes[dAssoc.alias].through) {
        dAssoc.through = attributes[dAssoc.alias].through;
      }

      return dAssoc;
    });

    return exits.success(decoratedAssocs);
  }
};
