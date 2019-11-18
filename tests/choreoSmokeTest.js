require('../../../psknode/bundles/pskruntime');
let dc = require('../../double-check');
let assert = dc.assert;
let choreo = require('../../choreo');


let nameService = choreo.createNameService("default");
let serialisationStrategy = choreo.createSerialisationStrategy("json");

let swarmCommunicationStrategy = choreo.createCommunicationStrategy("local", nameService, serialisationStrategy);

let securityContext = choreo.createSecurityContext();

choreo.initialiseSwarmEngine(swarmCommunicationStrategy, nameService, serialisationStrategy, securityContext);

nameService.registerLocation("Agent1", "Agent1");
nameService.registerLocation("Agent2", "Agent2");

let swarmDefinition = $$.swarm.define("TestSwarm", {
    phase1:function(){
        this.swarm("Agent1", "phase2", "from Agent 1");
    },
    phase2:function(message){
        console.log(message);
    }
})


swarmDefinition.startSwarm().phase1();

