exports.getTemplateHandler = function(swarmEngine){
    let cm = require("callflow");
    let CNST = require("../moduleConstants");

    let beesHealer = require("swarmutils").beesHealer;
    return {
        createForObject : function(valueObject, thisObject, localId){

            function messageIdentityFilter (valueObject){
                return valueObject.meta.swarmId;
            }

            let swarmFunction = function(destinationContext, phaseName, ...args){
                //make the execution at level 0  (after all pending events) and wait to have a swarmId
                ret.observe(function(){
                    swarmEngine.sendSwarm(valueObject,CNST.EXECUTE_PHASE_COMMAND, destinationContext,  phaseName, args);
                },null,null);
                ret.notify();
                return thisObject;
            };

            let asyncReturn = function(err, result){

                let destinationContext = valueObject.meta[CNST.META_RETURN_CONTEXT];
                if(!destinationContext && valueObject.meta[CNST.META_WAITSTACK]){
                    destinationContext = valueObject.meta[CNST.META_WAITSTACK].pop();
                }
                if(!destinationContext){
                    destinationContext =  valueObject.meta[CNST.META_HOME_CONTEXT];
                }

                swarmEngine.sendSwarm(valueObject, CNST.RETURN_PHASE_COMMAND, destinationContext ,  CNST.RETURN_PHASE_COMMAND, [err, result]);
            };

            function home(err, result){
                let homeContext = valueObject.meta[CNST.META_HOME_CONTEXT];
                swarmEngine.sendSwarm(valueObject, CNST.HOME_PHASE_COMMAND, homeContext,  CNST.HOME_PHASE_COMMAND, [err, result]);
            }

            function waitResults(callback, keepAliveCheck, swarm){
                if(!swarm){
                    swarm = this;
                }
                if(!keepAliveCheck){
                    keepAliveCheck = function(){
                        return false;
                    }
                }
                var inner = swarm.getInnerValue();
                if(!inner.meta[CNST.META_WAITSTACK]){
                    inner.meta[CNST.META_WAITSTACK] = [];
                    inner.meta[CNST.META_WAITSTACK].push($$.HRN_securityContext)
                }
                swarmEngine.waitForSwarm(callback, swarm, keepAliveCheck);
            }


            let ret = cm.createStandardAPIsForSwarms(valueObject, thisObject, localId);

            ret.swarm           = swarmFunction;
            ret.home            = home;
            ret.onReturn        = waitResults;
            ret.onResult        = waitResults;
            ret.asyncReturn     = asyncReturn;
            ret.return          = asyncReturn;

            ret.autoInit        = function(someContext){

            };

            return ret;
        }
    }
};