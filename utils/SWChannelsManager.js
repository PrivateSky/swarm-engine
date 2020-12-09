const maxQueueSize = 100;
const TOKEN_PLACEHOLDER = "WEB_TOKEN_PLACEHOLDER";
const queues = {};
const subscribers = {};


function _getSubscribersList(channelName) {
    if (typeof subscribers[channelName] === "undefined") {
        subscribers[channelName] = [];
    }

    return subscribers[channelName];
}

function _getQueue(name) {
    let Queue = require("swarmutils").Queue;

    if (typeof queues[name] === "undefined") {
        queues[name] = new Queue();
    }

    return queues[name];
}

function _deliverMessage(subscribers, message) {
    let dispatched = false;
    try {
        while (subscribers.length > 0) {
            let subscriberCallback = subscribers.pop();
            if (!dispatched) {
                subscriberCallback(undefined, message);
                dispatched = true;
            } else {
                let e = new Error("Already dispatched");
                e.code = 403;
                subscriberCallback(e);
            }
        }
    } catch (err) {
        //... some subscribers could have a timeout connection
        if (subscribers.length > 0) {
            _deliverMessage(subscribers, message);
        }
    }

    return dispatched;
}

function createChannel(channelName, callback) {
    let Queue = require("swarmutils").Queue;

    if (typeof queues[channelName] !== "undefined") {
        let e = new Error("Channel exists!");
        e.code = 409;
        return callback(e);
    }

    queues[channelName] = new Queue();
    callback(undefined, TOKEN_PLACEHOLDER);
}

const plugs = {};
function sendMessage(channelName, message, callback) {

    let header;
    try{
        const SwarmPacker = require("swarmutils").SwarmPacker;
        header = SwarmPacker.getHeader(message);
    }catch(error){
        let e = new Error("SwarmPacker could not deserialize message");
        e.code = 400;
        callback(e);
    }

    if(typeof plugs[header.swarmTarget] === "undefined"){
        //we need to do this in order to ensure that we have a handler for every fake/real channel that we create
        let PC = require("../powerCords/browser/ServiceWorkerPC");
        plugs[header.swarmTarget] =  new PC();
        $$.swarmEngine.plug(header.swarmTarget, plugs[header.swarmTarget]);
    }

    let queue = _getQueue(channelName);
    let subscribers = _getSubscribersList(channelName);
    let dispatched = false;
    if (queue.isEmpty()) {
        dispatched = _deliverMessage(subscribers, message);
    }

    if (!dispatched) {
        if (queue.length < maxQueueSize) {
            queue.push(message);
            return callback(undefined);

        } else {
            //queue is full
            let e = new Error("Queue is full");
            e.code = 429;
            return callback(e);
        }

    }
    callback(undefined);

}

function receiveMessage(channelName, callback) {
    console.log(`Trying to receive message from channel "${channelName}"`);
    let queue = _getQueue(channelName);
    let message = queue.pop();

    if (!message) {
        _getSubscribersList(channelName).push(callback);
    } else {
        callback(undefined, message);
    }

}

function SWChannelsManager() {

        this.createChannel = createChannel;
        this.sendMessage = sendMessage;
        this.receiveMessage = receiveMessage;
        this.forwardMessage = function (channel, enable, callback) {
            let e = new Error("Unsupported feature");
            e.code = 403;
            callback(e);
        };
        console.log("ChannelsManager initialised!");
}

let channelManagerInstance = new SWChannelsManager();

module.exports.getChannelsManager = function(){
    return channelManagerInstance;
}
