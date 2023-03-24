/////////////////////////////////////////////////////////////////////////
///// IMPORT
import './main.css'
import * as THREE from 'three'
import { TWEEN } from 'three/examples/jsm/libs/tween.module.min.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import {ShadowMapViewer} from 'three/examples/jsm/utils/ShadowMapViewer'
import {TEXTURES, colorsSwatches} from './textures';
// import {CSG} from './CSGMesh';
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg';
// import { IFCLoader } from "web-ifc-three/IFCLoader";
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js'
// import {GUI} from 'three-dat.gui'
import { IFCLoader } from "three/examples/jsm/loaders/IFCLoader";
import {Reflector } from 'three/examples/jsm/objects/Reflector'
import { Scene } from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';


const dracoLoader = new DRACOLoader();
const loader = new GLTFLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
dracoLoader.setDecoderConfig({ type: 'js' });
loader.setDRACOLoader(dracoLoader);

let controls, scene, renderer, camera;
let BATHTUB_PATH = 'models/gltf/Bathtub_edited.glb'; 
let VANITY_PATH = 'models/gltf/vanity_edited.glb';
const APARTMENT_PATH = 'models/gltf/minimalistic_modern_bedroom.glb';
const CIGAR_PATH = 'models/gltf/Cut your Cigar.glb'
let CHAIR_PATH = 'models/gltf/chair_edited.gltf';
const ROOM_PATH = 'models/gltf/room_scene.glb';
let LAMP_PATH ='models/gltf/P0011_Table_Lamp_2';
const TEMPLATE = 'models/gltf/template09';
let BACKGROUND_COLOR = '#f1f1f1';
let wooden_Texture = new THREE.TextureLoader().load( "textures/wood_texture_3.jpg" ); 
wooden_Texture.wrapS = THREE.RepeatWrapping;
wooden_Texture.wrapT = THREE.RepeatWrapping;
wooden_Texture.repeat.set(2, 2);
let raycaster, pointer, INTERSECTED, material, cube, hitbox;
let currentIntersect = null;
const clippingPlane = new THREE.Plane();
const mouseStart = new THREE.Vector2();
const mouseEnd = new THREE.Vector2();
const intersectionPoint = new THREE.Vector3();
const isClipping = false;
let mirror;
let isDragging = false;
const ignoreMeshesNames = ['water drop', 'Object', 'Jabuticaba set']

let wooden_Material = new THREE.MeshStandardMaterial({
    map: wooden_Texture
});
const TRAY = document.getElementById('js-tray-slide');
function init(){
    const container = document.createElement('div');
    document.body.appendChild(container);
    document.body.appendChild( ARButton.createButton( renderer ) );
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    scene = new THREE.Scene()
    scene.background = new THREE.Color(BACKGROUND_COLOR);
    renderer = new THREE.WebGLRenderer({ antialias: true}) // turn on antialias
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) //set pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // make it full screen
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding // set color encoding
    container.appendChild(renderer.domElement) // add the renderer to html div

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000)
    camera.position.set(0, 1, -3);
    camera.lookAt(new THREE.Vector3(0, 4, 0));
    scene.add(camera);
    window.addEventListener('resize', () => {
        const width = window.innerWidth
        const height = window.innerHeight
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
        renderer.setPixelRatio(2)
    });
    const localPlane = new THREE.Plane( new THREE.Vector3( 0, -1, 0), 0.8 );
    const geometry = new THREE.BoxGeometry( 2, 2, 2);
    const material = new THREE.MeshPhongMaterial( {
        color: 0x80ee10,
        shininess: 100,
        side: THREE.DoubleSide

        // ***** Clipping setup (material): *****
        // clippingPlanes: [ localPlane ],
        // clipShadows: true

    } );
    let cubeMesh = new THREE.Mesh( geometry, material );
    let newPlane = null;
    // Set up event listeners
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    loadTemplateModel();
    load_model(CHAIR_PATH, TEXTURES,{sx:1.2, sy:1.2, sz:1.2}, {x : 0, z : -0.5});
    setOrbitControlsLimits(camera);
    lights();
    renderLoop();
}

function loadTemplateModel(){
    loader.load(CIGAR_PATH, function (gltf) {
        let model = gltf.scene; 
        model.position.set(0,0, 0);
        model.traverse((child) => {
            const childName = child.name || '';
            if(ignoreMeshesNames.every((meshName) => !childName.includes(meshName))){
                child.castShadow = true;
                child.receiveShadow = true;
            }
            
        })
        scene.add(model);
    })
}

