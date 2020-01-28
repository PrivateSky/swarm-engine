function HostBootScript(seed) {

    console.log("Booting host...");
    let se, IframePC;
    const seeds = {};

    function initaliseSwarmEngine(){
        if (typeof $$.swarmEngine !== "undefined") {
            //se = require("swarm-engine");
            //se.initialise("parent");
            IframePC = se.IframePowerCord;

            $$.swarms.describe("seed", {
                enter: function(identity){
                    this.return(null, seeds[identity]);
                }
            });
        }
    }
    let hostPskDomain = require("../lib/BrowserPskDomain").getBrowserPskDomain();
    hostPskDomain.getConstitutionFilesFromBar(seed, (err, constitutionBundles) =>{
        if(!err){
            constitutionBundles.forEach(bundle => eval(bundle.toString()));

            initaliseSwarmEngine();
        }
        else{
            console.log(err);
        }
    });



    this.createPowerCord = function (identity, seed, iframe) {
        seeds[identity] = seed;
        const powerCord = new IframePC(iframe);
        $$.swarmEngine.plug(identity, powerCord);
    }
}

module.exports = HostBootScript;





