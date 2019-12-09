module.exports = function (swarmEngineApi) {
    let cm = require("callflow");

    $$.interactions = cm.createSwarmEngine("interaction", require("./interaction_template"));
    $$.interaction  = $$.interactions;

    $$.interactions.attachTo = function (swarmTypeName, interactionDescription) {
        Object.keys(interactionDescription).forEach(phaseName => {
            swarmEngineApi.on('*', swarmTypeName, phaseName, interactionDescription[phaseName]);
        });
    };

    $$.interactions.startSwarmAs = function (identity, swarmTypeName, phaseName, ...args) {
        const swarm = swarmEngineApi.startSwarmAs(identity, swarmTypeName, phaseName, ...args);
        let swarmId = swarm.getMeta('swarmId');

        return {
            on: function(interactionDescription) {
                Object.keys(interactionDescription).forEach(phaseName => {
                    swarmEngineApi.on(swarmId, swarmTypeName, phaseName, interactionDescription[phaseName]);
                });
            },
            off: function(interactionDescription) {
                swarmEngineApi.off(interactionDescription);
            },
            onReturn: function (callback) {
                swarmEngineApi.on(swarmId, swarmTypeName, $$.swarmEngine.RETURN_PHASE_COMMAND, callback);
            }
        }
    }
};
