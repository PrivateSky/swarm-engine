
function OuterIsolatePowerCord(energySource, numberOfWires = 1, apis) { // seed or array of constitution bundle paths
    const syndicate = require('../../syndicate');
    let pool = null;

    function connectToEnergy() {
        const config = {
            maximumNumberOfWorkers: numberOfWires,
            workerOptions: {
                workerData: {
                    constitutions: energySource
                }
            }
        };

        pool = syndicate.createWorkerPool(config, (isolate) => {
            if(!apis) {
                return
            }

            Object.keys(apis).forEach(fnName => {
                isolate.globalSetSync(fnName, apis[fnName]);
            });
        });

    }

    connectToEnergy();

    this.startSwarm = function (swarmSerialization) {
        pool.addTask(swarmSerialization, this.transfer);
    };

}

module.exports = OuterIsolatePowerCord;
