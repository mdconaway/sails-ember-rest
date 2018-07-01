import supertest from 'supertest';

describe('Integration | Configuration | presentation', function() {
  describe(':: global model config', function() {
    it('should not return sideloaded comments for model without attribute config', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles')
        .expect(res => {
          expect(res.body.data.included).to.be.undefined;
        })
        .end(done);
    });
  });

  /* TODO: turn this back on when the included queryParam is implemented
  describe(':: attribute level config', function() {
    it('should return sideloaded articles for model with attribute level config', function(done) {
      supertest(sails.hooks.http.app)
        .get('/authors')
        .expect(res => {
          expect(res.body.data.included).to.be.an.instanceof(Array);
          expect(res.body.data.included).to.have.lengthOf(2);
        })
        .end(done);
    });
  });
  */
});
