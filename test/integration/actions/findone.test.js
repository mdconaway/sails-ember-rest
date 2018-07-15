import supertest from 'supertest';

describe('Integration | Action | findone', function() {
  describe(':: response format', function() {
    it('should respond with status code 200', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1')
        .expect(200)
        .end(done);
    });
    /* TODO: Handle errors correctly, not currently a feature of json-api-serializer
    it('should respond with status code 404', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/999')
        .expect(404)
        .expect(res => {
          expect(res.body.errors.length).to.equal(1);
          expect(res.body.errors[0].status).to.equal('404');
          expect(res.body.errors[0].title).to.equal('Not Found');
          expect(res.body.errors[0].detail).to.equal('No record found with the specified id');
        })
        .end(done);
    });
    */
    it('should respond with Content-Type application/vnd.api+json', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1')
        .expect(res => {
          expect(res.headers['content-type']).to.contain('application/vnd.api+json');
        })
        .end(done);
    });
    it('should return an object as root response value', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1')
        .expect(res => {
          expect(res.body).to.be.an.instanceof(Object);
        })
        .end(done);
    });
    it('should return a links object containing a self reference', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1')
        .expect(res => {
          expect(res.body.data.links.self).to.equal('http://localhost:1337/articles/1');
        })
        .end(done);
    });
    it('should return a data object representing a single resource object', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1')
        .expect(res => {
          expect(res.body.data).to.be.an.instanceof(Object);
        })
        .end(done);
    });
  });

  describe(':: data integrity', function() {
    it('should return 1 article', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1')
        .expect(res => {
          const { attributes, id, relationships, type } = res.body.data;

          expect(id).to.equal('1');
          expect(type).to.equal('article');
          expect(attributes.title).to.include('XML');
          expect(attributes['created-at']).to.exist;

          expect(relationships.author.data.type).to.equal('author');
          expect(relationships.author.links.self).to.not.exist;
          expect(relationships.author.links.related).to.be.an.instanceof(Object);
          expect(relationships.author.links.related.href).to.equal('http://localhost:1337/articles/1/author');
          expect(relationships.author.links.related.meta).to.be.an.instanceof(Object);
          expect(relationships.author.links.related.meta.count).to.equal(1);

          expect(relationships.comments.links.self).to.not.exist;
          expect(relationships.comments.links.related).to.be.an.instanceof(Object);
          expect(relationships.comments.links.related.href).to.equal('http://localhost:1337/articles/1/comments');
          expect(relationships.comments.links.related.meta).to.be.an.instanceof(Object);
          expect(relationships.comments.links.related.meta.count).to.equal(3);

          expect(attributes.createdAt).to.not.exist;
          expect(attributes.author).to.not.exist;

          expect(res.body.errors).to.not.exist;
        })
        .end(done);
    });
  });

  describe(':: query functions', function() {
    it('should only include author data', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1?include=author')
        .expect(res => {
          const { included } = res.body;
          const focusDoc = included[0];

          expect(included).to.have.length(1);
          expect(focusDoc.type).to.equal('author');
          expect(focusDoc.attributes.name).to.equal('Bob');
          expect(focusDoc.attributes.age).to.equal(46);

          expect(focusDoc.relationships.articles.links.related.href).to.equal(
            `http://localhost:1337/authors/${focusDoc.id}/articles`
          );
          expect(focusDoc.relationships.comments.links.related.href).to.equal(
            `http://localhost:1337/authors/${focusDoc.id}/comments`
          );

          if (focusDoc.id === '1') {
            expect(focusDoc.relationships.articles.links.related.meta.count).to.equal(1);
            expect(focusDoc.relationships.comments.links.related.meta.count).to.equal(0);
          }

          if (focusDoc.id === '2') {
            expect(focusDoc.relationships.articles.links.related.meta.count).to.equal(1);
            expect(focusDoc.relationships.comments.links.related.meta.count).to.equal(1);
          }
        })
        .end(done);
    });

    it('should include both author and comments', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1?include=author,comments')
        .expect(res => {
          const { included } = res.body;

          expect(included).to.have.length(4);

          const types = included.reduce(
            (acc, item) => {
              return item.type === 'author'
                ? Object.assign({}, acc, { author: acc.author + 1 })
                : Object.assign({}, acc, { comment: acc.comment + 1 });
            },
            { author: 0, comment: 0 }
          );
          expect(types.author).to.equal(1);
          expect(types.comment).to.equal(3);

          included.forEach(record => {
            if (record.type === 'author') {
              expect(record.relationships.articles.links.related.href).to.equal(
                `http://localhost:1337/authors/${record.id}/articles`
              );
              expect(record.relationships.comments.links.related.href).to.equal(
                `http://localhost:1337/authors/${record.id}/comments`
              );

              if (record.id === '1') {
                expect(record.relationships.articles.links.related.meta.count).to.equal(1);
                expect(record.relationships.comments.links.related.meta.count).to.equal(0);
              }

              if (record.id === '2') {
                expect(record.relationships.articles.links.related.meta.count).to.equal(1);
                expect(record.relationships.comments.links.related.meta.count).to.equal(1);
              }
            } else {
              expect(record.relationships.article.links.related.href).to.equal(
                `http://localhost:1337/comments/${record.id}/article`
              );
              expect(record.relationships.author.links.related.href).to.equal(
                `http://localhost:1337/comments/${record.id}/author`
              );

              expect(record.relationships.article.links.related.meta.count).to.equal(1);
              expect(record.relationships.author.links.related.meta.count).to.equal(1);
            }
          });
        })
        .end(done);
    });

    it('should include authors from relationship endpoint', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?include=author')
        .expect(res => {
          const { included } = res.body;

          expect(included).to.have.length(2);

          included.forEach(record => {
            expect(record.type).to.equal('author');
            expect(record.relationships.articles.links.related.href).to.equal(
              `http://localhost:1337/authors/${record.id}/articles`
            );
            expect(record.relationships.comments.links.related.href).to.equal(
              `http://localhost:1337/authors/${record.id}/comments`
            );

            if (record.id === '1') {
              expect(record.relationships.articles.links.related.meta.count).to.equal(1);
              expect(record.relationships.comments.links.related.meta.count).to.equal(0);
            }

            if (record.id === '2') {
              expect(record.relationships.articles.links.related.meta.count).to.equal(1);
              expect(record.relationships.comments.links.related.meta.count).to.equal(1);
            }
          });
        })
        .end(done);
    });

    it('should not honor additional query params', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1?title=XML')
        .expect(404)
        .end(done);
    });
  });
});
