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

// import {io} from 'socket.io-client';
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

/*
// region Old

//const LOG_VECTOR_EPSILON = 5 as const; // VECTOR_EPSILON = 10E-(LOG_VECTOR_EPSILON)
const VECTOR_EPSILON = 0.00001 as const; // Prevents floating point errors in vector equality
const MAX_RECURSION = 385 as const; // Max number of times a piece can "chain" moves (e.g. rook moving 2x forward)

// region Utils

Vector3.prototype.equals = function (v) {
    if (VECTOR_EPSILON === undefined) {
        return ((v.x === this.x) && (v.y === this.y) && (v.z === this.z));
    } else {
        return ((Math.abs(v.x - this.x) <= VECTOR_EPSILON) && (Math.abs(v.y - this.y) <= VECTOR_EPSILON) && (Math.abs(v.z - this.z) <= VECTOR_EPSILON));
    }
}
Vector2.prototype.equals = function (v) {
    if (VECTOR_EPSILON === undefined) {
        return ((v.x === this.x) && (v.y === this.y));
    } else {
        return ((Math.abs(v.x - this.x) <= VECTOR_EPSILON) && (Math.abs(v.y - this.y) <= VECTOR_EPSILON));
    }
}

function reverseRecord<T extends PropertyKey, U extends PropertyKey>(input: Record<T, U>) {
    return Object.fromEntries(
        Object.entries(input).map(([key, value]) => [
            value,
            key,
        ]),
    ) as Record<U, T>
}

// region Sides

// +x, -x, +y, -y, +z, -z
const Side = {
    Right: 0,
    Left: 1,
    Top: 2,
    Bottom: 3,
    Front: 4,
    Back: 5
} as const;
type Side = (typeof Side)[keyof typeof Side];

// https://stackoverflow.com/a/59700012
//type DeepReadonly<T> = T extends Function ? T : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
//type Reverser<T extends Record<any, PropertyKey>> = { [P in keyof T as T[P]]: P }
//const NormSides: Reverser<typeof SideNorms> = SideNorms;

type SideVec /!* aka. sv *!/ = { norm: Vector3, file: Vector3, rank: Vector3 } /!*Norm, dir of ranks (right), dir of files (up)*!/
const SideVecs: Record<Side, SideVec> = { // file: x+, rank: y+; imagine this vector being scaled to represent going to the k'th rank/file
    [Side.Right]: {norm: new Vector3(1, 0, 0), file: new Vector3(0, 0, -1), rank: new Vector3(0, 1, 0)},
    [Side.Left]: {norm: new Vector3(-1, 0, 0), file: new Vector3(0, 0, 1), rank: new Vector3(0, 1, 0)},
    [Side.Front]: {norm: new Vector3(0, 0, 1), file: new Vector3(1, 0, 0), rank: new Vector3(0, 1, 0)},
    [Side.Back]: {norm: new Vector3(0, 0, -1), file: new Vector3(-1, 0, 0), rank: new Vector3(0, 1, 0)},
    [Side.Top]: {norm: new Vector3(0, 1, 0), file: new Vector3(1, 0, 0), rank: new Vector3(0, 0, -1)},
    [Side.Bottom]: {norm: new Vector3(0, -1, 0), file: new Vector3(1, 0, 0), rank: new Vector3(0, 0, 1)}
} as const;
//type PosVec /!* aka. pv *!/ = { pos: Vector3, vec: Vector3 };

type SideAdjacencyNode = { left: Side, right: Side, up: Side, down: Side };
const SideAdjacencyGraph: Record<Side, SideAdjacencyNode> = {
    [Side.Right]: {left: Side.Front, right: Side.Back, up: Side.Top, down: Side.Bottom},
    [Side.Left]: {left: Side.Back, right: Side.Front, up: Side.Top, down: Side.Bottom},
    [Side.Front]: {left: Side.Left, right: Side.Right, up: Side.Top, down: Side.Bottom},
    [Side.Back]: {left: Side.Right, right: Side.Left, up: Side.Top, down: Side.Bottom},
    [Side.Top]: {left: Side.Left, right: Side.Right, up: Side.Back, down: Side.Front},
    [Side.Bottom]: {left: Side.Left, right: Side.Right, up: Side.Front, down: Side.Back}
}

// endregion Sides

// region Pieces

const Category = {
    Pawn: 0,
    Knight: 1,
    Bishop: 2,
    Rook: 3,
    Queen: 4,
    King: 5
} as const;
type Category = (typeof Category)[keyof typeof Category];
const Color = {
    White: 0,
    Black: 1
} as const;
type Color = (typeof Color)[keyof typeof Color];
type PieceVariant = {
    category: Category,
    color: Color
}
const ColorPerspectives: Record<Color, number> = {
    [Color.White]: 1,
    [Color.Black]: -1
} as const;
type ColorPerspective = (typeof ColorPerspectives)[keyof typeof ColorPerspectives];

// endregion Pieces

// region Position and Vectors

const CardinalDirection = {
    Up: new Vector2(0, 1),
    Down: new Vector2(0, -1),
    Right: new Vector2(1, 0),
    Left: new Vector2(-1, 0)
} as const;
const DiagonalDirection = {
    UpRight: new Vector2(1, 1),
    UpLeft: new Vector2(-1, 1),
    DownRight: new Vector2(1, -1),
    DownLeft: new Vector2(-1, -1)
} as const;
const Direction = {
    ...CardinalDirection,
    ...DiagonalDirection
} as const;
type Direction = (typeof Direction)[keyof typeof Direction];
// @ts-ignore
window.Direction = Direction; // TODO: DEBUG
//const DeltaMove = Vector2;
type DeltaMove = Vector2 | Direction; // General case of a piece translation, especially for potentially non-adjacent moves

const SurfacePos = Vector2;
type SurfacePos = Vector2;

const UCISide: Record<Side, string> = {
    [Side.Right]: 'o',
    [Side.Left]: 'r',
    [Side.Front]: 'g',
    [Side.Back]: 'b',
    [Side.Top]: 'w',
    [Side.Bottom]: 'y'
} as const;
const ReverseUCISide = reverseRecord<Side, string>(UCISide);
type UCISide = (typeof UCISide)[keyof typeof UCISide];
const UCIFile: Record<number, string> = {
    1: 'a',
    2: 'b',
    3: 'c',
    4: 'd',
    5: 'e',
    6: 'f',
    7: 'g',
    8: 'h'
} as const;
const ReverseUCIFile = reverseRecord<number, string>(UCIFile);
type UCIFile = (typeof UCIFile)[keyof typeof UCIFile];
const UCIRank: Record<number, string> = {
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8'
} as const;
const ReverseUCIRank = reverseRecord<number, string>(UCIRank);
type UCIRank = (typeof UCIRank)[keyof typeof UCIRank];
type UCIPos = `${UCISide}${UCIFile}${UCIRank}`;
type UCIPiece = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
const UCIPiece: Record<Category, Record<Color, UCIPiece>> = {
    [Category.Pawn]: {[Color.White]: 'P', [Color.Black]: 'p'},
    [Category.Knight]: {[Color.White]: 'N', [Color.Black]: 'n'},
    [Category.Bishop]: {[Color.White]: 'B', [Color.Black]: 'b'},
    [Category.Rook]: {[Color.White]: 'R', [Color.Black]: 'r'},
    [Category.Queen]: {[Color.White]: 'Q', [Color.Black]: 'q'},
    [Category.King]: {[Color.White]: 'K', [Color.Black]: 'k'},
} as const;
const ReverseUCIPiece: Record<UCIPiece, PieceVariant> = {
    'P': {category: Category.Pawn, color: Color.White},
    'p': {category: Category.Pawn, color: Color.Black},
    'N': {category: Category.Knight, color: Color.White},
    'n': {category: Category.Knight, color: Color.Black},
    'B': {category: Category.Bishop, color: Color.White},
    'b': {category: Category.Bishop, color: Color.Black},
    'R': {category: Category.Rook, color: Color.White},
    'r': {category: Category.Rook, color: Color.Black},
    'Q': {category: Category.Queen, color: Color.White},
    'q': {category: Category.Queen, color: Color.Black},
    'K': {category: Category.King, color: Color.White},
    'k': {category: Category.King, color: Color.Black},
} as const;
type UCIMove = string; // Too many combinations to encode in a type; UCIMove = UCIPiece + UCIPos x2, like algebraic notation

type FEN6Piece = UCIPiece;
const FEN6Piece: Record<Category, Record<Color, FEN6Piece>> = UCIPiece;
const ReverseFEN6Piece: Record<FEN6Piece, PieceVariant> = ReverseUCIPiece;
const FEN6Color: Record<Color, string> = {
    [Color.White]: 'w',
    [Color.Black]: 'b',
} as const;
const ReverseFEN6Color = reverseRecord(FEN6Color);
type FEN6Color = (typeof FEN6Color)[keyof typeof FEN6Color];
/!**
 * In order: Right (orange), Left (red), Top (white), Bottom (yellow), Front (green), Back (blue)
 * For each: Normal FEN of that side's board
 * Separated by ":"
 *!/
type FEN6Board = string;
/!**
 * `FEN6Board`
 * [SPACE]
 * Active color: W=White to move, B=Black to move
 *!/
type FEN6State = string;

/!*function isLikeDirection(move: DeltaMove) {
    return (-1 - VECTOR_EPSILON <= move.x && move.x <= 1 + VECTOR_EPSILON) && (-1 - VECTOR_EPSILON <= move.y && move.y <= 1 + VECTOR_EPSILON) && !(move.equals(BaseVector.Zero));
}
function isLikeCardinalDirection(move: DeltaMove) {
    return isLikeDirection(move) && ((Math.abs(move.x) <= VECTOR_EPSILON) != (Math.abs(move.y) <= VECTOR_EPSILON));
}
function isLikeDiagonalDirection(move: DeltaMove) {
    return isLikeDirection(move) && ((Math.abs(move.x) <= VECTOR_EPSILON) == (Math.abs(move.y) <= VECTOR_EPSILON));
}*!/

class Pos {
    #side!: Side
    #surfacePos: SurfacePos = new SurfacePos(1, 1)
    #posvec: Ray = new Ray();
    //posvec: PosVec = {pos: new Vector3(), vec: new Vector3()};
    //#pos: Vector3 = new Vector3() // temp vec design
    //#_v2: Vector3 = new Vector3()

    /!**
     * @param side - One of the 6 faces of the cube (from the Side enum)
     * @param surfacePos - SurfacePos object encompassing file and rank
     *!/
    constructor(side: Side, surfacePos: SurfacePos)
    /!**
     * Generates an invalid Pos for modification later on
     *!/
    constructor()
    /!**
     * @param side - One of the 6 faces of the cube (from the Side enum)
     * @param file - Bounded by [1, 8]
     * @param rank - Bounded by [1, 8]
     *!/
    constructor(side: Side, file: number, rank: number)
    constructor(side?: Side, fileOrSurfacePos?: SurfacePos | number, rank?: number) {
        if (side == undefined || fileOrSurfacePos == undefined) {
            side = Side.Right;
            fileOrSurfacePos = new SurfacePos(0, 0);
        }
        this.side = side;
        if (fileOrSurfacePos instanceof SurfacePos) this.surfacePos = fileOrSurfacePos;
        else {
            this.file = fileOrSurfacePos;
            this.rank = rank!;
        }
        //console.log(this.posvec);
    }

    set({side, file, rank}: { side?: Side, file?: number, rank?: number }): this
    set({side, surfacePos}: { side?: Side, surfacePos?: SurfacePos }): this
    set({side, surfacePos, file, rank}: { side?: Side, surfacePos?: SurfacePos, file?: number, rank?: number } = {}): this {
        if (side != undefined) this.side = side;
        if (surfacePos != undefined) this.surfacePos = surfacePos;
        else {
            if (file) this.file = file;
            if (rank) this.rank = rank;
        }
        //this.#calculatePosVec();
        return this;
    }

    get side() {
        return this.#side;
    }
    get file() {
        return this.#surfacePos.x;
    }
    get rank() {
        return this.#surfacePos.y;
    }
    get surfacePos() {
        return this.#surfacePos;
    }
    set side(side: Side) {
        this.#side = side;
        // this.recalculatePosvec();
    }
    set file(file: number) {
        this.#surfacePos.x = Math.round(file);
        // this.recalculatePosvec();
    }
    set rank(rank: number) {
        this.#surfacePos.y = Math.round(rank);
        // this.recalculatePosvec();
    }
    set surfacePos(surfacePos: SurfacePos) {
        this.file = surfacePos.x; // let the individual setters deal with rounding
        this.rank = surfacePos.y;
    }

    /!*canMove(move: DeltaMove): boolean {
        return this.canSurfaceMove(move) || (isLikeDirection(move) && this.canStep(move as Direction))
    }
    move(move: DeltaMove) {
        if (!this.canMove(move)) throw Error('Cannot move in such a direction! Please check with canMove first.');
    }*!/

    static getClosestSide(pos3: Vector3): Side {
        return Object.values(Side).map(
            (side: Side): [Side, number] => [side, SideVecs[side].norm.distanceTo(pos3)]
        ).sort(
            ((a, b) => a[1] - b[1])
        )[0][0];
    }
    setSurfacePosFromPos3(pos3: Vector3) {
        const newSide = Pos.getClosestSide(pos3);
        const newSv = SideVecs[newSide];
        let k = pos3.applyMatrix3(new Matrix3().set(
            newSv.norm.x, newSv.file.x, newSv.rank.x,
            newSv.norm.y, newSv.file.y, newSv.rank.y,
            newSv.norm.z, newSv.file.z, newSv.rank.z
        ).invert());
        k.y += 9 / 2;
        k.z += 9 / 2
        k.round();

        if (Math.abs(k.x - 4) > VECTOR_EPSILON
            || !(1 - VECTOR_EPSILON <= k.y && k.y <= 8 + VECTOR_EPSILON)
            || !(1 - VECTOR_EPSILON <= k.z && k.z <= 8 + VECTOR_EPSILON)) {
            throw Error('Failed to express PosVec in rotated basis');
        }

        this.set({side: newSide, file: k.y, rank: k.z});

        return this;
    }

    canSurfaceMove(move: DeltaMove): boolean {
        //console.log('canSurfaceMove');
        //console.log(this.side, this.file, this.rank, move);
        return (1 - VECTOR_EPSILON <= this.file + move.x && this.file + move.x <= 8 + VECTOR_EPSILON)
            && (1 - VECTOR_EPSILON <= this.rank + move.y && this.rank + move.y <= 8 + VECTOR_EPSILON);
    }
    surfaceMove(move: DeltaMove) {
        if (!this.canSurfaceMove(move)) throw Error('Surface-bound move extends past edge of side!');
        this.surfacePos.add(move);
    }
    canCross(move: DeltaMove): boolean {
        return ((1 - VECTOR_EPSILON <= this.file + move.x && this.file + move.x <= 8 + VECTOR_EPSILON)
                || (1 - VECTOR_EPSILON <= this.rank + move.y && this.rank + move.y <= 8 + VECTOR_EPSILON))
            && ((-1 - VECTOR_EPSILON <= move.x && move.x <= 1 + VECTOR_EPSILON)
                && (-1 - VECTOR_EPSILON <= move.y && move.y <= 1 + VECTOR_EPSILON));
    }
    cross(direction: Direction): Direction {
        //console.log(this.side, this.surfacePos, this.posvec.origin);
        //this.#calculatePosVec();
        //console.log(this.side, this.surfacePos, this.posvec.origin);
        let newPos = this.surfacePos.clone().add(direction);
        //console.log(newPos);
        let newSide: Side;
        if (newPos.y >= 9 - VECTOR_EPSILON) newSide = SideAdjacencyGraph[this.side].up;
        else if (newPos.y <= VECTOR_EPSILON) newSide = SideAdjacencyGraph[this.side].down;
        else if (newPos.x >= 9 - VECTOR_EPSILON) newSide = SideAdjacencyGraph[this.side].right;
        else if (newPos.x <= VECTOR_EPSILON) newSide = SideAdjacencyGraph[this.side].left;
        else throw Error(`Something weird happened with vector math (floating point error?): <${newPos.x}, ${newPos.y}>`);

        //console.log(this.side, newSide);

        let sv = SideVecs[this.side];

        let quaternion = new Quaternion();
        quaternion.setFromUnitVectors(sv.norm.clone().normalize(), SideVecs[newSide].norm.clone().normalize());
        //console.log(quaternion)
        let delta3 = (sv.file.clone()).multiplyScalar(direction.x).add((sv.rank.clone()).multiplyScalar(direction.y));
        delta3.divideScalar(2);
        let pos = this.posvec.origin.clone();
        //console.log(pos)
        pos.add(delta3);
        //console.log(delta3)
        //console.log(pos)
        delta3.applyQuaternion(quaternion);
        //console.log(delta3)
        pos.add(delta3);
        //console.log(pos)
        delta3.multiplyScalar(2);

        const newSv = SideVecs[newSide];

        this.setSurfacePosFromPos3(pos);

        //console.log(this.side, this.rank, this.file);
        //console.log(this);
        return new Vector2(delta3.dot(newSv.file), delta3.dot(newSv.rank));
    }
    canSlide(move: DeltaMove): boolean {
        return this.canSurfaceMove(move) || this.canCross(move);
    }
    slide(move: DeltaMove): DeltaMove {
        //console.log(move, this.surfacePos, this.posvec);
        //this.#calculatePosVec();
        if (this.canSurfaceMove(move)) {
            this.surfaceMove(move);
            return move;
        }
        else {
            if (this.canCross(move)) return this.cross(move);
            throw Error('Can neither surfaceMove nor cross!')
        }
    }

    get uci(): UCIPos {
        return `${UCISide[this.side]}${UCIFile[this.file]}${UCIRank[this.rank]}`;
    }
    set uci(uciPos: UCIPos) {
        if (uciPos.length != 3) throw Error('UCIPos has invalid length!');
        this.side = ReverseUCISide[uciPos[0]];
        this.file = ReverseUCIFile[uciPos[1]];
        this.rank = ReverseUCIRank[uciPos[2]];
    }

    equals(other: Pos) {
        //return (this.posvec.origin.equals(other.posvec.origin)) && (this.posvec.direction.equals(other.posvec.direction));
        return (Math.abs(this.side - other.side) <= VECTOR_EPSILON && this.surfacePos.equals(other.surfacePos));
    }

    get posvec(): Ray {
        let sv = SideVecs[this.side];
        return this.#posvec.set(
            sv.norm.clone().multiplyScalar(4)
                .add(sv.file.clone().multiplyScalar(this.file - 9 / 2))
                .add(sv.rank.clone().multiplyScalar(this.rank - 9 / 2)),
            sv.norm
        )
        // return {
        //     pos: this.#posvecpos // no async here so theoretically no race condition
        //         .copy(sv.norm.clone().multiplyScalar(SQUARE_WIDTH * 4))
        //         .add(sv.file.clone().multiplyScalar(this.file - SQUARE_WIDTH * 9 / 2))
        //         .add(sv.rank.clone().multiplyScalar(this.rank - SQUARE_WIDTH * 9 / 2)),
        //     vec: this.#posvecvec.copy(sv.norm)
        // };
    }
}

class Move {
    piece: Piece
    from: Pos
    to: Pos

    constructor(piece: Piece, to: Pos) {
        this.piece = new Piece(piece.pos, piece.variant, piece.graphics.config);
        this.from = this.piece.pos;
        this.to = to;
    }

    get uci(): UCIMove {
        return `${this.from.uci}${this.to.uci}`;
    }
    set uci(uciMove: UCIMove) {
        if (uciMove.length != 6) throw Error('UCIPos has invalid length!');
        this.from.uci = uciMove.slice(0, 3);
        this.to.uci = uciMove.slice(3);
    }
}

const BaseVector = {
    Zero: new Vector3(0, 0, 0),
    X: new Vector3(1, 0, 0),
    Y: new Vector3(0, 1, 0),
    Z: new Vector3(0, 0, 1),
    Zero2: new Vector2(0, 0),
    One2: new Vector2(1, 1),
    Eight2: new Vector2(8, 8)
} as const;
//const ZeroGeometry = new THREE.BufferGeometry();
//const ZeroMaterial = new THREE.MeshPhysicalMaterial();

// endregion Position and Vectors

// region Annotations

const AnnotationVariant = {
    RecentMove: 0,
    PossibleMove: 1,
    Check: 2,
    SelectedPiece: 3,
    Highlight: 4,
    DangerousPossibleMove: 5,
    ProspectiveMove: 6
} as const;
type AnnotationVariant = (typeof AnnotationVariant)[keyof typeof AnnotationVariant];

// endregion Annotations

// endregion Utils

//region Rules

const GameVariant = {
    Standard: 0
} as const;
type GameVariant = (typeof GameVariant)[keyof typeof GameVariant];

const MotionRestriction = {
    // Piece cannot go past the edge of the board
    NoCross: 0,
    // Piece cannot have moved before this move
    FirstMove: 1,
    // DeltaMove can only be used to capture pieces; exclusive w/NoCapture
    Capture: 2,
    CaptureOwnColor: 3,
    CaptureOtherColor: 4,
    // DeltaMove cannot be used to capture pieces (phasing not affected)
    NoCapture: 5,
    NoCaptureOwnColor: 6,
    NoCaptureOtherColor: 7,
    // Once a blocking piece is encountered, the piece can't go beyond it; only relevant if repeat > 1
    NoPhase: 8,
    NoPhaseOwnColor: 9,
    NoPhaseOtherColor: 10,
    // King-specific moves
    /!*NoRecieveCheck: 11,
    // TODO: Decide if NoGiveCheck should be added or not*!/
    // Resolved: Do not allow the player to walk into check, but only end the game once the king is captured
    // Moves exclusive to a color (e.g. pawns moving in opposite directions)
    White: 12,
    Black: 13
} as const;
type MotionRestriction = (typeof MotionRestriction)[keyof typeof MotionRestriction];
type MotionVerdict = { invalid: boolean, halt: boolean };
// move - Where to go (direction is a one-square-long move; individual DeltaMoves are executed in order to constitute a move)
// repeat - How many times can the piece can jump according to the aforementioned move; default = 1; -1 means infinite
// restrictions - Limitations on the piece
type MotionRange = Array<{ move: Array<DeltaMove>, repeat?: number, restrictions?: Array<MotionRestriction> }>;
type MotionRanges = Record<Category, MotionRange>;

const GameState = {
    Running: 0,
    KingCaptured: 1,
    Stalemate: 2
} as const;
type GameState = (typeof GameState)[keyof typeof GameState];

interface ChessRules {
    isRestrictionLegal: (board: Board, piece: Piece, startingPos: Pos, move: DeltaMove, restriction: MotionRestriction) => MotionVerdict,
    enumeratePossibleMoves: (board: Board, piece: Piece, startPos: Pos, avoid?: Array<MotionRestriction>, mustHave?: Array<MotionRestriction>) => Array<Pos>,
    isAttacked: (board: Board, piece: Piece, pos: Pos) => boolean,
    getGameState: (game: Game) => GameState,
    motionRanges: MotionRanges,
    startingFen6: FEN6State
    //isGameOver: (board: Board) => GameState
}

type Rulebook = Record<GameVariant, ChessRules>;
const Rulebook: Rulebook = {
    [GameVariant.Standard]: {
        isRestrictionLegal(board: Board, piece: Piece, startingPos: Pos, move: DeltaMove, restriction: MotionRestriction): MotionVerdict {
            const newPos = new Pos(startingPos.side, startingPos.surfacePos);
            if (!newPos.canSlide(move)) return {invalid: true, halt: true};
            newPos.slide(move);
            let kv = board.getPiece(newPos);
            if (restriction == MotionRestriction.NoCross) {
                if (!startingPos.canSurfaceMove(move)) return {invalid: true, halt: true};
                else return {invalid: false, halt: false};
            }
            else if (restriction == MotionRestriction.FirstMove) {
                if (piece.moved) return {invalid: true, halt: true};
                else return {invalid: false, halt: false};
            }
            else if (restriction == MotionRestriction.Capture) {
                if (!kv[1]) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            }
            else if (restriction == MotionRestriction.CaptureOtherColor) {
                if (!kv[1] || kv[1].variant.color == piece.variant.color) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            }
            else if (restriction == MotionRestriction.CaptureOwnColor) {
                if (!kv[1] || kv[1].variant.color == piece.variant.color) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            }
            else if (restriction == MotionRestriction.NoCapture) {
                if (kv[1]) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            }
            else if (restriction == MotionRestriction.NoCaptureOwnColor) {
                if (kv[1] && kv[1].variant.color == piece.variant.color) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            }
            else if (restriction == MotionRestriction.NoCaptureOtherColor) {
                if (kv[1] && kv[1].variant.color != piece.variant.color) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            }
            else if (restriction == MotionRestriction.NoPhase) {
                if (kv[1]) return {invalid: false, halt: true};
                else return {invalid: false, halt: false};
            }
            else if (restriction == MotionRestriction.NoPhaseOwnColor) {
                if (kv[1] && kv[1].variant.color == piece.variant.color) return {invalid: false, halt: true};
                else return {invalid: false, halt: false};
            }
            else if (restriction == MotionRestriction.NoPhaseOtherColor) {
                if (kv[1] && kv[1].variant.color != piece.variant.color) return {invalid: false, halt: true};
                else return {invalid: false, halt: false};
            }
            /!*else if (restriction == MotionRestriction.NoRecieveCheck) {
                if (this.isAttacked(board, piece, newPos)) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            }*!/
            else if (restriction == MotionRestriction.White) {
                if (piece.variant.color != Color.White) return {invalid: true, halt: true};
                else return {invalid: false, halt: false};
            }
            else if (restriction == MotionRestriction.Black) {
                if (piece.variant.color != Color.Black) return {invalid: true, halt: true};
                else return {invalid: false, halt: false};
            }
            return {invalid: true, halt: true};
        },
        enumeratePossibleMoves(board: Board, piece: Piece, pos: Pos, ignore?: Array<MotionRestriction>, avoid?: Array<MotionRestriction>, mustHave?: Array<MotionRestriction>): Array<Pos> {
            let moves: Array<Pos> = [];
            for (let range of this.motionRanges[piece.variant.category]) {
                let moveSequence = [...range.move];
                let verdict: MotionVerdict = {invalid: false, halt: false};
                const tempPos = (new Pos(pos.side, pos.surfacePos));
                let restrictions = range.restrictions || [];
                if (ignore) restrictions = restrictions.filter((e) => !ignore.includes(e))
                if ((avoid && avoid.some(restrictions.includes.bind(restrictions)))
                    || (mustHave && !mustHave.some(restrictions.includes.bind(restrictions)))) {
                    //console.log('continuing', avoid, restrictions);
                    continue;
                }
                const repeat = range.repeat != undefined ? (range.repeat > 0 ? range.repeat : MAX_RECURSION) : 1;
                //console.log(range.repeat, repeat);

                //let toAdd: Array<Pos> = [];
                let seen: Array<Pos> = [new Pos(tempPos.side, tempPos.surfacePos)];
                for (let j = 0; j < repeat; j++) {
                    let flag = false;
                    for (let i=0; i<moveSequence.length; i++) {
                        //console.log(pos.surfacePos, tempPos.surfacePos, range, i);
                        verdict = restrictions
                            .map((restriction) => this.isRestrictionLegal(board, piece, tempPos, moveSequence[i], restriction))
                            .reduce((prev, e) =>
                                    (Object.fromEntries(
                                        Object.entries(prev).map(
                                            ([key, value]) =>
                                                [key, value || e[key as keyof MotionVerdict]]
                                        )
                                    ) as MotionVerdict)
                                , {invalid: false, halt: false});
                        //console.log(tempPos.surfacePos, moveSequence, verdict);

                        if (!tempPos.canSlide(moveSequence[i]) || (verdict.invalid && verdict.halt)) {
                            flag = true;
                            break;
                        }
                        let sv1 = SideVecs[tempPos.side];
                        // console.log(verdict);
                        // console.log(moveSequence[i], tempPos.side, tempPos.surfacePos, "before");
                        moveSequence[i] = tempPos.slide(moveSequence[i]);
                        let sv2 = SideVecs[tempPos.side];

                        //board.highlight(tempPos);
                        // console.log(moveSequence[i], tempPos.side, tempPos.surfacePos);
                        // debugger;

                        let quaternion = (new Quaternion()).setFromUnitVectors(sv1.norm.clone().normalize(), sv2.norm.clone().normalize());
                        for (let k=i+1; k<moveSequence.length; k++) {
                            let delta3 = (sv1.file.clone()).multiplyScalar(moveSequence[k].x)
                                .add((sv1.rank.clone()).multiplyScalar(moveSequence[k].y))
                                .applyQuaternion(quaternion);
                            moveSequence[k] = new Vector2(delta3.dot(sv2.file), delta3.dot(sv2.rank));
                        }
                    }
                    if (flag) {
                        //console.log(2);
                        //console.log(tempPos, moveSequence, j);
                        //throw Error();
                        break;
                    }
                    //console.log(verdict, tempPos);
                    //debugger;

                    if (seen.some(e => tempPos.equals(e))) {
                        break;
                    }
                    if (!verdict.invalid) {
                        if (!moves.some(e => tempPos.equals(e))) {
                            //console.log('push');
                            moves.push(new Pos(tempPos.side, tempPos.surfacePos));
                        }
                    }
                    if (verdict.halt) {
                        break;
                    }
                    seen.push(new Pos(tempPos.side, tempPos.surfacePos));
                }
            }
            return moves;
        },
        isAttacked(board: Board, piece: Piece, pos: Pos) {
            for (let other of board.board.values()) {
                if (other.variant.color != piece.variant.color
                    && this.enumeratePossibleMoves(board, other, other.pos, [MotionRestriction.Capture, MotionRestriction.CaptureOtherColor, MotionRestriction.NoCaptureOwnColor], [MotionRestriction.NoCapture, MotionRestriction.NoCaptureOtherColor])
                        .some(pos.equals.bind(pos))) {
                    return true;
                }
            }
            return false;
        },
        getGameState(game: Game): GameState {
            const sameColorRoyalPieces = game.board.royalPieces.filter(
                (piece) => piece.variant.color == game.activeColor
            );
            //console.log(sameColorRoyalPieces);
            if (sameColorRoyalPieces.length <= 0) return GameState.KingCaptured;
            for (let piece of game.board.board.values()) {
                if (game.canMove(piece.pos)) {
                    return GameState.Running;
                }
            }
            return GameState.Stalemate;
        },
        motionRanges: {
            [Category.Pawn]: [
                {move: [Direction.Up], repeat: 2, restrictions: [MotionRestriction.FirstMove, MotionRestriction.NoCapture, MotionRestriction.NoPhase, MotionRestriction.White]},
                {move: [Direction.Up], restrictions: [MotionRestriction.NoCapture, MotionRestriction.White]}, // Allow promotion, aka entering the top/bottom sides
                {move: [Direction.UpRight], restrictions: [MotionRestriction.CaptureOtherColor, MotionRestriction.White]},
                {move: [Direction.UpLeft], restrictions: [MotionRestriction.CaptureOtherColor, MotionRestriction.White]},

                {move: [Direction.Down], repeat: 2, restrictions: [MotionRestriction.FirstMove, MotionRestriction.NoCapture, MotionRestriction.NoPhase, MotionRestriction.Black]},
                {move: [Direction.Down], restrictions: [MotionRestriction.NoCapture, MotionRestriction.Black]},
                {move: [Direction.DownRight], restrictions: [MotionRestriction.CaptureOtherColor, MotionRestriction.Black]},
                {move: [Direction.DownLeft], restrictions: [MotionRestriction.CaptureOtherColor, MotionRestriction.Black]}
            ],
            [Category.Knight]: [
                {move: [Direction.Up, Direction.Up, Direction.Left], restrictions: [MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.Up, Direction.Up, Direction.Right], restrictions: [MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.Down, Direction.Down, Direction.Left], restrictions: [MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.Down, Direction.Down, Direction.Right], restrictions: [MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.Right, Direction.Right, Direction.Up], restrictions: [MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.Right, Direction.Right, Direction.Down], restrictions: [MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.Left, Direction.Left, Direction.Up], restrictions: [MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.Left, Direction.Left, Direction.Down], restrictions: [MotionRestriction.NoCaptureOwnColor]}
            ],
            [Category.Bishop]: [
                {move: [Direction.UpRight], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.UpLeft], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.DownRight], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.DownLeft], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]}
            ],
            [Category.Rook]: [
                {move: [Direction.Up], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.Down], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.Right], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.Left], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]}
            ],
            [Category.Queen]: [
                {move: [Direction.UpRight], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.UpLeft], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.DownRight], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.DownLeft], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},

                {move: [Direction.Up], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.Down], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.Right], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]},
                {move: [Direction.Left], repeat: -1, restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]}
            ],
            [Category.King]: [
                {move: [Direction.Up], restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.Down], restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.Right], restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.Left], restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]},

                {move: [Direction.UpRight], restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.UpLeft], restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.DownRight], restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]},
                {move: [Direction.DownLeft], restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]}
            ]
        } as const,
        startingFen6: 'pppppppp/8/8/8/8/8/8/PPPPPPPP|pppppppp/8/8/8/8/8/8/PPPPPPPP|rbbnnbbr/b6b/b6b/n3q2n/n2k3n/b6b/b6b/rbbnnbbr|RBBNNBBR/B6B/B6B/N2K3N/N3Q2N/B6B/B6B/RBBNNBBR|pppppppp/8/8/8/8/8/8/PPPPPPPP|pppppppp/8/8/8/8/8/8/PPPPPPPP:w' as const
    }
}

class PieceObserver {
    /!**
     * AFTER any move is done!!
     *!/
    beforeInit(board: Board, piece: Piece) {}
    beforeThisMove(board: Board, piece: Piece) {
    }
    afterThisMove(board: Board, piece: Piece) {
    }
    afterThisAdded(board: Board, piece: Piece) {
    }
    beforeOtherMove(board: Board, piece: Piece) {
    }
    afterOtherMove(board: Board, piece: Piece) {
    }
    afterOtherAdded(board: Board, piece: Piece) {
    }
}
class PawnObserver extends PieceObserver {
    afterThisMove(board: Board, piece: Piece) {
        piece.moved = true;
        if (piece.pos.side == Side.Top || piece.pos.side == Side.Bottom) {
            piece.moved = false;
            piece.setVariant({category: Category.Queen, color: piece.variant.color});
        }
    }
    afterThisAdded(board: Board, piece: Piece) {
        if (piece.pos.rank != 1 && piece.pos.rank != 8) {
            piece.moved = true;
        }
        if (piece.pos.side == Side.Top || piece.pos.side == Side.Bottom) {
            piece.moved = false;
            piece.setVariant({category: Category.Queen, color: piece.variant.color});
        }
    }
}
class KingObserver extends PieceObserver {
    #updateSquaresTimeout: ReturnType<typeof setTimeout> = setTimeout(()=>{});
    beforeInit(board: Board, piece: Piece) {
        piece.royal = true;
    }
    beforeThisMove(board: Board, piece: Piece) {
        board.unmarkChecked(piece.pos);
    }
    beforeOtherMove(board: Board, piece: Piece) {
        this.beforeThisMove(board, piece);
    }
    afterThisMove(board: Board, piece: Piece) {
        clearTimeout(this.#updateSquaresTimeout);
        setTimeout(()=> {
            if (board.isAttacked(piece, piece.pos)) {
                board.markChecked(piece.pos);
            }
        });
    }
    afterOtherMove(board: Board, piece: Piece) {
        this.afterThisMove(board, piece);
    }
    afterThisAdded(board: Board, piece: Piece) {
        this.afterThisMove(board, piece);
    }
    afterOtherAdded(board: Board, piece: Piece) {
        this.afterThisMove(board, piece);
    }
}
const PieceObservers: Record<Category, PieceObserver> = {
    [Category.Pawn]: new PawnObserver(),
    [Category.Knight]: new PieceObserver(),
    [Category.Bishop]: new PieceObserver(),
    [Category.Rook]: new PieceObserver(),
    [Category.Queen]: new PieceObserver(),
    [Category.King]: new KingObserver()
} as const;

//endregion Rules

// region Logic

type AnyPiece = Piece | undefined; //null;
type AnyPos = Pos | undefined;
//const NoGroupPos = {} as const;
//type AnyGroupPos = Pos | typeof NoGroupPos;

class Piece {
    graphics: PieceGraphics
    variant!: PieceVariant
    #pos!: Pos // Initialized by assignment to this.pos which is called in constructor
    moved: boolean = false; // restrictions
    royal: boolean = false;
    alive: boolean = false; // For disposal reasons

    constructor(pos: Pos, variant: PieceVariant, graphicsConfig: GraphicsConfig) {
        this.graphics = new PieceGraphics(variant, graphicsConfig);
        this.variant = variant;
        this.pos = pos;
    }
    get pos() {
        return this.#pos;
    }
    set pos(pos: Pos) {
        this.#pos = pos;
        this.graphics.setPos(pos);
    }
    setVariant(variant: PieceVariant) {
        this.variant = variant;
        this.graphics.setVariant(variant);
        this.graphics.setPos(this.pos);
    }

    /!**
     * NOTE: Use Board.movePiece instead!
     * @param move
     *!/
    _slide(move: DeltaMove): DeltaMove {
        let out = this.pos.slide(move);
        //console.log('afterwards:', this.pos)
        this.graphics.setPos(this.pos);
        return out;
    }
}

class Annotation {
    graphics: AnnotationGraphics
    variant: AnnotationVariant
    #pos!: Pos // Initialized indirectly in constructor

    constructor(pos: Pos, variant: AnnotationVariant, graphicsConfig: GraphicsConfig) {
        this.graphics = new AnnotationGraphics(variant, graphicsConfig);
        this.variant = variant;
        this.pos = pos;
    }
    get pos() {
        return this.#pos;
    }
    set pos(pos: Pos) {
        this.#pos = pos;
        this.graphics.setPos(pos);
    }
    setVariant(variant: AnnotationVariant) {
        this.variant = variant;
        this.graphics.setVariant(variant);
        this.graphics.setPos(this.pos);
    }
}

class AnnotationGroup {
    readonly #annotations: Array<Annotation>

    constructor(annotations: Array<Annotation>) {
        this.#annotations = annotations;
    }

    get annotations() {
        return this.#annotations;
    }

    addAnnotation(annotation: Annotation) {
        this.#annotations.push(annotation);
    }
    getAnnotations(pos: Pos) {
        return [...this.annotations].filter(
            (annotation) => pos.equals(annotation.pos)
        );
    }
    delAnnotation(annotation: Annotation) {
        if (this.#annotations.includes(annotation)) this.#annotations.splice(this.#annotations.indexOf(annotation), 1);
    }
    // get empty(): boolean {
    //     return this.#annotations.length === 0;
    // }
}

class Board {
    graphics: BoardGraphics
    graphicsConfig: GraphicsConfig
    board: Map<Pos, Piece> = new Map(); //Array<Array<Array<AnyPiece>>>
    annotationBoard: Map<Pos, AnnotationGroup> = new Map();
    /!**
     * Maps Object3D.id to logical object (e.g. This Board, Piece, Annotation, etc.)
     *!/
    meshBoard: Map<number, Piece | Annotation | Board> = new Map();
    royalPieces: Array<Piece> = [];
    rules: ChessRules; // TODO: Add game variants
    possibleMovesCache: Map<Piece, Array<Pos>> = new Map(); // TODO: Add cacheing

    constructor(rules: ChessRules, graphicsConfig: GraphicsConfig) {
        this.rules = rules;
        this.graphics = new BoardGraphics(graphicsConfig);
        this.graphicsConfig = graphicsConfig;
        this.meshBoard.set(this.graphics.boardMesh.id, this); // NOTE: boardObject is the one with collision, not object!
        //this.board = new Array(6).fill(undefined).map(u => new Array(8).fill(undefined).map(u => new Array(8).fill(undefined)))
    }

    /!**
     * Finds the accompanying logic object (e.g. Piece, Annotation, Board) for a Mesh
     * @param object
     *!/
    getLogicalObjectFromMesh(object: THREE.Object3D) {
        //console.log(this.graphics.object.id);
        //console.log(this.meshBoard);
        return this.meshBoard.get(object.id);
    }

    // region Piece Management

    addPiece(pos: Pos, variant: PieceVariant) {
        const piece = new Piece(pos, variant, this.graphicsConfig);
        this._addExternalPiece(pos, piece);
        return piece;
    }
    _addExternalPiece(pos: Pos, piece: Piece) {
        pos = new Pos(pos.side, pos.surfacePos);
        const kv = this.getPiece(pos);
        if (kv[0]) {
            this.delPiece(kv[0]);
        }
        piece.pos = pos; // Just makign sure
        this.board.set(pos, piece);
        PieceObservers[piece.variant.category].beforeInit(this, piece);
        if (piece.royal) this.royalPieces.push(piece);
        piece.alive = true;
        this.invalidatePossibleMoves();
        this.meshBoard.set(piece.graphics.object.id, piece);
        this.graphics.add(piece.graphics);
        for (let selectedPiece of this.board.values()) {
            if (selectedPiece == piece) PieceObservers[selectedPiece.variant.category].afterOtherAdded(this, selectedPiece);
            else PieceObservers[selectedPiece.variant.category].afterThisAdded(this, selectedPiece);
        }
    }
    getPiece(pos: Pos): [AnyPos, AnyPiece] {
        const kv = [...this.board].filter(([key]) => pos.equals(key)).pop();
        if (kv) return kv;
        return [undefined, undefined];
    }
    movePiece(pos: Pos, newPos: Pos) {
        newPos = new Pos(newPos.side, newPos.surfacePos);
        //console.log(newPos.surfacePos, newPos.side)
        const [k, v] = this.getPiece(pos);
        if (k != undefined && v != undefined) {
            for (let piece of this.board.values()) {
                if (piece == v) PieceObservers[piece.variant.category].beforeThisMove(this, piece);
                else PieceObservers[piece.variant.category].beforeOtherMove(this, piece);
            }
            this.delPiece(newPos);
            this.board.set(newPos, v);
            //console.log('predelete', this.board.get(k), k.surfacePos);
            this.board.delete(k);
            //console.log('deleted', this.board.get(k));
            v.pos = newPos;
            this.invalidatePossibleMoves();
            //console.log(v.pos.surfacePos);
            for (let piece of this.board.values()) {
                if (piece == v) PieceObservers[piece.variant.category].afterThisMove(this, piece);
                else PieceObservers[piece.variant.category].afterOtherMove(this, piece);
            }
        }
    }
    delPiece(pos: Pos) {
        const [k, v] = this.getPiece(pos);
        if (k != undefined && v != undefined) {
            this.meshBoard.delete(v.graphics.object.id);
            let i = this.royalPieces.indexOf(v);
            if (i >= 0) this.royalPieces.splice(i, 1);
            this.board.delete(k);
            v.alive = false;
            this.invalidatePossibleMoves();
            this.graphics.del(v.graphics);
        }
    }
    delAllPieces() {
        for (let piece of [...this.board.values()]) {
            this.delPiece(piece.pos);
        }
    }

    // endregion Piece Management

    // region Annotation Management

    getAnnotationGroup(groupPos: Pos) {
        const kv = [...this.annotationBoard].filter(
            ([key]) =>
                /!*groupPos === key
                || (groupPos instanceof Pos && key instanceof Pos && *!/groupPos.equals(key)/!*)*!/
        ).pop();
        if (kv) return kv;
        return [undefined, undefined];
    }
    /!**
     * @param groupPos - What position the AnnotationGroup is linked to
     * @param annotationPos - Where the Annotation is actually rendered on the board
     * @param variant - Details about the Annotation
     *!/
    addAnnotation(groupPos: Pos, annotationPos: Pos, variant: AnnotationVariant) {
        const annotation = new Annotation(annotationPos, variant, this.graphicsConfig);
        this._addExternalAnnotation(groupPos, annotation);
        return annotation;
    }
    _addExternalAnnotation(groupPos: Pos, annotation: Annotation) {
        const kv = this.getAnnotationGroup(groupPos);
        //console.log('kv', kv);
        if (kv[1]) kv[1].addAnnotation(annotation);
        else this.annotationBoard.set(groupPos, new AnnotationGroup([annotation]));
        this.meshBoard.set(annotation.graphics.object.id, annotation);
        this.graphics.add(annotation.graphics);
    }
    delAnnotation(groupPos: Pos, annotation: Annotation) {
        const kv = this.getAnnotationGroup(groupPos);
        if (kv[1]) {
            //const annotation = kv[1].getAnnotation(pos);
            //if (annotation) {
            kv[1].delAnnotation(annotation);
            this.meshBoard.delete(annotation.graphics.object.id);
            this.graphics.del(annotation.graphics);
            return;
            //}
        }
        throw Error('No annotationGroup at Pos!');
    }
    delAllAnnotations(groupPos: Pos) {
        const kv = this.getAnnotationGroup(groupPos);
        if (kv[1]) {
            // @ts-ignore kv[1] is NOT undefined because I checked already (see previous line)
            kv[1].annotations.forEach(annotation => {kv[1].del(annotation); this.graphics.del(annotation.graphics)});
        }
        else throw Error('No annotationGroup at Pos!');
    }

    /!**
     * Shows all legal moves
     * @param pos1
     * @param prospective - Optional; If `true`, then `AnnotationVariant.ProspectiveMove` is used
     *!/
    showPossibleMoves(pos1: Pos, prospective?: boolean) {
        const [pos, piece] = this.getPiece(pos1);
        if (!pos || !piece) throw Error('No piece at Pos!');
        let destinations = this.enumeratePossibleMoves(pos);
        for (let destination of destinations) {
            if (prospective) {
                this.addAnnotation(pos, destination, AnnotationVariant.ProspectiveMove);
            }
            else if (this.isAttacked(piece, destination)) {
                this.addAnnotation(pos, destination, AnnotationVariant.DangerousPossibleMove);
            }
            else {
                this.addAnnotation(pos, destination, AnnotationVariant.PossibleMove);
            }
        }
        //console.log(...this.annotationBoard.values())
    }
    hidePossibleMoves(pos1: Pos) {
        const [pos, annotationGroup] = this.getAnnotationGroup(pos1);
        if (!pos || !annotationGroup) return; //throw Error('No annotationGroup at Pos!');
        for (let annotation of annotationGroup.annotations.slice()) {
            //console.log(annotation);
            if (annotation.variant == AnnotationVariant.PossibleMove
                || annotation.variant == AnnotationVariant.DangerousPossibleMove
                || annotation.variant == AnnotationVariant.ProspectiveMove) {
                this.delAnnotation(pos, annotation);
            }
        }
    }

    // recalculatePossibleMoves(pos1: Pos) {
    //     const [pos, piece] = this.getPiece(pos1);
    //     const [_, annotationGroup] = this.getAnnotationGroup(pos1);
    //     if (!pos || !piece || !annotationGroup) return;
    //     for (let annotation of annotationGroup.annotations.slice()) {
    //         if (this.isAttacked(piece, annotation.pos)) {
    //             annotation.setVariant(AnnotationVariant.DangerousPossibleMove);
    //         }
    //         else {
    //             annotation.setVariant(AnnotationVariant.PossibleMove);
    //         }
    //     }
    // }
    invalidatePossibleMoves() {
        this.possibleMovesCache.clear();
        // this.delAllAnnotations();
    }
    hideAllPossibleMoves() {
        for (let pos of this.annotationBoard.keys()) {
            this.hidePossibleMoves(pos);
        }
    }

    highlight(pos1: Pos) {
        this.addAnnotation(pos1, pos1, AnnotationVariant.Highlight);
    }
    unhighlight(pos1: Pos) {
        let annotations = this.getAnnotationGroup(pos1)[1]?.getAnnotations(pos1);
        if (annotations) {
            for (let annotation of annotations) {
                if (annotation.variant == AnnotationVariant.Highlight) {
                    this.delAnnotation(pos1, annotation);
                }
            }
        }
    }
    unhighlightAll() {
        for (let pos of this.annotationBoard.keys()) {
            this.unhighlight(pos);
        }
    }
    _showRecentMove(pos1: Pos) {
        this.addAnnotation(pos1, pos1, AnnotationVariant.RecentMove);
    }
    _hideRecentMove(pos1: Pos) {
        let annotations = this.getAnnotationGroup(pos1)[1]?.getAnnotations(pos1);
        if (annotations) {
            for (let annotation of annotations) {
                if (annotation.variant == AnnotationVariant.RecentMove) {
                    this.delAnnotation(pos1, annotation);
                }
            }
        }
    }
    showRecentMove(move: Move) {
        this._showRecentMove(move.from);
        this._showRecentMove(move.to);
    }
    hideRecentMove(move: Move) {
        this._hideRecentMove(move.from);
        this._hideRecentMove(move.to);
    }

    /!**
     * @deprecated
     *!/
    highlightMultiple(posarray: Array<Pos>) {
        for (let pos of posarray) {
            this.highlight(pos);
        }
    }
    /!**
     * @deprecated
     *!/
    unhighlightMultiple(posarray: Array<Pos>) {
        for (let pos of posarray) {
            this.unhighlight(pos);
        }
    }

    select(pos1: Pos) {
        this.addAnnotation(pos1, pos1, AnnotationVariant.SelectedPiece);
    }
    unselect(pos1: Pos) {
        let annotations = this.getAnnotationGroup(pos1)[1]?.getAnnotations(pos1);
        if (annotations) {
            for (let annotation of annotations) {
                if (annotation.variant == AnnotationVariant.SelectedPiece) {
                    this.delAnnotation(pos1, annotation);
                }
            }
        }
    }

    markChecked(pos1: Pos) {
        this.addAnnotation(pos1, pos1, AnnotationVariant.Check);
    }
    unmarkChecked(pos1: Pos) {
        let annotations = this.getAnnotationGroup(pos1)[1]?.getAnnotations(pos1);
        if (annotations) {
            for (let annotation of annotations) {
                if (annotation.variant == AnnotationVariant.Check) {
                    this.delAnnotation(pos1, annotation);
                }
            }
        }
    }

    // endregion Annotation Management

    /!**
     * Moves a piece from point A to point B
     * @param move - A Move object
     *!/
    move(move: Move) {
        this.movePiece(move.from, move.to);
    }

    /!**
     * Lists all legal moves a piece can make
     * @param piecePos - the Pos of the piece in question
     *!/
    enumeratePossibleMoves(piecePos: Pos) {
        const [pos, piece] = this.getPiece(piecePos);
        if (!pos || !piece) throw Error('No piece at Pos!');
        let res = this.possibleMovesCache.get(piece) || this.rules.enumeratePossibleMoves(this, piece, pos);
        this.possibleMovesCache.set(piece, res);
        return res;
    }
    isAttacked(piece: Piece, pos: Pos) {
        return this.rules.isAttacked(this, piece, pos);
    }

    /!**
     * Checks if a move is legal for the piece at `move.from`
     * @param move
     *!/
    isPossibleMove(move: Move) {
        return this.enumeratePossibleMoves(move.from).some(move.to.equals.bind(move.to));
    }

    // region Parsing

    get fen6(): FEN6Board {
        let pos = new Pos();
        let out = '';
        for (let side of Object.values(Side)) {
            for (let rank = 8; rank >= 1; rank--) {
                for (let file = 1; file <= 8; file++) {
                    pos.set({side: side, file: file, rank: rank});
                    let piece = this.getPiece(pos)[1];
                    if (piece) {
                        out += FEN6Piece[piece.variant.category][piece.variant.color];
                    }
                    else {
                        if (!out.at(-1) || isNaN(Number(out.at(-1)))) out += '1';
                        else out = out.slice(0, -1) + (Number(out.at(-1)!)+1).toString();
                    }
                }
                out += '/'
            }
            out = out.slice(0, -1); // Remove trailing delimiter
            out += '|'
        }
        return out.slice(0, -1); // Remove trailing delimiter
    }
    set fen6(fenBoard: FEN6Board) {
        this.delAllPieces();
        let pos = new Pos();
        pos.side = 0;
        for (let fenSide of fenBoard.split('|')) {
            pos.rank = 8
            for (let fenRow of fenSide.split('/')) {
                pos.file = 1;
                for (let fenChar of fenRow) {
                    if (isNaN(Number(fenChar))) {
                        //console.log(fenChar);
                        this.addPiece(pos, ReverseFEN6Piece[fenChar as FEN6Piece]);
                        if (pos.file >= 8) break;
                        pos.file++;
                    }
                    else {
                        pos.file += Number(fenChar);
                    }
                }
                if (pos.rank <= 1) break;
                pos.rank--;
            }
            if (pos.side >= 5) break;
            pos.side++;
        }
    }

    // endregion Parsing
}

class Game {
    graphics: GameGraphics
    board: Board
    variant: GameVariant
    selected?: Pos
    #activeColor!: Color;
    moveHistory: Array<Move> = [];
    #invalid!: boolean;

    constructor(variant: GameVariant) {
        this.graphics = new GameGraphics();
        this.variant = variant;
        this.board = new Board(Rulebook[this.variant], this.graphics.config);
        this.graphics.addBoard(this.board.graphics);
        this.activeColor = Color.White;
        // this.invalid = true;
    }

    /!**
     * Finds the accompanying logic object (e.g. Piece, Annotation, Board) for a Mesh
     * @param mesh
     *!/
    getLogicalObjectFromMesh(mesh: THREE.Object3D) {
        return this.board.getLogicalObjectFromMesh(mesh)
    }

    // get invalid(): boolean {
    //     return this.#invalid;
    // }
    // set invalid(value: boolean) {
    //     this.#invalid = value;
    // }

    get activeColor(): Color {
        return this.#activeColor
    }
    set activeColor(color: Color) {
        this.#activeColor = color;
        // this.invalid = true;
        this.graphics.setPerspective(ColorPerspectives[this.#activeColor])
    }
    advanceActiveColor() {
        if (this.activeColor == Color.White) {
            this.activeColor = Color.Black;
        }
        else {
            this.activeColor = Color.White;
        }
    }

    get recentMove(): Move | undefined {
        return this.moveHistory.at(-1);
    }
    set recentMove(move: Move) {
        this.moveHistory.push(move);
    }
    clearMoveHistory() {
        this.moveHistory = [];
    }

    /!**
     * Determines if play can continue or is halted (e.g. no royal pieces left)
     *!/
    getGameState(): GameState {
        return Rulebook[this.variant].getGameState(this);
    }

    addPiece(pos: Pos, variant: PieceVariant) {
        if (!this.board.getPiece(pos)[0]) {
            return this.board.addPiece(pos, variant);
        }
        throw Error('Cannot add a new piece on top of an existing piece!')
    }
    getPiece(pos: Pos) {
        return this.board.getPiece(pos)[1];
    }

    move(move: Move) {
        this.board.hideAllPossibleMoves();
        this.board.unhighlight(move.from);
        this.board.unhighlight(move.to);
        if (this.recentMove) this.board.hideRecentMove(this.recentMove);
        this.unselect();

        if (!this.isPossibleMove(move)) { // At this point, we're just providing detailed error messages
            if (this.getGameState() != GameState.Running) throw Error('Pieces cannot be moved on a completed (gameOver-ed) board!');
            else if (!this.getPiece(move.from)) throw Error('No piece at (starting) Pos!');
            else if (this.getPiece(move.from)!.variant.color != this.activeColor) throw Error('Cannot move out of turn!')
            else if (!this.board.isPossibleMove(move)) throw Error('Not a possible move!');
            else throw Error('(Generic) not a possible move at this time!')
        }
        else this.board.move(move);
        this.recentMove = move;
        this.board.showRecentMove(move);
        this.advanceActiveColor();
    }

    enumeratePossibleMoves(piecePos: Pos) {
        return this.board.enumeratePossibleMoves(piecePos);
    }
    isPossibleMove(move: Move): boolean {
        return (this.getGameState() == GameState.Running)
            && (this.getPiece(move.from) != undefined)
            && (this.getPiece(move.from)!.variant.color == this.activeColor)
            && (this.board.isPossibleMove(move));
    }
    canMove(piecePos: Pos) {
        const piece = this.getPiece(piecePos);
        if (!piece) throw Error('No piece at Pos!');
        return piece.variant.color == this.activeColor && (!!this.board.enumeratePossibleMoves(piece.pos));
    }

    showPossibleMoves(piecePos: Pos) {
        this.board.showPossibleMoves(piecePos);
    }
    hidePossibleMoves(piecePos: Pos) {
        this.board.hidePossibleMoves(piecePos);
    }
    hideAllPossibleMoves() {
        this.board.hideAllPossibleMoves();
    }
    highlight(pos: Pos) {
        this.board.highlight(pos);
    }
    unhighlight(pos: Pos) {
        this.board.unhighlight(pos);
    }
    unhighlightAll() {
        this.board.unhighlightAll();
    }
    select(pos: Pos) {
        this.unselect();
        this.selected = pos;
        let piece = this.board.getPiece(this.selected)[1];
        if (piece) this.board.showPossibleMoves(this.selected, piece.variant.color != this.activeColor);
        this.board.select(pos);
    }
    unselect() {
        if (this.selected) {
            this.board.hidePossibleMoves(this.selected);
            this.board.unselect(this.selected);
            this.selected = undefined;
        }
    }

    /!**
     * Call this BEFORE clearMoveHistory();
     *!/
    hideAllAnnotations() {
        this.board.hideAllPossibleMoves();
        this.board.unhighlightAll();
        if (this.recentMove) this.board.hideRecentMove(this.recentMove);
        this.unselect();
    }

    /!**
     * Looks at a point on the board
     * @deprecated
     *!/
    focus(targetPos: Pos) { // TODO: Add notification for when an off-screen Pos is focused
        this.graphics.lookAt(targetPos);
    }

    validateFen6(fenState: string): boolean {
        let split = fenState.split(':');
        if (split.length == 2
            && Object.values(FEN6Color).includes(split[1])
            && split[0].split('|').length == 6
            && !split[0].split('|').some(
                part => part.split('/').length != 8)
        )
            return true;
        return false;
    }
    get fen6(): FEN6State {
        return `${this.board.fen6}:${FEN6Color[this.activeColor]}`;
    }
    set fen6(fenState: string) {
        if (!this.validateFen6(fenState)) throw Error('Invalid FEN6State!');
        let split = (fenState as FEN6State).split(':');
        let [fenBoard, fenColor]: [FEN6Board, FEN6Color] = <[string, string]>split;
        this.activeColor = ReverseFEN6Color[fenColor];
        this.hideAllAnnotations();
        this.clearMoveHistory();
        this.board.fen6 = fenBoard;
    }
}

// endregion Logic

// endregion Old
*/

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
        const possibleMoveWidth = SQUARE_WIDTH*1.6
        const possibleMoveGeometry = new THREE.BoxGeometry(possibleMoveWidth/2, possibleMoveWidth/2, possibleMoveDepth);
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

        const highlightDepth = SQUARE_WIDTH*0.061;
        const highlightWidth = SQUARE_WIDTH*0.9
        const highlightGeometry = new THREE.CylinderGeometry(highlightWidth/2, highlightWidth/2, highlightDepth);
        highlightGeometry.rotateX(Math.PI / 2);
        highlightGeometry.translate(0, 0, highlightDepth/2);

        const dangerousPossibleMoveDepth = SQUARE_WIDTH*0.06;
        const dangerousPossibleMoveWidth = SQUARE_WIDTH*1.6
        const dangerousPossibleMoveGeometry = new THREE.BoxGeometry(dangerousPossibleMoveWidth/2, dangerousPossibleMoveWidth/2, dangerousPossibleMoveDepth);
        //dangerousPossibleMoveGeometry.rotateX(Math.PI / 2);
        dangerousPossibleMoveGeometry.translate(0, 0, dangerousPossibleMoveDepth/2);

        const prospectiveMoveDepth = SQUARE_WIDTH*0.06;
        const prospectiveMoveWidth = SQUARE_WIDTH*1.6
        const prospectiveMoveGeometry = new THREE.BoxGeometry(prospectiveMoveWidth/2, prospectiveMoveWidth/2, prospectiveMoveDepth);
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

