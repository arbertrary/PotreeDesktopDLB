const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const Menu = electron.Menu;
const MenuItem = electron.MenuItem;
const remote = electron.remote;

const path = require('path')
const url = require('url')
const axios = require("axios")

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let miniConfig = {}; // Store the miniConfig in the main process

function createWindow() {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1600,
		height: 1200,
		webPreferences: {
			nodeIntegration: true,
			backgroundThrottling: false,
			contextIsolation: false,
			enableRemoteModule: true,
		}

	})

	// and load the index.html of the app.
	// mainWindow.loadURL(url.format({
	// 	pathname: path.join(__dirname, 'index.html'),
	// 	protocol: 'file:',
	// 	slashes: true
	// }));
	mainWindow.loadFile(path.join(__dirname, 'index.html'));
	// mainWindow.webContents.openDevTools();


	//let menu = new Menu();
	//let menuItemWindow = new MenuItem({label: "Window"});
	//let menuItemToggleDevTools = new MenuItem({label: 'Toggle Developer Tools', click() { 
	//		//remote.getCurrentWindow().toggleDevTools();
	//		mainWindow.webContents.toggleDevTools();
	//	}});
	////menuItemWindow.append(menuItemToggleDevTools);
	//menuItemWindow.submenu = [menuItemToggleDevTools];

	//menu.append(menuItemWindow);

	let template = [
		{
			label: "Window",
			submenu: [
				{ label: "Reload", click() { mainWindow.webContents.reloadIgnoringCache() } },
				{ label: "Toggle Developer Tools", click() { mainWindow.webContents.toggleDevTools() } },
			]
		},
		{
			label: "Point Clouds",
			submenu: [
				{
					label: "Mothra", click() {
						mainWindow.webContents.send("loadPC",
							{
								key: "mothra",
								name: "Mothra",
								path: "./pointclouds/mothra_converted/metadata.json",
								msg: "Loaded Mothra Point Cloud"
							}
						)
					}
				},
				// {
				// 	label: "Niua South", click() {
				// 		mainWindow.webContents.send("loadPC",
				// 			{
				// 				key: "niuasouth",
				// 				name: "Niua South Central Group",
				// 				path: "./pointclouds/CentralGroup_testalignment_converted/metadata.json",
				// 				msg: "Loaded Niua South Central Group Point Cloud"

				// 			}
				// 		)
				// 	}
				// },
				{
					label: "Dechen Cave", click() {
						mainWindow.webContents.send("loadPC", {
							key: "dechen",
							name: "Dechen Cave",
							path: "http://5.9.65.151/mschuetz/potree/resources/pointclouds/uni_heidelberg/dechen_cave/cloud.js",
							msg: "Loaded Dechen Cave Point Cloud",
							material: {
								activeAttributeName: "elevation"
							},
							description: `Point cloud of <a href="http://www.dechenhoehle.de/" target="_blank">Dechen-Cave, Iserlohn</a>. Courtesy of <a href="http://lrg.geog.uni-heidelberg.de" target="_blank">Heidelberg University, LiDAR Research Group (LRG)</a><br>
			<i style="font-size: small">
			H&auml;mmerle, M., H&ouml;fle, B., Fuchs, J., Schr&ouml;der-Ritzrau, A., Vollweiler, N. & Frank, N. (2014): <a href="http://lrg.geog.uni-heidelberg.de/dechencave/" target="_blank">Comparison of Kinect and Terrestrial LiDAR Capturing Natural Karst Cave 3D Objects</a>. IEEE Geoscience and Remote Sensing Letters, Vol. 11(11), pp 1896-1900, DOI:<a href="http://dx.doi.org/10.1109/LGRS.2014.2313599" target="_blank">10.1109/LGRS.2014.2313599</a>
			</i>`
						}
						)
					}
				},
				{
					label: "Santorini", click() {
						mainWindow.webContents.send("loadPC", {
							key: "santorini",
							name: "Santorini",
							path: "http://5.9.65.151/mschuetz/potree/resources/pointclouds/various/santorini/cloud.js",
							msg: "Loaded Santorini Point Cloud",
							material: {
								activeAttributeName: "elevation",
								ranges: [{
									name: "elevationRange",
									value: [13.3, 174]
								}]
							},
							description: `Pyle, David; Parks, Michelle; Mather, Tamsin; Nomikou, Paraskevi (2014): 
			2012 Santorini LiDAR data 
			<a href="http://figshare.com/articles/2012_Santorini_LiDAR_data/1138718" target="_blank">
			taken from figshare</a><br>Datasets from a LiDAR survey of the Greek volcanic islands of Nea Kameni and Palea Kameni, Santorini, Greece. Data were collected during a NERC ARSF flight campaign EU-12-12-137`
						}
						)
					}
				},
				// {
				// 	label: "Mars", click() {
				// 		mainWindow.webContents.send("loadPC", {
				// 			key: "mars",
				// 			name: "RealityCapture Mars Imagery Demo",
				// 			path: "./pointclouds/RC_Mars_tut_converted/metadata.json",
				// 			msg: "Loaded RealityCapture Mars Demo\n(https://www.capturingreality.com/sample-datasets)"
				// 		}
				// 		)
				// 	}
				// },
				// {
				// 	label: "Drone Imagery", click() {
				// 		mainWindow.webContents.send("loadPC", {
				// 			key: "drone",
				// 			name: "RealityCapture Drone Imagery Demo",
				// 			path: "./pointclouds/RC_DroneImagery_tut_converted/metadata.json",
				// 			msg: "Loaded RealityCapture Drone Imagery Demo\n(https://www.capturingreality.com/sample-datasets)"
				// 		}
				// 		)
				// 	}
				// }
			]
		},
		{
			label: "Digital Lab Book",
			submenu: [
				{ label: "Save to DLB", click() { mainWindow.webContents.send('ping', 'sendCommit'); } },
				{
					label: "Check DLB Connection", click() {
						if (miniConfig.CONNECTED) {
							var cn = "Connected to DLB!"
						} else {
							var cn = "Not Connected to DLB!"
						}
						mainWindow.webContents.send("message", cn);
					}
				}
			]
		}
	];



	let menu = Menu.buildFromTemplate(template);
	mainWindow.setMenu(menu);


	{
		const { ipcMain } = require('electron');

		ipcMain.on('asynchronous-message', (event, arg) => {
			console.log(arg) // prints "ping"
			event.reply('asynchronous-reply', 'pong')
		})

		ipcMain.on('synchronous-message', (event, arg) => {
			console.log(arg) // prints "ping"
			event.returnValue = 'pong'
		})

		ipcMain.on('update-mini-config', (event, config) => {
			miniConfig = config;
			console.log('miniConfig updated in main process:', miniConfig);
		});
	}

	// {
	// 	const { spawn, fork, execFile } = require('child_process');
	// 	let inputPaths = ["D:/dev/pointclouds/bunny_20M.las"];
	// 	let chosenPath = "D:/dev/pointclouds/bunny_20M.las_converted";

	// 	const process = spawn('./libs/PotreeConverter2/Converter.exe', [
	// 		...inputPaths,
	// 		"-o", chosenPath
	// 	], {

	// 	});

	// 	process.stdout.on('data', (data) => {
	// 		console.log(`stdout: ${data}`);
	// 	});
	// }



	// require('remote').getCurrentWindow().toggleDevTools();


	// Open the DevTools.
	//mainWindow.webContents.openDevTools();

	// Emitted when the window is closed.
	mainWindow.on('closed', function () {

		if (miniConfig.CONNECTED) {
			const response = axios.put("http://" + miniConfig.DLB_ADDRESS + ":" + miniConfig.DLB_PORT + "/api/unreal/info", { disconnect: true }, {
				headers: { 'Content-Type': 'application/json' },
			});
		}
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null
	})
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', function () {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow()
	}
})



// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
