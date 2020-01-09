function InnerThreadPowerCord() {
    const worker_threads = "worker_threads";
    const {parentPort} = require(worker_threads);

    this.sendSwarm = function (swarmSerialization) {
        parentPort.postMessage(swarmSerialization);
    };

}

module.exports = InnerThreadPowerCord;
