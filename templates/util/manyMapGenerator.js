//This crude map generator is only needed until waterline provides a means to count relationships
module.exports = function generateManyMap(models){
    const aliasMap = {};
    Object.keys(models).forEach((k) => {
        let model = models[k];
        //only user-defined models have a global-id
        if(model.globalId) 
        {
            let name = model.identity;
            aliasMap[name] = {};
            model.associations.forEach((assoc) => {
                //hasMany
                if(assoc.type === 'collection')
                {
                    let tgt = assoc.through ? assoc.through : assoc.collection;
                    models[tgt].associations.forEach((inverse) => {
                        //if the inverse is a collection, it will be found by the junction table scanner in the final else
                        if(inverse.alias === assoc.via && inverse.type === 'model'){
                            aliasMap[name][assoc.alias] = function(pk){
                                return function(done){
                                    let where = {};
                                    where[inverse.alias] = pk;
                                    models[tgt].count(where).exec(done);
                                };
                            };
                        }
                    });
                }
                //belongsTo
                else if(assoc.type === 'model')
                {
                    //count result of populate call on parent model
                    aliasMap[name][assoc.alias] = function(pk){
                        return function(done){
                            model.findOne(pk).populate(assoc.alias).exec((err, record) => {
                                if(err || !record)
                                {
                                    return done(null, 0);
                                }
                                return done(null, record[assoc.alias] ? 1 : 0);
                            });
                        };
                    };
                }
            });
        }
        else
        {
            //many<->many
            //traverse all the junction collections to enable counting them!!
            model.associations.forEach((assoc) => {
                //if there is no model key, this isn't a normal join table...
                if(assoc.model)
                {
                    let attrName = assoc.alias.split('_').pop();
                    aliasMap[assoc.model][attrName] = function(pk){
                        return function(done){
                            let where = {};
                            where[assoc.alias] = pk;
                            model.count(where).exec(done);
                        };
                    }; 
                }
            });
        }
    });
    return aliasMap;
}