module.exports.createForObject = function(valueObject, thisObject, localId){
    let cm = require("callflow");
    let CNST = require("../moduleConstants");

    let swarmFunction = function(destinationContext, phaseName, ...args){
        //make the execution at level 0  (after all pending events) and wait to have a swarmId
        ret.observe(function(){
            $$.swarmEngine.sendSwarm(valueObject,CNST.EXECUTE_PHASE_COMMAND, destinationContext,  phaseName, args);
        },null,null);
        ret.notify();
        return thisObject;
    };


    let ret = cm.createStandardAPIsForSwarms(valueObject, thisObject, localId);

    ret.swarm           = swarmFunction;
    ret.swarmAs         = swarmFunction;

    ret.home            = null;
    ret.onReturn        = null;
    ret.onResult        = null;

    ret.asyncReturn     = null;
    ret.return          = null;

    ret.off             = off;

    ret.autoInit        = function(someContext){

    };

    return ret;
};