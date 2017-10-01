import supertest from 'supertest';
const newFoo = {
    foo: {
        name: 'Interrupt Fooooooo!',
        myBar: 1
    }
};
const updateFoo = {
    foo: {
        name: 'Updated Interrupt Fooooooo!',
        myBar: 2
    }
};
let FooController;
let tempFoo;

describe('Integration | Interrupt | beforeUpdate', function() {
    before(function(done) {
        Object.keys(require.cache).forEach(k => {
            if (k.indexOf('FooController') !== -1) {
                FooController = require.cache[k].exports;
            }
        });
        if (!FooController) {
            return done(new Error('Could not find FooController!'));
        }
        Foo.create(newFoo.foo).exec((err, record) => {
            if (err) {
                return done(err);
            }
            tempFoo = record;
            done();
        });
    });
    after(function(done) {
        Foo.destroy(tempFoo.id).exec(done);
    });
    afterEach(function() {
        FooController.setServiceInterrupt('beforeUpdate', (req, res, next) => {
            next();
        });
    });

    describe(':: invocation arguments', function() {
        it('should call interrupt with 5 arguments', function(done) {
            FooController.setServiceInterrupt('beforeUpdate', function(req, res, next) {
                expect(arguments.length).to.equal(5);
                next();
            });
            supertest(sails.hooks.http.app)
                .patch(`/foos/${tempFoo.id}`)
                .send(updateFoo)
                .end(done);
        });
        it('should return the contextual request object', function(done) {
            FooController.setServiceInterrupt('beforeUpdate', function(req, res, next) {
                expect(req).to.be.instanceof(Object);
                expect(req.headers).to.be.instanceof(Object);
                expect(req.url).to.be.a('string');
                next();
            });
            supertest(sails.hooks.http.app)
                .patch(`/foos/${tempFoo.id}`)
                .send(updateFoo)
                .end(done);
        });
        it('should return the contextual response object', function(done) {
            FooController.setServiceInterrupt('beforeUpdate', function(req, res, next) {
                expect(res).to.be.instanceof(Object);
                expect(res.locals).to.be.a('object');
                next();
            });
            supertest(sails.hooks.http.app)
                .patch(`/foos/${tempFoo.id}`)
                .send(updateFoo)
                .end(done);
        });
        it('should return a next() function', function(done) {
            FooController.setServiceInterrupt('beforeUpdate', function(req, res, next) {
                expect(next).to.be.a('function');
                next();
            });
            supertest(sails.hooks.http.app)
                .patch(`/foos/${tempFoo.id}`)
                .send(updateFoo)
                .end(done);
        });
        it('should return the parsed model class', function(done) {
            FooController.setServiceInterrupt('beforeUpdate', function(req, res, next, Model) {
                expect(Model.globalId).to.equal('Foo');
                next();
            });
            supertest(sails.hooks.http.app)
                .patch(`/foos/${tempFoo.id}`)
                .send(updateFoo)
                .end(done);
        });
        it('should return only the values to be used for the update', function(done) {
            FooController.setServiceInterrupt('beforeUpdate', function(req, res, next, Model, values) {
                expect(values).to.be.an.instanceof(Object);
                expect(values).to.not.have.property('id');
                expect(values)
                    .to.have.property('name')
                    .that.equals(updateFoo.foo.name);
                next();
            });
            supertest(sails.hooks.http.app)
                .patch(`/foos/${tempFoo.id}`)
                .send(updateFoo)
                .end(done);
        });
    });
});
