import * as THREE from 'three';
import {Vector2, Vector3} from 'three';
import {TrackballControls} from './TrackballControls.js';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';
import {
    Annotation,
    AnnotationVariant,
    BaseVector,
    Board,
    Category,
    Color,
    FEN6Piece,
    FEN6State,
    Game,
    GameState,
    GameVariant,
    Move,
    Piece,
    PieceVariant,
    Pos,
    Rulebook
} from 'logic';
// import 'scheduler-polyfill';
// import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
//import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
// import {StereoEffect} from 'three/examples/jsm/effects/StereoEffect.js';

// import Stats from 'stats.js';
// const stats = new Stats();
// stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild(stats.dom);

const loader = new STLLoader();

const SQUARE_WIDTH = 1 as const; // One square on the board is this many units wide
const PIECE_SCALE = 0.4 as const; // 2 * PIECE_SCALE = width of piece
const CLICK_DRAG_EPSILON = 35 as const; // How many pixels must a mouse move while pressed to count as a drag versus a click
const FRAMERATE = 10 as const; // Framerate at rest (increases for smooth animation)

type ColorPerspective = Vector3;
const ColorPerspectives: Record<Color, ColorPerspective> = {
    [Color.White]: BaseVector.Y,
    [Color.Black]: BaseVector.Y.clone().multiplyScalar(-1),
} as const;

// Downwards decoupling from GameGraphics to rendered objects
type BoardConfig = {
    template: THREE.Mesh
}
type PieceConfig = {
    templates: Record<Category, Record<Color, THREE.Mesh>>
}
type AnnotationConfig = {
    templates: Record<AnnotationVariant, THREE.Mesh>
}
interface GraphicsConfig {
    //envTexture?: THREE.Texture,
    board: BoardConfig,
    piece: PieceConfig,
    annotation: AnnotationConfig
}

interface Graphics {
    object: THREE.Object3D
}

class PieceGraphics implements Graphics {
    object: THREE.Mesh = new THREE.Mesh();
    config: GraphicsConfig

    constructor(piece: Piece, graphicsConfig: GraphicsConfig) {
        this.config = graphicsConfig
        // Shares geometry & material so that it can be hotswapped in once assets are loaded
        // this.setVariant(piece.variant); // Done in this::catchUp
        this.catchUp(piece);
        // console.log('afterCatchUp', this.object.position);
        this.subscribe(piece);
        // console.log('afterConstructor', this.object.position);
    }

    catchUp(piece: Piece) {
        this.setPos(piece.pos);
        // console.log('afterSetPos', this.object.position)
        this.setVariant(piece.variant);
    }

    subscribe(piece: Piece) {
        piece.events.setPos.subscribe({next: this.setPos.bind(this)});
        piece.events.setVariant.subscribe({next: this.setVariant.bind(this)});
    }
    setPos(pos: Pos) {
        // console.log('setPos', this.object.id, pos.uci);
        this.object.position.copy(BaseVector.Zero);
        this.object.lookAt(pos.posvec.direction);
        this.object.position.copy(pos.posvec.origin).multiplyScalar(SQUARE_WIDTH);
        // console.log(this.object.position);
    }

    setVariant(variant: PieceVariant) {
        let position = this.object.position.clone();
        let rotation = this.object.rotation.clone();
        this.object.copy(this.config.piece.templates[variant.category][variant.color]);
        this.object.scale.set(PIECE_SCALE, PIECE_SCALE, PIECE_SCALE);
        this.object.position.copy(position);
        this.object.rotation.copy(rotation);
    }
}

class AnnotationGraphics implements Graphics {
    object: THREE.Mesh = new THREE.Mesh();
    config: GraphicsConfig

    constructor(annotation: Annotation, graphicsConfig: GraphicsConfig) {
        this.config = graphicsConfig;
        // this.setVariant(annotation.variant); // Done in this::catchUp
        this.catchUp(annotation);
        this.subscribe(annotation);
    }

    catchUp(annotation: Annotation) {
        this.setPos(annotation.pos);
        this.setVariant(annotation.variant);
    }

    subscribe(annotation: Annotation) {
        annotation.events.setPos.subscribe({next: this.setPos.bind(this)});
        annotation.events.setVariant.subscribe({next: this.setVariant.bind(this)});
    }
    setPos(pos: Pos) {
        this.object.position.copy(BaseVector.Zero);
        this.object.lookAt(pos.posvec.direction);
        this.object.position.copy(pos.posvec.origin).multiplyScalar(SQUARE_WIDTH);
    }
    setVariant(variant: AnnotationVariant) {
        let position = this.object.position.clone();
        let rotation = this.object.rotation.clone();
        this.object.copy(this.config.annotation.templates[variant].clone());
        this.object.position.copy(position);
        this.object.rotation.copy(rotation);
    }
}

class BoardGraphics implements Graphics {
    object: THREE.Object3D
    boardMesh: THREE.Mesh
    config: GraphicsConfig
    pieceGraphicsBoard = new Map<Piece, PieceGraphics>();
    annotationGraphicsBoard = new Map<Annotation, AnnotationGraphics>();
    meshBoard = new Map<number, Piece | Annotation | Board>();

    constructor(board: Board, graphicsConfig: GraphicsConfig) {
        //let envTexture = graphicsConfig.envTexture;
        this.config = graphicsConfig;
        this.object = new THREE.Object3D();
        this.boardMesh = graphicsConfig.board.template.clone();
        this.object.add(this.boardMesh);
        this.meshBoard.set(this.boardMesh.id, board);
        this.catchUp(board);
        this.subscribe(board);
    }

    catchUp(board: Board) {
        for (let piece of Object.values(board.board)) this.addPiece(piece);
        for (let annotation of Object.values(board.annotationBoard)) this.addAnnotation(annotation);
    }

    subscribe(board: Board) {
        board.events.addPiece.subscribe({next: this.addPiece.bind(this)});
        board.events.addAnnotation.subscribe({next: this.addAnnotation.bind(this)});
        board.events.delPiece.subscribe({next: this.delPiece.bind(this)});
        board.events.delAnnotation.subscribe({next: this.delAnnotation.bind(this)});
    }

