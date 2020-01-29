function BootEngine(seed) {
    let config = {
        brickStorageName: 'bootEngineBrickStorage',
        edfsEndpoint: 'http://localhost:8080'
    };

    const EDFS = require('edfs');
    let edfs;

    this.prepareEnv = function () {
        edfs = EDFS.attach(this.getTransportStrategy());
    };

    this.getTransportStrategy = function () {
        $$.brickTransportStrategiesRegistry.add(config.brickStorageName, new EDFS.HTTPBrickTransportStrategy(config.edfsEndpoint));
        return config.brickStorageName;
    };

    this.retrieveArchive = function () {
        return edfs.loadBar(seed);
    };

    this.evalBundles = async function (bundles) {
        if (!Array.isArray(bundles)) {
            throw new Error('Bundles should be an array');
        }

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
    };

    this.setRuntimeBundles = function (...bundles) {
        config.runtimeBundles = bundles;
    };

    this.getConfig = function () {
        //to be used with caution
        return this.config;
    };

    this.initializeSwarmEngine = function(){
        throw new Error("Implement this");
    };

    this.setConstitutionBundles = function(...bundles){
        config.constitutionBundles = bundles;
    };

    this.boot = function (callback) {
       const __boot = async () => {
            this.prepareEnv();
            this.bar = this.retrieveArchive();
            await this.evalBundles(config.runtimeBundles);
            this.initializeSwarmEngine();
            await this.evalBundles(config.constitutionBundles);
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

module.exports={
    createBootEngine : function(seed){
        return new BootEngine(seed);
    },
    promisify
};