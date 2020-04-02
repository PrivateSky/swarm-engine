const MimeType = require("../util/MimeType");

function RawDossierHelper(rawDossier){


  function getAppFile(appFile) {
        return new Promise((resolve, reject) => {
            rawDossier.readFile(appFile, (err, content) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(content);
                }
            });
        });
    }

    this.handleLoadApp = function (basePath) {

        return function (req, res, next) {
            if (rawDossier) {
                let url = new URL(req.originalUrl);
                let filePath = url.pathname;
                //match landing page and other pages. e.g. /, /settings, /settings/privacy
                if (filePath === "/" || filePath.indexOf(".") === -1) {
                    filePath = "/index.html";
                }
                let appFile = basePath + filePath;
                let fileExtension = appFile.substring(appFile.lastIndexOf(".") + 1);
                let mimeType = MimeType.getMimeTypeFromExtension(fileExtension);
                getAppFile(appFile).then((data) => {
                    let headers = {};
                    headers["Content-Type"] = mimeType.name;
                    res.set(headers);
                    res.status(200);
                    let content = mimeType.binary ? data : data.toString();
                    res.send(content);
                    res.end();

                }).catch((error) => {
                    console.log(error);
                    res.status(404);
                    res.end();
                });
            }
            else {
                console.error("RawDossier is not ready");
                res.status(503);
                res.end();
            }
        }
    }
}

module.exports = RawDossierHelper;
