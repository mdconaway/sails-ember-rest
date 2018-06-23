export default {
  attributes: {
    name: {
      type: 'string',
      required: true,
      minLength: 1
    },
    identiField: {
      type: 'string',
      minLength: 1
    }
  }
};
