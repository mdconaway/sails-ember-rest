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
        myFoo: {
            model: 'foo'
        }
    }
};
