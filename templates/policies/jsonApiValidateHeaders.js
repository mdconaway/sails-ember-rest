module.exports = function(req, res, next) {
  const contentType = req.headers['content-type'];
  const accept = req.headers['accept'];

  // Servers MUST respond with a 415 Unsupported Media Type status code if a request specifies
  // the header Content-Type: application/vnd.api+json with any media type parameters
  if (!contentType || contentType !== 'application/vnd.api+json') {
    return res.unsupportedMediaType(
      "The Content-Type should be 'application/vnd.api+json' and may not contain media type parameters"
    );
  }

  // Servers MUST respond with a 406 Not Acceptable status code if a request’s Accept header
  // contains the JSON API media type and all instances of that media type are modified with
  // media type parameters
  if (accept !== 'application/vnd.api+json') {
    return res.notAcceptable(
      "The Accept header should be 'application/vnd.api+json' and may not contain media type parameters"
    );
  }

  return next();
};
