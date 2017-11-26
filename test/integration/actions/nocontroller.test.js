import supertest from 'supertest';

describe('Integration | Action | nocontroller', function() {
    describe(':: custom actions', function() {
        it('should allow a non-ember action (actions2 or classic)', function(done) {
            supertest(sails.hooks.http.app)
                .get('/users/1')
                .expect(200)
                .expect(res => {
                    expect(res.body.message).to.equal('This action has been overriden!');
                })
                .end(done);
        });
    });

    describe(':: ember actions', function() {
        it('should respond with status code 200', function(done) {
            supertest(sails.hooks.http.app)
                .get('/users')
                .expect(200)
                .end(done);
        });
        it('should return an object as root response value', function(done) {
            supertest(sails.hooks.http.app)
                .get('/users')
                .expect(res => {
                    expect(res.body).to.be.an.instanceof(Object);
                })
                .end(done);
        });
        it('should return a pluralized payload envelope', function(done) {
            supertest(sails.hooks.http.app)
                .get('/users')
                .expect(res => {
                    expect(res.body.users).to.be.an.instanceof(Array);
                })
                .end(done);
        });
        it('should return a meta object', function(done) {
            supertest(sails.hooks.http.app)
                .get('/users')
                .expect(res => {
                    expect(res.body.meta).to.be.an.instanceof(Object);
                })
                .end(done);
        });
        it('should return a meta total that is a number', function(done) {
            supertest(sails.hooks.http.app)
                .get('/users')
                .expect(res => {
                    expect(res.body.meta)
                        .to.have.property('total')
                        .that.is.a('number');
                })
                .end(done);
        });
    });
});
