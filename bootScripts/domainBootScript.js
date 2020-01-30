const path = require('path');
require("../utils/pingpongFork").enableLifeLine(1000);

const seed = process.env.PSK_DOMAIN_SEED;
process.env.PSK_DOMAIN_SEED = undefined;
process.env.PRIVATESKY_DOMAIN_NAME = "AnonymousDomain" + process.pid;

process.env.PRIVATESKY_TMP = path.resolve(process.env.PRIVATESKY_TMP || "../tmp");
process.env.DOMAIN_WORKSPACE = path.resolve(process.env.PRIVATESKY_TMP, "domainsWorkspace", process.env.PRIVATESKY_DOMAIN_NAME);

const config = JSON.parse(process.env.config);

if (typeof config.constitution !== "undefined" && config.constitution !== "undefined") {
    process.env.PRIVATESKY_DOMAIN_CONSTITUTION = config.constitution;
}

if (typeof config.workspace !== "undefined" && config.workspace !== "undefined") {
    process.env.DOMAIN_WORKSPACE = config.workspace;
}

function boot(){
    const BootEngine = require("./BootEngine");

    const bootter = new BootEngine(getSeed, getEDFS, initializeSwarmEngine, ["pskruntime"]);
    bootter.boot((err, archive)=>{
        if(err){
            console.log(err);
            return;
        }

        for (const alias in domainConf.communicationInterfaces) {
            if (domainConf.communicationInterfaces.hasOwnProperty(alias)) {
                let remoteUrls = domainConf.communicationInterfaces[alias];
                let powerCordToDomain = new se.SmartRemoteChannelPowerCord([remoteUrls.virtualMQ + "/"], domainConf.alias, remoteUrls.zeroMQ);
                $$.swarmEngine.plug("*", powerCordToDomain);
            }
        }

        const agents = edfs.loadAssets('Agent');

        if (agents.length === 0) {
            agents.push({alias: 'system'});
        }

        agents.forEach(agent => {
            const agentPC = new se.OuterThreadPowerCord(["../bundles/pskruntime.js",
                "../bundles/psknode.js",
                "../bundles/edfsBar.js",
                process.env.PRIVATESKY_DOMAIN_CONSTITUTION
            ]);
            $$.swarmEngine.plug(`${process.env.PRIVATESKY_DOMAIN_NAME}/agent/${agent.alias}`, agentPC);
        });

        $$.event('status.domains.boot', {name: domainConf.alias});
        console.log("Domain boot successfully");
    })
}

function getSeed(callback){
    callback(seed);
}

let edfs;
function getEDFS(callback){
    let EDFS = require("EDFS");
    edfs = EDFS.attachFromSeed(seed);
    return edfs;
}

function initializeSwarmEngine(callback){
    const myCSB = edfs.loadCSB(seed);

    domainConfigs = myCSB.loadAssets("DomainConfig");
    if(domainConfigs.length === 0){
        console.log("No domain configuration found in CSB. Boot process will stop here...");
        return;
    }
    let domainConf = domainConfigs[0];

    $$.log(`Booting domain ... ${domainConf.alias}`);

    $$.PSK_PubSub = require("soundpubsub").soundPubSub;
    const se = pskruntimeRequire("swarm-engine");
    se.initialise(domainConf.alias);
}

boot();