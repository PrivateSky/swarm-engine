const HostSWBootScript = require("./HostSWBootScript");
const server = require("ssapp-middleware").getMiddleware();
const ChannelsManager = require("../../../utils/SWChannelsManager").getChannelsManager();
const UtilFunctions = require("../../../utils/utilFunctions");
const RawDossierHelper = require("./RawDossierHelper");
const EDFS = require("edfs");
const CONSTANTS = EDFS.constants.CSB;
let bootScript = null;
let rawDossier = null;
let rawDossierHlp = null;


function createChannelHandler (req, res) {
    ChannelsManager.createChannel(req.params.channelName, function (err) {
        if (err) {
            res.status(err.code || 500);

        } else {
            res.status(200);
        }
        res.end();
    });
}

function forwardMessageHandler(req, res){
    ChannelsManager.forwardMessage(req.params.channelName,function(err){
        if(err){
            res.status(err.code || 500);
        }
        res.end();
    });
}

function sendMessageHandler (req, res) {
    UtilFunctions.prepareMessage(req, function (err, bodyAsBuffer) {

        if (err) {
            res.status(err.code || 500);
            res.end();
        } else {
            ChannelsManager.sendMessage(req.params.channelName, bodyAsBuffer, function (err) {
                if (err) {
                    res.status(err.code || 500);

                } else {
                    res.status(200);
                }
                res.end();
            });
        }
    })
}

function receiveMessageHandler (req, res) {
    ChannelsManager.receiveMessage(req.params.channelName, function (err, message) {
        if (err) {
            res.status(err.code || 500);
        } else {
            if (Buffer.isBuffer(message)) {
                res.setHeader('content-type', 'application/octet-stream');
            }

            if (typeof message.length !== "undefined") {
                res.setHeader('content-length', message.length);
            }

            res.status(200);
            res.send(message);
        }
        res.end();
    });
}

self.addEventListener('activate', function (event) {
    console.log("Activating host service worker", event);

    try {
        clients.claim();
    } catch (err) {
        console.log(err);
    }
});

self.addEventListener('message', function (event) {
    if (event.target instanceof ServiceWorkerGlobalScope) {
        if (event.data.action === "activate") {
            event.ports[0].postMessage({status: 'empty'});
        }

        if (event.data.seed) {
            bootScript = new HostSWBootScript(event.data.seed);
            bootScript.boot((err, _rawDossier) => {

                if(err){
                    throw err;
                }

                rawDossier = _rawDossier;
                rawDossierHlp = new RawDossierHelper(rawDossier);
                initMiddleware();
                rawDossier.listFiles(CONSTANTS.APP_FOLDER, (err, files) => {
                    if (files.length > 0 && files.indexOf(`${CONSTANTS.APP_FOLDER}/index.html`)!==1) {
                        rawDossier.readFile(`${CONSTANTS.APP_FOLDER}/index.html`, (err, content) => {
                                event.ports[0].postMessage({status: 'finished', content: content.toString()});
                        })
                    } else {
                        let error = "No app found";
                        console.error(error);
                        event.ports[0].postMessage({error: error});
                        self.registration.unregister()
                            .then(function () {
                                return self.clients.matchAll();
                            })
                            .then(function (clients) {
                                clients.forEach(client => client.navigate(client.url));
                            });
                    }
                });
                afterBootScripts();
            });
        }
    }
});

server.init(self);

function initMiddleware(){
    server.put("/create-channel/:channelName", createChannelHandler);
    server.post("/forward-zeromq/:channelName", forwardMessageHandler);
    server.post("/send-message/:channelName", sendMessageHandler);
    server.get("/receive-message/:channelName", receiveMessageHandler);
    server.use("*","OPTIONS",UtilFunctions.handleOptionsRequest);
    server.get("*",rawDossierHlp.handleLoadApp(CONSTANTS.APP_FOLDER));
}


function afterBootScripts(){
    console.log("$$.swarms.describe");
    $$.swarms.describe("listDossierFiles", {
        start: function(path){
            rawDossier.listFiles(path, this.return);
        }
    });
}
