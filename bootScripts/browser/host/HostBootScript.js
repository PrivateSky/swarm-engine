function HostBootScript() {
    console.log("Booting host...")
    let se, IframePC;
    const seeds = {};

    if (typeof $$.swarmEngine === "undefined") {
        se = require("swarm-engine");
        se.initialise("parent");
        IframePC = se.IframePowerCord;

        $$.swarms.describe("seed", {
            enter: function(identity){
                this.return(null, seeds[identity]);
            }
        });
    }


    this.createPowerCord = function (identity, seed, iframe) {
        seeds[identity] = seed;
        const powerCord = new IframePC(iframe);
        $$.swarmEngine.plug(identity, powerCord);
    }
}

module.exports = HostBootScript;





