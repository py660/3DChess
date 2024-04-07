import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.001, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

/* Board */
const geometry = new THREE.BoxGeometry( 16, 16, 16 );
const texture = new THREE.TextureLoader().load( "public/board.png" );
texture.colorSpace = THREE.SRGBColorSpace;
texture.magFilter = THREE.NearestFilter;
const material = new THREE.MeshBasicMaterial( { map: texture } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );


//const light = new THREE.AmbientLight( 0x404040 ); // soft white light
//scene.add( light );

camera.position.z = 32;
/*document.addEventListener('mousewheel', (event) => {
    camera.position.z = Math.max(15, Math.min(50, camera.position.z + event.deltaY/50));
});*/
window.onwheel = function(event){
    event.preventDefault();
};
window.onmousewheel = function(event){
    event.preventDefault();
};
scene.add(new THREE.AxesHelper(50))

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.minDistance = 20;
controls.maxDistance = 50;
controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: ''
}
controls.keys = { LEFT: 0, RIGHT: 0, UP: 0, BOTTOM: 0 }

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

function animate() {
	requestAnimationFrame( animate );

	//cube.rotation.x = xrotation;
	//cube.rotation.y = yrotation;

	renderer.render( scene, camera );
}

animate();