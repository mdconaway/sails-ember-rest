export default {
  attributes: {
    title: {
      type: 'string',
      required: true,
      minLength: 1
    },
    author: {
      model: 'author'
    },
    comments: {
      collection: 'comment',
      via: 'article'
    }
  }
};
