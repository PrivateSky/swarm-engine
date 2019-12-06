
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

            isolate.globalSetSync("getIdentity", () => {
                return superThis.identity;
            });

            if(!apis) {
                return
            }

            Object.keys(apis).forEach(fnName => {
                isolate.globalSetSync(fnName, apis[fnName]);
            });
        });

    }

    let superThis = this;
    connectToEnergy();


    this.sendSwarm = function (swarmSerialization) {
        pool.addTask(swarmSerialization, (message) => {
            if (message instanceof Error) {
                throw message
            }
console.log("Uite ca primesc un mesaj de la isolate", message.toString());
            this.transfer(message);
        });
    };

}

module.exports = OuterIsolatePowerCord;
