function SwarmEngine(identity){
    let myOwnIdentity = identity || SwarmEngine.prototype.ANONYMOUS_IDENTITY;

    //loading swarm space
    let cm = require("callflow");
    let swarmUtils = require("./swarms/swarm_template-se");

    const protectedFunctions = {};

    const SwarmPacker = require("../swarmutils").SwarmPacker;
    //serializationType used when starting a swarm from this SwarmEngine instance
    let serializationType = SwarmPacker.prototype.JSON;

    const swarmInstancesCache = new Map();
    const powerCordCollection = new Map();

    this.updateIdentity = function (identify) {
        if(myOwnIdentity === SwarmEngine.prototype.ANONYMOUS_IDENTITY){
            console.log("Updating my identity with", identify);
            myOwnIdentity = identify;
        }else{
            $$.err(`Trying to changing identity from "${myOwnIdentity}" to "${identify}"`);
        }
    };

    this.setSerializationType = function(type){
        if(typeof SwarmPacker.getSerializer(type) !== "undefined"){
            serializationType = type;
        }else{
            $$.throw(`Unknown serialization type "${type}"`);
        }
    };

    this.plug = function(identity, powerCordImpl){
        makePluggable(powerCordImpl);
        powerCordImpl.plug(identity, relay);

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

    this.startSwarmAs = function(identity, swarmTypeName, phaseName, ...args){
        protectedFunctions.sendSwarm(createBaseSwarm(swarmTypeName), SwarmEngine.EXECUTE_PHASE_COMMAND, identity, phaseName, args);
    };

    function relay(swarmSerialization) {
try {


    /*if(swarmSerialization instanceof ArrayBuffer) {
        console.log('swarm....', new Uint8Array(swarmSerialization).toString());
    } else {
        console.log('not good swarm', swarmSerialization.toString(), arguments[1], '\n\n\n\n')
    }

    console.log('AM AJUNS AICI MACAR????', global.getIdentity && global.getIdentity(), ArrayBuffer.isView(swarmSerialization), typeof swarmSerialization, swarmSerialization instanceof ArrayBuffer);*/
    console.log("SwarmEngine-ul cu identitatea", myOwnIdentity, "a primit serializarea", swarmSerialization.toString());

    const swarmutils = require('swarmutils');

    const OwM = swarmutils.OwM;
    const SwarmPacker = swarmutils.SwarmPacker;

    const swarmHeader = SwarmPacker.getHeader(swarmSerialization);
    const swarmTargetIdentity = swarmHeader.swarmTarget;


    console.log("incerc sa aflu daca eu trebuie sa execut", myOwnIdentity, swarmTargetIdentity);
    if (myOwnIdentity === swarmTargetIdentity) {
        const deserializedSwarm = OwM.prototype.convert(SwarmPacker.unpack(swarmSerialization));
        protectedFunctions.execute_swarm(deserializedSwarm);
        return;
    }
    console.log("incerc sa aflu powercordul", myOwnIdentity, swarmTargetIdentity);
    const targetPowerCord = powerCordCollection.get(swarmTargetIdentity) || powerCordCollection.get(SwarmEngine.WILD_CARD_IDENTITY);

    if (targetPowerCord) {
        console.log("apelez powercordul", myOwnIdentity, swarmTargetIdentity);
        targetPowerCord.sendSwarm(swarmSerialization);
        return;
    } else {
        $$.err(`Bad Swarm Engine configuration. No PowerCord for identity "${swarmTargetIdentity}" found.`);
    }
}catch(superError){
    console.log(superError)
}
    }

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

    function createBaseSwarm(swarmTypeName) {
        const swarmutils = require('swarmutils');
        const OwM = swarmutils.OwM;
        const swarm = new OwM();
        swarm.setMeta("swarmId", $$.uidGenerator.safe_uuid());
        swarm.setMeta("requestId", swarm.getMeta("swarmId"));
        swarm.setMeta("swarmTypeName", swarmTypeName);
        swarm.setMeta(SwarmEngine.META_SECURITY_HOME_CONTEXT, myOwnIdentity);
        return swarm;
    }

    protectedFunctions.sendSwarm = function(swarmAsVO, command, identity, phaseName, args){
        swarmAsVO.setMeta("phaseName", phaseName);
        swarmAsVO.setMeta("target", identity);
        swarmAsVO.setMeta("command", command);
        swarmAsVO.setMeta("args", args);

        relay(serialize(swarmAsVO));
    };

    protectedFunctions.waitForSwarm = function(callback, swarm, keepAliveCheck){

        function doLogic(){
            let  swarmId = swarm.getInnerValue().meta.swarmId;
            let  watcher = swarmInstancesCache.get(swarmId);
            if(!watcher){
                watcher = {
                    swarm: swarm,
                    callback: callback,
                    keepAliveCheck: keepAliveCheck
                };
                swarmInstancesCache.set(swarmId, watcher);
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

    protectedFunctions.execute_swarm = function(swarmOwM){

        let swarmId     = swarmOwM.getMeta('swarmId');
        let swarmType   = swarmOwM.getMeta('swarmTypeName');
        let instance    = swarmInstancesCache.get(swarmId);

        let swarm;

        if (instance){
            swarm = instance.swarm;
            swarm.update(swarmOwM);

        } else {
            if(typeof $$.blockchain !== "undefined") {
                swarm = $$.swarm.startWithContext($$.blockchain, swarmType);
            }else{
                swarm = $$.swarm.start(swarmType);
            }

            if(!swarm){
                throw new Error(`Unknown swarm with type <${swarmType}>. Check if this swarm is defined in the domain constitution!`);
            }else{
                swarm.update(swarmOwM);
            }

            /*swarm = $$.swarm.start(swarmType, swarmSerialisation);*/
        }

        const swarmCommand = swarmOwM.getMeta('command');

        switch (swarmCommand) {
            case SwarmEngine.EXECUTE_PHASE_COMMAND:
                swarm.runPhase(swarmOwM.meta.phaseName, swarmOwM.meta.args);
                break;
            case SwarmEngine.EXECUTE_INTERACT_PHASE_COMMAND:
                break;
            case SwarmEngine.RETURN_PHASE_COMMAND:
                break;
            default:
                $$.err(`Unrecognized swarm command ${swarmCommand}`);
        }

        // if (swarmOwM.meta.command === "asyncReturn") {
        //     let  co = $$.PSK_PubSub.publish($$.CONSTANTS.SWARM_RETURN, swarmOwM);
        //     console.log("Subscribers listening on", $$.CONSTANTS.SWARM_RETURN, co);
        //     // cleanSwarmWaiter(swarmSerialisation);
        // } else if (swarmOwM.meta.command === "executeSwarmPhase") {
        //     swarm.runPhase(swarmOwM.meta.phaseName, swarmOwM.meta.args);
        // } else {
        //     console.log("Unknown command", swarmOwM.meta.command, "in swarmSerialisation.meta.command");
        // }
        //
        // return swarm;
    };

    $$.swarms           = cm.createSwarmEngine("swarm", swarmUtils.getTemplateHandler(protectedFunctions));
    $$.swarm            = $$.swarms;
}

Object.defineProperty(SwarmEngine.prototype, "EXECUTE_PHASE_COMMAND", {value: "executeSwarmPhase"});
Object.defineProperty(SwarmEngine.prototype, "EXECUTE_INTERACT_PHASE_COMMAND", {value: "executeInteractPhase"});
Object.defineProperty(SwarmEngine.prototype, "RETURN_PHASE_COMMAND", {value: "return"});

Object.defineProperty(SwarmEngine.prototype, "META_RETURN_CONTEXT", {value: "returnContext"});
Object.defineProperty(SwarmEngine.prototype, "META_SECURITY_HOME_CONTEXT", {value: "homeSecurityContext"});
Object.defineProperty(SwarmEngine.prototype, "META_WAITSTACK", {value: "waitStack"});

Object.defineProperty(SwarmEngine.prototype, "ANONYMOUS_IDENTITY", {value: "anonymous"});
Object.defineProperty(SwarmEngine.prototype, "SELF_IDENTITY", {value: "self"});
Object.defineProperty(SwarmEngine.prototype, "WILD_CARD_IDENTITY", {value: "*"});

function makePluggable(powerCord){
    powerCord.plug = function (identity, powerTransfer) {
        powerCord.transfer = powerTransfer;
        Object.defineProperty(powerCord, "identity", {value: identity});
    };

    powerCord.unplug = function () {
        powerCord.transfer = null;
    };

    return powerCord;
}

module.exports = SwarmEngine;