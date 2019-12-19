$$.swarms.describe("echo",{
    say: function(input){
        this.return("Echo "+ input);
    },
    interactSay: function(input){
        this.interact("interactResponse", input);
    },
    finally: function(){
        this.home();
    }
});