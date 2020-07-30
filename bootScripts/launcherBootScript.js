//the first argument is a path to a configuration folder
const path = require('path');

process.on("uncaughtException", (err) => {
    console.log('err', err);
});

let keySSI;
if (process.argv.length >= 3) {
    keySSI = process.argv[2];
}
console.log(`Launcher is using ${keySSI} as keySSI`);

function boot() {
    const BootEngine = require("./BootEngine");

    const bootter = new BootEngine(getKeySSI, initializeSwarmEngine, ["pskruntime.js", "pskWebServer.js", "edfsBar.js"], ["blockchain.js"]);
    $$.log("Launcher booting process started");
    bootter.boot(function (err, archive) {
        if (err) {
            console.log(err);
            return;
        }
        const EDFS = require("edfs");
        EDFS.resolveSSI(self.keySSI, "RawDossier", (err, rawDossier) => {
            if (err) {
                throw err;
            }

            rawDossier.start((err) => {
                if (err) {
                    throw err;
                }

                launch(rawDossier);
            })
        });
    })
}

let self = {keySSI};

function getKeySSI(callback) {
    setTimeout(() => {
        callback(undefined, self.keySSI);
    }, 0);
}

function initializeSwarmEngine(callback) {
    dossier = require("dossier");
    /*const se = require("swarm-engine");
    se.initialise();*/
    callback();
}

let dossier;
boot();


/************************ HELPER METHODS ************************/

function launch(csb) {
    const beesHealer = require('swarmutils').beesHealer;

    const domains = {};
    csb.getKeySSI((err, keySSI) => {
        if (err) {
            throw err;
        }

        dossier.load(keySSI, "launcherIdentity", function (err, dossierHandler) {
            if (err) {
                throw err;
            }
            dossierHandler.startTransaction("Domain", "getDomains").onReturn(function (err, domainsRefs) {
                if (err) {
                    throw err;
                }

                domainsRefs.forEach(domainRef => {
                    launchDomain(domainRef.alias, domainRef);
                });

                if (domains.length === 0) {
                    console.log(`\n[::] No domains were deployed.\n`);
                }
            });
        });
    });

    function launchDomain(name, configuration) {
        if (!domains.hasOwnProperty(name)) {
            console.log(`Launcher is starting booting process for domain <${name}>`);
            const env = {config: configuration};
            const child_env = JSON.parse(JSON.stringify(process.env));

            child_env.PRIVATESKY_TMP = process.env.PRIVATESKY_TMP;
            child_env.PSK_DOMAIN_KEY_SSI = env.config.constitution;

            child_env.config = JSON.stringify({
                workspace: env.config.workspace
            });

            Object.keys(process.env).forEach(envVar => {
                if (envVar && envVar.startsWith && envVar.startsWith('PSK')) {
                    child_env[envVar] = process.env[envVar];
                }
            });

            const swarmutils = require('swarmutils');
            const child = swarmutils.pingPongFork.fork(path.resolve(path.join(process.env.PSK_ROOT_INSTALATION_FOLDER, 'psknode/bundles/domainBoot.js')), [name], {
                cwd: process.env.PSK_ROOT_INSTALATION_FOLDER,
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
