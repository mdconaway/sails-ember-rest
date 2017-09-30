import supertest from 'supertest';

describe('Integration | Action | hydrate', function() {
    describe(':: response format', function() {
        it('should respond with status code 200', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .expect(200)
                .end(done);
        });
        it('should return an object as root response value', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .expect(res => {
                    expect(res.body).to.be.an.instanceof(Object);
                })
                .end(done);
        });
        it('should return a pluralized payload envelope', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .expect(res => {
                    expect(res.body.foos).to.be.an.instanceof(Array);
                })
                .end(done);
        });
        it('should not return a meta object', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .expect(res => {
                    expect(res.body.meta).to.be.undefined;
                })
                .end(done);
        });
    });

    describe(':: data integrity', function() {
        it('should return 1 foo', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                })
                .end(done);
        });
        it('should return 1 foo with 2 bars', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .expect(res => {
                    expect(res.body.foos[0].bars).to.have.lengthOf(2);
                })
                .end(done);
        });
        it('should return 1 foo with myBar object', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .expect(res => {
                    expect(res.body.foos[0].myBar).to.be.an.instanceof(Object);
                })
                .end(done);
        });
    });

    describe(':: query functions', function() {
        it('should honor additional query params', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate?name=bob')
                .expect(404)
                .end(done);
        });
    });
});
