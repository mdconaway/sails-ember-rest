export default {
  attributes: {
    name: {
      type: 'string',
      required: true,
      minLength: 1
    },
    age: {
      type: 'number',
      required: true
    },
    articles: {
      collection: 'article',
      via: 'author'
    },
    comments: {
      collection: 'comment',
      via: 'author'
    },
    publishers: {
      collection: 'publisher',
      via: 'authors'
    }
  }
};
