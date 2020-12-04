const http = require("http");
const querystring = require("querystring");
const worker_threads = "worker_threads";
const { parentPort, workerData } = require(worker_threads);
const openDSU = require("opendsu");
const resolver = openDSU.loadApi("resolver");
const MimeType = require("./browser/util/MimeType");

const USER_DETAILS = "user-details.json";

function boot() {
    const sendErrorAndExit = (error) => {
        parentPort.postMessage({ error });
        setTimeout(() => {
            process.exit(1);
        }, 100);
    };

    const getAppSeed = function (dsu, path, appName, res) {
        dsu.listMountedDossiers(path, (err, result) => {
            if (err) {
                const errorMessage = "Error listing mounted DSU";
                console.log(errorMessage, err);
                res.statusCode = 500;
                return res.end(errorMessage);
            }

            let selectedDsu = result.find((dsu) => dsu.path === appName);
            if (!selectedDsu) {
                const errorMessage = `Dossier with the name ${appName} was not found in the mounted points!`;
                console.log(errorMessage, err);
                res.statusCode = 500;
                return res.end(errorMessage);
            }

            res.statusCode = 200;
            res.end(selectedDsu.identifier);
        });
    };

    const getUserDetails = function (dsu, res) {
        dsu.readFile(USER_DETAILS, (err, fileContent) => {
            if (err) {
                const errorMessage = "Error getting user details";
                console.log(errorMessage, err);
                res.statusCode = 500;
                return res.end(errorMessage);
            }

            const dataSerialization = fileContent.toString();
            res.statusCode = 200;
            res.end(dataSerialization);
        });
    };

    process.on("uncaughtException", (error) => {
        console.error("unchaughtException inside worker", error);
        sendErrorAndExit(error);
    });

    if (!workerData) {
        return sendErrorAndExit("invalid data");
    }

    if (!workerData.seed || typeof workerData.seed !== "string") {
        return sendErrorAndExit("missing or invalid seed");
    }
    if (!workerData.authorizationKey) {
        return sendErrorAndExit("missing authorizationKey");
    }

    let { seed, authorizationKey } = workerData;

    resolver.loadDSU(seed, (err, dsu) => {
        if (err) {
            console.log(`Error loading DSU`, err);
            return sendErrorAndExit(err);
        }

        rawDossier = dsu;

        var httpServer = http.createServer(function (req, res) {
            const { method, url } = req;

            if (!req.headers || req.headers.authorization !== authorizationKey) {
                res.statusCode = 403;
                return res.end("Unauthorized request");
            }

            const requestedPath = url;

            // handling api-standard request
            if (requestedPath.indexOf("/api-standard") === 0) {
                const requestedApiPath = requestedPath.substr("/api-standard".length + 1);
                const requestedApiPathInfoMatch = requestedApiPath.match(/^([^\/\?]*)[\/\?](.*)$/);

                const apiMethod = requestedApiPathInfoMatch ? requestedApiPathInfoMatch[1] : requestedApiPath;
                const apiParameter = requestedApiPathInfoMatch ? requestedApiPathInfoMatch[2] : undefined;

                switch (apiMethod) {
                    case "app-seed": {
                        const { path, name } = querystring.parse(apiParameter);
                        getAppSeed(dsu, path, name, res);
                        return;
                    }
                    case "user-details": {
                        getUserDetails(dsu, res);
                        return;
                    }
                }

                res.statusCode = 403;
                res.end("Unknow api-standard method");
                return;
            }

            if (requestedPath.indexOf("/api?") === 0) {
                const apiQuery = requestedPath.substr("/api?".length);
                let { name: functionName, arguments: args } = querystring.parse(apiQuery);

                try {
                    args = JSON.parse(args);
                } catch (err) {
                    res.statusCode = 400;
                    return res.end("Invalid arguments provided");
                }

                dsu.call(functionName, ...args, (...result) => {
                    res.statusCode = 200;
                    res.end(JSON.stringify(result));
                });
                return;
            }

            // handling file request
            let file = requestedPath;
            if (!file || file === "/" || file.indexOf(".") === -1) {
                file = "/index.html";
            }

            if (file.indexOf("/") !== 0) {
                file = `/${file}`;
            }

            // console.log(`Handling iframe with KeySSI: ${seed} and file: ${file}`);

            let fileExtension = file.substring(file.lastIndexOf(".") + 1);
            let mimeType = MimeType.getMimeTypeFromExtension(fileExtension);

            const sendFile = (data) => {
                res.setHeader("Content-Type", mimeType.name);
                res.statusCode = 200;
                let content = data;
                if (!mimeType.binary) {
                    content = data.toString();

                    if (["htm", "html", "xhtml"].includes(fileExtension)) {
                        const baseUrl = `${url.substr(0, url.indexOf("/iframe"))}/iframe/${seed}/`;
                        content = content.replace("PLACEHOLDER_THAT_WILL_BE_REPLACED_BY_SW_OR_SERVER_WITH_BASE_TAG", `<base href="${baseUrl}">`);
                    }
                }

                res.end(content);
            };

            dsu.readFile(`/app${file}`, (err, fileContent) => {
                if (err) {
                    dsu.readFile(`/code${file}`, (err, fileContent) => {
                        if (err) {
                            console.log(`Error reading file /code${file}`, err);
                            res.statusCode = 500;
                            return res.end("Error reading file");
                        }

                        sendFile(fileContent);
                    });
                    return;
                }

                sendFile(fileContent);
            });
        });

        httpServer.listen(0, function () {
            const serverPort = httpServer.address().port;
            parentPort.postMessage({ port: serverPort, status: "started" });
        });
    });
}

boot();
