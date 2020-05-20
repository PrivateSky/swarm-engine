function InnerWebWorkerPowerCord() {
    this.sendSwarm = function (swarmSerialization) {
        postMessage(swarmSerialization);
    };

}

module.exports = InnerWebWorkerPowerCord;
