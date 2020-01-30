function BootEngine(getSeed, getEDFS, initializeSwarmEngine, runtimeBundles, constitutionBundles) {

    if(typeof getSeed !== "function"){
        throw new Error("getSeed missing or not a function");
    }
    getSeed = promisify(getSeed);

    if(typeof getEDFS !== "function"){
        throw new Error("getEDFS missing or not a function");
    }
    getEDFS = promisify(getEDFS);

    if(typeof initializeSwarmEngine !== "function"){
        throw new Error("initializeSwarmEngine missing or not a function");
    }
    initializeSwarmEngine = promisify(initializeSwarmEngine);

    if(typeof runtimeBundles !== "undefined" && !Array.isArray(runtimeBundles)){
        throw new Error("runtimeBundles is not array");
    }

    if(typeof constitutionBundles !== "undefined" && !Array.isArray(constitutionBundles)){
        throw new Error("constitutionBundles is not array");
    }

    const EDFS = require('edfs');
    let edfs;

    async function evalBundles (bundles) {
        const listFiles = promisify(this.bar.listFiles);
        const readFile = promisify(this.bar.readFile);

        let fileList = await listFiles(EDFS.constants.CSB.CONSTITUTION_FOLDER);
        fileList = bundles.filter(bundle => fileList.includes(`${EDFS.constants.CSB.CONSTITUTION_FOLDER}/${bundle}`))
            .map(bundle => `${EDFS.constants.CSB.CONSTITUTION_FOLDER}/${bundle}`);

        if (fileList.length !== bundles.length) {
            throw new Error(`Some bundles missing. We found only the following ${fileList}`);
        }

        for (let i = 0; i < fileList.length; i++) {
            const fileContent = await readFile(fileList[i]);
            eval(fileContent.toString());
        }
    }

    this.boot = function (callback) {
       const __boot = async () => {
            const seed = await getSeed();
            edfs = await getEDFS();
            this.bar = edfs.loadBar(seed);
            await evalBundles(runtimeBundles);
            await initializeSwarmEngine();
            await evalBundles(constitutionBundles);
        };

        __boot()
            .then(() => callback(undefined, this.bar))
            .catch(callback);
    };
}

function promisify(fn) {
    return function (...args) {
        return new Promise((resolve, reject) => {
            fn(...args, (err, ...res) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(...res);
                }
            });
        });
    }
}

module.exports = BootEngine;