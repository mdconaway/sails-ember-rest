/**
 * forbiddenJsonApi.js
 *
 * 403 (Not Found) Handler for JSON API
 *
 * Example usage:
 * ```
 *     return res.forbiddenJsonApi();
 *     // -or-
 *     return res.forbiddenJsonApi(optionalData);
 * ```
 *
 * Or with actions2:
 * ```
 *     exits: {
 *       somethingHappened: {
 *         responseType: 'forbiddenJsonApi'
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

module.exports = function forbiddenJsonApi(optionalData) {
  const res = this.res;
  const statusCodeToSet = 403;
  const title = 'Forbidden';

  // If no data was provided, use res.sendStatus().
  if (optionalData === undefined) {
    sails.log.info('Ran custom response: res.forbiddenJsonApi()');
    return res.status(statusCodeToSet).send({ errors: [{ title }] });
  }
  // Else if the provided data is an Error instance, if it has
  // a toJSON() function, then always run it and use it as the
  // response body to send.  Otherwise, send down its `.stack`,
  // except in production use res.sendStatus().
  else if (_.isError(optionalData)) {
    sails.log.info('Custom response `res.forbiddenJsonApi()` called with an Error:', optionalData);

    // If the error doesn't have a custom .toJSON(), use its `stack` instead--
    // otherwise res.json() would turn it into an empty dictionary.
    // (If this is production, don't send a response body at all.)
    if (!_.isFunction(optionalData.toJSON)) {
      optionalData.toJSON = sails.helpers.jsonifyError.with({ err: optionalData, title });
    }

    return res.status(statusCodeToSet).send(optionalData);
  }
  // If the data has already been structured in JSON API format
  else if (_.isObject(optionalData) && optionalData.errors) {
    return res.status(statusCodeToSet).send(optionalData);
  }
  // Set status code and send response data.
  else {
    return res
      .status(statusCodeToSet)
      .send({ errors: [{ title, status: _.toString(statusCodeToSet), detail: optionalData }] });
  }
};
