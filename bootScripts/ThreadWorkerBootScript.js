function boot() {
    const worker_threads ='worker_threads';
    const {parentPort, workerData} = require(worker_threads);

    process.on("uncaughtException", (err) => {
        console.error('unchaughtException inside worker', err);
        setTimeout(() => {
            process.exit(1);
        }, 100);
    });

    function getSeed(callback){
        let err;
        if (!workerData.hasOwnProperty('constitutionSeed') || typeof workerData.constitutionSeed !== "string") {
            err = new Error(`Missing or wrong type of constitutionSeed in worker data configuration: ${JSON.stringify(workerData)}`);
            if(!callback){
                throw err;
            }
        }
        if(callback){
            return callback(err, workerData.constitutionSeed);
        }
        return workerData.constitutionSeed;
    }

    let edfs;
    function getEDFS(callback){
        const EDFS = require("edfs");
        EDFS.attachWithSeed(getSeed(), (err, edfsInst) => {
            if (err) {
                return callback(err);
            }

            edfs = edfsInst;
            callback(null, edfs);
        });
    }

    function initializeSwarmEngine(callback){
        require('callflow').initialise();
        const swarmEngine = require('swarm-engine');

        swarmEngine.initialise(process.env.IDENTITY);
        const powerCord = new swarmEngine.InnerThreadPowerCord();

        $$.swarmEngine.plug($$.swarmEngine.WILD_CARD_IDENTITY, powerCord);

        parentPort.on('message', (packedSwarm) => {
            powerCord.transfer(packedSwarm);
        });

        edfs.bootRawDossier(workerData.constitutionSeed, (err, csbhandler) =>{
            if(err){
                $$.throwError(err);
            }
            callback();
        });
    }

    const BootEngine = require("./BootEngine.js");

    const booter = new BootEngine(getSeed, getEDFS, initializeSwarmEngine, ["pskruntime.js", "blockchain.js"], ["domain.js"]);

    booter.boot((err) => {
        if(err){
            throw err;
        }
        parentPort.postMessage('ready');
    });
}

boot();
//module.exports = boot.toString();
