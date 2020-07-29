const path = require('path');
//enabling life line to parent process
require(path.join(process.env.PSK_ROOT_INSTALATION_FOLDER, "psknode/core/utils/pingpongFork.js")).enableLifeLine();

const keySSI = process.env.PSK_DOMAIN_KEY_SSI;
//preventing children to access the env parameter
process.env.PSK_DOMAIN_KEY_SSI = undefined;

if (process.argv.length > 3) {
    process.env.PRIVATESKY_DOMAIN_NAME = process.argv[2];
} else {
    process.env.PRIVATESKY_DOMAIN_NAME = "AnonymousDomain" + process.pid;
}

process.env.PRIVATESKY_TMP = path.resolve(process.env.PRIVATESKY_TMP || "../tmp");
process.env.DOMAIN_WORKSPACE = path.resolve(process.env.PRIVATESKY_TMP, "domainsWorkspace", process.env.PRIVATESKY_DOMAIN_NAME);

const config = JSON.parse(process.env.config);

if (typeof config.constitution !== "undefined" && config.constitution !== "undefined") {
    process.env.PRIVATESKY_DOMAIN_CONSTITUTION = config.constitution;
}

if (typeof config.workspace !== "undefined" && config.workspace !== "undefined") {
    process.env.DOMAIN_WORKSPACE = config.workspace;
}

function boot() {
    const BootEngine = require("./BootEngine");

    const bootter = new BootEngine(getKeySSI, initializeSwarmEngine, ["pskruntime.js", "pskWebServer.js", "edfsBar.js"], ["blockchain.js"]);
    bootter.boot(function (err, archive) {
        if (err) {
            console.log(err);
            return;
        }
        try {
            plugPowerCords();
        } catch (err) {
            console.log("Caught an error will finishing booting process", err);
        }
    })
}

function getKeySSI(callback) {
    callback(undefined, self.keySSI);
}

let self = {keySSI};

function initializeSwarmEngine(callback) {
    const EDFS = require("edfs");
    EDFS.resolveSSI(self.keySSI, "Bar", (err, bar) => {
        if (err) {
            return callback(err);
        }

        bar.readFile(EDFS.constants.CSB.DOMAIN_IDENTITY_FILE, (err, content) => {
            if (err) {
                return callback(err);
            }
            self.domainName = content.toString();
            $$.log(`Domain ${self.domainName} is booting...`);

            $$.PSK_PubSub = require("soundpubsub").soundPubSub;
            const se = require("swarm-engine");
            se.initialise(self.domainName);

            callback();
        });
    });
}

function plugPowerCords() {
    const dossier = require("dossier");
    dossier.load(self.keySSI, "DomainIdentity", function (err, dossierHandler) {
        if (err) {
            throw err;
        }

        dossierHandler.startTransaction("DomainConfigTransaction", "getDomains").onReturn(function (err, domainConfigs) {
            if (err) {
                throw  err;
            }

            const se = require("swarm-engine");
            if (domainConfigs.length === 0) {
                console.log("No domain configuration found in CSB. Boot process will stop here...");
                return;
            }
            self.domainConf = domainConfigs[0];

            for (const alias in self.domainConf.communicationInterfaces) {
                if (self.domainConf.communicationInterfaces.hasOwnProperty(alias)) {
                    let remoteUrls = self.domainConf.communicationInterfaces[alias];
                    let powerCordToDomain = new se.SmartRemoteChannelPowerCord([remoteUrls.virtualMQ + "/"], self.domainConf.alias, remoteUrls.zeroMQ);
                    $$.swarmEngine.plug("*", powerCordToDomain);
                }
            }

            dossierHandler.startTransaction("Agents", "getAgents").onReturn(function (err, agents) {
                if (err) {
                    throw err;
                }

                if (agents.length === 0) {
                    agents.push({alias: 'system'});
                }

                const EDFS = require("edfs");
                const pskPath = require("swarmutils").path;
                EDFS.resolveSSI(self.keySSI, "RawDossier", (err, rawDossier) => {
                    if (err) {
                        throw err;
                    }

                    rawDossier.readFile(pskPath.join("/", EDFS.constants.CSB.CODE_FOLDER, EDFS.constants.CSB.CONSTITUTION_FOLDER , "threadBoot.js"), (err, fileContents) => {
                        if (err) {
                            throw err;
                        }

                        agents.forEach(agent => {
                            const agentPC = new se.OuterThreadPowerCord(fileContents.toString(), true, keySSI);
                            $$.swarmEngine.plug(`${self.domainConf.alias}/agent/${agent.alias}`, agentPC);
                        });

                        $$.event('status.domains.boot', {name: self.domainConf.alias});
                        console.log("Domain boot successfully");
                    });
                });
            });
        })
    });
}

boot();
