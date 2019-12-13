function SwarmEngine(identity) {
    let myOwnIdentity = identity || SwarmEngine.prototype.ANONYMOUS_IDENTITY;

    const protectedFunctions = {};

    const SwarmPacker = require("swarmutils").SwarmPacker;
    //serializationType used when starting a swarm from this SwarmEngine instance
    let serializationType = SwarmPacker.prototype.JSON;

    const swarmInstancesCache = new Map();
    const powerCordCollection = new Map();

    this.updateIdentity = function (identify) {
        if (myOwnIdentity === SwarmEngine.prototype.ANONYMOUS_IDENTITY) {
            console.log("Updating my identity with", identify);
            myOwnIdentity = identify;
        } else {
            $$.err(`Trying to changing identity from "${myOwnIdentity}" to "${identify}"`);
        }
    };

    this.setSerializationType = function (type) {
        if (typeof SwarmPacker.getSerializer(type) !== "undefined") {
            serializationType = type;
        } else {
            $$.throw(`Unknown serialization type "${type}"`);
        }
    };

    this.plug = function (identity, powerCordImpl) {
        makePluggable(powerCordImpl);
        powerCordImpl.plug(identity, relay);

        powerCordCollection.set(identity, powerCordImpl);
    };

    this.unplug = function (identity) {
        const powerCord = powerCordCollection.get(identity);

        if (!powerCord) {
            //silent fail
            return;
        }

        powerCord.unplug();
        powerCordCollection.delete(identity);
    };

    function relay(swarmSerialization) {
        try {

            const swarmutils = require('swarmutils');

            const OwM = swarmutils.OwM;
            const SwarmPacker = swarmutils.SwarmPacker;

            const swarmHeader = SwarmPacker.getHeader(swarmSerialization);
            const swarmTargetIdentity = swarmHeader.swarmTarget;

            if (myOwnIdentity === swarmTargetIdentity) {
                const deserializedSwarm = OwM.prototype.convert(SwarmPacker.unpack(swarmSerialization));
                protectedFunctions.execute_swarm(deserializedSwarm);
                return;
            }

            const targetPowerCord = powerCordCollection.get(swarmTargetIdentity) || powerCordCollection.get(SwarmEngine.prototype.WILD_CARD_IDENTITY);

            if (targetPowerCord) {
                //console.log(myOwnIdentity, "calling powercord", swarmTargetIdentity);
                targetPowerCord.sendSwarm(swarmSerialization);
                return;
            } else {
                $$.err(`Bad Swarm Engine configuration. No PowerCord for identity "${swarmTargetIdentity}" found.`);
            }
        } catch (superError) {
            console.log(superError);
        }
    }

    function getPowerCord(identity) {
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

    function serialize(swarm) {
        const beesHealer = require("swarmutils").beesHealer;
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

    function cleanSwarmWaiter(swarmSerialisation) { // TODO: add better mechanisms to prevent memory leaks
        let swarmId = swarmSerialisation.meta.swarmId;
        let watcher = swarmInstancesCache[swarmId];

        if (!watcher) {
            $$.warn("Invalid swarm received: " + swarmId);
            return;
        }

        let args = swarmSerialisation.meta.args;
        args.push(swarmSerialisation);

        watcher.callback.apply(null, args);
        if (!watcher.keepAliveCheck()) {
            delete swarmInstancesCache[swarmId];
        }
    }

    protectedFunctions.startSwarmAs = function (identity, swarmTypeName, phaseName, ...args) {
        const swarm = createBaseSwarm(swarmTypeName);
        swarm.setMeta($$.swarmEngine.META_SECURITY_HOME_CONTEXT, myOwnIdentity);

        protectedFunctions.sendSwarm(swarm, SwarmEngine.EXECUTE_PHASE_COMMAND, identity, phaseName, args);
        return swarm;
    };

    protectedFunctions.sendSwarm = function (swarmAsVO, command, identity, phaseName, args) {

        swarmAsVO.setMeta("phaseName", phaseName);
        swarmAsVO.setMeta("target", identity);
        swarmAsVO.setMeta("command", command);
        swarmAsVO.setMeta("args", args);

        relay(serialize(swarmAsVO));
    };

    protectedFunctions.waitForSwarm = function (callback, swarm, keepAliveCheck) {

        function doLogic() {
            let swarmId = swarm.getInnerValue().meta.swarmId;
            let watcher = swarmInstancesCache.get(swarmId);
            if (!watcher) {
                watcher = {
                    swarm: swarm,
                    callback: callback,
                    keepAliveCheck: keepAliveCheck
                };
                swarmInstancesCache.set(swarmId, watcher);
            }
        }

        function filter() {
            return swarm.getInnerValue().meta.swarmId;
        }

        //$$.uidGenerator.wait_for_condition(condition,doLogic);
        swarm.observe(doLogic, null, filter);
    };

    protectedFunctions.execute_swarm = function (swarmOwM) {

        const swarmCommand = swarmOwM.getMeta('command');

        //console.log("Switching on command ", swarmCommand);
        switch (swarmCommand) {
            case SwarmEngine.prototype.EXECUTE_PHASE_COMMAND:
                let swarmId = swarmOwM.getMeta('swarmId');
                let swarmType = swarmOwM.getMeta('swarmTypeName');
                let instance = swarmInstancesCache.get(swarmId);

                let swarm;

                if (instance) {
                    swarm = instance.swarm;
                    swarm.update(swarmOwM);

                } else {
                    if (typeof $$.blockchain !== "undefined") {
                        swarm = $$.swarm.startWithContext($$.blockchain, swarmType);
                    } else {
                        swarm = $$.swarm.start(swarmType);
                    }

                    if (!swarm) {
                        throw new Error(`Unknown swarm with type <${swarmType}>. Check if this swarm is defined in the domain constitution!`);
                    } else {
                        swarm.update(swarmOwM);
                    }

                    /*swarm = $$.swarm.start(swarmType, swarmSerialisation);*/
                }
                swarm.runPhase(swarmOwM.meta.phaseName, swarmOwM.meta.args);
                break;
            case SwarmEngine.prototype.EXECUTE_INTERACT_PHASE_COMMAND:
                is.dispatch(swarmOwM);
                break;
            case SwarmEngine.prototype.RETURN_PHASE_COMMAND:
                is.dispatch(swarmOwM);
                break;
            default:
                $$.err(`Unrecognized swarm command ${swarmCommand}`);
        }
    };

    protectedFunctions.acknowledge = function(method, swarmId, swarmName, swarmPhase){
        powerCordCollection.forEach((powerCord, identity)=>{
            if(typeof powerCord[method] === "function"){
                powerCord[method].call(powerCord, swarmId, swarmName, swarmPhase);
            }
        });
    };

    require("./swarms")(protectedFunctions);
    const is = require("./interactions")(protectedFunctions);
}

Object.defineProperty(SwarmEngine.prototype, "EXECUTE_PHASE_COMMAND", {value: "executeSwarmPhase"});
Object.defineProperty(SwarmEngine.prototype, "EXECUTE_INTERACT_PHASE_COMMAND", {value: "executeInteractPhase"});
Object.defineProperty(SwarmEngine.prototype, "RETURN_PHASE_COMMAND", {value: "__return__"});

Object.defineProperty(SwarmEngine.prototype, "META_RETURN_CONTEXT", {value: "returnContext"});
Object.defineProperty(SwarmEngine.prototype, "META_SECURITY_HOME_CONTEXT", {value: "homeSecurityContext"});
Object.defineProperty(SwarmEngine.prototype, "META_WAITSTACK", {value: "waitStack"});

Object.defineProperty(SwarmEngine.prototype, "ANONYMOUS_IDENTITY", {value: "anonymous"});
Object.defineProperty(SwarmEngine.prototype, "SELF_IDENTITY", {value: "self"});
Object.defineProperty(SwarmEngine.prototype, "WILD_CARD_IDENTITY", {value: "*"});

function makePluggable(powerCord) {
    powerCord.plug = function (identity, powerTransfer) {
        powerCord.transfer = powerTransfer;
        powerCord.identity = identity;
    };

    powerCord.unplug = function () {
        powerCord.transfer = null;
    };

    Object.defineProperty(powerCord, "identity", {
        set: (value) => {
            if(typeof this.__identity === "undefined"){
                this.__identity = value;
            }
        }, get: () => {
            return this.__identity;
        }
    });

    return powerCord;
}

module.exports = SwarmEngine;