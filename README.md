# replier [![NPM version](https://badge.fury.io/js/replier.png)](http://badge.fury.io/js/replier) [![Build Status](https://travis-ci.org/kaelzhang/node-replier.png?branch=master)](https://travis-ci.org/kaelzhang/node-replier) [![Dependency Status](https://gemnasium.com/kaelzhang/node-replier.png)](https://gemnasium.com/kaelzhang/node-replier)

A very simple high-level JSON-based messaging socket server and client.

## Usage

server:

```js
var port = 9000;
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
	        break;
	        
	    case 'join':
	        result = array.join('');
	        break;
	        
	    default:
	    	err = 'error!'
	}
	
	reply(err, result);

}).listen(port);
```

client:

```js
var client = replier.client().connect(port, function(err){
    client.send({
        action: 'sum',
        array: [1, 2, 3]
    }, function(err, result){
        if(err){
        	return console.error('error: ', err);
        }
        
        console.log('the result is', result);
    })
});

// the result is 6
```


## replier.check(port, callback)

Checks if there's already a server listening to the given `port`.

- port `Number`
- callback(alive) `Function`
	- alive `Boolean` true, if the server is alive.

## replier.server()

Creates and returns a replier server object which is an instance of `replier.Server`.

```js
replier.server({
	port: 9000
}, replierServerCallback);
```

The code above is relevant to:

```js
replier.server().listen(9000, callback);
```

## Class: replier.Server

	
### server.listen(port, [callback]);

Listens to a port.

### Event: 'message'

Emitted when the server has reseived a message from the client. 

Differs from normal events, this event passes a function `reply` parameter which is used to reply responses to the client.

- message `mixed` 
- reply `function(err, response)` `err` and `response` will be passed to the `callback` of `client.send(message, callback)` 

### Event: 'listening'

Emitted when the server has been bound after calling server.listen.

### Event: 'close'

Emitted when the server closes. Note that if connections exist, this event is not emitted until all connections are ended.

### Event: 'error'

- `Error Object`

Emitted when an error occurs. The 'close' event will be called directly following this event. See example in discussion of server.listen.


## replier.client([options])

## Class: replier.Client([options])

- options `Object` The options of [`net.Socket`](http://nodejs.org/api/net.html#net_new_net_socket_options)

### client.connect(port, callback)

- port `Number`
- callback(err) `Function`
	- err `Error Object` server error, see [The GNU C Library - Error Reporting](http://www.chemie.fu-berlin.de/chemnet/use/info/libc/libc_2.html) for details
	
Connects the client to the server. 


### client.send(data, callback)

- data `Object` The data to be sent to the server
- callback(err, serverData)
	- err `mixed` error information from the server
	- serverData `mixed` server data 
	
Sends messages to the server, and 

### client.end()

Close the client.

### Events

Events of [`net.Socket`](http://nodejs.org/api/net.html#net_event_connect)

- `'connect'`
- `'error'`
- `'end'`
- `'data'`
- `'timeout'`
- `'close'`
- `'drain'`
