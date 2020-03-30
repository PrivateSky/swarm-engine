function HostBootScript(identity){
    require('callflow').initialise();
    const se = require("swarm-engine");
    se.initialise(identity);
    const SRPC = se.SmartRemoteChannelPowerCord;
    let swUrl = "http://localhost:8080/";
    const powerCord = new SRPC([swUrl]);
    $$.swarmEngine.plug("test/agent/007", powerCord);
}

module.exports = HostBootScript;