    addPiece(piece: Piece) {
        // console.log('addPiece', piece)
        // console.log(piece.pos.posvec.origin);
        let graphics = new PieceGraphics(piece, this.config);
        this.pieceGraphicsBoard.set(piece, graphics);
        this.object.add(graphics.object);
        this.registerObject3D(graphics, piece);
        // console.log(graphics.object.id);
        // console.log(this.meshBoard);
        // console.log(piece.pos.posvec.origin);
        // console.log(graphics.object.position);
        //console.log(this.object.id, graphics.object.id, graphics.object.type);
    }

    addAnnotation(annotation: Annotation) {
        let graphics = new AnnotationGraphics(annotation, this.config);
        this.annotationGraphicsBoard.set(annotation, graphics);
        this.object.add(graphics.object);
        this.registerObject3D(graphics, annotation);
    }

    delPiece(piece: Piece) {
        if (!this.pieceGraphicsBoard.has(piece)) throw Error('No PieceGraphics associated with Piece!');
        this.object.remove(this.pieceGraphicsBoard.get(piece)!.object);
        this.unregisterObject3D(this.pieceGraphicsBoard.get(piece)!);
        this.pieceGraphicsBoard.delete(piece);
    }

    delAnnotation(annotation: Annotation) {
        if (!this.annotationGraphicsBoard.has(annotation)) throw Error('No PieceGraphics associated with Piece!')
        this.object.remove(this.annotationGraphicsBoard.get(annotation)!.object);
        this.unregisterObject3D(this.annotationGraphicsBoard.get(annotation)!);
        this.annotationGraphicsBoard.delete(annotation);
    }

    registerObject3D(graphics: Graphics, logical: Piece | Annotation | Board) {
        this.meshBoard.set(graphics.object.id, logical);
    }

    unregisterObject3D(graphics: Graphics) {
        this.meshBoard.delete(graphics.object.id);
    }

    /**
     * Finds the accompanying logic object (e.g. Piece, Annotation, Board) for a Mesh
     * @param object
     */
    getLogicalFromObject3D(object: THREE.Object3D) {
        //console.log(this.graphics.object.id);
        //console.log(this.meshBoard);
        // console.log(this.meshBoard.size);
        return this.meshBoard.get(object.id);
    }
}

class GameGraphics {
    scene!: THREE.Scene // These get initialized IMMEDIATELY AFTER in GraphicsManager
    camera!: THREE.PerspectiveCamera
    renderer!: THREE.WebGLRenderer
    bounds!: DOMRect
    controls!: TrackballControls
    envTexture?: THREE.Texture
    bgTexture?: THREE.Texture
    config: GraphicsConfig

    boardGraphics?: BoardGraphics

    #mousePos: Vector2 = new Vector2();
    raycaster: THREE.Raycaster = new THREE.Raycaster();
    //intersected: Array<THREE.Intersection> = [];

    // updateEvent: Event = new CustomEvent('update');
    timer!: THREE.Timer;

    // Rendering
    #invalid: boolean = false;
    #lastRenderTime: DOMHighResTimeStamp = performance.now();

    constructor(game: Game) {
        this.createTimer();
        this.createScene();
        let boardConfig = this.generateBoardConfig();
        let pieceConfig = this.generatePieceConfig();
        let annotationConfig = this.generateAnnotationConfig();
        this.config = {
            //envTexture: this.envTexture,
            board: boardConfig,
            piece: pieceConfig,
            annotation: annotationConfig
        }
        this.generatePieceTemplates().then(pieceTemplates => {
            for (let category of Object.values(Category)) {
                for (let color of Object.values(Color)) {
                    //console.log(category, color, pieceTemplates[category]);
                    this.config.piece.templates[category][color].geometry.copy(pieceTemplates[category]);
                    //this.config.piece.templates[category][color].scale.copy(pieceTemplates[category][color].scale);
                }
            }
        });
        this.catchUp(game);
        this.subscribe(game);
    }

    catchUp(game: Game) {
        this.addBoard(game.board);
        // this.updateThisColor(game.thisColor);
    }

    subscribe(game: Game) {
        // game.events.updateThisColor.subscribe({next: this.updateThisColor.bind(this)});
        // game.events.addBoard.subscribe({next: this.addBoard.bind(this)});
    }
    createScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera();
        this.camera.position.set(0, 0, 16);
        this.camera.fov = 80;
        this.camera.far = 25;
        //this.camera.aspect = window.innerWidth / window.innerHeight;

        this.renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
        //this.effect = new StereoEffect(this.renderer);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        //this.renderer.setSize(window.innerWidth, window.innerHeight);
        //this.renderer.debug.checkShaderErrors = false;

