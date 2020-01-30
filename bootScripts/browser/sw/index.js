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
            let swPskDomain = require("../lib/BrowserPskDomain").getBrowserPskDomain();
            swPskDomain.getConstitutionFilesFromBar(event.data.seed, (err, constitutionBundles) =>{
                if(!err){
                    constitutionBundles.forEach(bundle => eval(bundle.toString()));
                    event.ports[0].postMessage({status: constitutionBundles[0].toString()});
                }
                else{
                    console.log(err);
                }
            });

        }
    }
});