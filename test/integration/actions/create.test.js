import supertest from 'supertest';

const ids = [];
const newArticle = {
  data: {
    type: 'article',
    attributes: {
      title: 'I Woke Up in a Car'
    },
    relationships: {
      author: {
        data: {
          type: 'author',
          id: '2'
        }
      }
    }
  }
};
const newMediaOutlet = {
  data: {
    type: 'media-outlet',
    attributes: {
      name: "Nate's Newz",
      type: 'newspaper'
    }
  }
};
const badMediaOutlet = {
  data: {
    type: 'mediaOutlet',
    attributes: {
      name: "Ralph's Radio 93.7",
      type: 'radio'
    }
  }
};

describe('Integration | Action | create', function() {
  after(function(done) {
    Article.destroy({ id: ids }).exec(done);
  });

  describe(':: response format', function() {
    describe('for valid requests', function() {
      it('should respond with status code 201', function(done) {
        supertest(sails.hooks.http.app)
          .post('/articles')
          .send(newArticle)
          .expect(201)
          .expect(res => {
            ids.push(res.body.data.id);
          })
          .end(done);
      });
      it('should respond with Content-Type application/vnd.api+json', function(done) {
        supertest(sails.hooks.http.app)
          .post('/articles')
          .send(newArticle)
          .expect(res => {
            expect(res.headers['content-type']).to.contain('application/vnd.api+json');
          })
          .expect(res => {
            ids.push(res.body.data.id);
          })
          .end(done);
      });
      it('should return an object as root response value', function(done) {
        supertest(sails.hooks.http.app)
          .post('/articles')
          .send(newArticle)
          .expect(res => {
            expect(res.body).to.be.an.instanceof(Object);
          })
          .expect(res => {
            ids.push(res.body.data.id);
          })
          .end(done);
      });
      it('should return a links object containing a self reference', function(done) {
        supertest(sails.hooks.http.app)
          .post('/articles')
          .send(newArticle)
          .expect(res => {
            expect(res.body.data.links.self).to.equal(`http://localhost:1337/articles/${res.body.data.id}`);
          })
          .expect(res => {
            ids.push(res.body.data.id);
          })
          .end(done);
      });
      it('should return a data object containing the newly created record info', function(done) {
        supertest(sails.hooks.http.app)
          .post('/articles')
          .send(newArticle)
          .expect(res => {
            expect(res.body.data).to.be.an.instanceof(Object);
          })
          .expect(res => {
            ids.push(res.body.data.id);
          })
          .end(done);
      });
    });

    describe('for invalid requests', function() {
      it('should respond with status code 411', function(done) {
        supertest(sails.hooks.http.app)
          .post('/articles')
          .send({ data: {}})
          .expect(411)
          .expect(res => {
            const { errors } = res.body;

            expect(errors).to.be.an.instanceof(Array);
            expect(errors).to.have.length(1);
            expect(errors[0].title).to.equal('Validation Error');
            expect(errors[0].detail).to.exist;
          })
          .end(done);
      });
    });
  });

  describe(':: data integrity', function() {
    it('should return 1 article', function(done) {
      supertest(sails.hooks.http.app)
        .post('/articles')
        .send(newArticle)
        .expect(res => {
          expect(res.body.data.type).to.equal('article');
          expect(res.body.data.id).to.not.be.undefined;
          expect(res.body.data.attributes.title).to.equal('I Woke Up in a Car');
        })
        .expect(res => {
          ids.push(res.body.data.id);
        })
        .end(done);
    });
  });

  describe(':: multi-word model name', function() {
    it('should receive and return a kabab-case type in the data object', function(done) {
      supertest(sails.hooks.http.app)
        .post('/mediaoutlets')
        .send(newMediaOutlet)
        .expect(201)
        .expect(res => {
          expect(res.body.data.type).to.equal('media-outlet');
        })
        .expect(res => {
          expect(res.body.data.attributes.name).to.equal("Nate's Newz");
        })
        .end(done);
    });

    /* TODO: Should this be tested / implemented ?
    it('should fail if sent as a non-kebab-case type', function(done) {
      supertest(sails.hooks.http.app)
        .post('/mediaoutlets')
        .send(badMediaOutlet)
        .expect(400)
        .end(done);
    });
    */
  });
});
