/**
 * unprocessableEntity.js
 *
 * A custom response for handling invalid creation / modification of entities
 *
 * Example usage:
 * ```
 *     return res.unprocessableEntity();
 *     // -or-
 *     return res.unprocessableEntity(optionalData);
 * ```
 *
 * Or with actions2:
 * ```
 *     exits: {
 *       somethingHappened: {
 *         responseType: 'unprocessableEntity'
 *       }
 *     }
 * ```
 *
 * ```
 *     throw 'somethingHappened';
 *     // -or-
 *     throw { somethingHappened: optionalData }
 * ```
 */

module.exports = function unprocessableEntity(optionalData) {
  // Get access to `req` and `res`
  var req = this.req;
  var res = this.res;
  // Define the status code to send in the response.
  var statusCodeToSet = 411;

  // If no data was provided, use res.sendStatus().
  if (optionalData === undefined) {
    sails.log.info('Ran custom response: res.unprocessableEntity()');
    return res.status(statusCodeToSet).send({ errors: [{ title }] });
  }
  // Else if the provided data is an Error instance, if it has
  // a toJSON() function, then always run it and use it as the
  // response body to send.  Otherwise, send down its `.stack`,
  // except in production use res.sendStatus().
  else if (_.isError(optionalData)) {
    sails.log.info('Custom response `res.unprocessableEntity()` called with an Error:', optionalData);
    optionalData.toJSON = function(data) {
      res.sendStatus(statusCodeToSet);
    };
    // If the error doesn't have a custom .toJSON(), use its `stack` instead--
    // otherwise res.json() would turn it into an empty dictionary.
    // (If this is production, don't send a response body at all.)
    if (!_.isFunction(optionalData.toJSON)) {
      if (process.env.NODE_ENV === 'production') {
        return res.sendStatus(statusCodeToSet);
      } else {
        return res.status(statusCodeToSet).send(optionalData.stack);
      }
    }

    return res.status(statusCodeToSet).send(optionalData.toJSON());
  }
  // Set status code and send response data.
  else {
    return res.status(statusCodeToSet).send(optionalData);
  }
};
