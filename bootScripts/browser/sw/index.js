const server = require("ssapp-middleware").getMiddleware();
const SSappSWBootScript = require("./SSappSWBootScript");
const ChannelsManager = require("../../../utils/SWChannelsManager").getChannelsManager();
const UtilFunctions = require("../../../utils/utilFunctions");
const Uploader = require("./Uploader");
const EDFS_CONSTANTS = require('edfs').constants;

let bootScript = null;
let rawDossier = null;
let uploader = null;

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

function uploadHandler (req, res) {
    if (!uploader) {
        setupUploader({
            inputName: 'files[]',
            uploadPath: `${EDFS_CONSTANTS.CSB.DATA_FOLDER}/uploads/`
        });
    }
    uploader.upload(req.body, function (err, uploadedFiles) {
        if (err && (!Array.isArray(uploadedFiles) || !uploadedFiles.length))  {
            res.sendError(400, err, 'application/json');
            return;
        }

        res.status(201);
        res.set("Content-Type", "application/json");
        res.send(JSON.stringify(uploadedFiles));
    });
}

/*
* just adding the event listener to catch all the requests
*/

server.put("/create-channel/:channelName", createChannelHandler);
server.post("/forward-zeromq/:channelName", forwardMessageHandler);
server.post("/send-message/:channelName", sendMessageHandler);
server.get("/receive-message/:channelName", receiveMessageHandler);
server.post('/upload', uploadHandler);
server.get('/upload', function (req, res) {
    rawDossier.listFiles('/data/uploads', (err, files) => {
        res.status(200);
        res.set("Content-Type", "text/plain");
        res.send(files.join('\n'));
    })
});


server.use(function(req,res, next){
    if(req.method.toUpperCase()!=="OPTIONS"){
        next();
    }
    else{
        console.log("OPTIONS request");
        const headers = {};
        // IE8 does not allow domains to be specified, just the *
        headers["Access-Control-Allow-Origin"] = req.headers.origin;
        // headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = true;
        headers["Access-Control-Max-Age"] = '3600'; //one hour
        headers["Access-Control-Allow-Headers"] = `Content-Type, Content-Length, Access-Control-Allow-Origin, User-Agent, ${signatureHeaderName}`;
        res.set(headers);
        res.status(200);
        res.end();
    }
})

// Uncomment this during development to forward requests
// to host network if you're planning to load the application
// from localhost
server.useDefault();

/*
* if no previous handler response to the event it means that the url doesn't exit
*
**/
server.use(function (req, res, next) {
    let requestedDomain = new URL(req.originalUrl).host;
    server.requestedHosts.delete(requestedDomain);
    res.status(404);
    res.end();
});

server.init(self);


/**
 * Configure uploader
 *
 * @param {object} config
 */
function setupUploader(config) {
    config = config || {};
    config.inputName = config.inputName || 'files[]';

    if (typeof config.uploadPath !== 'string' || !config.uploadPath.length) {
        throw new Error('Upload path is required');
    }

    let uploadPath = config.uploadPath;
    if (uploadPath.substr(-1) !== '/') {
        uploadPath += '/';
    }

    uploader = new Uploader({
        inputName: config.inputName,
        dossier: rawDossier,
        uploadPath: uploadPath
    });
}


self.addEventListener('activate', function (event) {
    console.log("Activating service worker", event);

    try {
        clients.claim();
    } catch (err) {
        console.log(err);
    }
});

self.addEventListener('message', function(event) {
    if(event.target instanceof ServiceWorkerGlobalScope){
        if(event.data.action === "activate"){
            event.ports[0].postMessage({status: 'empty'});
        }

        // Configure uploader
        if (event.data.action === "uploader:configure") {
            try {
                setupUploader(event.data.config);
                event.ports[0].postMessage({status: 'empty'});
            } catch(e) {
                console.error(e);
                event.ports[0].postMessage({error: e});
            }
        }

        if(event.data.seed){
            if (rawDossier) {
                return;
            }

            //TODO: check if this is not the same code with swHostScript
            bootScript = new SSappSWBootScript(event.data.seed);
            bootScript.boot((err, _rawDossier) => {
                if (err) {
                    console.error(err);
                    event.ports[0].postMessage({error: err});
                    return;
                }

                rawDossier = _rawDossier
                rawDossier.listFiles("app", (err, files) => {
                    if (err) {
                        console.error(err);
                    }

                    console.log(files);
                    rawDossier.readFile("app/index.html", (err, content) => {
                        console.log(content.toString());
                        event.ports[0].postMessage({status: 'initialized'});
                    })
                })
            });

        }
    }
});
