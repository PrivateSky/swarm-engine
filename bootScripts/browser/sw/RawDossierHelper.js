const MimeType = require("../util/MimeType");
const securityPolicies = "/app/security.policies";
const cache = require("opendsu").loadApi("cache").getCacheForVault("middlewareCache", 1000*60*60);

const USER_DETAILS = "user-details.json";

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
                if (["htm", "html", "xhtml"].includes(fileExtension)) {
                    const baseUrl = `/`;
                    content = content.replace("PLACEHOLDER_THAT_WILL_BE_REPLACED_BY_SW_OR_SERVER_WITH_BASE_TAG", `<base href="${baseUrl}">`);
                }
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

    this.getAppSeed = function(path, appName, callback) {
        if(!rawDossier) {
           return callback(new Error("Raw Dossier is not available."));
        }

        rawDossier.listMountedDossiers(path, (err, result) => {
            if (err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to get the list of DSUs mounted at path <${path}>`, err));
            }

            let selectedDsu = result.find((dsu) => dsu.path === appName);
            if (!selectedDsu) {
                return callback(new Error(`Dossier with the name ${appName} was not found in the mounted points!`));
            }

            callback(undefined, selectedDsu.identifier);
        });
    }

    this.getUserDetails = function(callback) {
        if(!rawDossier) {
            return callback(new Error("Raw Dossier is not available."));
        }

        rawDossier.readFile(USER_DETAILS, (err, fileContent) => {
            if(err) {
                return OpenDSUSafeCallback(callback)(createOpenDSUErrorWrapper(`Failed to read file <${USER_DETAILS}>`, err));
            }
            const dataSerialization = fileContent.toString();
            return callback(undefined, JSON.parse(dataSerialization));
        });
    }
}

module.exports = RawDossierHelper;
