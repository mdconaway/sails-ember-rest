import supertest from 'supertest';

describe('Integration | policies | validation', function() {
  describe(':: jsonApiValidateHeaders policy', function() {
    it('should return a 415 when the Content Type header is not set to application/vnd.api+json', function(done) {
      supertest(sails.hooks.http.app)
        .get('/dummy')
        .expect(415)
        .end(done);
    });

    it('should return a 415 when the Content Type header incorrectly contains media parameters', function(done) {
      supertest(sails.hooks.http.app)
        .get('/dummy')
        .set('Content-Type', 'application/vnd.api+json; version=2')
        .expect(415)
        .end(done);
    });

    it('should return a 406 when the Accept header is not set to application/vnd.api+json', function(done) {
      supertest(sails.hooks.http.app)
        .get('/dummy')
        .set('Content-Type', 'application/vnd.api+json')
        .expect(406)
        .end(done);
    });

    it('should return a 200 when all headers are correctly set', function(done) {
      supertest(sails.hooks.http.app)
        .get('/dummy')
        .set('Content-Type', 'application/vnd.api+json')
        .set('Accept', 'application/vnd.api+json')
        .expect(200)
        .end(done);
    });
  });
});
