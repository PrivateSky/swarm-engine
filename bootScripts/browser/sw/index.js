const server = require("ssapp-middleware").getMiddleware();
HostBootScript = require("../sw-host/HostBootScript");
const ChannelsManager = require("../lib/ChannelsManager").getChannelsManager();
const UtilFunctions = require("../utils/utilFunctions");
let bootScript = null;

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

/*
* just adding the event listener to catch all the requests
*/

server.put("/create-channel/:channelName", createChannelHandler);
server.post("/forward-zeromq/:channelName", forwardMessageHandler);
server.post("/send-message/:channelName", sendMessageHandler);
server.get("/receive-message/:channelName", receiveMessageHandler);


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
        if(event.data.action ==="activate"){
            event.ports[0].postMessage({status: 'empty'});
        }

        if(event.data.seed){
            //TODO: check if this is not the same code with swHostScript
            bootScript = new HostBootScript(event.data.seed);
            bootScript.boot((err, archive) => {
                archive.listFiles("app", (err, files) => {
                    console.log(files);
                    archive.readFile("app/index.html", (err, content) => {
                        console.log(content.toString());
                    })
                })
            });

        }
    }
});
