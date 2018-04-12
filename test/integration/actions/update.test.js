import supertest from 'supertest';
const newFoo = {
    foo: {
        name: 'updateFoo',
        myBar: 1
    }
};
const updateFoo = {
    foo: {
        name: 'goodbye foo',
        myBar: 2
    }
};
const updateAssessmentQuestion = {
    assessmentQuestion: {
        name: 'Question 1:Addendum',
        identiField: 'Now Z'
    }
};
const badAssessmentQuestion = {
    'assessment-question': {
        name: 'Question 1:Addendum',
        identiField: 'ZZ'
    }
};
let targetFoo = null;

describe('Integration | Action | update', function() {
    before(function(done) {
        Foo.create(newFoo.foo).exec((err, record) => {
            if (err) {
                return done(err);
            }
            targetFoo = record;
            done();
        });
    });
    after(function(done) {
        Foo.destroy(targetFoo.id).exec(done);
    });

    describe(':: response format', function() {
        it('should respond with status code 200', function(done) {
            supertest(sails.hooks.http.app)
                .patch(`/foos/${targetFoo.id}`)
                .send(updateFoo)
                .expect(200)
                .end(done);
        });
        it('should return an object as root response value', function(done) {
            supertest(sails.hooks.http.app)
                .patch(`/foos/${targetFoo.id}`)
                .send(updateFoo)
                .expect(res => {
                    expect(res.body).to.be.an.instanceof(Object);
                })
                .end(done);
        });
        it('should return a pluralized payload envelope', function(done) {
            supertest(sails.hooks.http.app)
                .patch(`/foos/${targetFoo.id}`)
                .send(updateFoo)
                .expect(res => {
                    expect(res.body.foos).to.be.an.instanceof(Array);
                })
                .end(done);
        });
        it('should not return a meta object', function(done) {
            supertest(sails.hooks.http.app)
                .patch(`/foos/${targetFoo.id}`)
                .send(updateFoo)
                .expect(res => {
                    expect(res.body.meta).to.be.undefined;
                })
                .end(done);
        });
    });

    describe(':: data integrity', function() {
        it('should return 1 foo', function(done) {
            supertest(sails.hooks.http.app)
                .patch(`/foos/${targetFoo.id}`)
                .send(updateFoo)
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                })
                .end(done);
        });
        it('should return 1 foo with correctly patched field', function(done) {
            supertest(sails.hooks.http.app)
                .patch(`/foos/${targetFoo.id}`)
                .send({
                    foo: {
                        name: 'special patch',
                        myBar: 1
                    }
                })
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                    expect(res.body.foos[0].name).to.equal('special patch');
                })
                .end(done);
        });
        it('should return 1 foo with correctly updated many<->many relation', function(done) {
            supertest(sails.hooks.http.app)
                .patch(`/foos/${targetFoo.id}`)
                .send({
                    foo: {
                        name: 'relation patch',
                        myBar: 2,
                        bars: [1, 2, 3, 4]
                    }
                })
                .expect(res => {
                    expect(res.body.foos).to.have.lengthOf(1);
                })
                .end(() => {
                    supertest(sails.hooks.http.app)
                        .get(`/foos/${targetFoo.id}/bars`)
                        .expect(res => {
                            expect(res.body.bars).to.have.lengthOf(4);
                            expect(res.body.meta.total).to.equal(4);
                        })
                        .end(done);
                });
        });
    });

    describe(':: multi-word model name', function() {
        it('should receive and return a camelCase payload envelope', function(done) {
            supertest(sails.hooks.http.app)
                .patch('/assessmentquestions/1')
                .send(updateAssessmentQuestion)
                .expect(200)
                .expect(res => {
                    expect(res.body.assessmentQuestions).to.be.an.instanceof(Array);
                })
                .expect(res => {
                    expect(res.body.assessmentQuestions[0].name).to.equal('Question 1:Addendum');
                })
                .end(done);
        });

        it('should fail to update attributes if sent a kebab-case payload envelope', function(done) {
            supertest(sails.hooks.http.app)
                .patch('/assessmentquestions/1')
                .send(badAssessmentQuestion)
                .expect(200)
                .expect(res => {
                    expect(res.body.assessmentQuestions[0].identiField).not.to.equal('ZZ');
                })
                .end(done);
        });
    });
});
