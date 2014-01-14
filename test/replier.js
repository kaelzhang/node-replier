'use strict';

var expect = require('chai').expect;
var replier = require('../');

// replier.listen({
//     port: 9998

// }, function () {
    

// }).on('message', function (data, reply) {
//     reply(data);
// });


function send (msg) {
    var client = new replier.Client;

    client.connect(9998, function () {
        
    }).on('error', function () {
        console.log('err', arguments)
    });
}

// send('abc');

replier.check(9998, function () {
    console.log(arguments);
})