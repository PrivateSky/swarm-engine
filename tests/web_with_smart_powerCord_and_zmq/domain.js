require("../../../../psknode/bundles/pskruntime.js");
require("../../../../psknode/bundles/pskWebServer.js");
const path = require("path");

const se = pskruntimeRequire("swarm-engine");
se.initialise("domain");

const powerCordToDomain = new se.SmartRemoteChannelPowerCord(["http://127.0.0.1:8080/", "http://127.0.0.1:1080/", "http://127.0.0.1:2080/"], "domain", "tcp://127.0.0.1:5000");
$$.swarmEngine.plug("*", powerCordToDomain);
const constitution = [
    path.join(__dirname, '../../../../psknode/bundles/sandboxBase.js'),
    path.join(__dirname, '../../../../psknode/bundles/pskruntime.js'),
    path.join(__dirname, "../swarmCollection/basicSwarm.js")
];

const agentPC = new se.OuterIsolatePowerCord(constitution);
$$.swarmEngine.plug("domain/agent/agent007", agentPC);

/*
$$.swarms.describe("echo", {
    say: function(){
        this.return("For sure it works!");
    },
    again: function(){
        this.interact("back", "Trust me, it works!");
    }
});*/
