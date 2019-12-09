function InteractionSpace(swarmEngineApi) {
    const listeners = {};
    const interactionTemplate = require('./interaction_template').getTemplateHandler(swarmEngineApi);

    function createThis(swarm) {
        const thisObj = interactionTemplate.createForObject(swarm);
        //todo: implement a proxy for public and private vars...
        return thisObj;
    }

    this.dispatch = function (swarm) {
        const {swarmId, swarmTypeName, phaseName, args} = swarm.meta;

        const regexString = `(${swarmId}|\\*)\\/(${swarmTypeName}|\\*)\\/(${phaseName}|\\*)`;
        const reg = new RegExp(regexString);

        const keys = Object.keys(listeners);
        keys.forEach(key => {
            if (key.match(reg)) {
                const callbacks = listeners[key];
                callbacks.forEach(cb => {
                    cb.call(createThis(swarm), ...args);
                });
            }
        });

        if (phaseName === $$.swarmEngine.RETURN_PHASE_COMMAND) {
            Object.keys(listeners).forEach(key => {
                if (key.startsWith(swarmId + "/")) {
                    delete listeners[key];
                }
            });
        }
    };

    this.on = function (swarmId, swarmTypeName, phaseName, callback) {
        const key = `${swarmId}/${swarmTypeName}/${phaseName}`;
        if (typeof listeners[key] === "undefined") {
            listeners[key] = [];
        }
        listeners[key].push(callback);
    };

    this.off = function (swarmId = '*', swarmTypeName = '*', phaseName = '*', callback) {

        function escapeIfStar(str) {
            return str.replace("*", "\\*")
        }

        swarmId = escapeIfStar(swarmId);
        swarmTypeName = escapeIfStar(swarmTypeName);
        phaseName = escapeIfStar(phaseName);

        const regexString = `(${swarmId})\\/(${swarmTypeName})\\/(${phaseName})`;
        const reg = new RegExp(regexString);

        const keys = Object.keys(listeners);
        keys.forEach(key => {
            if (key.match(reg)) {
                const callbacks = listeners[key];

                if (!callback) {
                    listeners[key] = [];
                } else {
                    listeners[key] = callbacks.filter(cb => cb !== callback);
                }
            }
        });
    };
}

module.exports = InteractionSpace;