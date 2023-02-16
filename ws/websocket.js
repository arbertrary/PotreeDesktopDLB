const WebSocket = require('ws');
const express = require('express');


// Config
const Config = {
	http_port: 8888,
	socket_port: 3030
};

// Http server
const _app = express();
const server = require('http').Server(_app);
server.listen(Config.http_port);


const wss = new WebSocket.Server({ port: Config.socket_port });
// Console print
// Console print
console.log('[SERVER]: WebSocket on: localhost:' + Config.socket_port); // print websocket ip address
console.log('[SERVER]: HTTP on: localhost:' + Config.http_port); // print web server ip address
console.log(wss.address());


wss.on("connection", (ws) => {
	//connection is up, let's add a simple simple event
	ws.on("message", (message) => {
		//log the received message and send it back to the client
		console.log("received: %s", message);
		// ws.send(`Hello, you sent -> ${message}`);

		const msg = JSON.parse(message);

		if (msg.type == "load") {
			console.log(msg);
			Potree.loadProject(viewer, msg.data);
		}
		else if (msg.type == "save") {
			let data = Potree.saveProject(viewer);
			console.log(data);
			// let dataString = JSON5.stringify(data, null, "\t");
			// ws.send(JSON.stringify(dataString));

			ws.send(JSON.stringify(data));
		} else {
			console.error("Couldn't get message type");
		}

	});



	//send immediatly a feedback to the incoming connection
	// ws.send("Hi there, I am a WebSocket server");
});

// start our server
// server.listen(Config.http_port, () => {
// 	console.log(`Data stream server started on port ${Config.http_port}`);
// });