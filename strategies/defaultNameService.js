const ALL = "all";

function NameService(){
    let registry = {};

    let groups = {ALL:{}};

    this.getLocation = function(identity){
        return registry[identity];
    }

    this.registerLocation = function(identity, localtionObject, group){
        if(!groups[group]){
            groups[group] = {};
        }
        groups[group][identity] = identity;
        groups[ALL][identity] = identity;
        registry[identity] = localtionObject;
    }

    this.asyncEnumerateGroupMembers = function(group, callback){
        if(!groups[group]) return;
        for(let g in groups[group]){
            callback(g);
        }
    }
}

module.exports.createStrategy = function(...args){
    return new NameService(...args);
}