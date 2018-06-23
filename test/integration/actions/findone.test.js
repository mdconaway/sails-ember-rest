import supertest from 'supertest';

describe('Integration | Action | findone', function() {
  describe(':: response format', function() {
    it('should respond with status code 200', function(done) {
      supertest(sails.hooks.http.app)
        .get('/foos/1')
        .expect(200)
        .end(done);
    });
    it('should return an object as root response value', function(done) {
      supertest(sails.hooks.http.app)
        .get('/foos/1')
        .expect(res => {
          expect(res.body).to.be.an.instanceof(Object);
        })
        .end(done);
    });
    it('should return a pluralized payload envelope', function(done) {
      supertest(sails.hooks.http.app)
        .get('/foos/1')
        .expect(res => {
          expect(res.body.foos).to.be.an.instanceof(Array);
        })
        .end(done);
    });
    it('should not return a meta object', function(done) {
      supertest(sails.hooks.http.app)
        .get('/foos/1')
        .expect(res => {
          expect(res.body.meta).to.be.undefined;
        })
        .end(done);
    });
  });

  describe(':: data integrity', function() {
    it('should return 1 foo', function(done) {
      supertest(sails.hooks.http.app)
        .get('/foos/1')
        .expect(res => {
          expect(res.body.foos).to.have.lengthOf(1);
        })
        .end(done);
    });
  });

  describe(':: query functions', function() {
    it('should honor additional query params', function(done) {
      supertest(sails.hooks.http.app)
        .get('/foos/1?name=bob')
        .expect(404)
        .end(done);
    });
  });
});
