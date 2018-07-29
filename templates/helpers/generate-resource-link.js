module.exports = {
  friendlyName: 'Generate resource link',
  description: 'Create an individual link for a resource',
  sync: true,

  inputs: {
    modelPlural: {
      type: 'string',
      description: "The resource's (model) name pluralized",
      required: true
    },
    linkSuffix: {
      type: 'string',
      description: "Additional content to append to the resource's path (e.g. an alias to a relationship)",
      defaultsTo: ''
    }
  },

  exits: {},

  fn: function({ modelPlural, linkSuffix }, exits) {
    const isSsl = (sails.config.ssl && sails.config.ssl.key && sails.config.ssl.cert) || sails.config.proxyHostSsl;
    const protocol = isSsl ? 'https' : 'http';
    const host = sails.config.explicitHost || sails.config.proxyHost || 'localhost';
    const port = sails.config.port || (isSsl ? 443 : 80);
    const linkPrefix = sails.config.blueprints.linkPrefix ? sails.config.blueprints.linkPrefix : '';

    return exits.success(
      `${protocol}://${host}:${port}${linkPrefix || ''}/${modelPlural}${linkSuffix ? '/' + linkSuffix : ''}`
    );
  }
};
