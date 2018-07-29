export default {
  attributes: {
    text: {
      type: 'string',
      required: true,
      minLength: 1
    },
    author: {
      model: 'author'
    },
    article: {
      model: 'article'
    }
  }
};
