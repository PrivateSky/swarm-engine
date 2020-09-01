function HostBootScript(identity) {
    if (typeof $$.flows === "undefined") {
        require('callflow').initialise();
    }

    const se = require("swarm-engine");
    if (typeof $$.swarmEngine === "undefined") {
        se.initialise(identity);
    }

    const SRPC = se.SmartRemoteChannelPowerCord;
    let swUrl = "http://localhost:8080/";
    const powerCord = new SRPC([swUrl]);
    $$.swarmEngine.plug("test/agent/007", powerCord);
}

module.exports = HostBootScript;