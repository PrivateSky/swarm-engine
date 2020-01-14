function IframePowerCord(iframe){

    this.sendSwarm = function (swarmSerialization){
        iframe.contentWindow.postMessage(swarmSerialization, iframe.src);
    };

    let receivedMessageHandler  = (event)=>{
        console.log("Message received in parent",event);
        this.transfer(event.data);
    };

    let subscribe = () => {
        window.addEventListener("message",receivedMessageHandler)
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