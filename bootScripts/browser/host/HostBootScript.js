function HostBootScript(identity) {
    if (typeof $$.flows === "undefined") {
        require('callflow').initialise();
    }

    const se = require("swarm-engine");
    if (typeof $$.swarmEngine === "undefined") {
        se.initialise(identity);
    }

    const SRPC = se.SmartRemoteChannelPowerCord;
    let location = window.location;
    let port = "";
    if(location.port !== "" && location.host.indexOf(":")===-1){
        port = `:${location.port}`;
    }
    let swUrl = `${location.protocol}//${location.host}${port}/`;

    const powerCord = new SRPC([swUrl]);
    $$.swarmEngine.plug("test/agent/007", powerCord);
}

module.exports = HostBootScript;