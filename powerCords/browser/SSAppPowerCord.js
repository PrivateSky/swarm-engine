/*
	This type of PowerCord can be used from outer and inner SSApp in order to facilitate the SWARM communication
	@param reference can be the parent (SSApp or wallet environment) or the iframe in which the SSApp gets loaded
*/
function SSAppPowerCord(reference){

	this.sendSwarm = function (swarmSerialization){
		//console.log("Sending swarm using", reference);
		reference.postMessage(swarmSerialization, "*");
	};

	let receivedMessageHandler  = (event)=>{
		console.log("SSAppPowerCord caught event", event);
		/*if(event.source !== reference){
			console.log("Not my message to handle");
			return;
		}
		console.log("Message received from ssapp", event.source);
		*/
		let swarmSerialization = event.data;
		this.transfer(swarmSerialization);
	};

	let setupConnection = () => {
		if(typeof window.powerCordHandler === "undefined"){
			//console.log("SSAPP PC listener set up");
			window.powerCordHandler = receivedMessageHandler;
			window.addEventListener("message", window.powerCordHandler);
		}else{
			//console.log("SSAPP handler already set.");
		}
	};

	return new Proxy(this, {
		set(target, p, value, receiver) {
			target[p] = value;
			if(p === 'identity') {
				setupConnection();
			}
			return true;
		}
	});
}

module.exports = SSAppPowerCord;
