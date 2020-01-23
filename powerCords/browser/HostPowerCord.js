function HostPowerCord(parent){

    this.sendSwarm = function (swarmSerialization){
        parent.postMessage(swarmSerialization, "*");
    };

    let receivedMessageHandler  = (event)=>{
        console.log("Message received in iframe",event);
        let swarmSerialization = event.data;
        this.transfer(swarmSerialization);
    };

    let subscribe = () => {
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


module.exports = HostPowerCord;