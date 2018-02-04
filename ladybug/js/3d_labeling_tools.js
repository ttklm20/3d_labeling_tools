var canvas2D,stats,image_2d,ctx;
var camera, controls, scene, renderer;
var cube;
var keyboard = new KeyboardState();
var numbertag_list = [];
var gui_tag = [];
var gui = new dat.GUI();
var CameraExMat = [];
var cube_array = [];
var bb1 = [];
var folder_position = [];
var folder_size = [];
var bbox_flag = true;
var click_flag = false;
var click_object_index = 0;
var mouse_down = { x: 0, y: 0 };
var mouse_up = { x: 0, y: 0 };
var click_point = THREE.Vector3();
var click_plane_array = []
var attribute = ["car", "pedestrian", "motorbike", "bus", "truck", "cyclist", "train", "obstacle", "stop_signal", "wait_signal", "gosignal"];
var input_filename = 'input'
var now_flame = 0
var ground_mesh
var image_array = []
var bird_view_flag = false;

//save part
//hold part

var parameters = {
    i : -1,
    camera_id : 2,
    flame : now_flame,
    image_checkbox : true,
    addbboxpara : function() {
	var init_parameters = {
	    x : 0,
	    y : 0,
	    z : -1,
	    delta_x : 0,
	    delta_y : 0,
	    delta_z : 0,
	    width : 0.5,
	    height : 0.5,
	    depth : 0.5,
	    yaw : 0,
	    numbertag : parameters.i+1,
	    label : attribute[0],
        camera_id : parameters.camera_id
	};
	addbbox(init_parameters);
	gui_reset_tag();
    },
    rightcamera : function() {
    workspace.rightCam();
    },
    leftcamera : function() {
    workspace.leftCam();
    },
    next : function() {
	workspace.nextFile();
    },
    before : function() {
	workspace.previousFile();
    },
    hold_bbox_flag : false,
    bird_view : function() {
	bird_view();
    },
    camera_view : function() {
	camera_view();
    },
    update_database : function() {
	workspace.archiveWorkFiles();
    }
    //,result: function() {result(1,cube_array);}
}

// Visualize 2d and 3d data
WorkSpace.prototype.showData = function() {
    parameters.flame = this.curFile;
    var pcd_loader = new THREE.PCDLoader();
    var pcd_url = this.workBlob + '/PCDPoints/'
		+ this.fileList[this.curFile] + '/all.pcd';
    var oldFile = this.curFile;
    var that = this;
    pcd_loader.load(pcd_url, function (mesh) {
        if (oldFile == that.curFile) {
	       scene.add(mesh);
	       ground_mesh = mesh;
	       /* var center = mesh.geometry.boundingSphere.center;*/
	    }
    });

    var img_url = this.workBlob + '/JPEGImages' + this.camera_id + '/'
        + this.fileList[this.curFile] + '.jpg';
    var textloader = new THREE.TextureLoader()
    textloader.crossOrigin = '';
    var image = textloader.load(img_url);
    image.minFilter = THREE.LinearFilter;
    var material = new THREE.MeshBasicMaterial({map: image});
    var geometry = new THREE.PlaneGeometry(2, 2.5);
    var image_plane = new THREE.Mesh(geometry, material);
    var image_mat = [1.0, 0, 0, 1];
    rotation_angle = 2*Math.PI*(parameters.camera_id-2)/5
    image_plane.position.x = Math.cos(rotation_angle)*image_mat[0]-Math.sin(rotation_angle)*image_mat[1];
    image_plane.position.y = Math.sin(rotation_angle)*image_mat[0]+Math.cos(rotation_angle)*image_mat[1];
    image_plane.position.z = image_mat[2];
    image_plane.rotation.y = -Math.PI/2+rotation_angle;
    image_plane.rotation.x = Math.PI/2;
    scene.add(image_plane);

    image_array = [];
    image_array.push(image_plane);
    image_2d = new Image();
    image_2d.crossOrigin = 'Anonymous'
    image_2d.src = this.workBlob + '/JPEGImages' + String(parameters.camera_id+1) + '/'
		 + this.fileList[this.curFile] + '.jpg?' + new Date().getTime();
    image_2d.onload = function() {
	ctx.drawImage(image_2d, 0, 0, 2*416, 2*505);
    }
    if(parameters.image_checkbox==false || bird_view_flag == true){
	image_array[0].visible = false;
    }
    if(this.hold_flag==false){
	for (var k = 0 ; k < parameters.i + 1 ; k++){
	    gui.removeFolder('BoundingBox'+String(k));
	    cube_array[k].visible=false;
	}
	this.originalBboxes = [];
	this.bboxes = [];
	cube_array = [];
	numbertag_list = [];
	bb1 = [];
	gui_tag = [];
	numbertag_list = [];
	folder_position = [];
	folder_size = [];
	parameters.i = -1;

    readYAMLFile(this.workBlob + '/calibration' + this.camera_id + '.yml');
	this.getAnnotations();
    }
}

