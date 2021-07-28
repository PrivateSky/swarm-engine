const http = require("http");
const worker_threads = "worker_threads";
const { parentPort, workerData } = require(worker_threads);
const openDSU = require("opendsu");
const resolver = openDSU.loadApi("resolver");

const apiHandler = require("./apiHandler");
const apiStandardHandler = require("./apiStandardHandler");
const uploadHandler = require("./uploadHandler");
const downloadHandler = require("./downloadHandler");
const fileRequestHandler = require("./fileRequestHandler");
const mainDSUSSIHandler = require("./mainDSUSSIHandler");

function boot() {
    const sendErrorAndExit = (error) => {
        parentPort.postMessage({ error });
        setTimeout(() => {
            process.exit(1);
        }, 100);
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

    const startHttpServer = (dsu) => {
        var httpServer = http.createServer(function (req, res) {
            const { method, url } = req;

            if (!req.headers || req.headers.authorization !== authorizationKey) {
                res.statusCode = 403;
                return res.end("Unauthorized request");
            }

            const requestedPath = url;

            console.log(`requestedPath: ${requestedPath}`);

            if (requestedPath.indexOf("/api-standard") === 0) {
                return apiStandardHandler.handle(dsu, res, requestedPath);
            }

            if (requestedPath.indexOf("/api?") === 0) {
                return apiHandler.handle(dsu, res, requestedPath);
            }

            if (requestedPath.indexOf("/upload") === 0) {
                return uploadHandler.handle(dsu, req, res, requestedPath);
            }

            if (requestedPath.indexOf("/download") === 0) {
                return downloadHandler.handle(dsu, res, requestedPath);
            }

            if (requestedPath.indexOf("/getSSIForMainDSU") === 0) {
                return mainDSUSSIHandler.handle(seed, res);
            }
            fileRequestHandler.handle(dsu, req, res, seed, requestedPath);
        });

        httpServer.listen(0, function () {
            const serverPort = httpServer.address().port;
            parentPort.postMessage({ port: serverPort, status: "started" });
        });
    };

    try {
        console.log("Trying to load DSU for seed ===============================================", seed);
        resolver.loadDSU(seed, (err, dsu) => {
            if (err) {
                console.log(`Error loading DSU`, err);
                return sendErrorAndExit(err);
            }

            rawDossier = dsu;
            startHttpServer(dsu);
        });
    } catch (error) {

        parentPort.postMessage({ error, status: "failed" });
        process.exit(-1);
    }
}

boot();
