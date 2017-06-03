const EmberController = require('./../controllers/EmberController');
module.exports = function(controller) {
    controller = controller ? controller : new EmberController();
    return function(req, res, next) {
        if (req.headers.ember) {
            return controller.create(req, res);
        }
        next();
    };
};
