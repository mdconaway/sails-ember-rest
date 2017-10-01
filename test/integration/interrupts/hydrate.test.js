import supertest from 'supertest';
let FooController;

describe('Integration | Interrupt | hydrate', function() {
    before(function(done) {
        Object.keys(require.cache).forEach(k => {
            if (k.indexOf('FooController') !== -1) {
                FooController = require.cache[k].exports;
            }
        });
        if (!FooController) {
            return done(new Error('Could not find FooController!'));
        }
        return done();
    });
    afterEach(function() {
        FooController.setServiceInterrupt('hydrate', (req, res, next) => {
            next();
        });
    });

    describe(':: invocation arguments', function() {
        it('should call interrupt with 5 arguments', function(done) {
            FooController.setServiceInterrupt('hydrate', function(req, res, next) {
                expect(arguments.length).to.equal(5);
                next();
            });
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .end(done);
        });
        it('should return the contextual request object', function(done) {
            FooController.setServiceInterrupt('hydrate', function(req, res, next) {
                expect(req).to.be.instanceof(Object);
                expect(req.headers).to.be.instanceof(Object);
                expect(req.url).to.be.a('string');
                next();
            });
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .end(done);
        });
        it('should return the contextual response object', function(done) {
            FooController.setServiceInterrupt('hydrate', function(req, res, next) {
                expect(res).to.be.instanceof(Object);
                expect(res.locals).to.be.a('object');
                next();
            });
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .end(done);
        });
        it('should return a next() function', function(done) {
            FooController.setServiceInterrupt('hydrate', function(req, res, next) {
                expect(next).to.be.a('function');
                next();
            });
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .end(done);
        });
        it('should return the parsed model class', function(done) {
            FooController.setServiceInterrupt('hydrate', function(req, res, next, Model) {
                expect(Model.globalId).to.equal('Foo');
                next();
            });
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .end(done);
        });
        it('should return the record found', function(done) {
            FooController.setServiceInterrupt('hydrate', function(req, res, next, Model, record) {
                expect(record).to.be.an.instanceof(Object);
                expect(record).to.have.property('id');
                expect(record)
                    .to.have.property('name')
                    .that.is.a('string');
                expect(record)
                    .to.have.property('myBar')
                    .that.is.a('object');
                next();
            });
            supertest(sails.hooks.http.app)
                .get('/foos/1/hydrate')
                .end(done);
        });
    });
});
