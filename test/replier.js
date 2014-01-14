'use strict';

var expect = require('chai').expect;
var replier = require('../');

replier.server().on('listening', function () { console.log('listening')
    send('abc');

}).on('message', function (data, reply) { console.log('message')
    reply(data);

}).listen(9998);


function send (msg) {
    var client = replier.client()
    .on('connect', function () {
        client.send(msg, function () {
            console.log(arguments);
        });
    })
    .on('error', function () {
        console.log('err', arguments);
    })
    .connect(9998);
}

// send('abc');

replier.check(9998, function () {
    console.log(arguments);
})