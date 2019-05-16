export default {
  attributes: {
    name: {
      type: 'string',
      required: true,
      minLength: 1
    },
    authors: {
      collection: 'author',
      via: 'publishers'
    }
  }
};
