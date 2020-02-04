//command line script
//the first argument is a path to a configuration folder
//the second argument is a path to a temporary folder
const path = require('path');
require("../../../psknode/core/utils/pingpongFork.js").enableLifeLine(1000);

const fs = require('fs');

process.on("uncaughtException", (err) => {
    console.log('err', err);
});

//TODO: replace process.cwd() call with something static like process.env.PSK_INSTALLATION_ROOT or something
let tmpDir = path.resolve(path.join(process.cwd(), "../tmp"));
let confDir = path.resolve(path.join(process.cwd(), "/conf"));
let seed;

if (process.argv.length >= 3) {
    seed = process.argv[2];
}
console.log("Seed", process.argv);
/*if (process.argv.length >= 4) {
    tmpDir = path.resolve(process.argv[3]);
}*/

if (!process.env.PRIVATESKY_TMP) {
    process.env.PRIVATESKY_TMP = tmpDir;
}

const basePath = tmpDir;
//fs.mkdirSync(basePath, {recursive: true});

const codeFolder = path.normalize(__dirname + "/../");

if (!process.env.PRIVATESKY_ROOT_FOLDER) {
    process.env.PRIVATESKY_ROOT_FOLDER = path.resolve(path.join(__dirname, '../../'));
}

function boot(){
    const BootEngine = require("./BootEngine");

    const bootter = new BootEngine(getSeed, getEDFS, initializeSwarmEngine, ["pskruntime.js", "virtualMQ.js"], ["blockchain.js"]);
    bootter.boot(function(err, archive){
        if(err){
            console.log(err);
            return;
        }


        self.edfs.loadCSB(self.seed, (err, csb) => {
            if (err) {
                throw err;
            }

            launch(csb);
        })
    })
}

let self = {seed};

function getSeed(callback){
    setTimeout(() => {
        callback(undefined, self.seed);
    }, 0);
}


function getEDFS(callback){
    let EDFS = require("edfs");
    self.edfs = EDFS.attachFromSeed(self.seed);
    callback(undefined, self.edfs);
}

function initializeSwarmEngine(callback){
    setTimeout(callback, 0);
}

process.env.PSK_CONF_FOLDER = confDir;
if(!process.env.PSK_CONF_FOLDER.endsWith('/')) { process.env.PSK_CONF_FOLDER += '/'; }

boot();


//TODO: cum ar fi mai bine oare sa tratam cazul in care nu se gaseste configuratia nodului PSK????
if (!fs.existsSync(confDir)) {
    console.log(`\n[::] Could not find conf <${confDir}> directory!\n`);
}



// loadConfigThenLaunch();

/************************ HELPER METHODS ************************/


function loadConfigCSB(seed) {
    const pskdomain = require('pskdomain');
    pskdomain.loadCSB(seed, (err, csb) => {
        if (err) {
            throw err;
        }

        launch(csb);
    });
}

function launch(csb) {
    const beesHealer = require('swarmutils').beesHealer;
    // require("callflow");

    const domains = {};

    let domainReferences = csb.loadAssets("DomainReference");
    domainReferences.forEach(domainReference => {
        launchDomain(domainReference.alias, domainReference);
    });


    if (domains.length === 0) {
        console.log(`\n[::] No domains were deployed.\n`);
    }

    function launchDomain(name, configuration) {
        if (!domains.hasOwnProperty(name)) {
            const env = {config: JSON.parse(JSON.stringify(beesHealer.asJSON(configuration).publicVars))};
            const child_env = JSON.parse(JSON.stringify(process.env));

            child_env.PRIVATESKY_TMP = process.env.PRIVATESKY_TMP;
            child_env.PRIVATESKY_ROOT_FOLDER = process.env.PRIVATESKY_ROOT_FOLDER;

            child_env.PSK_DOMAIN_SEED = env.config.constitution;
            child_env.config = JSON.stringify({
                workspace: env.config.workspace
            });

            Object.keys(process.env).forEach(envVar => {
                if (envVar && envVar.startsWith && envVar.startsWith('PSK')) {
                    child_env[envVar] = process.env[envVar];
                }
            });

            const swarmutils = require('swarmutils');
            const child = swarmutils.pingPongFork.fork(path.resolve(path.join(__dirname, '../bundles/domainBoot.js')), [name], {
                cwd: __dirname,
                env: child_env
            });

            child.on('exit', (code, signal) => {
                setTimeout(() => {
                    console.log(`DomainSandbox [${name}] got an error code ${code}. Restarting...`);
                    delete domains[name];
                    $$.event('status.domains.restart', {name: name});
                    launchDomain(name, configuration);
                }, 100);
            });

            domains[name] = child;
        } else {
            console.log('Trying to start a sandbox for a domain that already has a sandbox');
        }
    }
}