// Set values to this.bboxes from annotations
WorkSpace.prototype.loadAnnotations = function(annotations) {
    this.bboxes = [];
    for (var i in annotations) {
	if (i != "remove") {
	    var readfile_mat =
		MaxProd(CameraExMat,[parseFloat(annotations[i].x),
				     parseFloat(annotations[i].y),
				     parseFloat(annotations[i].z),
				     1]);
            var width_tmp = parseFloat(annotations[i].width);
            var height_tmp = parseFloat(annotations[i].height);
            var depth_tmp = parseFloat(annotations[i].length);
            if(width_tmp == 0.0){width_tmp = 0.0001}
            if(height_tmp == 0.0){height_tmp = 0.0001}
            if(depth_tmp == 0.0){depth_tmp = 0.0001}

	    var readfile_parameters = {
		x : readfile_mat[0],
		y : -readfile_mat[1],
		z : readfile_mat[2],
		delta_x : 0,
		delta_y : 0,
		delta_z : 0,
		width : width_tmp,
		height : height_tmp,
		depth : depth_tmp,
		yaw : parseFloat(annotations[i].rotation_y),
		numbertag : parameters.i + 1,
		label : annotations[i].label
	    };
	    addbbox(readfile_parameters);
	}
    }
    this.originalBboxes = this.bboxes.concat();
    /* main();*/
    gui_add_tag();
}

// Create annotations from this.bboxes
WorkSpace.prototype.packAnnotations = function() {
    var annotations = [];
    for (var i = 0; i < this.bboxes.length; ++i) {
	var result_mat = MaxProd(invMax(CameraExMat),[cube_array[i].position.x,cube_array[i].position.y,cube_array[i].position.z,1]);
	//TODO BoundingBox Number Tag workspace.bboxes[i].numbertag
	var bbox = this.bboxes[i];
	annotations.push({label: workspace.bboxes[i].label,
			  truncated: 0,
			  occluded: 3,
			  alpha: 0,//Calculate by Python script
			  left: 0,//TODO please input image feature
			  top: 0,//TODO
			  right: 0,//TODO
			  bottom: 0,//TODO
			  height: cube_array[i].scale.y,
			  width: cube_array[i].scale.x,
			  length: cube_array[i].scale.z,
			  x: result_mat[0],
			  y: result_mat[1],
			  z: result_mat[2],
			  rotation_y: cube_array[i].rotation.z});
    }
    return annotations;
}


// Create annotations from this.bboxes
WorkSpace.prototype.rightCam = function() {
    this.setAnnotations();
    parameters.camera_id = (parameters.camera_id+4)%5;
    this.camera_id = String(parameters.camera_id+1);
    this.onChangeFile();
    if(bird_view_flag == false){
        camera_view();
    }
    else{
        bird_view();
    }
}

// Create annotations from this.bboxes
WorkSpace.prototype.leftCam = function() {
    this.setAnnotations();
    parameters.camera_id = (parameters.camera_id+1)%5;
    this.camera_id = String(parameters.camera_id+1);
    this.onChangeFile();
    if(bird_view_flag == false){
        camera_view();
    }
    else{
        bird_view();
    }
}

var workspace = new WorkSpace("PCD");

//add remove function in dat.GUI
dat.GUI.prototype.removeFolder = function(name){
    var folder = this.__folders[name];
    if (!folder) {
	return;
    }

    folder.close();
    this.__ul.removeChild(folder.domElement.parentNode);
    delete this.__folders[name];
    this.onResize();
}


/* if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
 * init();
 * animate();*/


//read local calibration file.
function readYAMLFile(filename) {
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", filename, false);
    rawFile.onreadystatechange = function (){
	if(rawFile.readyState === 4){
	    if(rawFile.status === 200 || rawFile.status == 0){
		var allText = rawFile.responseText;
		for (var i = 0 ; i < allText.split("\n").length ; i++){
		    if(allText.split("\n")[i].split(":")[0].trim() == 'data'){
			CameraExMat = [[parseFloat(allText.split("\n")[i].split(":")[1].split("[")[1].split(",")[0]),parseFloat(allText.split("\n")[i].split(":")[1].split("[")[1].split(",")[1]),parseFloat(allText.split("\n")[i].split(":")[1].split("[")[1].split(",")[2]),parseFloat(allText.split("\n")[i].split(":")[1].split("[")[1].split(",")[3])],
				       [parseFloat(allText.split("\n")[i+1].trim().split(",")[0]),parseFloat(allText.split("\n")[i+1].trim().split(",")[1]),parseFloat(allText.split("\n")[i+1].trim().split(",")[2]),parseFloat(allText.split("\n")[i+1].trim().split(",")[3])],
				       [parseFloat(allText.split("\n")[i+2].trim().split(",")[0]),parseFloat(allText.split("\n")[i+2].trim().split(",")[1]),parseFloat(allText.split("\n")[i+2].trim().split(",")[2]),parseFloat(allText.split("\n")[i+2].trim().split(",")[3])],
				       [0,0,0,1]];
			break
		    }
		}
	    }
	}
    }

    rawFile.send(null);
}

