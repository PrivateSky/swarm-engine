const HostBootScript = require("./HostBootScript");
const MimeType = require("../lib/MimeType");
let bootScript = null;
let csbArchive = null;


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
            bootScript.boot((err, archive) => {
                csbArchive = archive;
                csbArchive.listFiles("app", (err, files) => {
                    console.log(files);
                    csbArchive.readFile("app/index.html", (err, content) => {

                        let blob = new Blob([content.toString()], {type: "text/html;charset=utf-8"});

                        let response = new Response(blob, {"status": 200, "statusText": "ok"});

                        console.log(response);
                        caches.open('v1').then((cache) => {
                            let currentIndexLocation = `${event.data.url}`;
                            cache.put(currentIndexLocation, response);

                            event.ports[0].postMessage({status: 'finished', content:content.toString()});
                        });


                        //console.log(content.toString());
                    })
                })
            });

        }
    }
});


let getAppFile = function(request){
    return new Promise((resolve, reject)=>{
            console.log("Request",request.url);
            let url = new URL(request.url);
            let appFile = "app"+url.pathname;
            console.log(appFile);
            csbArchive.readFile(appFile,(err, content)=>{
                if(err){
                    reject(err);
                }else{
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

    let   cacheAndRelayResponse = function(response){
        let responseClone = response.clone();
        caches.open('v1').then((cache) => {
            cache.put(event.request, responseClone);
        });

        return response;
    };

    if(csbArchive){
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
