ipcRenderer.on("loadPC", function (event, pointCloudInfo) {
    viewer.scene.pointclouds.forEach(pc => pc.visible = false);

    // relative path but not ../pointclouds 
    // because rest-api.js is loaded from index.html 
    // and relative to that, pointclouds/ directory is on the same level
    Potree.loadPointCloud(pointCloudInfo.path, pointCloudInfo.name, function (e) {
        let scene = viewer.scene;
        let pointcloud = e.pointcloud;

        if (pointCloudInfo.material) {
            loadMaterial(pointCloudInfo.material, pointcloud);
        }

        if (!scene.pointclouds.some(pointcloud => pointcloud.name === pointCloudInfo.name)) {
            scene.addPointCloud(pointcloud);
        }

        viewer.zoomTo(pointcloud);
    });
    viewer.postMessage(pointCloudInfo.msg);
})


// /**
//  * see loadPointCloud in ../libs/potree/potree.js 
//  * @author Markus Schütz / http://potree.org
//  * @author Armin Bernstetter / https://arbertrary.dev
//  */
function loadMaterial(materialData, pointcloud) {
    if (materialData.activeAttributeName != null) {
        pointcloud.material.activeAttributeName = materialData.activeAttributeName;
    }

    if (materialData.ranges != null) {
        for (let range of materialData.ranges) {

            if (range.name === "elevationRange") {
                pointcloud.material.elevationRange = range.value;
            } else if (range.name === "intensityRange") {
                pointcloud.material.intensityRange = range.value;
            } else {
                pointcloud.material.setRange(range.name, range.value);
            }
        }
    }

    if (materialData.size != null) {
        pointcloud.material.size = materialData.size;
    }

    if (materialData.minSize != null) {
        pointcloud.material.minSize = materialData.minSize;
    }

    if (materialData.pointSizeType != null) {
        pointcloud.material.pointSizeType = PointSizeType[materialData.pointSizeType];
    }

    if (materialData.matcap != null) {
        pointcloud.material.matcap = materialData.matcap;
    }


}