function InnerIsolatePowerCord() {

    let setterTransfer;

    function transfer(...args) {

        args = args.map(arg => {
            if(arg.buffer) {
                // transforming UInt8Array to ArrayBuffer
                arg = arg.buffer;
            }

            return arg;
        });

        return setterTransfer(...args);
    }

    Object.defineProperty(this, "transfer", {
        set: (fn) => {
            setterTransfer = fn;
        }, get: () => {
            return setterTransfer ? transfer : undefined;
        }
    });

    this.sendSwarm = function (swarmSerialization) {
        try{
            if(swarmSerialization instanceof ArrayBuffer) {
                swarmSerialization = new global.ExternalCopy(new Uint8Array(swarmSerialization)).copyInto();
            }

            returnSwarm.apply(undefined, [null, swarmSerialization])
                .catch((err) => {
                    $$.log(err);
                })
        }catch(err){
           $$.log(err);
        }

    };

}

module.exports = InnerIsolatePowerCord;
