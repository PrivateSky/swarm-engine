/*
	This type of PowerCord can be used from outer and inner SSApp in order to facilitate the SWARM communication
	@param reference can be the parent (SSApp or wallet environment) or the iframe in which the SSApp gets loaded
*/
function SSAppPowerCord(reference){

	this.sendSwarm = function (swarmSerialization){
		reference.postMessage(swarmSerialization, "*");
	};

	let receivedMessageHandler  = (event)=>{
		console.log("SSAppPowerCord caught event", event);
		if(event.source !== reference){
			console.log("Not my message to handle");
			return;
		}
		console.log("Message received from ssapp", event.source);
		let swarmSerialization = event.data;
		this.transfer(swarmSerialization);
	};

	let setupConnection = () => {
		window.addEventListener("message", receivedMessageHandler);
	};

	return new Proxy(this, {
		set(target, p, value, receiver) {
			target[p] = value;
			if(p === 'identity') {
				setupConnection();
			}
		}
	});
}

module.exports = SSAppPowerCord;