//calicurate inverce matrix
function invMax(inMax){
    det = (inMax[0][0] * inMax[1][1] * inMax[2][2] * inMax[3][3] )
    + (inMax[0][0] * inMax[1][2] * inMax[2][3] * inMax[3][1] )
    + (inMax[0][0] * inMax[1][3] * inMax[2][1] * inMax[3][2] )
    - (inMax[0][0] * inMax[1][3] * inMax[2][2] * inMax[3][1] )
    - (inMax[0][0] * inMax[1][2] * inMax[2][1] * inMax[3][3] )
    - (inMax[0][0] * inMax[1][1] * inMax[2][3] * inMax[3][2] )
    - (inMax[0][1] * inMax[1][0] * inMax[2][2] * inMax[3][3] )
    - (inMax[0][2] * inMax[1][0] * inMax[2][3] * inMax[3][1] )
    - (inMax[0][3] * inMax[1][0] * inMax[2][1] * inMax[3][2] )
    + (inMax[0][3] * inMax[1][0] * inMax[2][2] * inMax[3][1] )
    + (inMax[0][2] * inMax[1][0] * inMax[2][1] * inMax[3][3] )
    + (inMax[0][1] * inMax[1][0] * inMax[2][3] * inMax[3][2] )
    + (inMax[0][1] * inMax[1][2] * inMax[2][0] * inMax[3][3] )
    + (inMax[0][2] * inMax[1][3] * inMax[2][0] * inMax[3][1] )
    + (inMax[0][3] * inMax[1][1] * inMax[2][0] * inMax[3][2] )
    - (inMax[0][3] * inMax[1][2] * inMax[2][0] * inMax[3][1] )
    - (inMax[0][2] * inMax[1][1] * inMax[2][0] * inMax[3][3] )
    - (inMax[0][1] * inMax[1][3] * inMax[2][0] * inMax[3][2] )
    - (inMax[0][1] * inMax[1][2] * inMax[2][3] * inMax[3][0] )
    - (inMax[0][2] * inMax[1][3] * inMax[2][1] * inMax[3][0] )
    - (inMax[0][3] * inMax[1][1] * inMax[2][2] * inMax[3][0] )
    + (inMax[0][3] * inMax[1][2] * inMax[2][1] * inMax[3][0] )
    + (inMax[0][2] * inMax[1][1] * inMax[2][3] * inMax[3][0] )
    + (inMax[0][1] * inMax[1][3] * inMax[2][2] * inMax[3][0] );

    inv = new Array(4);
    for(var i = 0; i < 4; i++){
        inv[i]= new Array(4);
    }
    inv[0][0] = (inMax[1][1]*inMax[2][2]*inMax[3][3] + inMax[1][2]*inMax[2][3]*inMax[3][1] + inMax[1][3]*inMax[2][1]*inMax[3][2] 
                - inMax[1][3]*inMax[2][2]*inMax[3][1] - inMax[1][2]*inMax[2][1]*inMax[3][3] - inMax[1][1]*inMax[2][3]*inMax[3][2])/det;
    inv[0][1] = (-inMax[0][1]*inMax[2][2]*inMax[3][3] - inMax[1][2]*inMax[2][3]*inMax[3][1] - inMax[0][3]*inMax[2][1]*inMax[3][2] 
                + inMax[1][3]*inMax[2][2]*inMax[3][1] + inMax[0][2]*inMax[2][1]*inMax[3][3] + inMax[0][1]*inMax[2][3]*inMax[3][2])/det;
    inv[0][2] = (inMax[0][1]*inMax[1][2]*inMax[3][3] + inMax[0][2]*inMax[1][3]*inMax[3][1] + inMax[0][3]*inMax[1][1]*inMax[3][2] 
                - inMax[0][3]*inMax[1][2]*inMax[3][1] - inMax[0][2]*inMax[1][1]*inMax[3][3] - inMax[0][1]*inMax[1][3]*inMax[3][2])/det;
    inv[0][3] = (-inMax[0][1]*inMax[1][2]*inMax[2][3] - inMax[0][2]*inMax[1][3]*inMax[2][1] - inMax[0][3]*inMax[1][1]*inMax[2][2] 
                + inMax[0][3]*inMax[1][2]*inMax[2][1] + inMax[0][2]*inMax[1][1]*inMax[2][3] + inMax[0][1]*inMax[1][3]*inMax[2][2])/det;
    
    inv[1][0] = (-inMax[1][0]*inMax[2][2]*inMax[3][3] - inMax[1][2]*inMax[2][3]*inMax[3][0] - inMax[1][3]*inMax[2][0]*inMax[3][2] 
                + inMax[1][3]*inMax[2][2]*inMax[3][0] + inMax[1][2]*inMax[2][0]*inMax[3][3] + inMax[1][0]*inMax[2][3]*inMax[3][2])/det;
    inv[1][1] = (inMax[0][0]*inMax[2][2]*inMax[3][3] + inMax[0][2]*inMax[2][3]*inMax[3][0] + inMax[0][3]*inMax[2][0]*inMax[3][2]
                - inMax[0][3]*inMax[2][2]*inMax[3][0] - inMax[0][2]*inMax[2][0]*inMax[3][3] - inMax[0][0]*inMax[2][3]*inMax[3][2])/det;
    inv[1][2] = (-inMax[0][0]*inMax[1][2]*inMax[3][3] - inMax[0][2]*inMax[1][3]*inMax[3][0] - inMax[0][3]*inMax[1][0]*inMax[3][2]
                + inMax[0][3]*inMax[1][2]*inMax[3][0] + inMax[0][2]*inMax[1][0]*inMax[3][3] + inMax[0][0]*inMax[1][3]*inMax[3][2])/det;
    inv[1][3] = (inMax[0][0]*inMax[1][2]*inMax[2][3] + inMax[0][2]*inMax[1][3]*inMax[2][0] + inMax[0][3]*inMax[1][0]*inMax[2][2] 
                - inMax[0][3]*inMax[1][2]*inMax[2][0] - inMax[0][2]*inMax[1][0]*inMax[2][3] - inMax[0][0]*inMax[1][3]*inMax[2][2])/det;

    inv[2][0] = (inMax[1][0]*inMax[2][1]*inMax[3][3] + inMax[1][1]*inMax[2][3]*inMax[3][0] + inMax[1][3]*inMax[2][0]*inMax[3][1] 
                - inMax[1][3]*inMax[2][1]*inMax[3][0] - inMax[1][1]*inMax[2][0]*inMax[3][3] - inMax[1][0]*inMax[2][3]*inMax[3][1])/det;
    inv[2][1] = (-inMax[0][0]*inMax[2][1]*inMax[3][3] - inMax[0][1]*inMax[2][3]*inMax[3][0] - inMax[0][3]*inMax[2][0]*inMax[3][1]
                + inMax[0][3]*inMax[2][1]*inMax[3][0] + inMax[0][1]*inMax[2][0]*inMax[3][3] + inMax[0][0]*inMax[2][3]*inMax[3][1])/det;
    inv[2][2] = (inMax[0][0]*inMax[1][1]*inMax[3][3] + inMax[0][1]*inMax[1][3]*inMax[3][0] + inMax[0][3]*inMax[1][0]*inMax[3][1]
                - inMax[0][3]*inMax[1][1]*inMax[3][0] - inMax[0][1]*inMax[1][0]*inMax[3][3] - inMax[0][0]*inMax[1][3]*inMax[3][1])/det;
    inv[2][3] = (-inMax[0][0]*inMax[1][1]*inMax[2][3] - inMax[0][1]*inMax[1][3]*inMax[2][0] - inMax[0][3]*inMax[1][0]*inMax[2][1]
                + inMax[0][3]*inMax[1][1]*inMax[2][0] + inMax[0][1]*inMax[1][0]*inMax[2][3] + inMax[0][0]*inMax[1][3]*inMax[2][1])/det;

    inv[3][0] = (-inMax[1][0]*inMax[2][1]*inMax[3][2] - inMax[1][1]*inMax[2][2]*inMax[3][0] - inMax[1][2]*inMax[2][0]*inMax[3][1]
                + inMax[1][2]*inMax[2][1]*inMax[3][0] + inMax[1][1]*inMax[2][0]*inMax[3][2] + inMax[1][0]*inMax[2][2]*inMax[3][1])/det;
    inv[3][1] = (inMax[0][0]*inMax[2][1]*inMax[3][2] + inMax[0][1]*inMax[2][2]*inMax[3][0] + inMax[0][2]*inMax[2][0]*inMax[3][1]
                - inMax[0][2]*inMax[2][1]*inMax[3][0] - inMax[0][1]*inMax[2][0]*inMax[3][2] - inMax[0][0]*inMax[2][2]*inMax[3][1])/det;
    inv[3][2] = (-inMax[0][0]*inMax[1][1]*inMax[3][2] - inMax[0][1]*inMax[1][2]*inMax[3][0] - inMax[0][2]*inMax[1][0]*inMax[3][1]
                + inMax[0][2]*inMax[1][1]*inMax[3][0] + inMax[0][1]*inMax[1][0]*inMax[3][2] + inMax[0][0]*inMax[1][2]*inMax[3][1])/det;
    inv[3][3] = (inMax[0][0]*inMax[1][1]*inMax[2][2] + inMax[0][1]*inMax[1][2]*inMax[2][0] + inMax[0][2]*inMax[1][0]*inMax[2][1]
                - inMax[0][2]*inMax[1][1]*inMax[2][0] - inMax[0][1]*inMax[1][0]*inMax[2][2] - inMax[0][0]*inMax[1][2]*inMax[2][1])/det;

    return inv;
}

