module.exports = {
    initialise:function(){
        if(typeof $$.swarmEngine === "undefined"){
            $$.swarmEngine = require("./SwarmEngine");
        }else{
            $$.throw("Swarm engine already initialized!");
        }
    },
    OuterIsolatePowerCord: require("./powerCords/OuterIsolatePowerCord")
};