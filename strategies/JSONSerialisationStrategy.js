function JSONSerialisationStrategy(){
     this.serialise = function(swarmInstance){

     }

    this.deserialise = function(jsonSerialisation){

    }
}

module.exports.createStrategy = function(...args){
    return new JSONSerialisationStrategy(...args);
}