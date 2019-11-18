function fakeCommunicationStrategy(nameService, serialisationStrategy){
    let self = this;

    this.sendSwarmMessage = function(swarmInstance, toIdentity){

    }

    this.broadcastMessage = function(swarmInstance, toSpecificGroup){
        nameService.asyncEnumerateGroupMembers(toSpecificGroup, function(identity){
            self.sendSwarmMessage(swarmInstance, identity);
        })
    }

    this.onPhaseReceived = function(callback){

    }

}

module.exports.createStrategy = function(nameService, serialisationStrategy){
    return new fakeCommunicationStrategy(nameService, serialisationStrategy);
}