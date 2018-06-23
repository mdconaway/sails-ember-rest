import { Actions } from '../../../index.js';
const { Create } = Actions;

//If using single exported actions, a named interrupt can be passed to the action
//This is optional, and the action constructor can also be sent no value
export default new Create({
  create(req, res, next, Model, record) {
    //you can interrupt the action after database interaction here...
    next();
  }
});