//calicurate prod of matrix
function MaxProd (inMax1,inMax2){
    var outMax = [0,0,0,0];
    outMax[0] = inMax1[0][0] * inMax2[0] + inMax1[0][1] * inMax2[1] + inMax1[0][2] * inMax2[2] + inMax1[0][3] * inMax2[3];
    outMax[1] = inMax1[1][0] * inMax2[0] + inMax1[1][1] * inMax2[1] + inMax1[1][2] * inMax2[2] + inMax1[1][3] * inMax2[3];
    outMax[2] = inMax1[2][0] * inMax2[0] + inMax1[2][1] * inMax2[1] + inMax1[2][2] * inMax2[2] + inMax1[2][3] * inMax2[3];
    outMax[3] = inMax1[3][0] * inMax2[0] + inMax1[3][1] * inMax2[1] + inMax1[3][2] * inMax2[2] + inMax1[3][3] * inMax2[3];
    return outMax
}

//change camera position to bird view position
function bird_view() {
    camera.position.set(0, 0, 15);
    angle = 2*Math.PI*(parameters.camera_id-2)/5;
    camera.up.set(Math.cos(angle), Math.sin(angle), 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    controls.target.set(0, 0, 0);
    bird_view_flag = true;
    parameters.image_checkbox = true;
    image_array[0].visible = false;
    canvas2D.style.display = "block";
}

//change camera position to initial position
function camera_view(){
    camera.position.set(0,0,0);
    camera.up.set(0, 0, 1);
    angle = 2*Math.PI*(parameters.camera_id-2)/5;
    camera.lookAt(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0));
    controls.target.set(Math.cos(angle), Math.sin(angle), 0);
    parameters.image_checkbox = true;
    image_array[0].visible = true;
    canvas2D.style.display = "none";
    bird_view_flag = false;
}

