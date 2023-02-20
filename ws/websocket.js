const WebSocket = require('ws');
const express = require('express');
const PoTree = require('./libs/potree/potree')

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

			// Remove measurements before loading
			viewer.scene.removeAllMeasurements();

			console.log(msg);
			Potree.loadProject(viewer, msg.data);
		}
		else if (msg.type == "save") {
			let potreeConfig = Potree.saveProject(viewer);
			console.log(potreeConfig);

			let scene = viewer.scene;
			let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

			let geoJson = []
			if (measurements.length > 0) {
				geoJson = serializeMeasurements(measurements);
			}

			exportMsg = {
				potreeConfig: potreeConfig,
				geoJSONMeasurements: geoJson
			}
			try {
				ws.send(JSON.stringify(exportMsg));
			}
			catch {
				console.warn("ERROR");
				console.log(measurements);
			}
		} else {
			console.error("Couldn't get message type");
		}
	});



	//send immediatly a feedback to the incoming connection
	// ws.send("Hi there, I am a WebSocket server");
});

// /**
//  *
//  * @author sigeom sa / http://sigeom.ch
//  * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
//  * @author Markus Schütz / http://potree.org
//  * @author Armin Bernstetter
//  */
function serializeMeasurements(measurements) {
	if (!(measurements instanceof Array)) {
		measurements = [measurements];
	}

	// measurements = measurements.filter(m => m instanceof PoTree.Measure);
	measurements = measurements.filter(m => m.constructor.name === "Measure");

	let features = [];
	for (let measure of measurements) {
		let f = PoTree.GeoJSONExporter.measurementToFeatures(measure);

		features = features.concat(f);
	}

	let geojson = {
		type: 'FeatureCollection',
		features: features
	};

	// return JSON.stringify(geojson, null, '\t');
	return geojson
}