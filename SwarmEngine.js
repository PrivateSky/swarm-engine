function SwarmEngine(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext){
    let _identity = "anonymous";
    let swarmInstancesCache = {

    };

    this.setNameService = function(ns){
        nameService = ns;
    };

    this.setSerialisationStrategy = function(ss){
        serialisationStrategy = ss;
    };

    this.setsecurityContext = function(sc){
        securityContext = sc;
    };

    this.init = function(identity){
        _identity = identity;
    };

    this.stop = function(){

    };

    /* ???
    swarmCommunicationStrategy.enableSwarmExecution(function(swarm){

    }); */


    this.sendSwarm = function(valueObject, command, destinationContext,  phaseName, args ){
        serialisationStrategy.cleanJSONSerialisation(valueObject, phaseName, args, function(err,jsMsg){
            jsMsg.meta.target = destinationContext;
            jsMsg.meta.command = command;
            swarmCommunicationStrategy.dispatch(jsMsg)
        });
    }

    this.waitForSwarm = function(callback, swarm, keepAliveCheck){

        function doLogic(){
            let  swarmId = swarm.getInnerValue().meta.swarmId;
            let  watcher = swarmInstancesCache[swarmId];
            if(!watcher){
                watcher = {
                    swarm:swarm,
                    callback:callback,
                    keepAliveCheck:keepAliveCheck
                };
                swarmInstancesCache[swarmId] = watcher;
            }
        }

        function filter(){
            return swarm.getInnerValue().meta.swarmId;
        }

        //$$.uidGenerator.wait_for_condition(condition,doLogic);
        swarm.observe(doLogic, null, filter);
    };

    function cleanSwarmWaiter(swarmSerialisation){ // TODO: add better mechanisms to prevent memory leaks
        let  swarmId = swarmSerialisation.meta.swarmId;
        let  watcher = swarmInstancesCache[swarmId];

        if(!watcher){
            $$.warn("Invalid swarm received: " + swarmId);
            return;
        }

        let  args = swarmSerialisation.meta.args;
        args.push(swarmSerialisation);

        watcher.callback.apply(null, args);
        if(!watcher.keepAliveCheck()){
            delete swarmInstancesCache[swarmId];
        }
    }

    this.revive_swarm = function(swarmSerialisation){

        let  swarmId     = swarmSerialisation.meta.swarmId;
        let  swarmType   = swarmSerialisation.meta.swarmTypeName;
        let  instance    = swarmInstancesCache[swarmId];

        let  swarm;

        if(instance){
            swarm = instance.swarm;
            swarm.update(swarmSerialisation);

        } else {
            if(typeof $$.blockchain !== "undefined") {
                swarm = $$.swarm.startWithContext($$.blockchain, swarmType);
            }else{
                swarm = $$.swarm.start(swarmType);
            }

            if(!swarm){
                throw new Error(`Unknown swarm with type <${swarmType}>. Check if this swarm is defined in the domain constitution!`);
            }else{
                swarm.update(swarmSerialisation);
            }

            /*swarm = $$.swarm.start(swarmType, swarmSerialisation);*/
        }

        if (swarmSerialisation.meta.command === "asyncReturn") {
            let  co = $$.PSK_PubSub.publish($$.CONSTANTS.SWARM_RETURN, swarmSerialisation);
            console.log("Subscribers listening on", $$.CONSTANTS.SWARM_RETURN, co);
            // cleanSwarmWaiter(swarmSerialisation);
        } else if (swarmSerialisation.meta.command === "executeSwarmPhase") {
            swarm.runPhase(swarmSerialisation.meta.phaseName, swarmSerialisation.meta.args);
        } else {
            console.log("Unknown command", swarmSerialisation.meta.command, "in swarmSerialisation.meta.command");
        }

        return swarm;
    }
}



module.exports.createSwarmEngine = function(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext){
    if(!swarmCommunicationStrategy){
        console.error("swarmCommunicationStrategy can't be undefined");
    }
    $$.swarmEngine = new SwarmEngine(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext);
    return $$.swarmEngine;
}