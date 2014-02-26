'use strict';

var expect = require('chai').expect;
var replier = require('../');


describe("replier.check()", function(){
    it("with no server", function(done){
        replier.check(9000, function (alive) {
            expect(alive).to.equal(false);
            done();
        });
    });

    it("with a server", function(done){
        var server = replier.server();

        server.listen(9001, function () {
            replier.check(9001, function (alive) {
                expect(alive).to.equal(true);
                done();
            });
        });
    });
});


describe("basic usage", function(){
    it("callbacks should not be messed up.", function(done){
        var port = 9002;
        var server = replier.server().on('message', function(msg, reply){
            if(!msg){
                return;
            }
            
            var result;
            var array = msg.array;
            var err = null;
            
            switch(msg.action){
                case 'sum':
                    result = array.reduce(function(p, c){
                        return p + c;
                    });

                    return setTimeout(function () {
                        reply(err, result);
                    }, 50);

                    break;
                    
                case 'join':
                    result = array.join('');
                    break;
                    
                default:
                    err = 'error!'
            }
            
            reply(err, result);

        }).listen(port);

        var count = 2;

        function cb () {
            count --;
            if ( !count ) {
                done();
            }
        }

        var client = replier.client().connect(port, function(err){
            client.send({
                action: 'sum',
                array: [1, 2, 3]
            }, function(err, result){
                expect(err).to.equal(null);
                expect(result).to.equal(6);
                cb();
            });

            client.send({
                action: 'join',
                array: [1, 2, 3]
            }, function(err, result){
                expect(err).to.equal(null);
                expect(result).to.equal('123');
                cb();
            });
        });
    });
});