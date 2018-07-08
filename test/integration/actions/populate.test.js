import supertest from 'supertest';

describe('Integration | Action | populate', function() {
  describe(':: response format', function() {
    it('should respond with status code 200', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(200)
        .end(done);
    });
    it('should return an object as root response value', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(res => {
          expect(res.body).to.be.an.instanceof(Object);
        })
        .end(done);
    });
    it('should return a data array containing a collection of resource objects', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(res => {
          expect(res.body.data).to.be.an.instanceof(Array);
        })
        .end(done);
    });
    it('should return a meta object', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(res => {
          expect(res.body.meta).to.be.an.instanceof(Object);
        })
        .end(done);
    });
    it('should return a meta total that is a number', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(res => {
          expect(res.body.meta)
            .to.have.property('total')
            .that.is.a('number');
        })
        .end(done);
    });
  });

  describe(':: data integrity', function() {
    it('should return 3 comments', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(3);
          expect(res.body.data[0].id).to.equal('1');
          expect(res.body.data[0].type).to.equal('comment');
          expect(res.body.data[0].attributes.text).to.include('Nice');
          expect(res.body.data[0].attributes['created-at']).to.exist;
          expect(res.body.data[0].attributes['createdAt']).to.not.exist;
        })
        .end(done);
    });
    it('should have meta total of 3', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(res => {
          expect(res.body.meta.total).to.equal(3);
        })
        .end(done);
    });
  });

  describe(':: query functions', function() {
    it('should honor additional query params', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?text[contains]=Terrible')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.data[0].attributes.text).to.include('Terrible');
        })
        .end(done);
    });
    it('should still return the total number of relations NO MATTER WHAT', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?text[contains]=Terrible')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.meta.total).to.equal(3);
        })
        .end(done);
    });
    it('should support limit parameter', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?limit=1')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.meta.total).to.equal(3);
        })
        .end(done);
    });
    it('should support skip parameter', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?skip=2')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.meta.total).to.equal(3);
        })
        .end(done);
    });
    it('should support simple sort parameter (ASC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?sort=text%20ASC')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(3);
          expect(res.body.meta.total).to.equal(3);
          expect(res.body.data[0].attributes.text).to.equal('A great try.');
          expect(res.body.data[1].attributes.text).to.equal('Nice article!');
          expect(res.body.data[2].attributes.text).to.equal('Terrible article...');
        })
        .end(done);
    });
    it('should support simple sort parameter (DESC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?sort=text%20DESC')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(3);
          expect(res.body.meta.total).to.equal(3);
          expect(res.body.data[0].attributes.text).to.equal('Terrible article...');
          expect(res.body.data[1].attributes.text).to.equal('Nice article!');
          expect(res.body.data[2].attributes.text).to.equal('A great try.');
        })
        .end(done);
    });
    it('should support array sort parameter (single ASC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?sort=[{"text":"ASC"}]')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(3);
          expect(res.body.meta.total).to.equal(3);
          expect(res.body.data[0].attributes.text).to.equal('A great try.');
          expect(res.body.data[1].attributes.text).to.equal('Nice article!');
          expect(res.body.data[2].attributes.text).to.equal('Terrible article...');
        })
        .end(done);
    });
    it('should support array sort parameter (single DESC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?sort=[{"text":"DESC"}]')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(3);
          expect(res.body.meta.total).to.equal(3);
          expect(res.body.data[0].attributes.text).to.equal('Terrible article...');
          expect(res.body.data[1].attributes.text).to.equal('Nice article!');
          expect(res.body.data[2].attributes.text).to.equal('A great try.');
        })
        .end(done);
    });
    it('should support array sort parameter (multi-column)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?sort=[{"author":"ASC"},{"text":"ASC"}]')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(3);
          expect(res.body.meta.total).to.equal(3);
          expect(res.body.data[0].attributes.text).to.equal('Nice article!');
          expect(res.body.data[1].attributes.text).to.equal('A great try.');
          expect(res.body.data[2].attributes.text).to.equal('Terrible article...');
        })
        .end(done);
    });
    it('should support empty query results', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?text[contains]=EMPTY YO')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(0);
          expect(res.body.meta.total).to.equal(3);
        })
        .end(done);
    });
  });
});
