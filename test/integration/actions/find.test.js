import supertest from 'supertest';

describe('Integration | Action | find', function() {
  describe(':: response format', function() {
    it('should respond with status code 200', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles')
        .expect(200)
        .end(done);
    });
    it('should respond with Content-Type application/vnd.api+json', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles')
        .expect(res => {
          expect(res.headers['content-type']).to.contain('application/vnd.api+json');
        })
        .end(done);
    });
    it('should return an object as root response value', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles')
        .expect(res => {
          expect(res.body).to.be.an.instanceof(Object);
        })
        .end(done);
    });
    it('should return a links object containing a self reference', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles')
        .expect(res => {
          expect(res.body.links.self).to.include('http://localhost:1337/articles');
        })
        .end(done);
    });
    it('should return a data array containing a collection of resource objects', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles')
        .expect(res => {
          expect(res.body.data).to.be.an.instanceof(Array);
        })
        .end(done);
    });
    it('should return a meta object', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles')
        .expect(res => {
          expect(res.body.meta).to.be.an.instanceof(Object);
        })
        .end(done);
    });
    it('should return a meta total that is a number', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles')
        .expect(res => {
          expect(res.body.meta)
            .to.have.property('total')
            .that.is.a('number');
        })
        .end(done);
    });
  });

  describe(':: data integrity', function() {
    it('should return 2 articles', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles')
        .expect(res => {
          const { data } = res.body;
          const focusDoc = data[0];

          expect(data).to.have.lengthOf(2);
          expect(focusDoc.id).to.equal('1');
          expect(focusDoc.type).to.equal('article');
          expect(focusDoc.attributes.title).to.include('XML');
          expect(focusDoc.attributes['created-at']).to.exist;
          expect(focusDoc.attributes['createdAt']).to.not.exist;

          expect(focusDoc.relationships).to.exist;
          expect(Object.keys(focusDoc.relationships).length).to.equal(2);
          expect(focusDoc.relationships.author.links.related.href).to.equal(
            `http://localhost:1337/articles/${focusDoc.id}/author`
          );
          expect(focusDoc.relationships.author.links.related.meta.count).to.equal(1);
        })
        .end(done);
    });
    it('should have meta total of 2', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles')
        .expect(res => {
          expect(res.body.meta.total).to.equal(2);
        })
        .end(done);
    });
  });

  describe(':: query functions', function() {
    it('should support belongsTo query', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?author=1')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.meta.total).to.equal(1);
        })
        .end(done);
    });
    it('should support contains query', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?title[contains]=XML')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.data[0].attributes.title).to.include('XML');
          expect(res.body.meta.total).to.equal(1);
        })
        .end(done);
    });
    it('should support in query', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?title[]=JSON%20to%20XML')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.data[0].attributes.title).to.equal('JSON to XML');
          expect(res.body.meta.total).to.equal(1);
        })
        .end(done);
    });
    it('should support equality query', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?title=JSON%20to%20XML')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.data[0].attributes.title).to.equal('JSON to XML');
          expect(res.body.meta.total).to.equal(1);
        })
        .end(done);
    });
    it('should support id query', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?id=1')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.meta.total).to.equal(1);
        })
        .end(done);
    });
    it('should support where object query', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?where[title][contains]=XML')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.data[0].attributes.title).to.include('XML');
          expect(res.body.meta.total).to.equal(1);
        })
        .end(done);
    });
    it('should support limit parameter', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?limit=1')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.meta.total).to.equal(2);
        })
        .end(done);
    });
    it('should support skip parameter', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?skip=1')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.meta.total).to.equal(2);
        })
        .end(done);
    });
    it('should support simple sort parameter (ASC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/authors?sort=name%20ASC')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(4);
          expect(res.body.meta.total).to.equal(4);
          expect(res.body.data[0].attributes.name).to.equal('Bob');
          expect(res.body.data[1].attributes.name).to.equal('Cob');
          expect(res.body.data[2].attributes.name).to.equal('Lob');
          expect(res.body.data[3].attributes.name).to.equal('Rob');
        })
        .end(done);
    });
    it('should support simple sort parameter (DESC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/authors?sort=name%20DESC')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(4);
          expect(res.body.meta.total).to.equal(4);
          expect(res.body.data[0].attributes.name).to.equal('Rob');
          expect(res.body.data[1].attributes.name).to.equal('Lob');
          expect(res.body.data[2].attributes.name).to.equal('Cob');
          expect(res.body.data[3].attributes.name).to.equal('Bob');
        })
        .end(done);
    });
    it('should support array sort parameter (single ASC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/authors?sort=[{"name":"ASC"}]')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(4);
          expect(res.body.meta.total).to.equal(4);
          expect(res.body.data[0].attributes.name).to.equal('Bob');
          expect(res.body.data[1].attributes.name).to.equal('Cob');
          expect(res.body.data[2].attributes.name).to.equal('Lob');
          expect(res.body.data[3].attributes.name).to.equal('Rob');
        })
        .end(done);
    });
    it('should support array sort parameter (single DESC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/authors?sort=[{"name":"DESC"}]')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(4);
          expect(res.body.meta.total).to.equal(4);
          expect(res.body.data[0].attributes.name).to.equal('Rob');
          expect(res.body.data[1].attributes.name).to.equal('Lob');
          expect(res.body.data[2].attributes.name).to.equal('Cob');
          expect(res.body.data[3].attributes.name).to.equal('Bob');
        })
        .end(done);
    });
    it('should support array sort parameter (multi-column)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/authors?sort=[{"age":"ASC"},{"name":"ASC"}]')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(4);
          expect(res.body.meta.total).to.equal(4);
          expect(res.body.data[0].attributes.name).to.equal('Rob');
          expect(res.body.data[1].attributes.name).to.equal('Cob');
          expect(res.body.data[2].attributes.name).to.equal('Bob');
          expect(res.body.data[3].attributes.name).to.equal('Lob');
        })
        .end(done);
    });
    it('should support empty query results', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?title[contains]=EMPTY YO')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(0);
          expect(res.body.meta.total).to.equal(0);
        })
        .end(done);
    });
    it('should support the include query param with a top-level relationship value', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?include=author')
        .expect(res => {
          const { included } = res.body;

          expect(included).to.have.length(2);
          expect(included[0].type).to.equal('author');
          expect(included[1].type).to.equal('author');
        })
        .end(done);
    });
    it('should NOT support the include query param with a nested relationship value', function(done) {
      supertest(sails.hooks.http.app)
        .get('/authors?include=articles.comments')
        .expect(400)
        .end(done);
    });
    it('should support the include query param with multiple top-level relationship values', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?include=author,comments')
        .expect(res => {
          const { included } = res.body;

          expect(included).to.have.length(5);
          const types = included.reduce(
            (acc, item) => {
              return item.type === 'author'
                ? Object.assign({}, acc, { author: acc.author + 1 })
                : Object.assign({}, acc, { comment: acc.comment + 1 });
            },
            { author: 0, comment: 0 }
          );
          expect(types.author).to.equal(2);
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
    it('should support the include query param with additional params', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles?include=author&title[contains]=XML')
        .expect(res => {
          const { included } = res.body;
          const focusDoc = included[0];

          expect(included).to.have.length(1);
          expect(focusDoc.type).to.equal('author');
          expect(focusDoc.id).to.equal('1');
          expect(focusDoc.relationships).to.exist;
          expect(Object.keys(focusDoc.relationships).length).to.equal(3);

          expect(focusDoc.relationships.articles.links.related.href).to.equal(
            `http://localhost:1337/authors/${focusDoc.id}/articles`
          );
          expect(focusDoc.relationships.articles.links.related.meta.count).to.equal(1);
          expect(focusDoc.relationships.comments.links.related.href).to.equal(
            `http://localhost:1337/authors/${focusDoc.id}/comments`
          );
          expect(focusDoc.relationships.comments.links.related.meta.count).to.equal(0);
        })
        .end(done);
    });
    it('should support the fields query param to display only the fields of a resource requested', function(done) {
      supertest(sails.hooks.http.app)
        .get('/authors?fields[authors]=name')
        .expect(200)
        .expect(res => {
          const { data } = res.body;

          data.forEach(record => {
            expect(record.attributes.name).to.exist;
            expect(record.attributes.age).to.not.exist;
          });
        })
        .end(done);
    });
    it('should support the fields query param in conjunction with the include query param', function(done) {
      supertest(sails.hooks.http.app)
        .get(
          '/authors?include=articles,publishers&fields[authors]=name&fields[articles]=&fields[publishers]=name,updatedAt'
        )
        .expect(200)
        .expect(res => {
          const { data, included } = res.body;

          data.forEach(record => {
            expect(record.attributes.name).to.exist;
            expect(record.attributes.age).to.not.exist;
          });

          // Expect only articles and publishers for relationships
          expect(included.filter(record => ['article', 'publisher'].indexOf(record.type) < 0).length).to.equal(0);

          included.forEach(record => {
            if (record.type === 'article') {
              expect(record.attributes).to.not.exist;
            } else if (record.type === 'publisher') {
              expect(record.attributes.name).to.exist;
              expect(record.attributes['updated-at']).to.exist;
              expect(record.attributes['created-at']).to.not.exist;
            }
          });
        })
        .end(done);
    });
  });
});
