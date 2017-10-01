import supertest from 'supertest';
const newFoo = {
    foo: {
        name: 'Interrupt Fooooooo!',
        myBar: 1
    }
};
let FooController;
let tempFoo;

describe('Integration | Interrupt | destroy', function() {
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
    beforeEach(function(done) {
        Foo.create(newFoo.foo).exec((err, newRecord) => {
            if (err) {
                return done(err);
            }
            tempFoo = newRecord;
            done();
        });
    });
    afterEach(function() {
        FooController.setServiceInterrupt('destroy', (req, res, next) => {
            next();
        });
    });

    describe(':: invocation arguments', function() {
        it('should call interrupt with 5 arguments', function(done) {
            FooController.setServiceInterrupt('destroy', function(req, res, next) {
                expect(arguments.length).to.equal(5);
                next();
            });
            supertest(sails.hooks.http.app)
                .delete(`/foos/${tempFoo.id}`)
                .end(done);
        });
        it('should return the contextual request object', function(done) {
            FooController.setServiceInterrupt('destroy', function(req, res, next) {
                expect(req).to.be.instanceof(Object);
                expect(req.headers).to.be.instanceof(Object);
                expect(req.url).to.be.a('string');
                next();
            });
            supertest(sails.hooks.http.app)
                .delete(`/foos/${tempFoo.id}`)
                .end(done);
        });
        it('should return the contextual response object', function(done) {
            FooController.setServiceInterrupt('destroy', function(req, res, next) {
                expect(res).to.be.instanceof(Object);
                expect(res.locals).to.be.a('object');
                next();
            });
            supertest(sails.hooks.http.app)
                .delete(`/foos/${tempFoo.id}`)
                .end(done);
        });
        it('should return a next() function', function(done) {
            FooController.setServiceInterrupt('destroy', function(req, res, next) {
                expect(next).to.be.a('function');
                next();
            });
            supertest(sails.hooks.http.app)
                .delete(`/foos/${tempFoo.id}`)
                .end(done);
        });
        it('should return the parsed model class', function(done) {
            FooController.setServiceInterrupt('destroy', function(req, res, next, Model) {
                expect(Model.globalId).to.equal('Foo');
                next();
            });
            supertest(sails.hooks.http.app)
                .delete(`/foos/${tempFoo.id}`)
                .end(done);
        });
        it('should return the destroyed record instance', function(done) {
            FooController.setServiceInterrupt('destroy', function(req, res, next, Model, record) {
                expect(record).to.be.an.instanceof(Object);
                expect(record).to.have.property('id');
                expect(record)
                    .to.have.property('name')
                    .that.is.a('string');
                next();
            });
            supertest(sails.hooks.http.app)
                .delete(`/foos/${tempFoo.id}`)
                .end(done);
        });
    });
});
