const SWBootScript = require("./SWBootScript");
const server = require("ssapp-middleware").getMiddleware();
const MimeType = require("../util/MimeType");
const ChannelsManager = require("../../../utils/SWChannelsManager").getChannelsManager();
const UtilFunctions = require("../../../utils/utilFunctions");
const RawDossierHelper = require("./RawDossierHelper");
const Uploader = require("./Uploader");
const EDFS = require("edfs");
const CONSTANTS = EDFS.constants.CSB;
let bootScript = null;
let rawDossierHlp = null;
let uploader = null;
let seedResolver = null;


function createChannelHandler (req, res) {
    ChannelsManager.createChannel(req.params.channelName, function (err) {
        if (err) {
            res.status(err.code || 500);

        } else {
            res.status(200);
        }
        res.end();
    });
}

function forwardMessageHandler(req, res){
    ChannelsManager.forwardMessage(req.params.channelName,function(err){
        if(err){
            res.status(err.code || 500);
        }
        res.end();
    });
}

function sendMessageHandler (req, res) {
    UtilFunctions.prepareMessage(req, function (err, bodyAsBuffer) {

        if (err) {
            res.status(err.code || 500);
            res.end();
        } else {
            ChannelsManager.sendMessage(req.params.channelName, bodyAsBuffer, function (err) {
                if (err) {
                    res.status(err.code || 500);

                } else {
                    res.status(200);
                }
                res.end();
            });
        }
    })
}

function receiveMessageHandler (req, res) {
    ChannelsManager.receiveMessage(req.params.channelName, function (err, message) {
        if (err) {
            res.status(err.code || 500);
        } else {
            if (Buffer.isBuffer(message)) {
                res.setHeader('content-type', 'application/octet-stream');
            }

            if (typeof message.length !== "undefined") {
                res.setHeader('content-length', message.length);
            }

            res.status(200);
            res.send(message);
        }
        res.end();
    });
}

self.addEventListener('activate', function (event) {
    console.log("Activating host service worker", event);
    event.waitUntil(clients.claim());
});

self.addEventListener('message', function (event) {
    if (!(event.target instanceof ServiceWorkerGlobalScope)) {
        return;
    }

    const data = event.data;
    const comPort = event.ports[0];

    if (data.action === "activate") {
        comPort.postMessage({status: 'empty'});
    }

    if (data.seed) {
        // If a seed promise resolver exists
        // it means that the state is waiting to be initialized
        // in the fetch request event handler
        if (seedResolver) {
            // Resolve the seed request
            seedResolver(data.seed);

            // Prevent multiple resolves in case
            // multiple tabs are open
            seedResolver = null;
            return;
        }

        if (!global.rawDossier) {
            bootSWEnvironment(data.seed, (err) => {
                if (err) {
                    throw err;
                }
                comPort.postMessage({status: 'finished'});
            })
        }
    }
});

self.addEventListener('fetch', (event) => {
    event.respondWith(initState(event).then(server.handleEvent));
});

/**
 * Initialize the service worker state
 *
 * If the dossier isn't loaded, request a seed
 * and boot the service worker environment
 *
 * @param {FetchEvent} event
 * @return {Promise}
 */
function initState(event) {
    if (global.rawDossier) {
        return Promise.resolve(event);
    }

    return requestSeedFromClient().then((seed) => {
        return new Promise((resolve, reject) => {
            bootSWEnvironment(seed, (err) => {
                if (err) {
                    return reject(err);
                }

                resolve(event);
            })
        })
    });
}

/**
 * Request a seed by posting a seed request
 * to all visible windows
 *
 * @return {Promise} The promise will be resolved
 *                   when a client will post back the
 *                   the requested seed in the
 *                   "on message" handler
 */
function requestSeedFromClient() {
    return clients.matchAll({
        includeUncontrolled: true,
        type: 'window'
    }).then((clients) => {
        // This promise will be resolved
        // once the loader posts back our seed in the "on message" handler
        let requestSeedPromise = new Promise((resolve, reject) => {
            seedResolver = resolve;
        })

        const identity = self.registration.scope.split('/').pop();

        // Request the seed
        for (const client of clients) {
            // Send a seed request only to visible windows
            if (client.visibilityState !== 'visible') {
                continue;
            }

            client.postMessage({
                query: 'seed',
                identity: identity,
            });
        }
        return requestSeedPromise;
    })
}

/**
 * @param {string} seed
 * @param {callback} callback
 */