function load_room(){
    load_model(BATHTUB_PATH, TEXTURES,{sx:1, sy:1, sz:1}, {x : -4, z : 2});
    load_model(VANITY_PATH, VANITY_TEXTURE,{sx:5, sy:5, sz:5}, {x : -10, z : 10});
    load_model(CHAIR_PATH, TEXTURES,{sx:1.2, sy:1.2, sz:1.2}, {x : 0, z : 3.5});
    load_model(CHAIR_PATH, TEXTURES,{sx:1.2, sy:1.2, sz:1.2}, {x : 1.0, z : 3.5});
}

function walls(size){
    let {x, y} = size;
    let wallGeometry = new THREE.PlaneGeometry(size.x, size.y, 1, 1);
    let material = new THREE.MeshStandardMaterial({color: 0xf0ff00});
    material.side = THREE.DoubleSide;
    let wall = new THREE.Mesh(wallGeometry, material);
    wall.name = 'wall';
    wall.receiveShadow = true;
    wall.position.set(0,25, -50);
    scene.add(wall);
}

function ground(size, texture){
    let {x, y} = size;
    let floorGeometry = new THREE.PlaneGeometry(size.x, size.y, 1, 1);
    let floor = new THREE.Mesh(floorGeometry, texture);
    floor.name = 'ground';
    floor.rotation.x = -0.5 * Math.PI;
    floor.receiveShadow = true;
    floor.position.set(0,0, 1);
}

function lights(){
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.name = 'Spot Light';
	spotLight.angle = Math.PI / 6;
	spotLight.penumbra = 0.3;
	spotLight.position.set( -10, 20, 5 );
	spotLight.castShadow = true;
	spotLight.shadow.camera.near = 8;
	spotLight.shadow.camera.far = 300;
	spotLight.shadow.mapSize.width = 1024;
	spotLight.shadow.mapSize.height = 1024;

    // create object to target
    const targetObject = new THREE.Object3D();
    targetObject.position.set(0, 0, 0);
    spotLight.target = targetObject;
    scene.add(spotLight);
    scene.add(targetObject)
    scene.add(ambient);
}

async function load_model(model_path, textures, scale, position){
    let {x, z} = position;
    let {sx, sy, sz} = scale;
    const gltf = await loader.loadAsync(model_path);
    const meshes = ["cushions","legs"];
    let model = gltf.scene;
    model.scale.set(scale.sx, scale.sy, scale.sz);
    model.position.set(x,0, z);
    model.traverse((child) => {
        if (child.isMesh) { 
            const meshName = child.name;
            const targetTexture =  textures.find((texture) => texture.type === meshName);
            if(targetTexture && meshes.includes(meshName)){
                child.material.map = new THREE.TextureLoader().load( targetTexture.texture , () => {
                    child.material.map.repeat.set(10, 10);
                    child.material.map.wrapS = THREE.RepeatWrapping;
                    child.material.map.wrapT = THREE.RepeatWrapping;
                    child.material.map.needsUpdate = true;
                });
            }else if(targetTexture && targetTexture.color){
                child.material.color.set(targetTexture.color)
            }
        }
    })
    scene.add(model);
}


function buildColors(colors) {
    for (let [i, color] of colors.entries()) {
      let swatch = document.createElement('div');
      swatch.classList.add('tray__swatch');
      swatch.style.background = "#" + color.color;
      swatch.setAttribute('data-key', i);
      TRAY.append(swatch);
    }
  }
  function setOrbitControlsLimits(camera) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.25;
    // controls.center =  new THREE.Vector3(
    //     chair.position.x,
    //     chair.position.y,
    //     chair.position.z
    // );
    // controls.minDistance  = 5;
    // controls.maxDistance  = 5;
    controls.enableZoom = true;
    return controls;
  }

function cube_box(size){
    let {x, y, z} = size;
    const geometry = new THREE.BoxGeometry( size.x, size.y, size.z );
    const material = new THREE.MeshBasicMaterial();
    let cube = new THREE.Mesh( geometry, material );
    return cube;
}

function onPointerMove( event ) {
    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera( pointer, camera );
}

function renderLoop() {
    // controls.update() 
    renderer.localClippingEnabled = true;
    renderer.render(scene, camera) // render the scene using the camera
    requestAnimationFrame(renderLoop);
}

init()