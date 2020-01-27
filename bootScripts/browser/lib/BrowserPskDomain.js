const FETCH_BRICK_STORAGE_STRATEGY_NAME = "sw-fetch";
function BrowserPskDomain(edfsURL){
    const EDFS = require('edfs');

    const hasHttpStrategyRegistered = $$.brickTransportStrategiesRegistry.has(FETCH_BRICK_STORAGE_STRATEGY_NAME);

    if (!hasHttpStrategyRegistered) {
        let CreateFetchBrickTransportationStrategy = require("./edfs/CreateFetchBrickTransportationStrategy");
        let FetchBrickTransportationStrategy = new CreateFetchBrickTransportationStrategy(edfsURL);
        $$.brickTransportStrategiesRegistry.add(FETCH_BRICK_STORAGE_STRATEGY_NAME, FetchBrickTransportationStrategy);
    }


    function asyncReduce(array, handler, currentValue, callback) {
        function __callNext(index = 0) {
            if (index >= array.length) {
                return callback(undefined, currentValue);
            }

            handler(currentValue, array[index], (err, newCurrentValue) => {
                if (err) {
                    return callback(err);
                }

                if (newCurrentValue) {
                    currentValue = newCurrentValue;
                }

                __callNext(index + 1);
            })
        }

        __callNext();
    }



    function readConstitutionFrom(archive, callback) {

        archive.listFiles('constitutions', (err, files) => {
            if (err) {
                return callback(err);
            }

            asyncReduce(files, __readFile, [], callback);
        });


        function __readFile(pastFilesContent, filePath, callback) {
            archive.readFile(filePath, (err, fileContent) => {
                if (err) {
                    return callback(err);
                }

                pastFilesContent.push(fileContent);
                callback();
            });
        }
    }


    this.getConstitutionFilesFromBar = function (seed, callback) {
        console.log("reading constitution");
        const edfs = EDFS.attach(FETCH_BRICK_STORAGE_STRATEGY_NAME);
        const constitutionBAR = edfs.loadBar(seed);
        readConstitutionFrom(constitutionBAR, callback)
    }
}


let browserPskDomainInstance = new BrowserPskDomain("http://localhost:8080");
module.exports.getBrowserPskDomain = function(){
    return browserPskDomainInstance;
};
