function HostBootScript(seed) {

    console.log("Booting host...");
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
        const FETCH_BRICK_STORAGE_STRATEGY_NAME = "sw-host-fetch";
        let EDFS = require("edfs");
        let SEED = require("bar").Seed;
        const seed = new SEED(self.seed);

        //self.edfs = EDFS.attachFromSeed(seed);

        const hasHttpStrategyRegistered = $$.brickTransportStrategiesRegistry.has(FETCH_BRICK_STORAGE_STRATEGY_NAME);

        if (!hasHttpStrategyRegistered) {
            let CreateFetchBrickTransportationStrategy = require("edfs").FetchBrickTransportationStrategy;
            let FetchBrickTransportationStrategy = new CreateFetchBrickTransportationStrategy(seed.getEndpoint());
            $$.brickTransportStrategiesRegistry.add(FETCH_BRICK_STORAGE_STRATEGY_NAME, FetchBrickTransportationStrategy);
        }
        self.edfs = EDFS.attach(FETCH_BRICK_STORAGE_STRATEGY_NAME);
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

}

module.exports = HostBootScript;





