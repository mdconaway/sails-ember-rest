export default {
    attributes: {
        name: {
            type: 'string',
            required: true,
            minLength: 1
        },
        bars: {
            collection: 'bar',
            via: 'foos'
        },
        myBar: {
            model: 'bar'
        }
    }
};
