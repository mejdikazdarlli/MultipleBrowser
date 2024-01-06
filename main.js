import WindowManager from './WindowManager.js'


let pts = [];
let outerLimit,innerLimit,inout,lim,rand,points;
let mainR = 200;
const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let cubes = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTime ()
{
	return (new Date().getTime() - today) / 1000.0;
}


if (new URLSearchParams(window.location.search).get("clear"))
{
	localStorage.clear();
}
else
{	
	// this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the url
	document.addEventListener("visibilitychange", () => 
	{
		if (document.visibilityState != 'hidden' && !initialized)
		{
			init();
		}
	});

	window.onload = () => {
		if (document.visibilityState != 'hidden')
		{
			init();
		}
	};

	function init ()
	{
		initialized = true;

		// add a short timeout because window.offsetX reports wrong values before a short period 
		setTimeout(() => {
			setupScene();
			setupWindowManager();
			resize();
			updateWindowShape(false);
			render();
			window.addEventListener('resize', resize);
		}, 500)	
	}

	function setupScene ()
	{
		camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
		
		camera.position.z = 2.5;
		near = camera.position.z - .5;
		far = camera.position.z + 0.5;

		scene = new t.Scene();
		scene.background = new t.Color(0.0);
		scene.add( camera );

		renderer = new t.WebGLRenderer({antialias: true, depthBuffer: true});
		renderer.setPixelRatio(pixR);
	    
	  	world = new t.Object3D();
		scene.add(world);

		renderer.domElement.setAttribute("id", "scene");
		document.body.appendChild( renderer.domElement );
	}

	function setupWindowManager ()
	{
		windowManager = new WindowManager();
		windowManager.setWinShapeChangeCallback(updateWindowShape);
		windowManager.setWinChangeCallback(windowsUpdated);

		// here you can add your custom metadata to each windows instance
		let metaData = {foo: "bar"};

		// this will init the windowmanager and add this window to the centralised pool of windows
		windowManager.init(metaData);

		// call update windows initially (it will later be called by the win change callback)
		windowsUpdated();
	}

	function windowsUpdated ()
	{
		//updateNumberOfCubes();
		updatePosition ()
	}
	function updatePosition ()
	{
		let POINT_COUNT = 4000;			
		outerLimit =10;
		innerLimit = 200;

		let wins = windowManager.getWindows();
		// remove all cubes
		cubes.forEach((c) => {world.remove(c);})
		cubes = [];
		
		for(let i = 0; i < POINT_COUNT; i++){
			inout = (Math.random() - 0.5) * 10;
			lim = (inout >= 0 ? outerLimit : innerLimit);
			rand = mainR + Math.pow(Math.random(),100) * lim * inout;
			//pts.push(new THREE.Vector3().setFromCylindricalCoords(
			pts.push(new THREE.Vector3().setFromSphericalCoords(
				rand,
				rand,
				rand,
				//Math.PI * 2 * Math.random(),
			))
		}

		for (let i = 0; i < wins.length; i++)
		{
			let win = wins[i];
			let c = new t.Color();
			c.setHSL(i * .1,0.9, .5);
			let s = 1 + i * 0.008;
			let g = new THREE.BufferGeometry().setFromPoints(pts);
			let m = new THREE.PointsMaterial({size:s, color: c,blending:THREE.AdditiveBlending});
			points = new THREE.Points(g, m);
			points.position.x = win.shape.x + (win.shape.w * .5);
			points.position.y = win.shape.y + (win.shape.h * .5);
			world.add(points);
			cubes.push(points);
		}
	}
	// function updateNumberOfCubes ()
	// {
	// 	let wins = windowManager.getWindows();

	// 	// remove all cubes
	// 	cubes.forEach((c) => {
	// 		world.remove(c);
	// 	})

	// 	cubes = [];

	// 	// add new cubes based on the current window setup
	// 	for (let i = 0; i < wins.length; i++)
	// 	{
	// 		let win = wins[i];

	// 		let c = new t.Color();
	// 		c.setHSL(i * .1, 1.0, .5);

	// 		let s = 100 + i * 50;
	// 		let cube = new t.Mesh(new t.BoxGeometry(s, s, s), new t.MeshBasicMaterial({color: c , wireframe: true}));
	// 		cube.position.x = win.shape.x + (win.shape.w * .5);
	// 		cube.position.y = win.shape.y + (win.shape.h * .5);

	// 		world.add(cube);
	// 		cubes.push(cube);
	// 	}
	// }

	function updateWindowShape (easing = true)
	{
		// storing the actual offset in a proxy that we update against in the render function
		sceneOffsetTarget = {x: -window.screenX, y: -window.screenY};
		if (!easing) sceneOffset = sceneOffsetTarget;
	}


	function render ()
	{
		let t = getTime();

		windowManager.update();


		// calculate the new position based on the delta between current offset and new offset times a falloff value (to create the nice smoothing effect)
		let falloff = .05;
		sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
		sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);

		// set the world position to the offset
		world.position.x = sceneOffset.x;
		world.position.y = sceneOffset.y;

		let wins = windowManager.getWindows();


		// loop through all our cubes and update their positions based on current window positions
		for (let i = 0; i < cubes.length; i++)
		{
			let cube = cubes[i];
			let win = wins[i];
			let _t = t + i * .2;

			let posTarget = {x: win.shape.x + (win.shape.w * .5), y: win.shape.y + (win.shape.h * .5)}

			cube.position.x = cube.position.x + (posTarget.x - cube.position.x) * falloff;
			cube.position.y = cube.position.y + (posTarget.y - cube.position.y) * falloff;
			cube.rotation.x = _t * .3;
			cube.rotation.y = _t * .9;
		};

		renderer.render(scene, camera);
		requestAnimationFrame(render);
	}


	// resize the renderer to fit the window size
	function resize ()
	{
		let width = window.innerWidth;
		let height = window.innerHeight
		
		camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
		camera.updateProjectionMatrix();
		renderer.setSize( width, height );
	}
}