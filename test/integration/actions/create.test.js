import supertest from 'supertest';

const ids = [];
const newArticle = {
  data: {
    type: 'articles',
    attributes: {
      title: 'I Woke Up in a Car'
    },
    relationships: {
      author: {
        data: {
          type: 'authors',
          id: '2'
        }
      }
    }
  }
};
const newMediaOutlet = {
  data: {
    type: 'media-outlets',
    attributes: {
      name: 'Nate\'s Newz',
      type: 'newspaper'
    }
  }
};
const badMediaOutlet = {
  data: {
    type: 'mediaOutlets',
    attributes: {
      name: 'Ralph\'s Radio 93.7',
      type: 'radio'
    }
  }
};

describe('Integration | Action | create', function() {
  after(function(done) {
    Article.destroy({ id: ids }).exec(done);
  });

  describe(':: response format', function() {
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

  describe(':: data integrity', function() {
    it('should return 1 article', function(done) {
      supertest(sails.hooks.http.app)
        .post('/articles')
        .send(newArticle)
        .expect(res => {
          expect(res.body.data.type).to.equal('articles');
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
          expect(res.body.data.type).to.equal('media-outlets');
        })
        .expect(res => {
          expect(res.body.data.attributes.name).to.equal('Nate\'s Newz');
        })
        .end(done);
    });

    it('should fail if sent as a non-kebab-case type', function(done) {
      supertest(sails.hooks.http.app)
        .post('/mediaoutlets')
        .send(badMediaOutlet)
        .expect(400)
        .end(done);
    });
  });
});
