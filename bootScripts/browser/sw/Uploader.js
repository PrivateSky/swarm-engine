const Buffer = require('buffer').Buffer;

/**
 * Constructor
 *
 * @param {object} options
 * @param {string} options.inputName
 * @param {RawDossier} options.dossier
 * @param {string} options.uploadPath
 */
function Uploader(options) {
    options = options || {};
    this.inputName = null;
    this.dossier = null;
    this.uploadPath = null;
    this.uploadMultipleFiles = false;

    if (typeof options.inputName !== 'string' || !options.inputName.length) {
        throw new Error("The input name is required!");
    }

    if (typeof options.dossier !== 'object') {
        throw new Error("The dossier is required and must be an instance of RawDossier!");
    }

    if (typeof options.uploadPath !== 'string' || !options.uploadPath.length) {
        throw new Error("The upload path is missing!");
    }

    this.inputName = options.inputName;
    this.dossier = options.dossier;
    this.uploadPath = options.uploadPath;
    this.uploadMultipleFiles = this.inputName.substr(-2) === '[]';
}

Uploader.prototype.Error = {
    NO_FILES: 10,
    INVALID_FILE: 20
};


/**
 * @param {object|any} body
 * @throws {Error}
 */
Uploader.prototype.validateRequestBody = function (body) {
    const inputName = this.inputName;

    if (typeof body !== 'object') {
        const error = new Error(`No files have been uploaded. "${inputName}" input is empty!"`);
        error.code = this.Error.NO_FILES;
        throw error;
    }

    const __uploadExists = () => {
        if (this.uploadMultipleFiles) {
            return Array.isArray(body[inputName]);
        }

        return body[inputName] instanceof File;
    }

    if (!__uploadExists()) {
        const error = new Error(`No files have been uploaded. "${inputName}" input is empty!"`);
        error.code = this.Error.NO_FILES;
        throw error;
    }
}

/**
 * Validate a single file
 *
 * @param {File} file
 * @throws {Error}
 */
Uploader.prototype.validateFile = function (file) {
    if (!file instanceof File) {
        const error = new Error('File must be an instance of File!');
        error.code = this.Error.INVALID_FILE;
        throw error;
    }

    // TODO: validate file size?
    // TODO: validate allowed type?
}

/**
 * @param {File} file
 * @param {callback} callback
 */
Uploader.prototype.uploadFile = function (file, callback) {
    const destFile = `${this.uploadPath}${file.name}`;
    file.arrayBuffer().then((buffer) => {
        const buf = new Buffer(buffer);
        this.dossier.writeFile(destFile, buf, (err) => {
            callback(err, {
                path: destFile
            });
        })
    })
}

/**
 * TODO: Support for uploading the request body payload
 * @param {object|any} requestBody
 * @param {callback} callback
 */
Uploader.prototype.upload = function (requestBody, callback) {
    try {
        this.validateRequestBody(requestBody);
    } catch (e) {
        return callback(e);
    }

    let files = [];
    if (!this.uploadMultipleFiles) {
        files.push(requestBody[this.inputName]);
    } else {
        files = requestBody[this.inputName];
    }

    const filesUploaded = [];

    function uploadFileCallback(file, err) {

        const _callback = function (err, result) {
            const srcFile = {
                name: file.name,
                type: file.type
            };

            if (err) {
                filesUploaded.push({
                    file: srcFile,
                    error: err
                });
            } else {
                filesUploaded.push({
                    file: srcFile,
                    result,
                });
            }


            if (filesUploaded.length === files.length) {
                let errors = filesUploaded.filter(item => item.error !== undefined);
                const uploadedFiles = filesUploaded.filter(item => item.result !== undefined);

                errors = (errors.length) ? errors : null;
                callback(errors, uploadedFiles);
            }
        };

        if (err) {
            return _callback(err);
        }
        return _callback;
    }

    for (const file of files) {
        try {
            this.validateFile(file);
        } catch (e) {
            uploadFileCallback(file, e);
            continue;
        }

        this.uploadFile(file, uploadFileCallback(file));
    }
}

module.exports = Uploader;
