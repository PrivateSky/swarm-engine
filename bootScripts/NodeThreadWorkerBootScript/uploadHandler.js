const querystring = require("querystring");

const Uploader = require("./NodeUploader");

function configureUploader(dsu, config) {
    config = config || {};

    if (!config.path) {
        throw new Error('Upload path is required. Ex: "POST /upload?path=/path/to/upload/folder"');
    }

    if (!config.input && !config.filename) {
        throw new Error(
            '"input" query parameter is required when doing multipart/form-data uploads or "filename" query parameter for request body uploads. Ex: POST /upload?input=files[] or POST /upload?filename=my-file.big'
        );
    }

    let uploadPath = config.path;
    if (uploadPath.substr(-1) !== "/") {
        uploadPath += "/";
    }

    let allowedTypes;
    if (typeof config.allowedTypes === "string" && config.allowedTypes.length) {
        allowedTypes = config.allowedTypes.split(",").filter((type) => type.length > 0);
    } else {
        allowedTypes = [];
    }
    const options = {
        inputName: config.input,
        filename: config.filename,
        maxSize: config.maxSize,
        allowedMimeTypes: allowedTypes,
        dossier: dsu,
        uploadPath: uploadPath,
        preventOverwrite: config.preventOverwrite,
    };

    const uploader = new Uploader(options);
    return uploader;
}

const handle = (dsu, req, res, requestedPath) => {
    let uploader;
    try {
        const query = requestedPath.substr(requestedPath.indexOf("?") + 1);
        const queryParams = querystring.parse(query);
        console.log({ queryParams });
        uploader = configureUploader(dsu, queryParams);
    } catch (e) {
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 500;
        res.end(JSON.stringify(e.message));
        return;
    }

    let data = [];
    req.on("data", (chunk) => {
        console.log("chuink", chunk);
        data.push(chunk);
        // data += chunk;
    });

    req.on("end", () => {
        try {
            data = $$.Buffer.concat(data);

            console.log("data", data.toString());
            // console.log('req.body', $$.Buffer.from(data).toString());
            uploader.upload(req, data, function (err, uploadedFiles) {
                if (err && (!Array.isArray(uploadedFiles) || !uploadedFiles.length)) {
                    console.log(err);
                    let statusCode = 400; // Validation errors

                    if (err instanceof Error) {
                        // This kind of errors should indicate
                        // a serious problem with the uploader
                        // and the status code should reflect that
                        statusCode = 500; // Internal "server" errors
                    }

                    res.setHeader("Content-Type", "application/json");
                    res.statusCode = statusCode;
                    res.end(
                        JSON.stringify(err, (key, value) => {
                            if (value instanceof Error) {
                                return value.message;
                            }

                            return value;
                        })
                    );

                    return;
                }

                res.setHeader("Content-Type", "application/json");
                res.statusCode = 201;
                res.end(JSON.stringify(uploadedFiles));
            });
        } catch (err) {
            console.log("worker error", err);
            res.statusCode = 500;
            res.end();
        }
    });
};

module.exports = {
    handle,
};
