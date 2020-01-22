function OuterIsolatePowerCord(energySource, numberOfWires = 1, apis) { // seed or array of constitution bundle paths
    const syndicate = require('../../syndicate');
    const bootScripts = require('../bootScripts');
    let pool = null;


    function connectToEnergy() {
        const WorkerStrategies = syndicate.WorkerStrategies;

        const config = {
            bootScript: bootScripts.getIsolatesBootScript(),
            maximumNumberOfWorkers: numberOfWires,
            workerStrategy: WorkerStrategies.ISOLATES,
            workerOptions: {
                workerData: {
                    constitutions: energySource
                },
                externalApi: apis
            }
        };

        pool = syndicate.createWorkerPool(config, (isolate) => {

            isolate.globalSetSync("getIdentity", () => {
                return superThis.identity;
            });
        });

    }

    let superThis = this;
    connectToEnergy();


    this.sendSwarm = function (swarmSerialization) {
        pool.addTask(swarmSerialization, (err, msg) => {
            if (err instanceof Error) {
                throw err;
            }

            this.transfer(msg.buffer || msg);
        });
    };

}

module.exports = OuterIsolatePowerCord;
