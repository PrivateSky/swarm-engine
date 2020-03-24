const UtilFunctions = require("../../bootScripts/browser/utils/utilFunctions");
function ServiceWorkerPC() {
    const channelsManager = require("../../bootScripts/browser/lib/ChannelsManager").getChannelsManager();
    const SwarmPacker = require("swarmutils").SwarmPacker;
    const server = require("ssapp-middleware").getMiddleware();

    this.sendSwarm = function (swarmSerialization) {
        let header;

        try {
            header = SwarmPacker.getHeader(swarmSerialization);
        } catch (e) {
            console.error("Could not deserialize swarm");
        }

        //TODO
        //verifica header.target pt urmatoarele cazuri:
        // -- daca targetul este un regex de forma domain/agent/agentName atunci trebuie trimis mesajul cu ajutorul lui channelsManager pe canalul Base64(numeDomeniu)
        // -- daca targetul este un regex de forma http/https atunci trebuie verificat daca domeniul fake-uit de service worker coincide cu domeniul din url.
        //          Daca coincid atunci se trimite folosind channelsManagerul local daca nu coincide atunci se face un request http(s) (fetch)
        // -- default ???? - posibil sa fie nevoie sa intoarcem tot in swarm engine... NU SUNT SIGUR!!!

        if(UtilFunctions.isUrl(header.swarmTarget)){
            if (!UtilFunctions.isInMyHosts(header.swarmTarget, server.requestedHosts)) {
                fetch(header.swarmTarget,
                    {
                        method: 'POST',
                        mode: 'cors',
                        cache: 'no-cache',
                        headers: {
                            'Content-Type': 'application/octet-stream'
                        },
                        redirect: 'follow', // manual, *follow, error
                        referrerPolicy: 'no-referrer', // no-referrer, *client
                        body: swarmSerialization
                    }).then(response => {

                    //TODO
                    //check status codes
                    if (!response.ok) {
                        console.error(`An error occurred:  ${response.status} - ${response.statusText}`);
                    }

                }).catch((err)=>{
                    //TODO
                    //handle error
                    console.log(err);
                });
                return;
            }
        }

        let channelName = UtilFunctions.getChannelName(header.swarmTarget);
        channelsManager.sendMessage(channelName, swarmSerialization, function () {
            //TODO
            //what now?
            console.log("done");
        });
    };

    let receiveSwarmSerialization = (err, message) => {
        if (err) {
            console.log(err);
            if (err.code >= 400 && err.code < 500) {
                return;
            }
        } else {
            //we facilitate the transfer of swarmSerialization to $$.swarmEngine
            this.transfer(message);
        }
        //we need tp subscribe again in order to be called when a new message arrive
        //because no matter why error or message channelManager will remove as from the subs list
        setTimeout(subscribe, 0);
    };

    let subscribe = () => {
        //TODO
        //verifica this.identity pt urmatoarele cazuri:
        // -- daca targetul este un regex de forma domain/agent/agentName atunci trebuie trimis mesajul cu ajutorul lui channelsManager pe canalul Base64(numeDomeniu)
        // -- default ???? - posibil sa fie nevoie sa intoarcem tot in swarm engine... NU SUNT SIGUR!!!


        //let channelName = ""; //based on this.identity when need to extract the domainName from regex domainName/agent/agentname
        let channelName = this.identity.split("/")[0];//temporary test
        channelsManager.receiveMessage(btoa(channelName), receiveSwarmSerialization);
    }

    return new Proxy(this, {
        set(target, p, value, receiver) {
            target[p] = value;
            if (p === 'identity') {
                //when we get our identity
                //setup means first call of subscribe
                subscribe.call(target);
            }
        }
    });
}

module.exports = ServiceWorkerPC;
