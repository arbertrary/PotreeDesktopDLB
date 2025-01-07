ipcRenderer.on("loadPC", function (event, pointCloudInfo) {
    viewer.scene.pointclouds.forEach(pc => pc.visible = false);

    // relative path but not ../pointclouds 
    // because rest-api.js is loaded from index.html 
    // and relative to that, pointclouds/ directory is on the same level
    Potree.loadPointCloud(pointCloudInfo.path, pointCloudInfo.name, function (e) {
        let scene = viewer.scene;
        let pointcloud = e.pointcloud;

        if (!scene.pointclouds.some(pointcloud => pointcloud.name === pointCloudInfo.name)) {

            scene.addPointCloud(pointcloud);
        } viewer.zoomTo(pointcloud);
    });
    viewer.postMessage(pointCloudInfo.msg);
})
