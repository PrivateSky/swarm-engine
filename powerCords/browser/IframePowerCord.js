function IframePowerCord(iframe){

    let iframeSrc = iframe.src;

    this.sendSwarm = function (swarmSerialization){
        const SwarmPacker = require("swarmutils").SwarmPacker;

        try {
           SwarmPacker.getHeader(swarmSerialization);
        }
        catch (e) {
            console.error("Could not deserialize swarm");
        }

        if(iframe && iframe.contentWindow){
            iframe.contentWindow.postMessage(swarmSerialization, iframe.src);
        }
        else{
            //TODO: check if the iframe/psk-app should be loaded again
            console.error(`Iframe is no longer available. ${iframeSrc}`);
        }

    };

    let receivedMessageHandler  = (event)=>{

        if (event.source !== window) {
            console.log("Message received in parent", event);
            this.transfer(event.data);
        }

    };

    let subscribe = () => {

        // if(this.identity && this.identity!=="*"){
        // }
        // else{
        //     //TODO: you should use a power cord capable of handling * identities.
        //     console.error("Cannot handle identity '*'. You should use a power cord capable of handling '*' identities.")
        // }

        if(!window.iframePCMessageHandler){
            window.iframePCMessageHandler = receivedMessageHandler;
            window.addEventListener("message",receivedMessageHandler)
        }
    };

    return new Proxy(this, {
        set(target, p, value, receiver) {
            target[p] = value;
            if(p === 'identity') {
                subscribe.call(target);
            }
        }
    });
}

module.exports = IframePowerCord;