//add new bounding box
function addbbox(read_parameters){
    workspace.bboxes.push(read_parameters);
    var tmp_parameters =
	{
	    x: read_parameters.x,
	    y: read_parameters.y,
	    z: read_parameters.z,
	    delta_x: read_parameters.delta_x,
	    delta_y: read_parameters.delta_y,
	    delta_z: read_parameters.delta_z,
	    width: read_parameters.width,
	    height: read_parameters.height,
	    depth: read_parameters.depth,
	    yaw:read_parameters.yaw,
	    numbertag:read_parameters.numbertag,
	    label:read_parameters.label
	};
    workspace.originalBboxes.push(tmp_parameters);
    parameters.i = 1 + parameters.i;
    var num = parameters.i;
    var bbox = workspace.bboxes[num];
    var cubeGeometry = new THREE.CubeGeometry(1.0,1.0,1.0);
    var cubeMaterial = new THREE.MeshBasicMaterial( { color: 0x008866, wireframe:true } );
    cube = new THREE.Mesh( cubeGeometry, cubeMaterial );
    cube.position.set(bbox.x,-bbox.y,bbox.z);
    cube.scale.set(bbox.width, bbox.height , bbox.depth);
    cube.rotation.z = bbox.yaw;
    scene.add(cube);
    cube_array.push(cube);
    addbbox_gui(num);
}

