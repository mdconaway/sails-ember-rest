import supertest from 'supertest';
const ids = [];
const newFoo = {
    foo: {
        name: 'Kung Fooooooo!',
        myBar: 1,
        bars: [1, 2, 3, 4]
    }
};

describe('Integration | Action | create', function() {
    after(function(done) {
        Foo.destroy({ id: ids }).exec(done);
    });

    describe(':: response format', function() {
        it('should respond with status code 201', function(done) {
            supertest(sails.hooks.http.app)
                .post('/foos')
                .send(newFoo)
                .expect(201)
                .expect(res => {
                    ids.push(res.body.foos[0].id);
                })
                .end(done);
        });
        it('should return an object as root response value', function(done) {
            supertest(sails.hooks.http.app)
                .post('/foos')
                .send(newFoo)
                .expect(res => {
                    expect(res.body).to.be.an.instanceof(Object);
                })
                .expect(res => {
                    ids.push(res.body.foos[0].id);
                })
                .end(done);
        });
        it('should return a pluralized payload envelope', function(done) {
            supertest(sails.hooks.http.app)
                .post('/foos')
                .send(newFoo)
                .expect(res => {
                    expect(res.body.foos).to.be.an.instanceof(Array);
                })
                .expect(res => {
                    ids.push(res.body.foos[0].id);
                })
                .end(done);
        });
        it('should not return a meta object', function(done) {
            supertest(sails.hooks.http.app)
                .post('/foos')
                .send(newFoo)
                .expect(res => {
                    expect(res.body.meta).to.be.undefined;
                })
                .expect(res => {
                    ids.push(res.body.foos[0].id);
                })
                .end(done);
        });
    });

    describe(':: data integrity', function() {
        it('should return 1 foo', function(done) {
            supertest(sails.hooks.http.app)
                .post('/foos')
                .send(newFoo)
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                    expect(res.body.foos[0].name).to.equal('Kung Fooooooo!');
                })
                .expect(res => {
                    ids.push(res.body.foos[0].id);
                })
                .end(done);
        });
        it('should create 4 many<->many bar relations', function(done) {
            supertest(sails.hooks.http.app)
                .post('/foos')
                .send(newFoo)
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                    expect(res.body.foos[0].name).to.equal('Kung Fooooooo!');
                })
                .expect(res => {
                    ids.push(res.body.foos[0].id);
                })
                .end(() => {
                    supertest(sails.hooks.http.app)
                        .get(`/foos/${ids[ids.length - 1]}/bars`)
                        .expect(res => {
                            expect(res.body.bars).to.have.lengthOf(4);
                            expect(res.body.meta.total).to.equal(4);
                        })
                        .end(done);
                });
        });
    });
});
