const MimeType = require("../util/MimeType");
const securityPolicies = "/app/security.policies";
const cache = require("opendsu").loadApi("cache").getCache("middlewareCache");

function RawDossierHelper(rawDossier) {
    let policies = {};

    rawDossier.readFile(securityPolicies, (err, _policies) => {
        if (!err) {
            policies = JSON.parse(_policies);
        }
    })

    function isCacheable(filePath) {
        const cacheableFolders = policies.cacheableFolders;
        if (typeof cacheableFolders === "undefined") {
            return false;
        }

        for (let i = 0; i < cacheableFolders.length; i++) {
            if (filePath.startsWith(cacheableFolders[i])) {
                return true;
            }
        }

        return false;
    }

    function getAppFile(appFile) {
        return new Promise((resolve, reject) => {
            if (isCacheable(appFile)) {
                cache.get(appFile, (err, data) => {
                    if (err || typeof data === "undefined") {
                        __readAppFile();
                    }else{
                        data.toString = function (){
                            const textDecoder = new TextDecoder();
                            return textDecoder.decode(data);
                        }
                        resolve(data);
                    }
                });
            } else {
                __readAppFile();
            }

            function __readAppFile() {
                rawDossier.readFile(appFile, (err, content) => {
                    if (err) {
                        reject(err);
                    } else {
                        if (isCacheable(appFile)) {
                            cache.put(appFile, content);
                        }
                        resolve(content);
                    }
                });
            }
        });
    }

    this.handleLoadApp = function (basePath, fallbackBasePath) {

        function respondWithFile(req, res, basePath) {
            let url = new URL(req.originalUrl);
            let filePath = url.pathname;
            //match landing page and other pages. e.g. /, /settings, /settings/privacy
            if (filePath === "/" || filePath.indexOf(".") === -1) {
                filePath = "/index.html";
            }
            let appFile = basePath + filePath;
            let fileExtension = appFile.substring(appFile.lastIndexOf(".") + 1);
            let mimeType = MimeType.getMimeTypeFromExtension(fileExtension);
            return getAppFile(appFile).then((data) => {
                let headers = {};
                headers["Content-Type"] = mimeType.name;
                res.set(headers);
                res.status(200);
                let content = mimeType.binary ? data : data.toString();
                res.send(content);
                res.end();
            })
        };

        return function (req, res, next) {
            if (rawDossier) {
                respondWithFile(req, res, basePath).catch((err) => {
                    return respondWithFile(req, res, fallbackBasePath);
                }).catch((err) => {
                    res.status(404);
                    res.end();
                })
                return;
            }

            console.error("RawDossier is not ready");
            res.status(503);
            res.end();
        }
    }
}

module.exports = RawDossierHelper;
