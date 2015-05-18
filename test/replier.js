'use strict';

var fs = require('fs');
var path = require('path');
var async = require('async');
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
    var arrayLength = 2500;
    beforeEach(function(){
        var array = [];
        for(var i=0; i < arrayLength; i++){
            array.push({timestamp:+ new Date()});
        }
        
        fs.writeFileSync(path.join(__dirname, '/fixture/longarray.js'), JSON.stringify(array));
    });

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
                case 'long':
                    result = array.length;
                    break;

                case 'join':
                    result = array.join('');
                    break;
                    
                default:
                    err = 'error!'
            }
            reply(err, result);

        }).listen(port);


        var client = replier.client().connect(port, function(err){

            async.series([
                function(cb){
                    client.send({
                        action: 'sum',
                        array: [1, 2, 3]
                    }, function(err, result){
                        expect(err).to.equal(null);
                        expect(result).to.equal(6);
                        cb();
                    });
                },
                function(cb){
                    var longarr = JSON.parse(fs.readFileSync(path.join(__dirname, './fixture/longarray.js')));
                    client.send({
                        action: 'long',
                        array: longarr
                    }, function(err, result){
                        expect(err).to.equal(null);
                        expect(result).to.equal(arrayLength);
                        cb();
                    });
                },
                function(cb){
                    client.send({
                        action: 'join',
                        array: [1, 2, 3]
                    }, function(err, result){
                        expect(err).to.equal(null);
                        expect(result).to.equal('123');
                        cb();
                    });
                }
            ], done);

        });
    });
});