        this.controls = new TrackballControls(this.camera);
        this.controls.staticMoving = true;
        this.controls.noPan = true;
        this.controls.rotateSpeed = 5;
        this.controls.zoomSpeed = 1.5;
        this.controls.minDistance = 8;
        this.controls.maxDistance = 20;
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: null
        }
        // this.controls.keys = { LEFT: 'a', RIGHT: 'd', UP: 'w', BOTTOM: 's' }
        //this.controls.listenToKeyEvents(window);
        //this.controls.connect(window);

        //this.controls.maxPolarAngle = Math.PI;

        const ambientLight = new THREE.AmbientLight(0xffffff, 4);
        this.scene.add(ambientLight);

        //const light = new THREE.RectAreaLight(0xffffff, 4, 10, 10);
        ////pointLight.position.set(1, 1, 1);
        //light.lookAt(this.camera.position.clone().negate());
        //this.camera.add(light);
        //this.scene.add(this.camera);

        //this.scene.add(new THREE.AxesHelper(50))

        this.envTexture = new THREE.CubeTextureLoader().load([
            'static/px_blur.png',
            'static/nx_blur.png',
            'static/py_blur.png',
            'static/ny_blur.png',
            'static/pz_blur.png',
            'static/nz_blur.png',
        ]);
        this.envTexture.mapping = THREE.CubeReflectionMapping;
        // this.bgTexture = new THREE.CubeTextureLoader().load([
        //     'static/px_25.jpg',
        //     'static/nx_25.jpg',
        //     'static/py_25.jpg',
        //     'static/ny_25.jpg',
        //     'static/pz_25.jpg',
        //     'static/nz_25.jpg',
        // ]);
        // this.bgTexture.mapping = THREE.CubeReflectionMapping;
        // this.scene.background = this.bgTexture;
        // this.scene.backgroundBlurriness = 0.7;
        this.scene.background = new THREE.Color(0xffffff);

        this.onResize(); // Initialize aspect ratio
    }
    generateBoardConfig(): BoardConfig {
        const geometry = new THREE.BoxGeometry(SQUARE_WIDTH*8, SQUARE_WIDTH*8, SQUARE_WIDTH*8);
        const texture = new THREE.TextureLoader().load('static/board.png');
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        let materialConfig: THREE.MeshPhysicalMaterialParameters= {
            reflectivity: 1,
            metalness: 0.0,
            roughness: 0.2,
            //specular: 'white',
            opacity: 1,
            transparent: false,
            //transmission: 0.2,
            //clearcoat: 1.0,
            //clearcoatRoughness: 0.25,
            map: texture
        }
        if (this.envTexture) materialConfig.envMap = this.envTexture;
        const colors: Array<THREE.Color | string | number> = ['orange', 'red', 'white', 'yellow', 'green', 'teal']
        const materials = colors.map(color => new THREE.MeshPhysicalMaterial({color, ...materialConfig}));
        return {template: new THREE.Mesh(geometry, materials)};
    }
    generatePieceConfig(): PieceConfig {
        const materialConfig: THREE.MeshPhysicalMaterialParameters = {
            envMap: this.envTexture,
            reflectivity: 1,
            metalness: 0.5,
            roughness: 0.2,
            //opacity: 1.0,
            transparent: false,
            //transmission: 0.99
            /*clearcoat: 1.0,
            clearcoatRoughness: 0.25*/
        }
        const whiteMaterial = new THREE.MeshPhysicalMaterial({
            ...materialConfig,
            color: 0xc2b99b
        });
        const blackMaterial = new THREE.MeshPhysicalMaterial({
            ...materialConfig,
            color: 0x222222
        });
        return {
            templates: Object.fromEntries(
                Object.values(Category).map(
                    category => [
                        [category], {[Color.White]: new THREE.Mesh(new THREE.BufferGeometry(), whiteMaterial), [Color.Black]: new THREE.Mesh(new THREE.BufferGeometry(), blackMaterial)}
                    ]
                )
            )
        }
    }
    async generatePieceTemplates(): Promise<Record<Category, THREE.BufferGeometry>> {
        return Object.fromEntries(
            await Promise.all(
                Object.entries(Category).map(
                    ([label, category]) => {
                        return new Promise<[[Category], THREE.BufferGeometry]>(
                            (resolve) => {
                                loader.load(
                                    `static/${label}.stl`,
                                    (geometry) => {
                                        //geometry.deleteAttribute('normal');
                                        //geometry = BufferGeometryUtils.mergeVertices(geometry, 0.02);
                                        //geometry.computeVertexNormals();

                                        ////let geometry = new BoxGeometry(4, 6, 8);
                                        //const mesh1 = new THREE.InstancedMesh(geometry, whiteMaterial, 385 /* 8*8 squares * 6 sides + 1 */);
                                        //geometry.computeBoundingBox();
                                        ////const scale = SQUARE_WIDTH/(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x);
                                        ////mesh1.scale.set(scale, scale, scale);
                                        //const mesh2 = mesh1.clone()
                                        //mesh2.material = blackMaterial;
                                        resolve([[category], geometry/*{ // NOTE: Only geometry is hotswapped
                                            [Color.White]: mesh1,
                                            [Color.Black]: mesh2
                                        }*/]);
                                    }
                                )
                            }
                        );
                    }
                )
            )
        );
    }
    generateAnnotationConfig(): AnnotationConfig {
        const materialConfig: THREE.MeshPhysicalMaterialParameters = {
            envMap: this.envTexture,
            //reflectivity: 10,
            metalness: 0.75,
            roughness: 0.1,
            //opacity: 0.9,
            //transparent: true,
            transmission: 0.99
            /*clearcoat: 1.0,
            clearcoatRoughness: 0.25*/
        }

        const selectedPieceMaterial = new THREE.MeshPhysicalMaterial({
            ...materialConfig,
            opacity: 0.6,
            transparent: true,
            color: new THREE.Color('green')
        });
        selectedPieceMaterial.side = THREE.DoubleSide;
        const checkMaterial = new THREE.MeshPhysicalMaterial({
            ...materialConfig,
            opacity: 0.6,
            transparent: true,
            color: new THREE.Color('red')
        });
        const possibleMoveMaterial = new THREE.MeshPhysicalMaterial({
            ...materialConfig,
            //opacity: 0.9,
            color: new THREE.Color(0x42f5dd)
        });
        const recentMoveMaterial = new THREE.MeshPhysicalMaterial({
            ...materialConfig,
            //opacity: 0.9,
            color: new THREE.Color(0xbdeb34)
        });
        const highlightMaterial = new THREE.MeshPhysicalMaterial({
            ...materialConfig,
            //opacity: 0.9,
            color: new THREE.Color('orange')
        });
        const dangerousPossibleMoveMaterial = new THREE.MeshPhysicalMaterial({
            ...materialConfig,
            //opacity: 0.9,
            color: 0x4080FF
        });
        const prospectiveMoveMaterial = new THREE.MeshPhysicalMaterial({
            ...materialConfig,
            opacity: 0.9,
            color: new THREE.Color('lightgrey')
        })

        const recentMoveDepth = SQUARE_WIDTH*0.03;
        const recentMoveWidth = SQUARE_WIDTH
        const recentMoveGeometry = new THREE.BoxGeometry(recentMoveWidth, recentMoveWidth, recentMoveDepth);
        recentMoveGeometry.translate(0, 0, recentMoveDepth/2);

        const possibleMoveDepth = SQUARE_WIDTH*0.06;
        const possibleMoveWidth = SQUARE_WIDTH * 0.8
        const possibleMoveGeometry = new THREE.BoxGeometry(possibleMoveWidth, possibleMoveWidth, possibleMoveDepth);
        //possibleMoveGeometry.rotateX(Math.PI / 2);
        possibleMoveGeometry.translate(0, 0, possibleMoveDepth/2);

        const checkDepth = SQUARE_WIDTH*2.1;
        const checkWidth = SQUARE_WIDTH*0.8
        const checkGeometry = new THREE.BoxGeometry(checkWidth, checkWidth, checkDepth);
        checkGeometry.translate(0, 0, checkDepth/2);

        const selectedPieceDepth = SQUARE_WIDTH*0.8;
        const selectedPieceWidth = SQUARE_WIDTH*0.4;
        const selectedPieceOffset = SQUARE_WIDTH*1.5;
        const selectedPieceGeometry = new THREE.CylinderGeometry(selectedPieceWidth/2, selectedPieceWidth/2/4, selectedPieceDepth);
        selectedPieceGeometry.rotateX(Math.PI / 2);
        selectedPieceGeometry.translate(0, 0, selectedPieceOffset + selectedPieceDepth/2);

        const highlightDepth = SQUARE_WIDTH * 0.059;
        const highlightWidth = SQUARE_WIDTH * 0.95
        const highlightGeometry = new THREE.CylinderGeometry(highlightWidth/2, highlightWidth/2, highlightDepth);
        highlightGeometry.rotateX(Math.PI / 2);
        highlightGeometry.translate(0, 0, highlightDepth/2);

        const dangerousPossibleMoveDepth = SQUARE_WIDTH*0.06;
        const dangerousPossibleMoveWidth = SQUARE_WIDTH * 0.8
        const dangerousPossibleMoveGeometry = new THREE.BoxGeometry(dangerousPossibleMoveWidth, dangerousPossibleMoveWidth, dangerousPossibleMoveDepth);
        //dangerousPossibleMoveGeometry.rotateX(Math.PI / 2);
        dangerousPossibleMoveGeometry.translate(0, 0, dangerousPossibleMoveDepth/2);

        const prospectiveMoveDepth = SQUARE_WIDTH*0.06;
        const prospectiveMoveWidth = SQUARE_WIDTH * 0.8
        const prospectiveMoveGeometry = new THREE.BoxGeometry(prospectiveMoveWidth, prospectiveMoveWidth, prospectiveMoveDepth);
        //prospectiveMoveGeometry.rotateX(Math.PI / 2);
        prospectiveMoveGeometry.translate(0, 0, prospectiveMoveDepth/2);

        //const mesh = new THREE.Mesh(thinGeometry, recentMoveMaterial);
        let templates: Partial<Record<AnnotationVariant, THREE.Mesh>> = {}
        templates[AnnotationVariant.RecentMove] = new THREE.Mesh(recentMoveGeometry, recentMoveMaterial);
        templates[AnnotationVariant.PossibleMove] = new THREE.Mesh(possibleMoveGeometry, possibleMoveMaterial);
        templates[AnnotationVariant.Check] = new THREE.Mesh(checkGeometry, checkMaterial);
        templates[AnnotationVariant.SelectedPiece] = new THREE.Mesh(selectedPieceGeometry, selectedPieceMaterial);
        templates[AnnotationVariant.Highlight] = new THREE.Mesh(highlightGeometry, highlightMaterial);
        templates[AnnotationVariant.DangerousPossibleMove] = new THREE.Mesh(dangerousPossibleMoveGeometry, dangerousPossibleMoveMaterial);
        templates[AnnotationVariant.ProspectiveMove] = new THREE.Mesh(prospectiveMoveGeometry, prospectiveMoveMaterial);
        return {templates: templates as Record<AnnotationVariant, THREE.Mesh>}
    }
    createTimer() {
        this.timer = new THREE.Timer();
        this.timer.connect(document);
        this.timer.update();
    }
    /**
     * To be called AFTER renderer.domElement is appended to the document tree
     */
    connectControls() {
        this.controls.connect(this.renderer.domElement);
        this.controls.handleResize();
        // @ts-ignore
        this.controls.addEventListener('redraw', this.invalidate.bind(this), {passive: true, capture: true});
    }

    addBoard(board: Board) {
        // console.log('addboard')
        let graphics = new BoardGraphics(board, this.config);
        this.boardGraphics = graphics;
        this.scene.add(graphics.object);
    }

    /**
     * Finds the accompanying logic object (e.g. Piece, Annotation, Board) for a Mesh
     * @param object
     */
    getLogicalFromObject3D(object: THREE.Object3D) {
        return this.boardGraphics?.getLogicalFromObject3D(object);
    }

    /**
     * @deprecated
     */
    lookAt(targetPos: Pos) {
        // let ray = new Ray(BaseVector.Zero, targetPos.posvec.origin.clone().normalize());
        // let azimuthal = Math.atan2(ray.direction.x, ray.direction.z);
        // let polar = Math.acos(ray.direction.y);
        // this.controls.rotateUp(this.controls.getPolarAngle() - polar);
        // this.controls.rotateLeft(this.controls.getAzimuthalAngle() - azimuthal);
    }

    updateThisColor(color: Color) { // TODO: See other note about Game::focus
        // let perspectiveCoefficient = ColorPerspectives[color];
        // this.camera.up.setY(perspectiveCoefficient);
        // console.log(this.camera.up);
        // this.controls.rotateSpeed = ROTATE_SPEED * perspectiveCoefficient;
        //this.controls.update();
        // this.camera.up.copy(ColorPerspectives[color]);
    }

    _animateOnce() {
        // TODO: Add dt support
        // stats.begin();
        //this.controls.update();
        let dt = this.timer.getDelta();
        this.timer.update();
        // this.renderer.domElement.dispatchEvent(this.updateEvent);
        this.renderer.render(this.scene, this.camera);
        // stats.end();
    }

    // animateOnce() {
    //     this._animateOnce();
    // }
    invalidate() {
        this.#invalid = true;
    }
    animateForever() {
        //console.log(performance.now() - this.#lastRenderTime);
        let time = performance.now();
        if (this.#invalid || time - this.#lastRenderTime >= 1000 / FRAMERATE) {
            this.#invalid = false;
            this.#lastRenderTime = time;
            this._animateOnce();
        }
        requestAnimationFrame(this.animateForever.bind(this));
    }

    onResize() {
        if (this.renderer.domElement.parentElement) this.bounds = this.renderer.domElement.parentElement.getBoundingClientRect();
        else this.bounds = document.documentElement.getBoundingClientRect();
        this.camera.aspect = this.bounds.width / this.bounds.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.bounds.width, this.bounds.height);
        if (this.controls.domElement) this.controls.handleResize();
        this.invalidate();
    }
    getIntersectedObjects(e: MouseEvent | PointerEvent) {
        this.#mousePos.set(((e.clientX-this.bounds.left) / this.bounds.width) * 2 - 1, -((e.clientY-this.bounds.top) / this.bounds.height) * 2 + 1);
        this.raycaster.setFromCamera(this.#mousePos, this.camera)
        return this.raycaster.intersectObjects(this.scene.children, true);
    }
}

