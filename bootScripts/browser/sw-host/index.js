HostBootScript = require("./HostBootScript");
let bootScript = null;


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
