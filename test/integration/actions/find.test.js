import supertest from 'supertest';

describe('Integration | Action | find', function() {
    describe(':: response format', function() {
        it('should respond with status code 200', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos')
                .expect(200)
                .end(done);
        });
        it('should return an object as root response value', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos')
                .expect(res => {
                    expect(res.body).to.be.an.instanceof(Object);
                })
                .end(done);
        });
        it('should return a pluralized payload envelope', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos')
                .expect(res => {
                    expect(res.body.foos).to.be.an.instanceof(Array);
                })
                .end(done);
        });
        it('should return a meta object', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos')
                .expect(res => {
                    expect(res.body.meta).to.be.an.instanceof(Object);
                })
                .end(done);
        });
        it('should return a meta total that is a number', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos')
                .expect(res => {
                    expect(res.body.meta)
                        .to.have.property('total')
                        .that.is.a('number');
                })
                .end(done);
        });
    });

    describe(':: data integrity', function() {
        it('should return 2 foos', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos')
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(2);
                })
                .end(done);
        });
        it('should have meta total of 2', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos')
                .expect(res => {
                    expect(res.body.meta.total).to.equal(2);
                })
                .end(done);
        });
    });

    describe(':: query functions', function() {
        it('should support belongsTo query', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos?myBar=1')
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                    expect(res.body.meta.total).to.equal(1);
                })
                .end(done);
        });
        it('should support contains query', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos?name[contains]=2%20Foo')
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                    expect(res.body.foos[0].name).to.include('2 Foo');
                    expect(res.body.meta.total).to.equal(1);
                })
                .end(done);
        });
        it('should support in query', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos?name[]=Fooooooo')
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                    expect(res.body.foos[0].name).to.equal('Fooooooo');
                    expect(res.body.meta.total).to.equal(1);
                })
                .end(done);
        });
        it('should support equality query', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos?name=Fooooooo')
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                    expect(res.body.foos[0].name).to.equal('Fooooooo');
                    expect(res.body.meta.total).to.equal(1);
                })
                .end(done);
        });
        it('should support id query', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos?id=1')
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                    expect(res.body.meta.total).to.equal(1);
                })
                .end(done);
        });
        it('should support where object query', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos?where[name][contains]=2%20Foo')
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                    expect(res.body.foos[0].name).to.include('2 Foo');
                    expect(res.body.meta.total).to.equal(1);
                })
                .end(done);
        });
        it('should support limit parameter', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos?limit=1')
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                    expect(res.body.meta.total).to.equal(2);
                })
                .end(done);
        });
        it('should support skip parameter', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos?skip=1')
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                    expect(res.body.meta.total).to.equal(2);
                })
                .end(done);
        });
        it('should support simple sort parameter (ASC)', function(done) {
            supertest(sails.hooks.http.app)
                .get('/bars?sort=name%20ASC')
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(4);
                    expect(res.body.meta.total).to.equal(4);
                    expect(res.body.bars[0].name).to.equal('2 Baaaaar');
                    expect(res.body.bars[1].name).to.equal('3 Baaaaar');
                    expect(res.body.bars[2].name).to.equal('4 Baaaaar');
                    expect(res.body.bars[3].name).to.equal('Baaaaar');
                })
                .end(done);
        });
        it('should support simple sort parameter (DESC)', function(done) {
            supertest(sails.hooks.http.app)
                .get('/bars?sort=name%20DESC')
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(4);
                    expect(res.body.meta.total).to.equal(4);
                    expect(res.body.bars[3].name).to.equal('2 Baaaaar');
                    expect(res.body.bars[2].name).to.equal('3 Baaaaar');
                    expect(res.body.bars[1].name).to.equal('4 Baaaaar');
                    expect(res.body.bars[0].name).to.equal('Baaaaar');
                })
                .end(done);
        });
        it('should support object sort parameter (1)', function(done) {
            supertest(sails.hooks.http.app)
                .get('/bars?sort={"name":1}')
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(4);
                    expect(res.body.meta.total).to.equal(4);
                    expect(res.body.bars[0].name).to.equal('2 Baaaaar');
                    expect(res.body.bars[1].name).to.equal('3 Baaaaar');
                    expect(res.body.bars[2].name).to.equal('4 Baaaaar');
                    expect(res.body.bars[3].name).to.equal('Baaaaar');
                })
                .end(done);
        });
        it('should support object sort parameter (-1)', function(done) {
            supertest(sails.hooks.http.app)
                .get('/bars?sort={"name":-1}')
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(4);
                    expect(res.body.meta.total).to.equal(4);
                    expect(res.body.bars[3].name).to.equal('2 Baaaaar');
                    expect(res.body.bars[2].name).to.equal('3 Baaaaar');
                    expect(res.body.bars[1].name).to.equal('4 Baaaaar');
                    expect(res.body.bars[0].name).to.equal('Baaaaar');
                })
                .end(done);
        });
        it('should support multi-column object sort parameter (1)', function(done) {
            supertest(sails.hooks.http.app)
                .get('/bars?sort={"identiField":1,"name":1}')
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(4);
                    expect(res.body.meta.total).to.equal(4);
                    expect(res.body.bars[2].name).to.equal('2 Baaaaar');
                    expect(res.body.bars[0].name).to.equal('3 Baaaaar');
                    expect(res.body.bars[3].name).to.equal('4 Baaaaar');
                    expect(res.body.bars[1].name).to.equal('Baaaaar');
                })
                .end(done);
        });
        it('should support array sort parameter (single ASC)', function(done) {
            supertest(sails.hooks.http.app)
                .get('/bars?sort=[{"name":"ASC"}]')
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(4);
                    expect(res.body.meta.total).to.equal(4);
                    expect(res.body.bars[0].name).to.equal('2 Baaaaar');
                    expect(res.body.bars[1].name).to.equal('3 Baaaaar');
                    expect(res.body.bars[2].name).to.equal('4 Baaaaar');
                    expect(res.body.bars[3].name).to.equal('Baaaaar');
                })
                .end(done);
        });
        it('should support array sort parameter (single DESC)', function(done) {
            supertest(sails.hooks.http.app)
                .get('/bars?sort=[{"name":"DESC"}]')
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(4);
                    expect(res.body.meta.total).to.equal(4);
                    expect(res.body.bars[3].name).to.equal('2 Baaaaar');
                    expect(res.body.bars[2].name).to.equal('3 Baaaaar');
                    expect(res.body.bars[1].name).to.equal('4 Baaaaar');
                    expect(res.body.bars[0].name).to.equal('Baaaaar');
                })
                .end(done);
        });
        it('should support array sort parameter (multi-column)', function(done) {
            supertest(sails.hooks.http.app)
                .get('/bars?sort=[{"identiField":"ASC"},{"name":"ASC"}]')
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(4);
                    expect(res.body.meta.total).to.equal(4);
                    expect(res.body.bars[2].name).to.equal('2 Baaaaar');
                    expect(res.body.bars[0].name).to.equal('3 Baaaaar');
                    expect(res.body.bars[3].name).to.equal('4 Baaaaar');
                    expect(res.body.bars[1].name).to.equal('Baaaaar');
                })
                .end(done);
        });
    });
});
