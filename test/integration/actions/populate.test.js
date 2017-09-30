import supertest from 'supertest';

describe('Integration | Action | populate', function() {
    describe(':: response format', function() {
        it('should respond with status code 200', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/bars')
                .expect(200)
                .end(done);
        });
        it('should return an object as root response value', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/bars')
                .expect(res => {
                    expect(res.body).to.be.an.instanceof(Object);
                })
                .end(done);
        });
        it('should return a pluralized payload envelope', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/bars')
                .expect(res => {
                    expect(res.body.bars).to.be.an.instanceof(Array);
                })
                .end(done);
        });
        it('should return a meta object', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/bars')
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
        it('should return 2 bars', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/bars')
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(2);
                })
                .end(done);
        });
        it('should have meta total of 2', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/bars')
                .expect(res => {
                    expect(res.body.meta.total).to.equal(2);
                })
                .end(done);
        });
    });

    describe(':: query functions', function() {
        it('should honor additional query params', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/bars?name[contains]=2%20Baa')
                .expect(200)
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(1);
                })
                .end(done);
        });
        it('should still return the total number of relations NO MATTER WHAT', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/bars?name[contains]=2%20Baa')
                .expect(200)
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(1);
                    expect(res.body.meta.total).to.equal(2);
                })
                .end(done);
        });
        it('should support limit parameter', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/2/bars?limit=1')
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(1);
                    expect(res.body.meta.total).to.equal(4);
                })
                .end(done);
        });
        it('should support skip parameter', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/2/bars?skip=3')
                .expect(res => {
                    expect(res.body.bars).to.have.lengthOf(1);
                    expect(res.body.meta.total).to.equal(4);
                })
                .end(done);
        });
        it('should support simple sort parameter (ASC)', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/2/bars?sort=name ASC')
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
                .get('/foos/2/bars?sort=name DESC')
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
                .get('/foos/2/bars?sort={"name":1}')
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
                .get('/foos/2/bars?sort={"name":-1}')
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
                .get('/foos/2/bars?sort={"identiField":1,"name":1}')
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
                .get('/foos/2/bars?sort=[{"name":"ASC"}]')
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
                .get('/foos/2/bars?sort=[{"name":"DESC"}]')
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
                .get('/foos/2/bars?sort=[{"identiField":"ASC"},{"name":"ASC"}]')
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
