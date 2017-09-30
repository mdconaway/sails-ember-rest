export default {
    attributes: {
        name: {
            type: 'string',
            required: true,
            minLength: 1
        },
        foos: {
            collection: 'foo',
            via: 'bars'
        },
        identiField: {
            type: 'string',
            minLength: 1
        },
        myFoo: {
            model: 'foo'
        }
    }
};
