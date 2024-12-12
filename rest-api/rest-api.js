const express = require('express');
const bodyParser = require('body-parser');
const axios = require("axios");
const path = require('path');
const fs = require("fs");

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
        // res.setHeader('Content-Type', 'application/json');
        res.json({ initInfo: { status: "playing", from: "PoTree", path: __dirname } });
    } else if (calledFunc === "loadFromJson") {
        console.log(req.body.parameters.saveGameData)
        viewer.scene.removeAllMeasurements();

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
        console.log("Disconnected from DLB");

        // res.setHeader('Content-Type', 'application/json');
        res.json({ action: "disconnected" });
    }

});

// Endpoint to handle /commit
apiApp.get('/commit', async (req, res) => {
    try {
        let screenshot_dir = __dirname + "/dummy_screenshots/"

        try {
            fs.copyFileSync(screenshot_dir + "dummy_screenshot.jpg", screenshot_dir + "123_screenshot.jpg");
            console.log('File copied successfully!');
        } catch (err) {
            console.error('Error copying file:', err);
        }

        let dummy_save_game_data = {
            timestamp: 123,
            data: { dataFrom: "Potree" }
        }
        let commit_data = {
            data: dummy_save_game_data,
            repoId: mini_config.REPO_ID,
            userName: mini_config.USER_NAME,
            email: mini_config.USER_EMAIL,
            origin: "unreal",
            saveGameData: dummy_save_game_data,
            toolboxMode: "dummy",
            screenshotPrefix: "123",
            screenshotDir: screenshot_dir,
            commitMessage: "Test"
        }
        // Forward the request body to another API
        const response = await axios.post('http://' + mini_config.DLB_ADDRESS + ':' + mini_config.DLB_PORT + '/api/git/commit', commit_data, {
            headers: { 'Content-Type': 'application/json' },
        });
        console.log(viewer.edlRenderer);
        // Respond to the original client with the response from the forwarded request
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error forwarding request:', error.message);

        // Handle errors gracefully
        res.status(error.response?.status || 500).json({
            error: 'Failed to forward request',
            details: error.message,
        });
    }
});


// Start the API server
apiApp.listen(apiPort, () => {
    console.log(`API server running at http://localhost:${apiPort}`);
});

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