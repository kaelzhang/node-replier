'use strict';
var BufferHelper = require('bufferhelper');
var replier = exports;
replier.Server = Server;
replier.Client = Client;

replier.server = function (options) {
    return new Server(options);
};

replier.client = function (options) {
    return new Client(options);
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

function dealStream(data, callback){
    data = data.toString('utf-8');
    function done(msg){
        if(msg){
            callback(msg);
        }
    }
    if ( !data ) {
        return;
    }

    if(data.indexOf(CHUNK_DELIMITER) == -1 && Buffer.byteLength(data, 'utf8') >= CHUNK_BUFFER_SIZE) {
        if(!buf){
            buf = new BufferHelper();
        }
        buf.concat(new Buffer(data)); // write data to buffer
    } else {
        var parts = data.split(CHUNK_DELIMITER);
        var msg;

        if(!buf || !buf.buffers.length){
            return parts.forEach(done);
        }

        if (parts.length == 2) {
            buf.concat(new Buffer(parts[0]));
            msg = buf.toBuffer().toString(); // and do something with message
            done(msg);

            if(parts[1]){
                buf = new BufferHelper();;
                buf.concat(new Buffer(parts[1])); // write new, incomplete data to buffer
            }else{
                buf = null;
            }
        } else {
            msg = buf.toString() + parts[0];
            done(msg);
            for (var i = 1; i <= parts.length -1; i++) {
                if (i !== parts.length-1) {
                    msg = parts[i];
                    done(msg);
                } else {
                    buf.concat(new Buffer(parts[i]));
                }
            }
        }
    }
}


// `socket.setNoDelay()` doesn't even work,
// so we use a delimiter to split each chunk into slices.
var CHUNK_DELIMITER = '\n';
var CHUNK_BUFFER_SIZE = Math.pow(2,16);
var buf;
// @constructor
// Create a socket server
// @param {Object} options
// - port {number}
function Server () {
    var self = this;

    this.server = new net.Server;
    this.server.on('connection', function (client) {
        client.setNoDelay(true);
        client.on('data', function(data){
            dealStream(data, function(msg){
                self._clientOnData(msg, client);
            });
        });
    });
    replier._migrate_events(['listening', 'close', 'error'], this.server, this);
}

util.inherits(Server, EE);

Server.prototype.listen = function(handle, callback) {
    this.server.listen(handle, callback);
    return this;
};


Server.prototype._clientOnData = function(data, client) {
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
    try {
        data = JSON.parse(data.toString());
    } catch(e) {
        this.emit('error', e);
        // fail silently.
        return;
    }

    var message_id = data.mid;
    var message = data.msg;

    if ( message === '_heartbeat' ) {
        reply(null, {
            alive: true
        });

    } else {
        this.emit('message', message, reply);
    }
};




// - retry {number}
//      - 0: no retries, default
//      - >0: max retry times
//      - -1: no limit
// - retry_timeout: {number} default to `100` ms
function Client (options) {
    var self = this;
    options = options || {};

    this.mid = 0;
    this.callbacks = {};

    this.socket = new net.Socket(options);
    replier._migrate_events(['connect', 'error', 'end', 'timeout', 'close', 'drain'], this.socket, this);

    this.socket.on('data', function (data) {
        dealStream(data, function(msg){
            self.emit('data', msg);
            self._dealServerData(msg);
        });
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
    var mid = this._messageId();
    var data = JSON.stringify({
        msg: msg,
        mid: mid
    });

    this._registerResponse(mid, callback);
    this.socket.write(data + CHUNK_DELIMITER);

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
    delete this.callbacks[mid];

    if ( callback ) {
        callback(error || null, msg);
    }
};


Client.prototype._messageId = function() {
    return ++ this.mid;
};



Client.prototype.end = function() {
    this.socket.end.apply(this.socket, arguments);
    return this;
};