//register now bounding box
function addbbox_gui(num){
    var bb = gui.addFolder('BoundingBox'+String(num));
    var bbox = workspace.bboxes[num];
    bb1.push(bb);
    var folder1 = bb1[num].addFolder('Position');
    var cubeX = folder1.add( bbox, 'x' ).min(-50).max(50).step(0.01).listen();
    var cube_delta_X = folder1.add( bbox, 'delta_x' ).min(-2).max(2).step(0.01).listen();
    var cubeY = folder1.add( bbox, 'y' ).min(-30).max(30).step(0.01).listen();
    var cube_delta_Y = folder1.add( bbox, 'delta_y' ).min(-2).max(2).step(0.01).listen();
    var cubeZ = folder1.add( bbox, 'z' ).min(-3).max(10).step(0.01).listen();
    var cube_delta_Z = folder1.add( bbox, 'delta_z' ).min(-2).max(2).step(0.01).listen();
    var cubeYaw = folder1.add( bbox, 'yaw' ).min(-Math.PI/2).max(0).step(0.05).listen();
    folder1.close();
    folder_position.push(folder1);
    var folder2 = bb1[num].addFolder('Size');
    var cubeW = folder2.add( bbox, 'width' ).min(0).max(10).step(0.01).listen();
    var cubeH = folder2.add( bbox, 'height' ).min(0).max(10).step(0.01).listen();
    var cubeD = folder2.add( bbox, 'depth' ).min(0).max(10).step(0.01).listen();
    folder2.close();
    folder_size.push(folder2);
    cubeX.onChange(function(value){cube_array[num].position.x = value;});
    cubeY.onChange(function(value){cube_array[num].position.y = -value;});
    cubeZ.onChange(function(value){cube_array[num].position.z = value;});
    cube_delta_X.onChange(function(value){cube_array[num].position.x = bbox.x + value;});
    cube_delta_Y.onChange(function(value){cube_array[num].position.y = -bbox.y - value;});
    cube_delta_Z.onChange(function(value){cube_array[num].position.z = bbox.z + value;});
    cubeYaw.onChange(function(value){cube_array[num].rotation.z = value;});
    cubeW.onChange(function(value){cube_array[num].scale.x = value;});
    cubeH.onChange(function(value){cube_array[num].scale.y = value;});
    cubeD.onChange(function(value){cube_array[num].scale.z = value;});
    var reset_parameters = {
	reset: function() {
	    resetCube(num);
	},
	delete: function (){
	    gui.removeFolder('BoundingBox'+String(num));
	    cube_array[num].visible=false;
	}
    };

    numbertag_list.push(num);
    labeltag = bb1[num].add( bbox, 'label' ,attribute).name("Attribute");
    bb1[num].add(reset_parameters, 'reset' ).name("Reset");
    d = bb1[num].add(reset_parameters, 'delete' ).name("Delete");
}

//add gui number tag to integrate 2d labeling result
function gui_add_tag(){
    for (var i = 0 ; i < numbertag_list.length ; i++){
	tag = bb1[i].add( workspace.bboxes[i], 'numbertag' ,numbertag_list).name("BoundingBoxTag");
	gui_tag.push(tag)
    }
}

//update gui number tag to integrate 2d labeling result
function gui_reset_tag(){
    for (var i = 0 ; i < numbertag_list.length-1 ; i++){
	bb1[i].remove(gui_tag[i]);
    }

    gui_tag = [];
    for (var i = 0 ; i < numbertag_list.length ; i++){
	tag = bb1[i].add( workspace.bboxes[i], 'numbertag' ,numbertag_list).name("BoundingBoxTag");
	gui_tag.push(tag)
    }
}

//reset cube patameter and position
function resetCube(num)
{
    workspace.bboxes[num].x = workspace.originalBboxes[num].x;
    workspace.bboxes[num].y = workspace.originalBboxes[num].y;
    workspace.bboxes[num].z = workspace.originalBboxes[num].z;
    workspace.bboxes[num].yaw = workspace.originalBboxes[num].yaw;
    workspace.bboxes[num].delta_x = workspace.originalBboxes[num].delta_x;
    workspace.bboxes[num].delta_y = workspace.originalBboxes[num].delta_y;
    workspace.bboxes[num].delta_z = workspace.originalBboxes[num].delta_z;
    workspace.bboxes[num].width = workspace.originalBboxes[num].width;
    workspace.bboxes[num].height = workspace.originalBboxes[num].height;
    workspace.bboxes[num].depth = workspace.originalBboxes[num].depth;
    cube_array[num].position.x = workspace.bboxes[num].x;
    cube_array[num].position.y = -workspace.bboxes[num].y;
    cube_array[num].position.z = workspace.bboxes[num].z;
    cube_array[num].rotation.z = workspace.bboxes[num].yaw;
    cube_array[num].scale.x = workspace.bboxes[num].width;
    cube_array[num].scale.y = workspace.bboxes[num].height;
    cube_array[num].scale.z = workspace.bboxes[num].depth;
}

//change window size
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

//drow animation
function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
    keyboard.update();
    if ( keyboard.down("shift") ){
	controls.enabled = true;
	bbox_flag = false;
    }

    if ( keyboard.up("shift") ){
	controls.enabled = false;
	bbox_flag = true;
    }

    controls.update();
    stats.update();
    for (var i = 0 ; i < numbertag_list.length; i++){
	if(bb1[i].closed==false){
	    cube_array[i].material.color.setHex( 0xff0000 );
	    folder_position[i].open();
	    folder_size[i].open();
	}

	if(bb1[i].closed==true){
	    cube_array[i].material.color.setHex( 0x008866 );
	}
    }
}

