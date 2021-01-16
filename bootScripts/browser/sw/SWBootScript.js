function SWBootScript(keySSI) {

    console.log("Booting host...");
    const keySSIs = {};
    let self = {keySSI};

     this.boot = function(callback){
        const BootEngine = require("../../BootEngine");

        const bootter = new BootEngine(getKeySSI, initializeSwarmEngine, ["webshims.js","pskruntime.js"],["domain.js"]);
        bootter.boot((err, archive)=>{
            if(err){
                printOpenDSUError("Failing to boot DSu Environment", err);
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to boot host`, err));
            }
            // in fiecare csbReference vom gasi un obiect care va contine:
            // - un seed pentru csb-ul referentiat(ssapp)
            // - numele aplicatiei (e.g My Tenders)

            //const csbReferences = self.myCSB.loadAssets('CSBReference');

            callback(null, archive);

        })
    };

    function getKeySSI(callback){
        callback(undefined, keySSI);
    }

    function initializeSwarmEngine(callback){
            require('callflow').initialise();
            console.log("Initializing swarm engine");
            $$.PSK_PubSub = require("soundpubsub").soundPubSub;
            const se = pskruntimeRequire("swarm-engine");
            se.initialise("*");
            self.IframePC = se.IframePowerCord;
            let ServiceWorkerPC = require("../../../powerCords/browser/ServiceWorkerPC");
            $$.swarmEngine.plug("*", new ServiceWorkerPC());
            callback();
    }


    this.createPowerCord = function (identity, keySSI, iframe) {
        keySSIs[identity] = keySSI;
        const powerCord = new self.IframePC(iframe);
        $$.swarmEngine.plug(identity, powerCord);
    };

}

module.exports = SWBootScript;





