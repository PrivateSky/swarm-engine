const se = require("../index");
require("./../../../psknode/bundles/pskruntime");
require("./../../../psknode/bundles/psknode");
const path = require("path");

se.initialise();

const constitution = [
    path.join(__dirname, '../../../psknode/bundles/sandboxBase.js'),
    path.join(__dirname, '../../../psknode/bundles/pskruntime.js'),
    path.join(__dirname, '../../../psknode/bundles/domain.js')
];

const powerCord = new se.OuterIsolatePowerCord(constitution);

$$.swarmEngine.plug("Agent007", powerCord);

const swarm = $$.interaction.startSwarmAs("Agent007", "global.echo", "say", "Uite ca merge!");
swarm.onReturn((err, ...args)=>{
    if(err){
        console.log(err);
    }
    console.log(...args);
});