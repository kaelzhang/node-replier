'use strict';

var replier = exports;

var net = require('net');
var util = require('util');
var EE = require('events').EventEmitter;

function Server (options, callback) {
    var self = this;

    options = options || {};
    this.server = new net.Server(options);

    if ( options.port ) {
        this.listen(options.port, function () {
            callback(self);
        });
    }

    this.server.on('connection', function (client) {
        client.on('data', function(data){
            function reply (msg){
                client.write( JSON.stringify(msg) );
            }

            // data is a stream
            data = JSON.parse(data.toString());

            if ( data === '_heartbeat' ) {
                reply({
                    alive: true
                });

            } else {
                self.emit('message', data, reply);
            }
        });
    });
}
replier.Server = Server;


// - retry {number}
//      - 0: no retries, default
//      - >0: max retry times
//      - -1: no limit
// - retry_timeout: {number} default to `100` ms
function Client (options, callback) {
    var self = this;

    options = options || {};
    this.socket = new net.Socket(options);
    this.socket.on('error', function (err) {
        self.emit('error', err);
    });

    if ( options.port ) {
        this.connect(options.port, function () {
            callback(self);
        });
    }
}
replier.Client = Client;


replier.listen = function (options, callback) {
    return new Server(options, callback);
};


replier.connect = function (options, callback) {
    return new Client(options, callback);
};


util.inherits(Server, EE);

Server.prototype.listen = function(handle, callback) {
    this.server.listen(handle, callback);
    return this;
};


util.inherits(Client, EE);

// Send data to the server
Client.prototype.send = function(data, callback) {
    this.socket.write( JSON.stringify(data) );

    var self = this;
    this.socket.once('data', function (data) {
        self._decode(data, callback);
    });

    return this;
};


// Data will transfer with the form of Stream
Client.prototype._decode = function(data, callback) {
    data = JSON.parse(data);

    var error = null;

    if ( data ){
        if (data.error ) {
            error = data.error;
        }

        delete data.error;
    }

    callback(error, data);
};


Client.prototype.connect = function(port, callback) {
    var self = this;

    this.socket.connect(port, function (err) {
        if ( err ) {
            self.emit('error', err);
        } else {
            self.emit('open');
        }

        callback && callback(err);
    });

    return this;
};


// Check if the server is alive and is a replier server
// see [The GNU C Library - Error Reporting](http://www.chemie.fu-berlin.de/chemnet/use/info/libc/libc_2.html)
replier.check = function (port, callback) {
    var cb = once(callback);

    replier.connect({
        port: port

    }, function (client) {
        client.send('_heartbeat', function (err, alive) {
            cb(!err && !!alive);
        });
    
    }).on('error', function (err) {
        cb(false);
    });
};


function once (fn, context) {
    var no;
    return function () {
        if ( !no ) {
            no = true;
            return fn && fn.apply(context || null, arguments);
        }
    };
}

