import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

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


const envTexture = new THREE.CubeTextureLoader().load([
    'public/px_25.jpg',
    'public/nx_25.jpg',
    'public/py_25.jpg',
    'public/ny_25.jpg',
    'public/pz_25.jpg',
    'public/nz_25.jpg',
]);
envTexture.mapping = THREE.CubeReflectionMapping;

const envBackground = new THREE.CubeTextureLoader().load([
    ""
]);
scene.background = envBackground;

const material = new THREE.MeshPhysicalMaterial({
    color: 0xb2ffc8,
    reflectivity: 1,
    envMap: envTexture,
    metalness: 0.5,
    roughness: 0.25,
    opacity: 1.0,
    transparent: false,
    transmission: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.25,
    map: texture
    /*
    color: 0xb2ffc8,
    envMap: envTexture,
    metalness: 0.5,
    roughness: 0.1,
    transparent: true,
    transmission: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.25,
    */
});

//const material = new THREE.MeshBasicMaterial( { map: texture } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

/* piece */

let pieces = [];
const loader = new STLLoader();
loader.load(
    'public/Bishop.stl',
    function (geometry) {
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xb2ffc8,
            envMap: envTexture,
            metalness: 0.25,
            roughness: 0.25,
            opacity: 1.0,
            transparent: false,
            transmission: 0.99,
            clearcoat: 1.0,
            clearcoatRoughness: 0.25,
        });
        const mesh1 = new THREE.Mesh(geometry, material);
        geometry.computeBoundingBox()
        let scale = 2/(geometry.boundingBox.max.x - geometry.boundingBox.min.x);
        mesh1.scale.set(scale, scale, scale);
        mesh1.position.z = 8;
        //mesh1.material.color.setHex( 0xcccccc );
        mesh1.material.color.setHex( 0xffee99 );
        
        //mesh.position.z = 20;
        pieces.push(mesh1);
        scene.add(mesh1);
    },
    (xhr) => {
        //console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.log(error);
    }
)



// Load the background texture
//var backgroundTexture = new THREE.TextureLoader().load( 'public/rick.png' );
//var backgroundMesh = new THREE.Mesh(
//    new THREE.PlaneGeometry(5, 5, 10),
//    new THREE.MeshBasicMaterial({
//        map: backgroundTexture
//    }));
//
//backgroundMesh .material.depthTest = false;
//backgroundMesh .material.depthWrite = false;

//// Create your background scene
//var backgroundScene = new THREE.Scene();
//var backgroundCamera = new THREE.Camera();
//backgroundScene .add(backgroundCamera );
//backgroundScene .add(backgroundMesh );

camera.position.z = 32;

const light = new THREE.DirectionalLight()
light.position.set(camera.position.x+10, camera.position.y+20, camera.position.z)
//scene.add(light)
const ambientLight = new THREE.AmbientLight( 0xffffff );
scene.add(ambientLight)

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

    light.position.set(camera.position.x+10, camera.position.y+20, camera.position.z)

	//cube.rotation.x = xrotation;
	//cube.rotation.y = yrotation;
    //renderer.autoClear = false;
    //renderer.clear();
    //renderer.render(backgroundScene , backgroundCamera );
	renderer.render( scene, camera );
}

animate();