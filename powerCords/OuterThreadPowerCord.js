function OuterThreadPowerCord(threadBootScript, evaluate= false, energySourceSeed, numberOfWires = 1) { // seed or array of constitution bundle paths
    const syndicate = require('syndicate');
    let pool = null;
    let self = this;

    function connectToEnergy() {
        const config = {
            maximumNumberOfWorkers: numberOfWires,
            workerStrategy: syndicate.WorkerStrategies.THREADS,
            bootScript: threadBootScript,
            workerOptions: {
                // cwd: process.env.DOMAIN_WORKSPACE,
                eval: evaluate,
                env: {
                    IDENTITY: self.identity
                },
                workerData: {
                    constitutionSeed: energySourceSeed
                }
            }
        };

        pool = syndicate.createWorkerPool(config);

    }

    this.sendSwarm = function (swarmSerialization) {
        pool.addTask(swarmSerialization, (err, msg) => {
            if (err instanceof Error) {
                throw err;
            }

            this.transfer(msg.buffer || msg);
        });
    };

    return new Proxy(this, {
        set(target, p, value, receiver) {
            target[p] = value;
            if(p === 'identity') {
                connectToEnergy();
            }
        }
    })
}

module.exports = OuterThreadPowerCord;
