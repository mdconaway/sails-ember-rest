import { Actions } from '../../../index.js';
const { Find } = Actions;

export default new Find((req, res, next, Model, record) => {
    //You can perform any interrupt work here...
    next();
});
