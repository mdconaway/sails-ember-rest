module.exports = function(){
    return function(req, res, next){
        if(!req.headers.ember)
        {
            req.headers.ember = true;
        }
        next();
    };
};