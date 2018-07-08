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
const updateArticle = {
  data: {
    id: '2',
    type: 'article',
    attributes: {
      title: 'I Slept in a Truck'
    }
  }
};
const updateCommentsViaArticleRelationship = {
  data: [{ type: 'comment', id: '4' }, { type: 'comment', id: '5' }]
};
const updateMediaOutlet = {
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
let targetArticle = null;

describe('Integration | Action | update', function() {
  before(function(done) {
    Article.create(
      Object.assign({}, newArticle.data.attributes, { author: newArticle.data.relationships.author.data.id })
    ).exec((err, record) => {
      if (err) {
        return done(err);
      }
      targetArticle = record;
      done();
    });
  });
  after(function(done) {
    Article.destroy(targetArticle.id).exec(done);
  });

  describe(':: response format', function() {
    it('should respond with status code 200', function(done) {
      supertest(sails.hooks.http.app)
        .patch(`/articles/${targetArticle.id}`)
        .send(updateArticle)
        .expect(200)
        .end(done);
    });
    it('should respond with Content-Type application/vnd.api+json', function(done) {
      supertest(sails.hooks.http.app)
        .patch(`/articles/${targetArticle.id}`)
        .send(updateArticle)
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
        .patch(`/articles/${targetArticle.id}`)
        .send(updateArticle)
        .expect(res => {
          expect(res.body).to.be.an.instanceof(Object);
        })
        .expect(res => {
          ids.push(res.body.data.id);
        })
        .end(done);
    });
    it('should return a data object containing the newly updated record info', function(done) {
      supertest(sails.hooks.http.app)
        .patch(`/articles/${targetArticle.id}`)
        .send(updateArticle)
        .expect(res => {
          expect(res.body.data).to.be.an.instanceof(Object);
        })
        .expect(res => {
          ids.push(res.body.data.id);
        })
        .end(done);
    });
  });

  describe(':: data integrity', function() {
    it('should return 1 article with a correctly patched field', function(done) {
      supertest(sails.hooks.http.app)
        .patch(`/articles/${targetArticle.id}`)
        .send(updateArticle)
        .expect(res => {
          expect(res.body.data.attributes.title).to.equal('I Slept in a Truck');
        })
        .end(done);
    });
    /* TODO: handle updating one to many relationship
    it('should return 2 comments with correctly updated one<->many relation', function(done) {
      before(cb => {
        Comment.createEach([
          { article: '2', author: '4', text: 'I have a comment!' },
          { article: '2', author: '3', text: 'Rabble, rabble, rabble' }
        ]).exec((err, record) => (err ? cb(err) : cb()));
      });

      supertest(sails.hooks.http.app)
        .patch(`/articles/${targetArticle.id}/comments`)
        .send(updateCommentsViaArticleRelationship)
        .expect(res => {
          sails.log.warn(res.body.data);
          expect(res.body.data.relationships.comments).to.have.lengthOf(2);
        })
        .end(() => {
          supertest(sails.hooks.http.app)
            .get(`/articles/${targetArticle.id}/comments`)
            .expect(res => {
              expect(res.body.data).to.have.lengthOf(2);
              expect(res.body.meta.total).to.equal(2);
            })
            .end(done);
        });
    });
    */
  });

  describe(':: multi-word model name', function() {
    before(cb => {
      MediaOutlet.create({ name: 'Fast Freddies', type: 'newspaper' }).exec((err, record) => (err ? cb(err) : cb()));
    });

    it('should receive and return a kabab-case type in the data object', function(done) {
      supertest(sails.hooks.http.app)
        .patch('/mediaoutlets/1')
        .send(updateMediaOutlet)
        .expect(200)
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
        .patch('/mediaoutlets/1')
        .send(badMediaOutlet)
        .expect(400)
        .end(done);
    });
    */
  });
});
