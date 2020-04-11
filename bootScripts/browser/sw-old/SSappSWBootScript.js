function SSappSWBootScript(seed) {

    console.log("Booting ssapp sw...");
    const seeds = {};
    let self = {seed};

    this.boot = function(callback){
        const BootEngine = require("../../BootEngine");

        const bootter = new BootEngine(getSeed, getEDFS, initializeSwarmEngine, ["webshims.js","pskruntime.js"],["bindableModel.js"]);
        bootter.boot((err, archive)=>{
            if(err){
                console.log(err);
                callback(err);
                return;
            }
            // in fiecare csbReference vom gasi un obiect care va contine:
            // - un seed pentru csb-ul referentiat(ssapp)
            // - numele aplicatiei (e.g My Tenders)

            //const csbReferences = self.myCSB.loadAssets('CSBReference');

            callback(null, archive);

        })
    };

    function getSeed(callback){
        callback(undefined, seed);
    }


    function getEDFS(callback){
        const EDFS = require("edfs");
        EDFS.attachWithSeed(seed, callback);
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

}

module.exports = SSappSWBootScript;





