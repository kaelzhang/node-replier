'use strict';

var replier = exports;
replier.Server = Server;
replier.Client = Client;

replier.server = function (options, callback) {
    return new Server(options, callback);
};

replier.client = function (options, callback) {
    return new Client(options, callback);
};

replier._migrate_events = function (events, from, to) {
    events.forEach(function (event) {
        from.on(event, function () {
            var args = [event];
            to.emit.apply(to, args.concat.apply(args, arguments));
        });
    });
};

// Check if the server is alive and is a replier server
// see [The GNU C Library - Error Reporting](http://www.chemie.fu-berlin.de/chemnet/use/info/libc/libc_2.html)
replier.check = function (port, callback) {
    function cb (alive) {
        if ( !no ) {
            no = true;
            callback(alive);
            client.end();
        }
    }

    var no;
    var client = replier
    .client()
    // Check if there's no server errors
    .on('error', function (err) {
        cb(false);
    })
    .on('connect', function () {
        // send heartbeat message
        client.send('_heartbeat', function (err, alive) {
            cb(!err && !!alive);
        });
        
    }).connect(port);
};


var net = require('net');
var util = require('util');
var EE = require('events').EventEmitter;


// @constructor
// Create a socket server
// @param {Object} options
// - port {number}
function Server (options, callback) {
    var self = this;
    options = options || {};

    this.server = new net.Server;
    this.server.on('connection', function (client) {
        client.on('data', function(data){
            function reply (err, msg){
                client.write(
                    JSON.stringify({
                        err: err,
                        msg: msg,
                        mid: message_id
                    })
                );
            }

            // data is a stream
            data = JSON.parse(data.toString());

            var message_id = data.mid;
            var message = data.msg;

            if ( message === '_heartbeat' ) {
                reply(null, {
                    alive: true
                });

            } else {
                self.emit('message', message, reply);
            }
        });
    });
    replier._migrate_events(['listening', 'close', 'error'], this.server, this);

    if ( options.port ) {
        // set the timer, so that the 'listening' event could be binded
        // setImmediate(function () {
            self.listen(options.port, function () {
                callback && callback(self);
            });
        // });
    }
}

util.inherits(Server, EE);

Server.prototype.listen = function(handle, callback) {
    this.server.listen(handle, callback);
    return this;
};


// - retry {number}
//      - 0: no retries, default
//      - >0: max retry times
//      - -1: no limit
// - retry_timeout: {number} default to `100` ms
function Client (options, callback) {
    var self = this;
    options = options || {};

    this.mid = 0;
    this.callbacks = {};

    this.socket = new net.Socket(options);
    replier._migrate_events(['connect', 'error', 'end', 'timeout', 'close', 'drain'], this.socket, this);

    this.socket.on('data', function (data) {
        self.emit('data', data);

        self._dealServerData(data);
    });
}

util.inherits(Client, EE);


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


// Send data to the server
Client.prototype.send = function(msg, callback) {
    var self = this;
    var mid = this._messageId();
    var data = JSON.stringify({
        msg: msg,
        mid: mid
    });

    this._registerResponse(mid, callback);
    this.socket.write(data);

    return this;
};


Client.prototype._registerResponse = function(id, callback) {
    this.callbacks[id] = callback;
};


Client.prototype._dealServerData = function(data) {
    data = JSON.parse(data);

    var error;
    var msg;
    var mid;

    if ( data ){
        error = data.err;
        msg = data.msg;
        mid = data.mid;
    }

    var callback = this.callbacks[mid];
    delete this.calbacks[mid];

    if ( callback ) {
        callback(err || null, msg);
    }
};


Client.prototype._messageId = function() {
    return ++ this.mid;
};



Client.prototype.end = function() {
    this.socket.end.apply(this.socket, arguments);
    return this;
};

