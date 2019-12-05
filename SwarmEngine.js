function SwarmEngine(){

    //loading swarm space
    let cm = require("callflow");
    let swarmUtils = require("./swarms/swarm_template-se");

    const protectedFunctions = {};

    const SwarmPacker = require("../swarmutils").SwarmPacker;
    //serializationType used when starting a swarm from this SwarmEngine instance
    let serializationType = SwarmPacker.prototype.JSON;

    const swarmInstancesCache = new Map();
    const powerCordCollection = new Map();

    this.setSerializationType = function(type){
        if(typeof SwarmPacker.getSerializer(type) !== "undefined"){
            serializationType = type;
        }else{
            $$.throw(`Unknown serialization type "${type}"`);
        }
    };

    this.plug = function(identity, powerCordImpl){
        makePluggable(powerCordImpl);
        powerCordImpl.plug(relay);

        powerCordCollection.set(identity, powerCordImpl);
    };

    this.unplug = function(identity){
        const powerCord = powerCordCollection.get(identity);

        if (!powerCord) {
            //silent fail
            return;
        }

        powerCord.unplug();
        powerCordCollection.delete(identity);
    };

    function getPowerCord(identity){
        const powerCord = powerCordCollection.get(identity);

        if (!powerCord) {
            //should improve the search of powerCord based on * and self :D

            $$.throw(`No powerCord found for the identity "${identity}"`);
        }

        return powerCord;
    }

    /* ???
    swarmCommunicationStrategy.enableSwarmExecution(function(swarm){

    }); */

    function serialize(swarm){
        const beesHealer = require("../swarmutils").beesHealer;
        const simpleJson = beesHealer.asJSON(swarm, swarm.meta.phaseName, swarm.meta.args);
        const serializer = SwarmPacker.getSerializer(swarm.meta.serializationType || serializationType);
        return SwarmPacker.pack(simpleJson, serializer);
    }

    function createBaseOfStartSwarmCommand() {
        const swarmutils = require('swarmutils');
        const OwM = swarmutils.OwM;
        const swarm = new OwM();
        swarm.setMeta("swarmId", $$.uidGenerator.safe_uuid());
        swarm.setMeta("requestId", swarm.getMeta("swarmId"));

        swarm.setMeta("command", SwarmEngine.prototype.EXECUTE_PHASE_COMMAND);
        return swarm;
    }

    this.startSwarmAs = function(identity, swarmName, swarmPhase, ...args){
        protectedFunctions.sendSwarm(createBaseOfStartSwarmCommand(identity, swarmName, phaseName, args));
    };

    protectedFunctions.sendSwarm = function(swarmAsVO, command, identity, phaseName, args){
        const powerCord = getPowerCord(identity);

        swarmAsVO.setMeta("swarmTypeName", swarmTypeName);
        swarmAsVO.setMeta("phaseName", phaseName);
        swarmAsVO.setMeta("target", identity);
        swarmAsVO.setMeta("args", args);

        powerCord.sendSwarm(serialize(swarmAsVO));
    };

    protectedFunctions.waitForSwarm = function(callback, swarm, keepAliveCheck){

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

    protectedFunctions.revive_swarm = function(swarmSerialisation){

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

    $$.swarms           = cm.createSwarmEngine("swarm", swarmUtils.getTemplateHandler(protectedFunctions));
    $$.swarm            = $$.swarms;
}

Object.defineProperty(SwarmEngine.prototype, "EXECUTE_PHASE_COMMAND", {value: "executeSwarmPhase"});
Object.defineProperty(SwarmEngine.prototype, "RETURN_PHASE_COMMAND", {value: "return"});
Object.defineProperty(SwarmEngine.prototype, "META_RETURN_CONTEXT", {value: "returnContext"});
Object.defineProperty(SwarmEngine.prototype, "META_WAITSTACK", {value: "waitStack"});

function makePluggable(powerCord){
    powerCord.plug = function (powerTransfer) {
        powerCord.transfer = powerTransfer;
    };

    powerCord.unplug = function () {
        powerCord.transfer = null;
    };

    return powerCord;
}

module.exports = new SwarmEngine();