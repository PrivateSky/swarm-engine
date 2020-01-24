HostBootScript = require("./HostBootScript");
let bootScript = new HostBootScript();
module.exports = {
    getBootScriptLoader:function(){
        return bootScript;
    }
};