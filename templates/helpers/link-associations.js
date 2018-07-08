const pluralize = require('pluralize');

module.exports = {
  friendlyName: 'Link associations',
  description: 'Prepare records and populated associations to be consumed by a JSON API compatible client',
  sync: true,

  inputs: {
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

  fn: function ({ model, records }, exits) {
    const modelPlural = pluralize(model.identity);
    records = Array.isArray(records) ? records : [records];

    const linkedRecords = records.map(record => {
      let links = {};
      model.associations.forEach(assoc => {
        if (assoc.type === 'collection') {
          links[assoc.alias] = sails.helpers.generateResourceLink.with({ modelPlural, linkSuffix: `${record[model.primaryKey]}/${assoc.alias}` });
        }
      });
      if (Object.keys(links).length > 0) {
        record.links = links;
      }
      return record;
    });

    return exits.success(linkedRecords);
  }
};

