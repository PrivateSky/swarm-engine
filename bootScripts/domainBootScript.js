const path = require('path');
//enabling life line to parent process
require(path.join(process.env.PSK_ROOT_INSTALATION_FOLDER, "psknode/core/utils/pingpongFork.js")).enableLifeLine();

const seed = process.env.PSK_DOMAIN_SEED;
//preventing children to access the env parameter
process.env.PSK_DOMAIN_SEED = undefined;

if(process.argv.length > 3){
    process.env.PRIVATESKY_DOMAIN_NAME = process.argv[2];
}else{
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

function boot(){
    const BootEngine = require("./BootEngine");

    const bootter = new BootEngine(getSeed, getEDFS, initializeSwarmEngine, ["pskruntime.js", "virtualMQ.js"], ["blockchain.js"]);
    bootter.boot(function(err, archive){
        if(err){
            console.log(err);
            return;
        }
        try{
            plugPowerCords();
        }catch(err){
            console.log("Caught an error will finishing booting process", err);
        }
    })
}

function getSeed(callback){
    callback(undefined, self.seed);
}

let self = {seed};
function getEDFS(callback){
    let EDFS = require("edfs");
    self.edfs = EDFS.attachWithSeed(seed);
    callback(undefined, self.edfs);
}

function initializeSwarmEngine(callback){
    const EDFS = require("edfs");
    const bar = self.edfs.loadBar(self.seed);
    bar.readFile(EDFS.constants.CSB.DOMAIN_IDENTITY_FILE, (err, content)=>{
        if(err){
            return callback(err);
        }
        self.domainName = content.toString();
        $$.log(`Domain ${self.domainName} is booting...`);

        $$.PSK_PubSub = require("soundpubsub").soundPubSub;
        const se = require("swarm-engine");
        se.initialise(self.domainName);

        callback();
    });
}

function plugPowerCords(){
    self.edfs.loadCSB(self.seed, (err, csb)=>{
        if(err){
            return console.log("Failed to boot properly domain!!");
        }

        self.myCSB = csb;
        const se = require("swarm-engine");

        let domainConfigs = self.myCSB.loadAssets("DomainConfig");
        if(domainConfigs.length === 0){
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

        const agents = self.myCSB.loadAssets('Agent');

        if (agents.length === 0) {
            agents.push({alias: 'system'});
        }

        const EDFS = require("edfs");
        const bar = self.edfs.loadBar(self.seed);
        bar.readFile(EDFS.constants.CSB.CONSTITUTION_FOLDER + '/threadBoot.js', (err, fileContents) => {
            if(err) {
                throw err;
            }

            agents.forEach(agent => {
                const agentPC = new se.OuterThreadPowerCord(fileContents.toString(), true, seed);
                $$.swarmEngine.plug(`${self.domainConf.alias}/agent/${agent.alias}`, agentPC);
            });

            $$.event('status.domains.boot', {name: self.domainConf.alias});
            console.log("Domain boot successfully");
        });


    });
}

boot();
