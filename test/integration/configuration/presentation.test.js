import supertest from 'supertest';

describe('Integration | Configuration | presentation', function() {
    describe(':: global model config', function() {
        it('should not return sideloaded bars for model without attribute config', function(done) {
            supertest(sails.hooks.http.app)
                .get('/foos')
                .expect(res => {
                    expect(res.body.bars).to.be.undefined;
                })
                .end(done);
        });
    });

    describe(':: attribute level config', function() {
        it('should return sideloaded foos for model with attribute level config', function(done) {
            supertest(sails.hooks.http.app)
                .get('/bars')
                .expect(res => {
                    expect(res.body.foos).to.be.an.instanceof(Array);
                    expect(res.body.foos).to.have.lengthOf(2);
                })
                .end(done);
        });
    });
});
