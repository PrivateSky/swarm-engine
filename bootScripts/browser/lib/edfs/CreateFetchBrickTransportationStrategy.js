
function FetchBrickTransportStrategy(initialConfig) {
    const url = initialConfig;
    this.send = (name, data, callback) => {

        fetch(url + "/EDFS/", {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            body: data
        }).then(function(response) {
            return response.json();
        }).then(function(data) {
            callback(null, data)
        }).catch(error=>{
            callback(error);
        });

    };

    this.get = (name, callback) => {
        fetch(url + "/EDFS/"+name,{
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/octet-stream'
            },
        }).then(response=>{
            return response.arrayBuffer();
        }).then(arrayBuffer=>{

                let buffer = new Buffer(arrayBuffer.byteLength);
                let view = new Uint8Array(arrayBuffer);
                for (let i = 0; i < buffer.length; ++i) {
                    buffer[i] = view[i];
                }

            callback(null, buffer);
        }).catch(error=>{
            callback(error);
        });
    };

    this.getHashForAlias = (alias, callback) => {
        fetch(url + "/EDFS/getVersions/" + alias, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/octet-stream'
            },
        }).then(response => {
            return response.json().then(data => {
                callback(null, data);
            }).catch(error => {
                callback(error);
            })
        });
    };

    this.getLocator = () => {
        return url;
    };
}
//TODO:why we use this?
FetchBrickTransportStrategy.prototype.FETCH_BRICK_TRANSPORT_STRATEGY = "FETCH_BRICK_TRANSPORT_STRATEGY";


module.exports = FetchBrickTransportStrategy;
