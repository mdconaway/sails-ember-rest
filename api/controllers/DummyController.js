import { controllers } from './../../index';

const DummyController = new controllers.JsonApiController({
  hello(req, res) {
    return res.ok('Hello.');
  }
});

export default DummyController;