class PAPGraphicsManager {
    rendererElement: HTMLCanvasElement
    controller: PAPController
    gameGraphics: GameGraphics

    gameWrapper: HTMLElement = document.getElementById('game_wrapper')!; // Parent of rendererElement
    hudStatusBar: HTMLElement = document.getElementById('hud_statusbar')!; // Shows whose move it is
    dialog: HTMLDialogElement = document.getElementById('dialog') as HTMLDialogElement;
    dialogStatusBar: HTMLElement = document.getElementById('dialog_statusbar')!;
    dialogPlayAgain: HTMLButtonElement = document.getElementById('dialog_playagain') as HTMLButtonElement;
    sidebarMoveList: HTMLElement = document.getElementById('sidebar_movelist')!;
    fen6Box: HTMLInputElement = document.getElementById('fen6box') as HTMLInputElement;
    // TODO: Allow inputting PGN6s as well as FEN6s

    #lastClickLocation: Vector2 = BaseVector.Zero2.clone();
    #lastLastClickLocation: Vector2 = BaseVector.Zero2.clone();
    #dragDistance: number = 0;
    #dragging: boolean = false;
    #lastClickTime: DOMHighResTimeStamp = performance.now();
    #lastHoverTime: DOMHighResTimeStamp = performance.now();

    constructor(controller: PAPController) {
        this.controller = controller;
        this.gameGraphics = new GameGraphics(this.controller.game);
        this.rendererElement = this.gameGraphics.renderer.domElement;

        this.configureRendererElement();
        this.gameGraphics.connectControls();
        this.configureEventListeners();
    }
    configureRendererElement() {
        this.gameWrapper.appendChild(this.gameGraphics.renderer.domElement);
        this.gameGraphics.onResize();
    }
    configureEventListeners() {
        //window.addEventListener('wheel', (e) => e.preventDefault(), {passive: false, capture: true});
        window.addEventListener('resize', this.gameGraphics.onResize.bind(this.gameGraphics));
        window.addEventListener('pointermove', this.onMouseHover.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('click', this.onMouseClick.bind(this));
        window.addEventListener('contextmenu', this.onRightClick.bind(this));
        //this.graphics.renderer.domElement.addEventListener('update', this.controller.update.bind(this.controller));
        this.dialogPlayAgain.addEventListener('click', () => {
            this.dialog.close();
            this.controller.newGame();
        });
        this.fen6Box.addEventListener('blur', this.loadFen6.bind(this), {passive: true});
        this.fen6Box.addEventListener(`focus`, this.fen6Box.select.bind(this.fen6Box), {passive: true});
        this.fen6Box.addEventListener('keyup', (e) => {
            if (e.key === "Enter") setTimeout(this.fen6Box.blur.bind(this.fen6Box), 0);
        }, {passive: true});
    }

    onMouseDown(e: MouseEvent) {
        this.#lastClickLocation.set(e.clientX, e.clientY);
        this.#lastLastClickLocation.set(e.clientX, e.clientY);
        this.#dragDistance = 0;
        this.#dragging = false;
    }
    onMouseMove(e: MouseEvent) {
        this.#lastLastClickLocation.copy(this.#lastClickLocation);
        this.#lastClickLocation.set(e.clientX, e.clientY);
        this.#dragDistance += this.#lastLastClickLocation.distanceTo(this.#lastClickLocation);
        this.#dragging = this.#dragDistance > CLICK_DRAG_EPSILON;
    }
    onMouseHover(e: PointerEvent) {
        let time = performance.now();
        if (time - this.#lastHoverTime < 50) return;
        this.#lastHoverTime = time;

        const intersected = this.gameGraphics.getIntersectedObjects(e);
        for (let intersection of intersected) {
            const logical = this.gameGraphics.getLogicalFromObject3D(intersection.object);
            if (logical instanceof Piece || logical instanceof Annotation) {
                this.controller.onHover(logical, logical.pos);
            }
            else if (logical instanceof Board) {
                this.controller.onHover(logical, (new Pos()).setSurfacePosFromPos3(intersection.point.divideScalar(SQUARE_WIDTH)));
            }
            if (logical != undefined) {
                this.setCursor(true);
                return;
            }
        }
        this.setCursor(false);
    }
    onMouseClick(e: MouseEvent) {
        if (this.#dragging) return;
        let time = performance.now();
        if (time - this.#lastClickTime < 100) return;
        this.#lastClickTime = time;

        const intersected = this.gameGraphics.getIntersectedObjects(e);
        //console.log(intersected);
        for (let intersection of intersected) {
            const logical = this.gameGraphics.getLogicalFromObject3D(intersection.object);
            if (logical instanceof Piece || logical instanceof Annotation) {
                //console.log((logical as Piece).id, intersection.object.id);
                this.controller.onClick(logical, logical.pos);
                return;
            }
            else if (logical instanceof Board) {
                this.controller.onClick(logical, (new Pos()).setSurfacePosFromPos3(intersection.point.divideScalar(SQUARE_WIDTH)));
                return;
            }
        }
        return;
    }

    onRightClick(e: PointerEvent) {
        if (this.#dragging) return;
        let time = performance.now();
        if (time - this.#lastClickTime < 100) return;
        this.#lastClickTime = time;

        const intersected = this.gameGraphics.getIntersectedObjects(e);
        //console.log(intersected);
        for (let intersection of intersected) {
            const logical = this.gameGraphics.getLogicalFromObject3D(intersection.object);
            if (logical instanceof Piece || logical instanceof Annotation) {
                //console.log((logical as Piece).id, intersection.object.id);
                this.controller.onRightClick(logical, logical.pos);
                return;
            } else if (logical instanceof Board) {
                this.controller.onRightClick(logical, (new Pos()).setSurfacePosFromPos3(intersection.point.divideScalar(SQUARE_WIDTH)));
                return;
            }
        }
        e.preventDefault();
    }
    setCursor(enabled: boolean) {
        if (enabled) {
            this.rendererElement.style.cursor = 'pointer';
        }
        else {
            this.rendererElement.style.cursor = 'default';
        }
    }
    updateMoveList() {
        // console.log('updateMoveList', this.controller.getMoveHistory());
        let elements: Array<Element> = [];
        for (let move of this.controller.getMoveHistory()) {
            let li = document.createElement('li');
            li.classList.add('move');
            if (move.piece.variant.color == Color.White) li.classList.add('white');
            else li.classList.add('black');
            let pieceEl = document.createElement('span');
            pieceEl.classList.add('piece');
            pieceEl.innerText = FEN6Piece[move.piece.variant.category][move.piece.variant.color];
            li.appendChild(pieceEl);
            let startingPosEl = document.createElement('span');
            startingPosEl.classList.add('pos', 'starting');
            startingPosEl.innerText = move.from.uci;
            li.appendChild(startingPosEl);
            let endingPosEl = document.createElement('span');
            endingPosEl.classList.add('pos');
            endingPosEl.innerText = move.to.uci;
            li.appendChild(endingPosEl);
            elements.push(li);
        }
        this.sidebarMoveList.innerHTML = '';
        this.sidebarMoveList.append(...elements);
    }
    updateGameState() {
        const gameState = this.controller.getGameState();
        const color = this.controller.getActiveColor();
        if (gameState == GameState.Running) {
            if (color == Color.White) this.hudStatusBar.innerText = 'White to Move';
            else this.hudStatusBar.innerText = 'Black to Move';
            return;
        } else if (gameState == GameState.KingCaptured) {
            this.hudStatusBar.innerText = 'Game Over';
            if (color == Color.White) this.dialogStatusBar.innerText = 'Black is victorious!';
            else this.dialogStatusBar.innerText = 'White is victorious!';
        } else if (gameState == GameState.Stalemate) {
            this.hudStatusBar.innerText = 'Stalemate';
            this.dialogStatusBar.innerText = 'Draw by stalemate';
        } else throw Error('Invalid GameState!');
        this.dialog.showModal();
    }
    displayFen6() {
        if (!document.querySelector(`#${this.fen6Box.id}:focus`)) this.fen6Box.value = this.controller.savePositionAsFEN();
        this.fen6Box.classList.remove('invalid');
    }
    loadFen6() {
        try {
            this.controller.loadPositionFromFEN(this.fen6Box.value);
            this.fen6Box.classList.remove('invalid');
        }
        catch (e) {
            console.error("Invalid FEN inputted:", e);
            this.fen6Box.classList.add('invalid');
        }
    }
    update() {
        this.updateMoveList();
        this.updateGameState();
        this.displayFen6();
    }

    animateForever() {
        this.gameGraphics.animateForever();
    }
}

class PAPController {
    graphics: PAPGraphicsManager
    game: Game
    #valid: boolean;

    constructor() {
        this.game = new Game(GameVariant.Standard);
        this.graphics = new PAPGraphicsManager(this);
        // this.game.initialize();
        this.#valid = false;
        this.update();
    }

    get valid(): boolean {
        return this.#valid;
    }

    invalidate() {
        this.#valid = false;
    }

    validate() {
        this.#valid = true;
    }

    // region Helpers

    loadPositionFromFEN(fenState: FEN6State) {
        this.game.reset();
        this.game.fen6 = fenState;
        this.update();
    }

    savePositionAsFEN(): FEN6State {
        return this.game.fen6;
    }

    getMoveHistory(): Array<Move> {
        return this.game.moveHistory;
    }

    clearMoveHistory() {
        this.game.clearMoveHistory();
        this.update();
    }

    reset() {
        this.game.reset();
        this.update();
    }

    getActiveColor(): Color {
        return this.game.activeColor;
    }

    getGameState(): GameState {
        return this.game.getGameState();
    }

    // endregion Helpers

    // region Things that do stuff

    newGame() {
        this.loadPositionFromFEN(Rulebook[GameVariant.Standard].startingFen6); // TODO: Real variant support
        // this.game.focus(new Pos(Side.Front, 6, 7));
    }

    /**
     * Click handler
     * @param logical - The logical object managing the object
     * @param pos - The Pos of the object (relevant when `logical instanceof Board`)
     */
    onClick(logical: Board | Piece | Annotation, pos: Pos) {
        // console.log(logical, pos.side, pos.surfacePos, pos.posvec.origin);
        // this.game.highlight(pos);
        let move: Move;
        // console.log(this.game.selected);
        // if (this.game.selected) {
        //     console.log(pos)
        // }
        //console.log(this.game.selected, pos, this.game.isPossibleMove(new Move(this.game.selected!, pos)));
        this.game.unhighlightAll();
        if (this.game.selected
            && this.game.getPiece(this.game.selected)
            && this.game.isPossibleMove(move = new Move(this.game.getPiece(this.game.selected)!, pos))) {
            this.game.move(move);
            this.update();
            // this.game.focus(move.to);
        } else {
            this.game.hideAllPossibleMoves();
            let samePiece = false;
            if (this.game.selected) {
                samePiece = this.game.selected.equals(pos);
                this.game.unselect();
            }

            if (!samePiece) {
                let piece = this.game.getPiece(pos);
                //console.log(piece);
                if (piece != undefined) {
                    this.game.select(pos);
                }
            }
            //
            // if (!this.game.selected) {
            //     console.log(1)
            //     let piece = this.game.getPiece(pos);
            //     //console.log(piece);
            //     if (piece != undefined) {
            //         if (piece.variant.color == this.game.activeColor) this.game.select(pos);
            //         else this.game.showPossibleMoves(pos);
            //     }
            // }
            //
            // if (this.game.selected && this.game.selected.equals(pos)) {
            //     console.log(2)
            //     this.game.unselect();
            // }
            // if (this.game.selected && !this.game.selected.equals(pos)) {
            //     console.log(3);
            //     this.game.unselect();
            //     let piece = this.game.getPiece(pos);
            //     this.game.hideAllPossibleMoves();
            //     if (piece != undefined) {
            //         if (piece.variant.color == this.game.activeColor) this.game.select(pos);
            //         else this.game.showPossibleMoves(pos);
            //     }
            // }
        }
    }

    onRightClick(logical: Board | Piece | Annotation, pos: Pos) {
        if (this.game.isHighlighted(pos)) this.game.unhighlight(pos);
        else this.game.highlight(pos);
    }

    onHover(logical: Board | Piece | Annotation, pos: Pos) {

    }

    update() {
        this.invalidate();
        setTimeout(() => { // Defer until all modifications are settled
            if (!this.valid) {
                this.graphics.update();
                this.validate();
            }
        }, 0);
    }

    animateForever() {
        this.graphics.animateForever();
    }

    // endregion Things that do stuff
}

class MultiplayerGraphicsManager {
    rendererElement: HTMLCanvasElement
    controller: MultiplayerController
    gameGraphics: GameGraphics

    gameWrapper: HTMLElement = document.getElementById('game_wrapper')!; // Parent of rendererElement
    hudStatusBar: HTMLElement = document.getElementById('hud_statusbar')!; // Shows whose move it is
    dialog: HTMLDialogElement = document.getElementById('dialog') as HTMLDialogElement;
    dialogStatusBar: HTMLElement = document.getElementById('dialog_statusbar')!;
    dialogPlayAgain: HTMLButtonElement = document.getElementById('dialog_playagain') as HTMLButtonElement;
    sidebarMoveList: HTMLElement = document.getElementById('sidebar_movelist')!;
    fen6Box: HTMLInputElement = document.getElementById('fen6box') as HTMLInputElement;
    // TODO: Allow inputting PGN6s as well as FEN6s

    #lastClickLocation: Vector2 = BaseVector.Zero2.clone();
    #lastLastClickLocation: Vector2 = BaseVector.Zero2.clone();
    #dragDistance: number = 0;
    #dragging: boolean = false;
    #lastClickTime: DOMHighResTimeStamp = performance.now();
    #lastHoverTime: DOMHighResTimeStamp = performance.now();

    constructor(controller: MultiplayerController) {
        this.controller = controller;
        this.gameGraphics = new GameGraphics(this.controller.game);
        this.rendererElement = this.gameGraphics.renderer.domElement;

        this.configureRendererElement();
        this.gameGraphics.connectControls();
        this.configureEventListeners();
    }

    configureRendererElement() {
        this.gameWrapper.appendChild(this.gameGraphics.renderer.domElement);
        this.gameGraphics.onResize();
    }

    configureEventListeners() {
        //window.addEventListener('wheel', (e) => e.preventDefault(), {passive: false, capture: true});
        window.addEventListener('resize', this.gameGraphics.onResize.bind(this.gameGraphics));
        window.addEventListener('pointermove', this.onMouseHover.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('click', this.onMouseClick.bind(this));
        //this.graphics.renderer.domElement.addEventListener('update', this.controller.update.bind(this.controller));
        this.dialogPlayAgain.addEventListener('click', () => {
            this.dialog.close();
            this.controller.newGame();
        });
        this.fen6Box.addEventListener('blur', this.loadFen6.bind(this), {passive: true});
        this.fen6Box.addEventListener(`focus`, this.fen6Box.select.bind(this.fen6Box), {passive: true});
        this.fen6Box.addEventListener('keyup', (e) => {
            if (e.key === "Enter") setTimeout(this.fen6Box.blur.bind(this.fen6Box), 0);
        }, {passive: true});
    }

    onMouseDown(e: MouseEvent) {
        this.#lastClickLocation.set(e.clientX, e.clientY);
        this.#lastLastClickLocation.set(e.clientX, e.clientY);
        this.#dragDistance = 0;
        this.#dragging = false;
    }

    onMouseMove(e: MouseEvent) {
        this.#lastLastClickLocation.copy(this.#lastClickLocation);
        this.#lastClickLocation.set(e.clientX, e.clientY);
        this.#dragDistance += this.#lastLastClickLocation.distanceTo(this.#lastClickLocation);
        this.#dragging = this.#dragDistance > CLICK_DRAG_EPSILON;
    }

    onMouseHover(e: PointerEvent) {
        let time = performance.now();
        if (time - this.#lastHoverTime < 50) return;
        this.#lastHoverTime = time;

        const intersected = this.gameGraphics.getIntersectedObjects(e);
        for (let intersection of intersected) {
            const logical = this.gameGraphics.getLogicalFromObject3D(intersection.object);
            if (logical instanceof Piece || logical instanceof Annotation) {
                this.controller.onHover(logical, logical.pos);
            } else if (logical instanceof Board) {
                this.controller.onHover(logical, (new Pos()).setSurfacePosFromPos3(intersection.point.divideScalar(SQUARE_WIDTH)));
            }
            if (logical != undefined) {
                this.setCursor(true);
                return;
            }
        }
        this.setCursor(false);
    }

    onMouseClick(e: MouseEvent) {
        if (this.#dragging) return;
        let time = performance.now();
        if (time - this.#lastClickTime < 100) return;
        this.#lastClickTime = time;

        const intersected = this.gameGraphics.getIntersectedObjects(e);
        //console.log(intersected);
        for (let intersection of intersected) {
            const logical = this.gameGraphics.getLogicalFromObject3D(intersection.object);
            if (logical instanceof Piece || logical instanceof Annotation) {
                //console.log((logical as Piece).id, intersection.object.id);
                this.controller.onClick(logical, logical.pos);
                return;
            } else if (logical instanceof Board) {
                this.controller.onClick(logical, (new Pos()).setSurfacePosFromPos3(intersection.point.divideScalar(SQUARE_WIDTH)));
                return;
            }
        }
        return false;
    }

    setCursor(enabled: boolean) {
        if (enabled) {
            this.rendererElement.style.cursor = 'pointer';
        } else {
            this.rendererElement.style.cursor = 'default';
        }
    }

    updateMoveList() {
        // console.log('updateMoveList', this.controller.getMoveHistory());
        let elements: Array<Element> = [];
        for (let move of this.controller.getMoveHistory()) {
            let li = document.createElement('li');
            li.classList.add('move');
            if (move.piece.variant.color == Color.White) li.classList.add('white');
            else li.classList.add('black');
            let pieceEl = document.createElement('span');
            pieceEl.classList.add('piece');
            pieceEl.innerText = FEN6Piece[move.piece.variant.category][move.piece.variant.color];
            li.appendChild(pieceEl);
            let startingPosEl = document.createElement('span');
            startingPosEl.classList.add('pos', 'starting');
            startingPosEl.innerText = move.from.uci;
            li.appendChild(startingPosEl);
            let endingPosEl = document.createElement('span');
            endingPosEl.classList.add('pos');
            endingPosEl.innerText = move.to.uci;
            li.appendChild(endingPosEl);
            elements.push(li);
        }
        this.sidebarMoveList.innerHTML = '';
        this.sidebarMoveList.append(...elements);
    }

    updateGameState() {
        const gameState = this.controller.getGameState();
        const color = this.controller.getActiveColor();
        if (gameState == GameState.Running) {
            if (color == Color.White) this.hudStatusBar.innerText = 'White to Move';
            else this.hudStatusBar.innerText = 'Black to Move';
            return;
        } else if (gameState == GameState.KingCaptured) {
            this.hudStatusBar.innerText = 'Game Over';
            if (color == Color.White) this.dialogStatusBar.innerText = 'Black is victorious!';
            else this.dialogStatusBar.innerText = 'White is victorious!';
        } else if (gameState == GameState.Stalemate) {
            this.hudStatusBar.innerText = 'Stalemate';
            this.dialogStatusBar.innerText = 'Draw by stalemate';
        } else throw Error('Invalid GameState!');
        this.dialog.showModal();
    }

    displayFen6() {
        if (!document.querySelector(`#${this.fen6Box.id}:focus`)) this.fen6Box.value = this.controller.savePositionAsFEN();
        this.fen6Box.classList.remove('invalid');
    }

    loadFen6() {
        try {
            this.controller.loadPositionFromFEN(this.fen6Box.value);
            this.fen6Box.classList.remove('invalid');
        } catch (e) {
            console.error("Invalid FEN inputted:", e);
            this.fen6Box.classList.add('invalid');
        }
    }

    update() {
        this.updateMoveList();
        this.updateGameState();
        this.displayFen6();
    }

    animateForever() {
        this.gameGraphics.animateForever();
    }
}

class MultiplayerController {
    graphics: MultiplayerGraphicsManager
    game: Game
    #valid: boolean;

    constructor() {
        this.game = new Game(GameVariant.Standard);
        this.graphics = new MultiplayerGraphicsManager(this);
        // this.game.initialize();
        this.#valid = false;
        this.update();
    }

    get valid(): boolean {
        return this.#valid;
    }

    invalidate() {
        this.#valid = false;
    }

    validate() {
        this.#valid = true;
    }

    // region Helpers

    loadPositionFromFEN(fenState: FEN6State) {
        this.game.reset();
        this.game.fen6 = fenState;
        this.update();
    }

    savePositionAsFEN(): FEN6State {
        return this.game.fen6;
    }

    getMoveHistory(): Array<Move> {
        return this.game.moveHistory;
    }

    clearMoveHistory() {
        this.game.clearMoveHistory();
        this.update();
    }

    reset() {
        this.game.reset();
        this.update();
    }

    getActiveColor(): Color {
        return this.game.activeColor;
    }

    getGameState(): GameState {
        return this.game.getGameState();
    }

    // endregion Helpers

    // region Things that do stuff

    newGame() {
        this.loadPositionFromFEN(Rulebook[GameVariant.Standard].startingFen6); // TODO: Real variant support
        // this.game.focus(new Pos(Side.Front, 6, 7));
    }

    /**
     * Click handler
     * @param logical - The logical object managing the object
     * @param pos - The Pos of the object (relevant when `logical instanceof Board`)
     */
    onClick(logical: Board | Piece | Annotation, pos: Pos) {
        // console.log(logical, pos.side, pos.surfacePos, pos.posvec.origin);
        this.game.highlight(pos);
        let move: Move;
        // console.log(this.game.selected);
        // if (this.game.selected) {
        //     console.log(pos)
        // }
        //console.log(this.game.selected, pos, this.game.isPossibleMove(new Move(this.game.selected!, pos)));
        if (this.game.selected
            && this.game.getPiece(this.game.selected)
            && this.game.isPossibleMove(move = new Move(this.game.getPiece(this.game.selected)!, pos))) {
            this.game.move(move);
            this.update();
            // this.game.focus(move.to);
        } else {
            this.game.hideAllPossibleMoves();
            this.game.unhighlightAll();
            let samePiece = false;
            if (this.game.selected) {
                samePiece = this.game.selected.equals(pos);
                this.game.unselect();
            }

            if (!samePiece) {
                let piece = this.game.getPiece(pos);
                //console.log(piece);
                if (piece != undefined) {
                    this.game.select(pos);
                }
            }
            //
            // if (!this.game.selected) {
            //     console.log(1)
            //     let piece = this.game.getPiece(pos);
            //     //console.log(piece);
            //     if (piece != undefined) {
            //         if (piece.variant.color == this.game.activeColor) this.game.select(pos);
            //         else this.game.showPossibleMoves(pos);
            //     }
            // }
            //
            // if (this.game.selected && this.game.selected.equals(pos)) {
            //     console.log(2)
            //     this.game.unselect();
            // }
            // if (this.game.selected && !this.game.selected.equals(pos)) {
            //     console.log(3);
            //     this.game.unselect();
            //     let piece = this.game.getPiece(pos);
            //     this.game.hideAllPossibleMoves();
            //     if (piece != undefined) {
            //         if (piece.variant.color == this.game.activeColor) this.game.select(pos);
            //         else this.game.showPossibleMoves(pos);
            //     }
            // }
        }
    }

    onHover(logical: Board | Piece | Annotation, pos: Pos) {

    }

    update() {
        this.invalidate();
        setTimeout(() => { // Defer until all modifications are settled
            if (!this.valid) {
                this.graphics.update();
                this.validate();
            }
        }, 0);
    }

    animateForever() {
        this.graphics.animateForever();
    }

    // endregion Things that do stuff
}

let controller = new PAPController();
controller.animateForever();
//controller.beginTestRoutine();
controller.newGame();