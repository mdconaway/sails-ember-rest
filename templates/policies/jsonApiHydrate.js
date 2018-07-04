const JsonApiController = require('./../controllers/JsonApiController');
module.exports = function(controller) {
  controller = controller ? controller : new JsonApiController();
  return function(req, res, next) {
    if (req.headers.jsonApi) {
      return controller.hydrate(req, res);
    }
    next();
  };
};
