function HostBootScript(seed) {

    console.log("Booting host...");
    let se, IframePC;
    const seeds = {};
    let self = {seed};
    // function initaliseSwarmEngine(){
    //     if (typeof $$.swarmEngine !== "undefined") {
    //         //se = require("swarm-engine");
    //         //se.initialise("parent");
    //         IframePC = se.IframePowerCord;
    //
    //         $$.swarms.describe("seed", {
    //             enter: function(identity){
    //                 this.return(null, seeds[identity]);
    //             }
    //         });
    //     }
    // }


    function boot(){
        const BootEngine = require("../../BootEngine");

        const bootter = new BootEngine(getSeed, getEDFS, initializeSwarmEngine, ["pskruntime.js"]);
        bootter.boot((err, archive)=>{
            if(err){
                console.log(err);
                return;
            }

            // for (const alias in self.domainConf.communicationInterfaces) {
            //     if (self.domainConf.communicationInterfaces.hasOwnProperty(alias)) {
            //         let remoteUrls = self.domainConf.communicationInterfaces[alias];
            //         let powerCordToDomain = new se.SmartRemoteChannelPowerCord([remoteUrls.virtualMQ + "/"], self.domainConf.alias, remoteUrls.zeroMQ);
            //         $$.swarmEngine.plug("*", powerCordToDomain);
            //     }
            // }

            // const agents = self.myCSB.loadAssets('Agent');
            //
            // if (agents.length === 0) {
            //     agents.push({alias: 'system'});
            // }

            // agents.forEach(agent => {
            //     const agentPC = new se.OuterThreadPowerCord(["../bundles/pskruntime.js",
            //         "../bundles/psknode.js",
            //         "../bundles/edfsBar.js",
            //         process.env.PRIVATESKY_DOMAIN_CONSTITUTION
            //     ]);
            //     $$.swarmEngine.plug(`${self.domainConf.alias}/agent/${agent.alias}`, agentPC);
            // });
            //
            // $$.event('status.domains.boot', {name: self.domainConf.alias});
            // console.log("Domain boot successfully");
        })
    }

    function getSeed(callback){
        callback(undefined, seed);
    }

    function getEDFS(callback){
        let EDFS = require("edfs");
        self.edfs = EDFS.attachFromSeed(seed);
        callback(undefined, self.edfs);
    }

    function initializeSwarmEngine(callback){

            $$.PSK_PubSub = require("soundpubsub").soundPubSub;
            const se = pskruntimeRequire("swarm-engine");
            se.initialise("parent");
            self.IframePC = se.IframePowerCord;
            callback();
    }


    this.createPowerCord = function (identity, seed, iframe) {
        seeds[identity] = seed;
        const powerCord = new self.IframePC(iframe);
        $$.swarmEngine.plug(identity, powerCord);
    };

    boot();
}

module.exports = HostBootScript;





