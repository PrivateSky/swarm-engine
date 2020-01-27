HostBootScript = require("./HostBootScript");
let bootScript = null;
module.exports = {
    initializeBootScript : function(seed){
        if(bootScript){
            throw new Error("HostBootScript already initialized");
        }
       bootScript = new HostBootScript(seed);
    },
    getBootScriptLoader:function(){
        return bootScript;
    }
};
