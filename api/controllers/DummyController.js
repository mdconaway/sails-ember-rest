const Controller = new sails.hooks['sails-json-api'].controller({
  hello(req, res) {
    return res.ok('Hello.');
  }
});

export default Controller;
