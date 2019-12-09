module.exports = function(swarmEngineApi){
    const cm = require("callflow");
    const swarmUtils = require("./swarm_template-se");

    $$.swarms           = cm.createSwarmEngine("swarm", swarmUtils.getTemplateHandler(swarmEngineApi));
    $$.swarm            = $$.swarms;

    $$.swarms.startAs = function(identity, swarmName, ctor, ...params){
        swarmEngineApi.startSwarmAs(identity, swarmName, ctor, ...params);
    };
};