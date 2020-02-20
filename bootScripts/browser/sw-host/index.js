HostBootScript = require("./HostBootScript");
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

                        let blob = new Blob([content], {type: "text/html"});
                        let response = new Response(blob, {"status": 200, "statusText": "ok"});

                        caches.open('v1').then((cache) => {
                            let currentIndexLocation = `${window.location.origin}/index.html`;
                            cache.put(currentIndexLocation, response);
                        });

                        console.log(content.toString());
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
                    let mimeType;
                    switch (appFile.substring(appFile.lastIndexOf(".") + 1)) {
                        case "css":
                            mimeType = "text/css";
                            break;
                        case "js":
                            mimeType = "text/javascript";
                            break;
                        case "html":
                            mimeType = "text/html";
                            break;
                        case "png":
                            mimeType = "image/png";
                            break;
                        case "gif":
                            mimeType = "image/gif";
                            break;
                        case "json":
                            mimeType = "application/json";
                            break;
                        default:
                            mimeType = "text/plain";
                    }

                    let blob = new Blob([content], {type: mimeType});
                    let response = new Response(blob, {"status": 200, "statusText": "ok"});
                    resolve(response);
                }
            });
    });
};



self.addEventListener('fetch', (event) => {

    if(csbArchive){
        event.respondWith(
            caches.match(event.request).then((resp) => {

                return resp || fetch(event.request).then((response) => {
                    let responseClone = response.clone();
                    caches.open('v1').then((cache) => {
                        cache.put(event.request, responseClone);
                    });

                    return response;
                });
            }).catch(() => {
                return caches.match('./sw-test/gallery/myLittleVader.jpg');
            })
        );
    }


});
