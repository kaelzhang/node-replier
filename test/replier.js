'use strict';

var expect = require('chai').expect;
var replier = require('../');


function send (msg) {
    var client = replier.client()
    .on('connect', function () {
        client.send(msg, function () {
            console.log('response', arguments);
            // client.end();

        });
    })
    .on('error', function () {
        console.log('err', arguments);
    })
    .on('end', function () {
        console.log('end', arguments)
    })
    .connect(9998);
}

// send('abc');

replier.check(9998, function () {
    console.log(arguments);

    var count = 1;
    setInterval(function () {
        send(++ count);
    }, 1000);
    
})