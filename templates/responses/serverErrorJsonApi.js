/**
 * serverErrorJsonApi.js
 *
 * 500 (Server Error) Handler for JSON API
 *
 * Example usage:
 * ```
 *     return res.serverErrorJsonApi();
 *     // -or-
 *     return res.serverErrorJsonApi(optionalData);
 * ```
 *
 * Or with actions2:
 * ```
 *     exits: {
 *       somethingHappened: {
 *         responseType: 'serverErrorJsonApi'
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

module.exports = function serverErrorJsonApi(optionalData) {
  const res = this.res;
  const statusCodeToSet = 500;
  const title = 'Server Error';

  // If no data was provided, use res.sendStatus().
  if (optionalData === undefined) {
    sails.log.info('Ran custom response: res.serverErrorJsonApi()');
    return res.status(statusCodeToSet).send({ errors: [{ title }] });
  }
  // Else if the provided data is an Error instance, if it has
  // a toJSON() function, then always run it and use it as the
  // response body to send.  Otherwise, send down its `.stack`,
  // except in production use res.sendStatus().
  else if (_.isError(optionalData)) {
    sails.log.info('Custom response `res.serverErrorJsonApi()` called with an Error:', optionalData);

    // If the error doesn't have a custom .toJSON(), use its `stack` instead--
    // otherwise res.json() would turn it into an empty dictionary.
    // (If this is production, don't send a response body at all.)
    if (!_.isFunction(optionalData.toJSON)) {
      optionalData.toJSON = sails.helpers.jsonifyError.with({ err: optionalData, title });
    }

    return res.status(statusCodeToSet).send(optionalData);
  }
  // Set status code and send response data.
  else {
    return res.status(statusCodeToSet).send({ errors: [{ title, detail: optionalData }] });
  }
};
