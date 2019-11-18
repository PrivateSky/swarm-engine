require('../../../psknode/bundles/pskruntime');
let dc = require('../../double-check');
let swarm = require('../../choreo');
let assert = dc.assert;
let myModule = require('../index');


let nameService = myModule.createNameService("default");
let serialisationStrategy = myModule.createSerialisationStrategy("json");

let swarmCommunicationStrategy = myModule.createCommunicationStrategy("local", nameService, serialisationStrategy);

let securityContext = myModule.createSecurityContext();

myModule.initialiseSwarmEngine(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext);

nameService.registerLocation("Agent1", "Agent1");
nameService.registerLocation("Agent2", "Agent2");

let swarmDefinition = $$.swarm.describe("TestSwarm", {
    phase1:function(){
        this.swarm("Agent1", "phase2", "from Agent 1");
    },
    phase2:function(message){
        console.log(message);
    }
})


swarmDefinition().phase1();

