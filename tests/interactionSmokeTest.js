const Swarm_Engine = require("./index");

//$$.swarmEngine - instanta noua
Swarm_Engine.initialize();
//pana in acest punct swarmEngine este capabil sa execute flow-uri si swarm-uri la nivel local de proces

/*exemple de powercord-uri


SendingToIsolatePC // folosit de un domeniu astfel incat sa poata instantia un isolate si sa ii trimita task-uri
ReceivingFromIsolatePC // folosit de un domeniu astfel incat sa poata primi de la un isolate raspunsuri

IsolateSendingPC // folosit de isolate spre a comunica cu "lumea exterioara" domeniul ce l-a pornit
IsolateReceivingPC // folosit de isolate spre a primi task-uri

*/

// etapa de configurare powerCord-uri

$$.swarmEngine.plug("Identity", powerCord);
//unde identity poate fi : numeDomeniu/agent/numeAgent
//                         numeDomeniu/agent/*
//                         *
//                         self

$$.interactions.attachTo(swarmName, {
    interactionPhase1: function () {
        this.swarm("phase2", "from Agent 1");
        this.swarmAs(agent,...);
        this.off();
    },
    phase2: function (message) {
        console.log(message);
    }
})


let interaction1 = $$.interactions.startSwarmAs(agentIdentity,swarmName, phaseName, arg1, arg2).on({
        phase2:function(message){
            console.log(message);
        }
    });

let interaction2 = $$.interactions.startSwarmAs(agentIdentity,swarmName, phaseName, arg1, arg2);

interaction2.off();

swarmDefinition().phase1();

