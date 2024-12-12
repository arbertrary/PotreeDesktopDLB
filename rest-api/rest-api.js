const express = require('express');
const bodyParser = require('body-parser');
const axios = require("axios");
const path = require('path');
const fs = require("fs");

const html2canvas = require('html2canvas');

const { ipcRenderer } = require("electron")

const apiApp = express();
const apiPort = 30010;

let mini_config = {
    REPO_ID: "default",
    USER_NAME: "default",
    USER_EMAIL: "default@default.com",
    DLB_ADDRESS: "localhost",
    DLB_PORT: "5000",
    CONNECTED: false
}

// Middleware for parsing JSON bodies
apiApp.use(bodyParser.json());

// Example API routes
let data = [{ id: 1, name: 'Sample Item' }];

apiApp.get('/api/data', (req, res) => {
    res.json(data);
});

apiApp.post('/api/data', (req, res) => {
    const newItem = req.body;
    data.push(newItem);
    res.json({ success: true, item: newItem });
});

apiApp.get('/remote/preset/DummyPreset', (req, res) => {
    let preset_data = {
        Preset: {
            Groups: [
                {
                    ExposedActors: [
                        {
                            UnderlyingActor: {
                                Path: "DummyActor/BP_CompanionCommunicationActor"
                            },
                            DisplayName: "BP_CompanionCommunicationActor"
                        }
                    ]
                }
            ]
        }
    }
    res.json(preset_data);
});

apiApp.get('/remote/presets', (req, res) => {
    let presets_data = {
        Presets: [
            {
                Name: "DummyPreset"
            }
        ]
    }
    // res.setHeader('Content-Type', 'application/json');
    // res.end(JSON.stringify(presets_data));
    res.json(presets_data);
});

apiApp.put("/remote/object/call", (req, res) => {
    let calledFunc = req.body.functionName;
    if (calledFunc === "initFromBackend") {
        let params = req.body.parameters;
        mini_config = {
            CONNECTED: true,
            REPO_ID: params.repoId,
            USER_EMAIL: params.email,
            USER_NAME: params.userName,
            DLB_ADDRESS: params.address,
            DLB_PORT: params.port
        }
        console.log('Updated mini_config:', mini_config);
        sendMiniConfigToMain(mini_config);
        // res.setHeader('Content-Type', 'application/json');
        res.json({ initInfo: { status: "playing", from: "PoTree", path: __dirname } });
    } else if (calledFunc === "loadFromJson") {

        const saveGameData = JSON.parse(req.body.parameters.saveGameData);
        const config = saveGameData.potreeConfig
        // console.log(saveGameData.potreeConfig); // Now this should work
        viewer.scene.removeAllMeasurements();
        Potree.loadProject(viewer, config);

        // res.setHeader('Content-Type', 'application/json');
        res.json({ action: "loadFromJson" });
    } else if (calledFunc === "disconnect") {
        mini_config = {
            REPO_ID: "default",
            USER_NAME: "default",
            USER_EMAIL: "default@default.com",
            DLB_ADDRESS: "localhost",
            DLB_PORT: "5000",
            CONNECTED: false
        }
        console.log('Updated mini_config:', mini_config);
        sendMiniConfigToMain(mini_config);
        console.log("Disconnected from DLB");

        // res.setHeader('Content-Type', 'application/json');
        res.json({ action: "disconnected" });
    }

});

document.addEventListener('keydown', (event) => {
    // Check if the 'Control' or 'Meta' key (for macOS) is pressed along with 'S'
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {

        if (!mini_config.CONNECTED) {
            console.log("NOT CONNECTED");
            return;
        }
        event.preventDefault(); // Prevent the default browser action (like "Save Page")
        console.log('Ctrl+S or Cmd+S detected!');

        let timestamp = Math.floor(Date.now() / 1000);  // Get the timestamp in seconds
        let timestampString = timestamp.toString();     // Convert it to a string

        try {
            let screenshot_dir = path.join(__dirname, "screenshots")
            fs.mkdir(screenshot_dir, { recursive: true }, (err) => {
                if (err) {
                    console.error('Error creating directory:', err);
                    return;
                }
            });

            html2canvas(
                document.querySelector('#potree_render_area')).then(
                    function (canvas) {
                        var a = document.createElement('a');
                        var dataURL = canvas.toDataURL("image/png"); //.replace("image/png", "image/octet-stream");
                        const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');

                        // Convert the Base64 string to a buffer
                        const buffer = Buffer.from(base64Data, 'base64');

                        // Define the file path where you want to save the image
                        // const filePath = path.join(__dirname, 'screenshot.png');
                        var shotFileName = timestampString + "_screenshot.jpg"
                        const filePath = path.join(screenshot_dir, shotFileName)

                        // Write the buffer to a file
                        fs.writeFile(filePath, buffer, (err) => {
                            if (err) {
                                console.error('Error saving the image:', err);
                            } else {
                                console.log('Image saved to:', filePath);
                                let potreeConfig = Potree.saveProject(viewer);
                                console.log(potreeConfig);

                                let scene = viewer.scene;
                                let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

                                let geoJson = []
                                if (measurements.length > 0) {
                                    geoJson = serializeMeasurements(measurements);
                                }

                                let dummy_save_game_data = {
                                    timestamp: timestamp,
                                    potreeConfig: potreeConfig,
                                    geoJSONMeasurements: geoJson
                                }

                                let commit_data = {
                                    data: geoJson,
                                    repoId: mini_config.REPO_ID,
                                    userName: mini_config.USER_NAME,
                                    email: mini_config.USER_EMAIL,
                                    origin: "unreal",
                                    saveGameData: dummy_save_game_data,
                                    toolboxMode: "dummy",
                                    screenshotPrefix: timestampString,
                                    screenshotDir: screenshot_dir,
                                    commitMessage: ""
                                }
                                // Forward the request body to another API
                                const response = axios.post('http://' + mini_config.DLB_ADDRESS + ':' + mini_config.DLB_PORT + '/api/git/commit', commit_data, {
                                    headers: { 'Content-Type': 'application/json' },
                                });
                            }
                        });
                    });

        } catch (error) {
            console.error('Error forwarding request:', error.message);
        }
    }
});

// Start the API server
apiApp.listen(apiPort, () => {
    console.log(`API server running at http://localhost:${apiPort}`);
});


// window.addEventListener('unload', () => {
//     const url = 'http://127.0.0.1:5000/api/unreal/info';
//     const payload = { disconnect: true };

//     try {
//         axios.put(url, payload);
//     } catch (error) {
//         console.error('Axios request failed, using sendBeacon:', error);
//         const data = JSON.stringify(payload);
//         navigator.sendBeacon(url, data);
//     }
// });

// /**
//  * see GeoJSONExporter in ../libs/potree/potree.js 
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
        let f = Potree.GeoJSONExporter.measurementToFeatures(measure);

        features = features.concat(f);
    }

    let geojson = {
        type: 'FeatureCollection',
        features: features
    };

    return geojson
}

// Function to send mini_config to the main process
function sendMiniConfigToMain(config) {
    ipcRenderer.send('update-mini-config', config);
}