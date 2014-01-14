# replier [![NPM version](https://badge.fury.io/js/replier.png)](http://badge.fury.io/js/replier) [![Build Status](https://travis-ci.org/kaelzhang/node-replier.png?branch=master)](https://travis-ci.org/kaelzhang/node-replier) [![Dependency Status](https://gemnasium.com/kaelzhang/node-replier.png)](https://gemnasium.com/kaelzhang/node-replier)


replier.Server
replier.Client

var server = replier.listen(options, [callback])

// - retry {number}
//      - 0: no retries, default
//      - >0: max retry times
//      - -1: no limit
// - retry_timeout: {number} default to `100` ms
var client = replier.connect(options, [callback])


// Send data to the server
client.send(data, function (err, res) {
    
});


// When receiving client request
server.on('message', function (data, reply) {
    reply(err, res);
});


// Check if the server is alive and is a replier server
// see [The GNU C Library - Error Reporting](http://www.chemie.fu-berlin.de/chemnet/use/info/libc/libc_2.html)
replier.check(port, function (alive) {
    
});