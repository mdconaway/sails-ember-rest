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

describe('Integration | Interrupt | afterUpdate', function() {
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
        FooController.setServiceInterrupt('afterUpdate', (req, res, next) => {
            next();
        });
    });

    describe(':: invocation arguments', function() {
        it('should call interrupt with 5 arguments', function(done) {
            FooController.setServiceInterrupt('afterUpdate', function(req, res, next) {
                expect(arguments.length).to.equal(5);
                next();
            });
            supertest(sails.hooks.http.app)
                .patch(`/foos/${tempFoo.id}`)
                .send(updateFoo)
                .end(done);
        });
        it('should return the contextual request object', function(done) {
            FooController.setServiceInterrupt('afterUpdate', function(req, res, next) {
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
            FooController.setServiceInterrupt('afterUpdate', function(req, res, next) {
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
            FooController.setServiceInterrupt('afterUpdate', function(req, res, next) {
                expect(next).to.be.a('function');
                next();
            });
            supertest(sails.hooks.http.app)
                .patch(`/foos/${tempFoo.id}`)
                .send(updateFoo)
                .end(done);
        });
        it('should return the parsed model class', function(done) {
            FooController.setServiceInterrupt('afterUpdate', function(req, res, next, Model) {
                expect(Model.globalId).to.equal('Foo');
                next();
            });
            supertest(sails.hooks.http.app)
                .patch(`/foos/${tempFoo.id}`)
                .send(newFoo)
                .end(done);
        });
        it('should return the before and after update record instances', function(done) {
            FooController.setServiceInterrupt('afterUpdate', function(req, res, next, Model, records) {
                expect(records.before).to.be.an.instanceof(Object);
                expect(records.before).to.have.property('id');
                expect(records.before)
                    .to.have.property('name')
                    .that.equals(newFoo.foo.name);
                expect(records.after).to.be.an.instanceof(Object);
                expect(records.after).to.have.property('id');
                expect(records.after)
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
