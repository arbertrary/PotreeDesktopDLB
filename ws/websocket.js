const WebSocket = require('ws');
const express = require('express');
// const PoTree = require('./libs/potree/potree')

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

			// let scene = viewer.scene;
			// let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

			// let geoJson = ""
			// if (measurements.length > 0) {
			// 	geoJson = GeoJSONExporter.serialize(measurements);
			// }

			exportMsg = {
				potreeConfig: potreeConfig,
				measurements: "Developer comment: TODO"
			}

			ws.send(JSON.stringify(exportMsg));
		} else {
			console.error("Couldn't get message type");
		}
	});



	//send immediatly a feedback to the incoming connection
	// ws.send("Hi there, I am a WebSocket server");
});

/**
 *
 * @author sigeom sa / http://sigeom.ch
 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
 * @author Markus Schütz / http://potree.org
 *
 */

class GeoJSONExporter {

	static measurementToFeatures(measurement) {
		let coords = measurement.points.map(e => e.position.toArray());

		let features = [];

		if (coords.length === 1) {
			let feature = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: coords[0]
				},
				properties: {
					name: measurement.name
				}
			};
			features.push(feature);
		} else if (coords.length > 1 && !measurement.closed) {
			let object = {
				'type': 'Feature',
				'geometry': {
					'type': 'LineString',
					'coordinates': coords
				},
				'properties': {
					name: measurement.name
				}
			};

			features.push(object);
		} else if (coords.length > 1 && measurement.closed) {
			let object = {
				'type': 'Feature',
				'geometry': {
					'type': 'Polygon',
					'coordinates': [[...coords, coords[0]]]
				},
				'properties': {
					name: measurement.name
				}
			};
			features.push(object);
		}

		if (measurement.showDistances) {
			measurement.edgeLabels.forEach((label) => {
				let labelPoint = {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: label.position.toArray()
					},
					properties: {
						distance: label.text
					}
				};
				features.push(labelPoint);
			});
		}

		if (measurement.showArea) {
			let point = measurement.areaLabel.position;
			let labelArea = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: point.toArray()
				},
				properties: {
					area: measurement.areaLabel.text
				}
			};
			features.push(labelArea);
		}

		return features;
	}

	static serialize(measurements) {
		if (!(measurements instanceof Array)) {
			measurements = [measurements];
		}

		// measurements = measurements.filter(m => m instanceof Measure);

		let features = [];
		for (let measure of measurements) {
			let f = GeoJSONExporter.measurementToFeatures(measure);

			features = features.concat(f);
		}

		let geojson = {
			type: 'FeatureCollection',
			features: features
		};

		// return JSON.stringify(geojson, null, '\t');
		return geojson
	}

}