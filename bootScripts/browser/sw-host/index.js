const HostBootScript = require("./HostBootScript");
const MimeType = require("../util/MimeType");
let bootScript = null;
let rawDossier = null;


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
            bootScript = new HostBootScript(event.data.seed);
            bootScript.boot((err, rawDossier) => {
                rawDossier.listFiles("app", (err, files) => {
                    if (files.length > 0 && files.indexOf("app/index.html")!==1) {
                        rawDossier.readFile("app/index.html", (err, content) => {

                            let blob = new Blob([content.toString()], {type: "text/html;charset=utf-8"});

                            let response = new Response(blob, {"status": 200, "statusText": "ok"});

                            caches.open('v1').then((cache) => {
                                let currentIndexLocation = `${event.data.url}`;
                                cache.put(currentIndexLocation, response);

                                event.ports[0].postMessage({status: 'finished', content: content.toString()});
                            });
                        })
                    } else {
                        event.ports[0].postMessage({error: 'No app found'});
                        self.registration.unregister()
                            .then(function () {
                                return self.clients.matchAll();
                            })
                            .then(function (clients) {
                                clients.forEach(client => client.navigate(client.url));
                            });
                    }

                })
            });

        }
    }
});


let getAppFile = function (request) {
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
};


self.addEventListener('fetch', (event) => {

    let cacheAndRelayResponse = function (response) {
        let responseClone = response.clone();
        caches.open('v1').then((cache) => {
            cache.put(event.request, responseClone);
        });

        return response;
    };

    if (rawDossier) {
        event.respondWith(
            caches.match(event.request).then((resp) => {
                return resp || getAppFile(event.request).then(cacheAndRelayResponse);
            }).catch(() => {
                console.log("Not found in csb app or cache");
                return fetch(event.request).then(cacheAndRelayResponse).catch(() => {
                    console.error("Could not fulfill request");
                });

            })
        );
    }


});