function init() {
    scene = new THREE.Scene();
    var axisHelper = new THREE.AxisHelper( 0.1 );
    axisHelper.position.set(0,0,0);
    scene.add( axisHelper );
    camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.01, 10000 );
    camera.position.set(0,0,0);
    camera.up.set(0,0,1);
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( 0x000000 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    controls = new THREE.OrbitControls( camera,renderer.domElement );
    controls.rotateSpeed = 2.0;
    controls.zoomSpeed = 0.3;
    controls.panSpeed = 0.2;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.enableDamping = false;
    controls.dampingFactor = 0.3;
    controls.minDistance = 0.3;
    controls.maxDistance = 0.3 * 100;
    controls.noKey = true;
    controls.enabled = false;
    scene.add( camera );
    angle = 2*Math.PI*(parameters.camera_id-2)/5;
    controls.target.set(Math.cos(angle), Math.sin(angle), 0);
    controls.update();
    var canvas3D = document.getElementById('canvas3d');
    canvas3D.appendChild(renderer.domElement);
    stats = new Stats();
    canvas3D.appendChild( stats.dom );
    window.addEventListener( 'resize', onWindowResize, false );

    window.onmousedown = function (ev){
	if(bbox_flag==true){
	    if (ev.target == renderer.domElement) {
		var rect = ev.target.getBoundingClientRect();
		mouse_down.x =  ev.clientX - rect.left;
		mouse_down.y =  ev.clientY - rect.top;
		mouse_down.x =  (mouse_down.x / window.innerWidth) * 2 - 1;
		mouse_down.y = -(mouse_down.y / window.innerHeight) * 2 + 1;
		var vector = new THREE.Vector3( mouse_down.x, mouse_down.y ,1);
		vector.unproject( camera );
		var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
		var click_object = ray.intersectObjects( cube_array );
		if ( click_object.length > 0 ){
		    click_flag = true;
		    click_object_index = cube_array.indexOf(click_object[0].object);
		    click_point = click_object[0].point;
		    click_cube = cube_array[click_object_index];
		    var material = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe:false, transparent: true, opacity : 0.0 } );
		    var geometry = new THREE.PlaneGeometry(200, 200);
		    var click_plane = new THREE.Mesh( geometry, material );
		    click_plane.position.x = click_point.x;
		    click_plane.position.y = click_point.y;
		    click_plane.position.z = click_point.z;
		    var normal  = click_object[0].face;
		    if([normal.a,normal.b,normal.c].toString() == [6,3,2].toString() || [normal.a,normal.b,normal.c].toString() == [7,6,2].toString() ){
			click_plane.rotation.x = Math.PI / 2;
			click_plane.rotation.y = cube_array[click_object_index].rotation.z;
		    }
		    else if([normal.a,normal.b,normal.c].toString() == [6,7,5].toString() || [normal.a,normal.b,normal.c].toString() == [4,6,5].toString() ){
			click_plane.rotation.x = -Math.PI / 2;
			click_plane.rotation.y = -Math.PI / 2 - cube_array[click_object_index].rotation.z;
		    }
		    else if([normal.a,normal.b,normal.c].toString() == [0,2,1].toString() || [normal.a,normal.b,normal.c].toString() == [2,3,1].toString() ){
			click_plane.rotation.x = Math.PI / 2;
			click_plane.rotation.y = Math.PI / 2 + cube_array[click_object_index].rotation.z;
		    }
		    else if([normal.a,normal.b,normal.c].toString() == [5,0,1].toString() || [normal.a,normal.b,normal.c].toString() == [4,5,1].toString() ){
			click_plane.rotation.x = -Math.PI / 2;
			click_plane.rotation.y = -cube_array[click_object_index].rotation.z;
		    }
		    else if([normal.a,normal.b,normal.c].toString() == [3,6,4].toString() || [normal.a,normal.b,normal.c].toString() == [1,3,4].toString() ){
			click_plane.rotation.y = -Math.PI
		    }
		    scene.add( click_plane );
		    click_plane_array.push(click_plane);
		}
	    }
	}
    }

    window.onmouseup = function(ev) {
	if(bbox_flag==true){
	    var rect = ev.target.getBoundingClientRect();
	    mouse_up.x =  ev.clientX - rect.left;
	    mouse_up.y =  ev.clientY - rect.top;
	    mouse_up.x =  (mouse_up.x / window.innerWidth) * 2 - 1;
	    mouse_up.y = -(mouse_up.y / window.innerHeight) * 2 + 1;
	    var vector = new THREE.Vector3(  mouse_up.x, mouse_up.y ,1);
	    vector.unproject( camera );
	    var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
	    var click_object = ray.intersectObjects(click_plane_array);
	    if ( click_object.length > 0 && bb1[click_object_index].closed==false){
		var drag_vector = {x:click_object[0].point.x - click_point.x, y:click_object[0].point.y - click_point.y, z:click_object[0].point.z - click_point.z};
		var yaw_drag_vector = {x:drag_vector.x * Math.cos(-cube_array[click_object_index].rotation.z) - drag_vector.y * Math.sin(-cube_array[click_object_index].rotation.z), y:drag_vector.x * Math.sin(-cube_array[click_object_index].rotation.z) + drag_vector.y * Math.cos(-cube_array[click_object_index].rotation.z), z:drag_vector.z};
		var judge_click_point = {x:(click_point.x - cube_array[click_object_index].position.x) * Math.cos(-cube_array[click_object_index].rotation.z) - (click_point.y - cube_array[click_object_index].position.y) * Math.sin(-cube_array[click_object_index].rotation.z), y:(click_point.x - cube_array[click_object_index].position.x) * Math.sin(-cube_array[click_object_index].rotation.z) + (click_point.y - cube_array[click_object_index].position.y) * Math.cos(-cube_array[click_object_index].rotation.z)};
		workspace.bboxes[click_object_index].width = judge_click_point.x*yaw_drag_vector.x/Math.abs(judge_click_point.x) + workspace.bboxes[click_object_index].width;
		workspace.bboxes[click_object_index].x = drag_vector.x/2 + workspace.bboxes[click_object_index].x;
		workspace.bboxes[click_object_index].height = judge_click_point.y*yaw_drag_vector.y/Math.abs(judge_click_point.y) + workspace.bboxes[click_object_index].height;
		workspace.bboxes[click_object_index].y = -drag_vector.y/2 + workspace.bboxes[click_object_index].y;
		workspace.bboxes[click_object_index].depth = (click_point.z - cube_array[click_object_index].position.z)*drag_vector.z/Math.abs((click_point.z - cube_array[click_object_index].position.z)) + workspace.bboxes[click_object_index].depth;
		workspace.bboxes[click_object_index].z = drag_vector.z/2 + workspace.bboxes[click_object_index].z;
		cube_array[click_object_index].position.x = workspace.bboxes[click_object_index].x;
		cube_array[click_object_index].position.y = -workspace.bboxes[click_object_index].y;
		cube_array[click_object_index].position.z = workspace.bboxes[click_object_index].z;
		cube_array[click_object_index].rotation.z = workspace.bboxes[click_object_index].yaw;
		cube_array[click_object_index].scale.x = workspace.bboxes[click_object_index].width;
		cube_array[click_object_index].scale.y = workspace.bboxes[click_object_index].height;
		cube_array[click_object_index].scale.z = workspace.bboxes[click_object_index].depth;
	    }
	    if(click_flag==true){
		click_plane_array = [];
		for(var i = 0 ; i < bb1.length; i++){
		    bb1[i].close();
		}
		bb1[click_object_index].open();
		folder_position[click_object_index].open();
		folder_size[click_object_index].open();
	    }
	}
    }

    gui.add(parameters, 'addbboxpara').name("AddBoundingBox");
    gui.add(parameters, 'flame').name("Nowflame").listen();
    gui.add(parameters, 'camera_id').name("CameraID").listen();
    gui.add(parameters, 'rightcamera').name("RightCamera");
    gui.add(parameters, 'leftcamera').name("LeftCamera");
    gui.add(parameters, 'next').name("NextFrame");
    gui.add(parameters, 'before').name("BeforeFrame");
    var HoldCheck = gui.add(parameters, 'hold_bbox_flag').name("Hold").listen();
    gui.add(parameters, 'update_database').name("UploadDatabase");
    gui.add(parameters, 'bird_view').name("BirdView");
    gui.add(parameters, 'camera_view').name("CameraView");
    var ImageCheck = gui.add(parameters, 'image_checkbox').name("Image").listen();
    //gui.add(parameters,'result').name("result");

    canvas2D = document.getElementById('canvas2d');
    canvas2D.width = 416
    canvas2D.height = 505
    ctx = canvas2D.getContext('2d');
    ctx.scale(0.3,0.3);
    canvas2D.style.display = "none";
    gui.open();
    HoldCheck.onChange(function(value){workspace.hold_flag = value;})
    ImageCheck.onChange(function(value) {
	if (!bird_view_flag) {
	    image_array[0].visible = value;
	} else if (bird_view_flag && value) {
	    canvas2D.style.display = "block";
	} else if (bird_view_flag && !value) {
	    canvas2D.style.display = "none"
	}
    });
    //result(0, cube_array, workspace.bboxes)
}
