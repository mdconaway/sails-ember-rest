import supertest from 'supertest';
const newFoo = {
  foo: {
    name: 'destroyFoo',
    myBar: 1
  }
};
let targetFoo = null;

describe('Integration | Action | destroy', function() {
  beforeEach(function(done) {
    Foo.create(newFoo.foo).exec((err, record) => {
      if (err) {
        return done(err);
      }
      targetFoo = record;
      done();
    });
  });

  describe(':: response format', function() {
    it('should respond with status code 200', function(done) {
      supertest(sails.hooks.http.app)
        .delete(`/foos/${targetFoo.id}`)
        .expect(200)
        .end(done);
    });
    it('should return a null response text', function(done) {
      supertest(sails.hooks.http.app)
        .delete(`/foos/${targetFoo.id}`)
        .expect(res => {
          expect(res.text).to.equal('null');
        })
        .end(done);
    });
  });

  describe(':: data integrity', function() {
    it('should return no foos', function(done) {
      supertest(sails.hooks.http.app)
        .delete(`/foos/${targetFoo.id}`)
        .expect(res => {
          expect(res.body).to.equal(null);
        })
        .end(done);
    });
    it('should remove target record from the database', function(done) {
      supertest(sails.hooks.http.app)
        .delete(`/foos/${targetFoo.id}`)
        .expect(res => {
          expect(res.body).to.equal(null);
        })
        .end(() => {
          supertest(sails.hooks.http.app)
            .get(`/foos/${targetFoo.id}`)
            .expect(404)
            .end(done);
        });
    });
  });
});
