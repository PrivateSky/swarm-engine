const urlReg = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?([a-z0-9]+([\-.]{1}[a-z0-9]+)*\.[a-z]{2,5}|localhost)(:[0-9]{1,5})?(\/.*)?$/gi;
const domainReg = /^([0-9a-zA-Z]*)\/agent\/([0-9a-zA-Z]*)$/gi;
const httpUrlRegex = new RegExp(urlReg);
const domainRegex =  new RegExp(domainReg);


function prepareMessage(req, callback){
    const contentType = req.headers['content-type'];
    if (contentType === 'application/octet-stream') {
        const contentLength = Number.parseInt(req.headers['Content-Length'], 10);

        if(Number.isNaN(contentLength)){
            let e = new Error("Length Required");
            e.code = 411;
            return callback(e);
        }
        else{
            callback(undefined,req.body);
        }

    } else {
        let e = new Error("Wrong message format received!");
        e.code = 500;
        callback(e);
    }
}

function isUrl(url){
    return url.match(httpUrlRegex);
}

function isInMyHosts(swarmTarget, hosts) {
    let url = new URL(swarmTarget);
    let arrayHosts = Array.from(hosts);
    for(let i = 0; i<arrayHosts.length; i++){
        if (url.host === arrayHosts[i]) {
            return true;
        }
    }

    return false;
}

function getChannelName(swarmTarget){

    let channelName;
    //check against domain/agent/agentName;

    if(swarmTarget.match(domainRegex)){
        let regGroups = domainRegex.exec(swarmTarget);
        channelName = btoa(regGroups[2]);
        return channelName;
    }

    //check against urls;
    if (swarmTarget.match(httpUrlRegex)) {

        if (swarmTarget[swarmTarget.length - 1] === "/") {
            swarmTarget = swarmTarget.slice(0, -1);
        }

        let urlFragments = swarmTarget.split("/");
        channelName = urlFragments[urlFragments.length - 1];
    }

    return channelName;
}

function handleOptionsRequest(req,res, next){

    const headers = {};
    // IE8 does not allow domains to be specified, just the *
    headers["Access-Control-Allow-Origin"] = req.headers.origin;
    // headers["Access-Control-Allow-Origin"] = "*";
    headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
    headers["Access-Control-Allow-Credentials"] = true;
    headers["Access-Control-Max-Age"] = '3600'; //one hour
    headers["Access-Control-Allow-Headers"] = `Content-Type, Content-Length, Access-Control-Allow-Origin, User-Agent, ${signatureHeaderName}`;
    res.set(headers);
    res.status(200);
    res.end();
}

module.exports = {prepareMessage, getChannelName, isUrl, isInMyHosts, handleOptionsRequest};
