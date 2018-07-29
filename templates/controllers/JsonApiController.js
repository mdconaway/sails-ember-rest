/**
 * JsonApiController
 *
 * @description :: Server-side logic for a generic crud controller that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const defaultInterrupt = require('./../interrupts/defaultInterrupt');

function baseController(interrupts) {
  const actions = sails.getActions();
  const create = actions['sailsjsonapi/create'];
  const destroy = actions['sailsjsonapi/destroy'];
  const find = actions['sailsjsonapi/find'];
  const findone = actions['sailsjsonapi/findone'];
  const hydrate = actions['sailsjsonapi/hydrate'];
  const populate = actions['sailsjsonapi/populate'];
  const update = actions['sailsjsonapi/update'];

  return {
    create: create(interrupts),
    destroy: destroy(interrupts),
    find: find(interrupts),
    findone: findone(interrupts),
    hydrate: hydrate(interrupts),
    populate: populate(interrupts),
    update: update(interrupts)
  };
}

module.exports = function(instanceOverrides = {}) {
  const interrupts = {
    create: defaultInterrupt,
    destroy: defaultInterrupt,
    find: defaultInterrupt,
    findone: defaultInterrupt,
    hydrate: defaultInterrupt,
    populate: defaultInterrupt,
    beforeUpdate: defaultInterrupt,
    afterUpdate: defaultInterrupt
  };
  const instance = Object.assign(new baseController(interrupts), instanceOverrides);
  Object.defineProperty(instance, 'setServiceInterrupt', {
    value: function(name, fn) {
      if (interrupts.hasOwnProperty(name) && typeof fn === 'function') {
        interrupts[name] = fn;
      }
      return this;
    },
    enumerable: false
  });
  Object.defineProperty(instance, 'getInterrupts', {
    value: () => interrupts,
    enumerable: false
  });
  return instance;
};
