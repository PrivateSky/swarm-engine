
function SwarmEngine(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext){

    this.init = function(identity){

    }

    this.stop = function(){

    }

}

let psc = require("../../psk-security-context");

module.exports = {
    initialiseSwarmEngine:function(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext){
        return new SwarmEngine(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext);
    },
    createSerialisationStrategy:function(strategyName, ...args){
        switch(strategyName){
            case "json":
            case "JSON":
                return require("./strategies/JSONSerialisationStrategy").createStrategy(args);
            default: console.error("Unknown strategy ", strategyName);
        }
        return undefined;
    },
    createCommunicationStrategy:function(strategyName, ...args){
        switch(strategyName){
            case "fake":
            case "local":
                return require("./strategies/fakeCommunicationStrategy").createStrategy(args);
            case "sandbox":
                return require("./strategies/fakeCommunicationStrategy").createStrategy(args);
            case "serviceWorkers":
                return require("./strategies/fakeCommunicationStrategy").createStrategy(args);
            default: console.error("Unknown strategy ", strategyName);
        }
        return undefined;
    },
    createNameService:function(strategyName, ...args){
        switch(strategyName){
            case "default":
                return require("./strategies/defaultNameService").createStrategy(args);
            default: console.error("Unknown strategy ", strategyName);
        }
        return undefined;
    },
    createSecurityContext:function(strategyName, ...args){
        return psc.createSecurityContext(strategyName,...args);
    }
}