const se = require("../index");
require("./../../../psknode/bundles/testsRuntime");
require("./../../../psknode/bundles/pskruntime");
const dc = require('double-check');
const assert = dc.assert;
const path = require("path");

const constitutionSeed = "5gsxzWXL%2F4YebrIqsBAyuIpp95APysth4%2FctieO4b6Y%3D%7CImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MCI%3De";

se.initialise();
const powerCord = new se.OuterThreadPowerCord(path.join(__dirname, "../../../psknode/bundles/threadBoot.js"), false, constitutionSeed);

$$.swarmEngine.plug("Agent007", powerCord);

assert.callback('interactionAttachToPriority', (callback) => {
    let attachToCalled = false;
    let onCalled = false;
    let onReturnCalled = false;

    $$.interactions.attachTo("global.echo", {
        interactResponse: function (input) {
            attachToCalled = true;
        }
    });

    const swarm = $$.interaction.startSwarmAs("Agent007", "global.echo", "interactSay", "it works");
    swarm.on({
        interactResponse: function (input) {
            onCalled = true;
            this.swarm("Agent007", "finally", input);
        }
    }).onReturn(function () {
        onReturnCalled = true;
    });

    setTimeout(() => {
        assert.true(onCalled, '.on({interactResponse}) was not called');
        assert.true(onReturnCalled, '.onReturn was not called');
        assert.false(attachToCalled, '.attachTo({interactResponse}) was called, but for this swarm it should have been overwritten by .on({interactResponse})');
        callback();
    }, 10000);
}, 15000);
