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
      via: 'author',
      meta: {
          list: 'record',
          detail: 'record'
      }
    },
    comments: {
      collection: 'comment',
      via: 'author',
      meta: {
        list: 'record',
        detail: 'record'
      }
    }
  }
};
