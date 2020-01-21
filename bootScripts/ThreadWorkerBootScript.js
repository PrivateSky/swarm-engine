function boot() {
    const worker_threads ='worker_threads';
    const {parentPort, workerData} = require(worker_threads);

    process.on("uncaughtException", (err) => {
        console.error('unchaughtException inside worker', err);
        setTimeout(() => {
            process.exit(1);
        }, 100);
    });

    if (!workerData.hasOwnProperty('constitutions')) {
        throw new Error(`Did not receive the correct configuration in worker data ${JSON.stringify(workerData)}`);
    }

    const firstConstitution = workerData.constitutions.shift();
    require(firstConstitution);
    const swarmEngine = require('swarm-engine');

    swarmEngine.initialise(process.env.IDENTITY);
    const powerCord = new swarmEngine.InnerThreadPowerCord();

    $$.swarmEngine.plug($$.swarmEngine.WILD_CARD_IDENTITY, powerCord);


    function loadNextConstitution(constitutionList, index = 0) {
        if(index === constitutionList.length) {
            finishedLoadingConstitution();
            return;
        }

        const currentConstitution = constitutionList[index];

        if(currentConstitution.endsWith('.js')) {
            require(currentConstitution);
            loadNextConstitution(constitutionList,index + 1);
        } else {
            const pskadmin = require('pskadmin');

            pskadmin.loadCSB(currentConstitution, (err, csbBlockChain) => {
                if(err) {
                    throw err;
                }

                csbBlockChain.listFiles('constitutions', (err, files) => {
                    if(err) {
                        throw err;
                    }

                    function processNextFile(filesIndex = 0) {
                        if(filesIndex === files.length) {
                            loadNextConstitution(constitutionList, index + 1);
                            return;
                        }

                        csbBlockChain.readFile(files[filesIndex], (err, fileBuffer) => {
                            if(err) {
                                throw err;
                            }

                            let res = eval(fileBuffer.toString());
                            processNextFile(filesIndex + 1);
                        })
                    }

                    processNextFile();
                })
            });

        }
    }

    loadNextConstitution(workerData.constitutions);

    function finishedLoadingConstitution() {
        parentPort.postMessage('ready');
    }

    parentPort.on('message', (packedSwarm) => {
        powerCord.transfer(packedSwarm);
    });

}

module.exports = boot.toString();