function bootSWEnvironment(seed, callback) {
    bootScript = new SWBootScript(seed);
    bootScript.boot((err, _rawDossier) => {
        if(err){
            return callback(err);
        }

        global.rawDossier = _rawDossier;
        rawDossierHlp = new RawDossierHelper(global.rawDossier);
        initMiddleware();
        callback();
    });
}


function initMiddleware(){
    server.put("/create-channel/:channelName", createChannelHandler);
    server.post("/forward-zeromq/:channelName", forwardMessageHandler);
    server.post("/send-message/:channelName", sendMessageHandler);
    server.get("/receive-message/:channelName", receiveMessageHandler);
    server.post('/upload', uploadHandler);
    server.get('/download/*', downloadHandler);
    server.get('/apps/*', rawDossierHlp.handleLoadApp());
    server.use("*","OPTIONS",UtilFunctions.handleOptionsRequest);
    server.get("*",rawDossierHlp.handleLoadApp("/"+CONSTANTS.APP_FOLDER, "/"+CONSTANTS.CODE_FOLDER));
}


function uploadHandler (req, res) {
    try {
        configureUploader(req.query);
    } catch (e) {
        res.sendError(500, JSON.stringify(e.message), 'application/json');
        return;
    }
    uploader.upload(req, function (err, uploadedFiles) {
        if (err && (!Array.isArray(uploadedFiles) || !uploadedFiles.length))  {
            let statusCode = 400; // Validation errors

            if (err instanceof Error) {
                // This kind of errors should indicate
                // a serious problem with the uploader
                // and the status code should reflect that
                statusCode = 500; // Internal "server" errors
            }

            res.sendError(statusCode, JSON.stringify(err, (key, value) => {
                if (value instanceof Error) {
                    return value.message;
                }

                return value;
            }), 'application/json');
            return;
        }

        res.status(201);
        res.set("Content-Type", "application/json");
        res.send(JSON.stringify(uploadedFiles));
    });
}

function downloadHandler(req, res) {
    let path = req.path.split('/').slice(2); // remove the "/download" part
    path = path.filter(segment => segment.length > 0).map(segment => decodeURIComponent(segment));
    if (!path.length) {
        return res.sendError(404, "File not found");

    }
    path = '/' + path.join('/');

    /**
     * Convert a NodeJS stream.Readable to browser ReadableStream
     * @param {stream.Readable} stream
     * @return {ReadableStream}
     */
    function convertToNativeReadableStream(stream) {
        const nativeStream = new ReadableStream({
            start(controller) {

                stream.on('data', (chunk) => {
                    controller.enqueue(chunk);
                });
                stream.on('error', (err) => {
                    controller.error(err);
                })
                stream.on('end', () => {
                    controller.close();
                })
            },

            cancel() {
                stream.destroy();
            }
        });
        return nativeStream;
    }

    global.rawDossier.createReadStream(path, (err, stream) => {
        if (err instanceof Error) {
            if (err.message.indexOf('could not be found') !== -1) {
                return res.sendError(404, "File not found");
            }

            return res.sendError(500, err.message);
        } else if (err) {
            return res.sendError(500, Object.prototype.toString.call(err));
        }

        // Extract the filename
        const filename = path.split('/').pop();
        const readableStream = convertToNativeReadableStream(stream);

		let fileExt = filename.substring(filename.lastIndexOf(".") + 1);
        res.status(200);
        res.set("Content-Type",MimeType.getMimeTypeFromExtension(fileExt).name);
        res.set("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(readableStream);
    });
}

function configureUploader(config) {
    config = config || {};

    if (!config.path) {
        throw new Error('Upload path is required. Ex: "POST /upload?path=/path/to/upload/folder"');
    }

    if (!config.input && !config.filename) {
        throw new Error('"input" query parameter is required when doing multipart/form-data uploads or "filename" query parameter for request body uploads. Ex: POST /upload?input=files[] or POST /upload?filename=my-file.big');
    }

    let uploadPath = config.path;
    if (uploadPath.substr(-1) !== '/') {
        uploadPath += '/';
    }

    let allowedTypes;
    if (typeof config.allowedTypes === 'string' && config.allowedTypes.length) {
        allowedTypes = config.allowedTypes.split(',').filter(type => type.length > 0);
    } else {
        allowedTypes = [];
    }
    const options = {
        inputName: config.input,
        filename: config.filename,
        maxSize: config.maxSize,
        allowedMimeTypes: allowedTypes,
        dossier: global.rawDossier,
        uploadPath: uploadPath,
        preventOverwrite: config.preventOverwrite
    };

    if (!uploader) {
        uploader = new Uploader(options);
    } else {
        uploader.configure(options);
    }
}
