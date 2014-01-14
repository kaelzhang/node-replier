'use strict';

var expect = require('chai').expect;
var replier = require('../');

replier.listen(9998/*).on('listening'*/, function () {
    send('abc');

}).on('message', function (data, reply) { console.log('message')
    reply(data);

});


function send (msg) {
    var client = replier.connect(9998)
    .on('connect', function () {
        client.send(msg, function () {
            console.log(arguments);
        });
    })
    .on('error', function () {
        console.log('err', arguments);
    });
}

// send('abc');

replier.check(9998, function () {
    console.log(arguments);
})