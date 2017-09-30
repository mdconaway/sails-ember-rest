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
    });
});
