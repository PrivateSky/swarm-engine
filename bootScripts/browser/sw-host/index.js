const HostSWBootScript = require("./HostSWBootScript");
const MimeType = require("../util/MimeType");
const server = require("ssapp-middleware").getMiddleware();
const ChannelsManager = require("../../../utils/SWChannelsManager").getChannelsManager();
const UtilFunctions = require("../../../utils/utilFunctions");

let bootScript = null;
let rawDossier = null;


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
});


server.init(self);


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
            bootScript.boot((err, rawDossier) => {

                // rawDossier.listFiles("app", (err, files) => {
                //     console.log(files)
                // })

                // rawDossier.listFiles("app", (err, files) => {
                //     if (files.length > 0 && files.indexOf("app/index.html")!==1) {
                //         rawDossier.readFile("app/index.html", (err, content) => {
                //
                //             let blob = new Blob([content.toString()], {type: "text/html;charset=utf-8"});
                //
                //             let response = new Response(blob, {"status": 200, "statusText": "ok"});
                //
                //             caches.open('v1').then((cache) => {
                //                 let currentIndexLocation = `${event.data.url}`;
                //                 cache.put(currentIndexLocation, response);
                //
                //                 event.ports[0].postMessage({status: 'finished', content: content.toString()});
                //             });
                //         })
                //     } else {
                //         event.ports[0].postMessage({error: 'No app found'});
                //         self.registration.unregister()
                //             .then(function () {
                //                 return self.clients.matchAll();
                //             })
                //             .then(function (clients) {
                //                 clients.forEach(client => client.navigate(client.url));
                //             });
                //     }
                //
                // });

                afterBootScripts();
            });

        }
    }
});



/*let getAppFile = function (request) {
    return new Promise((resolve, reject) => {
        console.log("Request", request.url);
        let url = new URL(request.url);
        let appFile = "app" + url.pathname;
        console.log(appFile);
        rawDossier.readFile(appFile, (err, content) => {
            if (err) {
                reject(err);
            } else {
                let fileExtension = appFile.substring(appFile.lastIndexOf(".") + 1);
                let mimeType = MimeType.getMimeTypeFromExtension(fileExtension);

                let blob = new Blob([mimeType.binary ? content : content.toString()], {type: mimeType.name});
                let response = new Response(blob, {"status": 200, "statusText": "ok"});
                resolve(response);
            }
        });
    });
};*/


// self.addEventListener('fetch', (event) => {
//
//     let cacheAndRelayResponse = function (response) {
//         let responseClone = response.clone();
//         caches.open('v1').then((cache) => {
//             cache.put(event.request, responseClone);
//         });
//
//         return response;
//     };
//
//     if (rawDossier) {
//         event.respondWith(
//             caches.match(event.request).then((resp) => {
//                 return resp || getAppFile(event.request).then(cacheAndRelayResponse);
//             }).catch(() => {
//                 console.log("Not found in csb app or cache");
//                 return fetch(event.request).then(cacheAndRelayResponse).catch(() => {
//                     console.error("Could not fulfill request");
//                 });
//
//             })
//         );
//     }
//
// });

function afterBootScripts(){
    console.log("$$.swarms.describe")
    $$.swarms.describe("listDossierFiles", {
        start: function(path){
            console.log("i'm here",path);
            this.return(null, [1,2,3]);
        }
    });
}