class GraphicsManager {
    rendererElement: HTMLCanvasElement
    controller: Controller
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

    constructor(controller: Controller) {
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
        return false;
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

class Controller {
    graphics: GraphicsManager
    game: Game

    constructor() {
        this.game = new Game(GameVariant.Standard);
        this.graphics = new GraphicsManager(this);
        // this.game.initialize();
        this.update();
    }

    // region Helpers

    loadPositionFromFEN(fenState: FEN6State) {
        this.game.fen6 = fenState;
    }

    savePositionAsFEN(): FEN6State {
        return this.game.fen6;
    }

    getMoveHistory(): Array<Move> {
        return this.game.moveHistory;
    }

    clearMoveHistory() {
        this.game.clearMoveHistory();
    }

    reset() {
        this.game.reset();
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
        this.reset();
        this.loadPositionFromFEN(Rulebook[GameVariant.Standard].startingFen6); // TODO: Real variant support
        // this.game.focus(new Pos(Side.Front, 6, 7));
        this.update();
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
        setTimeout(() => { // Defer until all modifications are settled
            this.graphics.update();
        }, 0);
    }

    animateForever() {
        this.graphics.animateForever();
    }

    // endregion Things that do stuff
}

let controller = new Controller();
//controller.beginTestRoutine();
controller.newGame();
controller.animateForever();


// const socket = io();