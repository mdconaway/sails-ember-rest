module.exports = () =>
  function(req, res, next) {
    if (!req.headers.jsonApi) {
      req.headers.jsonApi = true;
    }
    next();
  };
