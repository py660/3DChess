import {Matrix3, Quaternion, Ray, Vector2, Vector3} from 'three';
import {Subject} from 'rxjs';

//const LOG_VECTOR_EPSILON = 5 as const; // VECTOR_EPSILON = 10E-(LOG_VECTOR_EPSILON)
const VECTOR_EPSILON = 0.00001 as const; // Prevents floating point errors in vector equality
const MAX_RECURSION = 385 as const; // Max number of times a piece can "chain" moves (e.g. rook moving 2x forward)

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

type SideVec /* aka. sv */ = { norm: Vector3, file: Vector3, rank: Vector3 } /*Norm, dir of ranks (right), dir of files (up)*/
const SideVecs: Record<Side, SideVec> = { // file: x+, rank: y+; imagine this vector being scaled to represent going to the k'th rank/file
    [Side.Right]: {norm: new Vector3(1, 0, 0), file: new Vector3(0, 0, -1), rank: new Vector3(0, 1, 0)},
    [Side.Left]: {norm: new Vector3(-1, 0, 0), file: new Vector3(0, 0, 1), rank: new Vector3(0, 1, 0)},
    [Side.Front]: {norm: new Vector3(0, 0, 1), file: new Vector3(1, 0, 0), rank: new Vector3(0, 1, 0)},
    [Side.Back]: {norm: new Vector3(0, 0, -1), file: new Vector3(-1, 0, 0), rank: new Vector3(0, 1, 0)},
    [Side.Top]: {norm: new Vector3(0, 1, 0), file: new Vector3(1, 0, 0), rank: new Vector3(0, 0, -1)},
    [Side.Bottom]: {norm: new Vector3(0, -1, 0), file: new Vector3(1, 0, 0), rank: new Vector3(0, 0, 1)}
} as const;
//type PosVec /* aka. pv */ = { pos: Vector3, vec: Vector3 };

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

// endregion Pieces

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
type UCISide = (typeof UCISide)[keyof typeof UCISide];
const ReverseUCISide = reverseRecord<Side, string>(UCISide);
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
type UCIFile = (typeof UCIFile)[keyof typeof UCIFile];
const ReverseUCIFile = reverseRecord<number, string>(UCIFile);
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
type UCIRank = (typeof UCIRank)[keyof typeof UCIRank];
const ReverseUCIRank = reverseRecord<number, string>(UCIRank);
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
/**
 * In order: Right (orange), Left (red), Top (white), Bottom (yellow), Front (green), Back (blue)
 * For each: Normal FEN of that side's board
 * Separated by ":"
 */
type FEN6Board = string;
/**
 * `FEN6Board`
 * [SPACE]
 * Active color: W=White to move, B=Black to move
 */
type FEN6State = string;

/*function isLikeDirection(move: DeltaMove) {
    return (-1 - VECTOR_EPSILON <= move.x && move.x <= 1 + VECTOR_EPSILON) && (-1 - VECTOR_EPSILON <= move.y && move.y <= 1 + VECTOR_EPSILON) && !(move.equals(BaseVector.Zero));
}
function isLikeCardinalDirection(move: DeltaMove) {
    return isLikeDirection(move) && ((Math.abs(move.x) <= VECTOR_EPSILON) != (Math.abs(move.y) <= VECTOR_EPSILON));
}
function isLikeDiagonalDirection(move: DeltaMove) {
    return isLikeDirection(move) && ((Math.abs(move.x) <= VECTOR_EPSILON) == (Math.abs(move.y) <= VECTOR_EPSILON));
}*/

class Pos {
    #side!: Side
    #surfacePos: SurfacePos = new SurfacePos(1, 1)
    #posvec: Ray = new Ray();
    //posvec: PosVec = {pos: new Vector3(), vec: new Vector3()};
    //#pos: Vector3 = new Vector3() // temp vec design
    //#_v2: Vector3 = new Vector3()

    /**
     * @param side - One of the 6 faces of the cube (from the Side enum)
     * @param surfacePos - SurfacePos object encompassing file and rank
     */
    constructor(side: Side, surfacePos: SurfacePos)
    /**
     * Generates an invalid Pos for modification later on
     */
    constructor()
    /**
     * @param side - One of the 6 faces of the cube (from the Side enum)
     * @param file - Bounded by [1, 8]
     * @param rank - Bounded by [1, 8]
     */
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

    get side() {
        return this.#side;
    }

    set side(side: Side) {
        this.#side = side;
        // this.recalculatePosvec();
    }

    get file() {
        return this.#surfacePos.x;
    }

    set file(file: number) {
        this.#surfacePos.x = Math.round(file);
        // this.recalculatePosvec();
    }

    get rank() {
        return this.#surfacePos.y;
    }

    set rank(rank: number) {
        this.#surfacePos.y = Math.round(rank);
        // this.recalculatePosvec();
    }

    get surfacePos() {
        return this.#surfacePos;
    }

    set surfacePos(surfacePos: SurfacePos) {
        this.file = surfacePos.x; // let the individual setters deal with rounding
        this.rank = surfacePos.y;
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

    /*canMove(move: DeltaMove): boolean {
        return this.canSurfaceMove(move) || (isLikeDirection(move) && this.canStep(move as Direction))
    }
    move(move: DeltaMove) {
        if (!this.canMove(move)) throw Error('Cannot move in such a direction! Please check with canMove first.');
    }*/

    static getClosestSide(pos3: Vector3): Side {
        return Object.values(Side).map(
            (side: Side): [Side, number] => [side, SideVecs[side].norm.distanceTo(pos3)]
        ).sort(
            ((a, b) => a[1] - b[1])
        )[0][0];
    }

    set({side, file, rank}: { side?: Side, file?: number, rank?: number }): this

    set({side, surfacePos}: { side?: Side, surfacePos?: SurfacePos }): this

    set({side, surfacePos, file, rank}: {
        side?: Side,
        surfacePos?: SurfacePos,
        file?: number,
        rank?: number
    } = {}): this {
        if (side != undefined) this.side = side;
        if (surfacePos != undefined) this.surfacePos = surfacePos;
        else {
            if (file) this.file = file;
            if (rank) this.rank = rank;
        }
        //this.#calculatePosVec();
        return this;
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
        } else {
            if (this.canCross(move)) return this.cross(move);
            throw Error('Can neither surfaceMove nor cross!')
        }
    }

    equals(other: Pos) {
        //return (this.posvec.origin.equals(other.posvec.origin)) && (this.posvec.direction.equals(other.posvec.direction));
        return (Math.abs(this.side - other.side) <= VECTOR_EPSILON && this.surfacePos.equals(other.surfacePos));
    }
}

class Move {
    piece: Piece
    from: Pos
    to: Pos

    constructor(piece: Piece, to: Pos) {
        this.piece = piece;
        this.from = this.piece.pos;
        this.to = to;
    }

    get uci(): UCIMove {
        return `${this.from.uci}${this.to.uci}`;
    }

    set uci(uciMove: UCIMove) {
        if (uciMove.length != 7) throw Error('UCIPos has invalid length!');
        this.piece.uci = uciMove[0] as UCIPiece;
        this.from.uci = uciMove.slice(1, 4);
        this.to.uci = uciMove.slice(4);
    }
}

// endregion Position and Vectors

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
    /*NoRecieveCheck: 11,
    // TODO: Decide if NoGiveCheck should be added or not*/
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
    startingColor: Color,
    nextColor: (game: Game) => Color,
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
            } else if (restriction == MotionRestriction.FirstMove) {
                if (piece.moved) return {invalid: true, halt: true};
                else return {invalid: false, halt: false};
            } else if (restriction == MotionRestriction.Capture) {
                if (!kv[1]) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            } else if (restriction == MotionRestriction.CaptureOtherColor) {
                if (!kv[1] || kv[1].variant.color == piece.variant.color) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            } else if (restriction == MotionRestriction.CaptureOwnColor) {
                if (!kv[1] || kv[1].variant.color == piece.variant.color) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            } else if (restriction == MotionRestriction.NoCapture) {
                if (kv[1]) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            } else if (restriction == MotionRestriction.NoCaptureOwnColor) {
                if (kv[1] && kv[1].variant.color == piece.variant.color) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            } else if (restriction == MotionRestriction.NoCaptureOtherColor) {
                if (kv[1] && kv[1].variant.color != piece.variant.color) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            } else if (restriction == MotionRestriction.NoPhase) {
                if (kv[1]) return {invalid: false, halt: true};
                else return {invalid: false, halt: false};
            } else if (restriction == MotionRestriction.NoPhaseOwnColor) {
                if (kv[1] && kv[1].variant.color == piece.variant.color) return {invalid: false, halt: true};
                else return {invalid: false, halt: false};
            } else if (restriction == MotionRestriction.NoPhaseOtherColor) {
                if (kv[1] && kv[1].variant.color != piece.variant.color) return {invalid: false, halt: true};
                else return {invalid: false, halt: false};
            }
            /*else if (restriction == MotionRestriction.NoRecieveCheck) {
                if (this.isAttacked(board, piece, newPos)) return {invalid: true, halt: false};
                else return {invalid: false, halt: false};
            }*/
            else if (restriction == MotionRestriction.White) {
                if (piece.variant.color != Color.White) return {invalid: true, halt: true};
                else return {invalid: false, halt: false};
            } else if (restriction == MotionRestriction.Black) {
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
                    for (let i = 0; i < moveSequence.length; i++) {
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
                        for (let k = i + 1; k < moveSequence.length; k++) {
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
                {
                    move: [Direction.Up],
                    repeat: 2,
                    restrictions: [MotionRestriction.FirstMove, MotionRestriction.NoCapture, MotionRestriction.NoPhase, MotionRestriction.White]
                },
                {move: [Direction.Up], restrictions: [MotionRestriction.NoCapture, MotionRestriction.White]}, // Allow promotion, aka entering the top/bottom sides
                {
                    move: [Direction.UpRight],
                    restrictions: [MotionRestriction.CaptureOtherColor, MotionRestriction.White]
                },
                {
                    move: [Direction.UpLeft],
                    restrictions: [MotionRestriction.CaptureOtherColor, MotionRestriction.White]
                },

                {
                    move: [Direction.Down],
                    repeat: 2,
                    restrictions: [MotionRestriction.FirstMove, MotionRestriction.NoCapture, MotionRestriction.NoPhase, MotionRestriction.Black]
                },
                {move: [Direction.Down], restrictions: [MotionRestriction.NoCapture, MotionRestriction.Black]},
                {
                    move: [Direction.DownRight],
                    restrictions: [MotionRestriction.CaptureOtherColor, MotionRestriction.Black]
                },
                {
                    move: [Direction.DownLeft],
                    restrictions: [MotionRestriction.CaptureOtherColor, MotionRestriction.Black]
                }
            ],
            [Category.Knight]: [
                {
                    move: [Direction.Up, Direction.Up, Direction.Left],
                    restrictions: [MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.Up, Direction.Up, Direction.Right],
                    restrictions: [MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.Down, Direction.Down, Direction.Left],
                    restrictions: [MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.Down, Direction.Down, Direction.Right],
                    restrictions: [MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.Right, Direction.Right, Direction.Up],
                    restrictions: [MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.Right, Direction.Right, Direction.Down],
                    restrictions: [MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.Left, Direction.Left, Direction.Up],
                    restrictions: [MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.Left, Direction.Left, Direction.Down],
                    restrictions: [MotionRestriction.NoCaptureOwnColor]
                }
            ],
            [Category.Bishop]: [
                {
                    move: [Direction.UpRight],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.UpLeft],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.DownRight],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.DownLeft],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                }
            ],
            [Category.Rook]: [
                {
                    move: [Direction.Up],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.Down],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.Right],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.Left],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                }
            ],
            [Category.Queen]: [
                {
                    move: [Direction.UpRight],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.UpLeft],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.DownRight],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.DownLeft],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },

                {
                    move: [Direction.Up],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.Down],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.Right],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                },
                {
                    move: [Direction.Left],
                    repeat: -1,
                    restrictions: [MotionRestriction.NoCaptureOwnColor, MotionRestriction.NoPhase]
                }
            ],
            [Category.King]: [
                {move: [Direction.Up], restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]},
                {
                    move: [Direction.Down],
                    restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.Right],
                    restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.Left],
                    restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]
                },

                {
                    move: [Direction.UpRight],
                    restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.UpLeft],
                    restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.DownRight],
                    restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]
                },
                {
                    move: [Direction.DownLeft],
                    restrictions: [MotionRestriction.NoPhase, MotionRestriction.NoCaptureOwnColor]
                }
            ]
        } as const,
        startingColor: Color.White,
        nextColor(game: Game): Color {
            if (game.activeColor == Color.White) return Color.Black;
            return Color.White
        },
        startingFen6: 'pppppppp/8/8/8/8/8/8/PPPPPPPP|pppppppp/8/8/8/8/8/8/PPPPPPPP|rbbnnbbr/b6b/b6b/n3q2n/n2k3n/b6b/b6b/rbbnnbbr|RBBNNBBR/B6B/B6B/N2K3N/N3Q2N/B6B/B6B/RBBNNBBR|pppppppp/8/8/8/8/8/8/PPPPPPPP|pppppppp/8/8/8/8/8/8/PPPPPPPP:w' as const
    }
}

class PieceObserver {
    /**
     * AFTER any move is done!!
     */
    beforeInit(board: Board, piece: Piece) {
    }

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

    afterThisSetVariant(board: Board, piece: Piece) {
    }

    afterOtherSetVariant(board: Board, piece: Piece) {
    }
}

class PawnObserver extends PieceObserver {
    afterThisMove(board: Board, piece: Piece) {
        piece.moved = true;
        if (piece.pos.side == Side.Top || piece.pos.side == Side.Bottom) {
            piece.moved = false;
            board.setPieceVariant(piece.pos, {category: Category.Queen, color: piece.variant.color});
        }
    }

    afterThisAdded(board: Board, piece: Piece) {
        if (!((piece.pos.rank == 1 && piece.variant.color == Color.White)
            || (piece.pos.rank == 8 && piece.variant.color == Color.Black))) {
            piece.moved = true;
        }
        if (piece.pos.side == Side.Top || piece.pos.side == Side.Bottom) {
            piece.moved = false;
            board.setPieceVariant(piece.pos, {category: Category.Queen, color: piece.variant.color});
        }
    }
}

class KingObserver extends PieceObserver {
    #updateSquaresTimeout: ReturnType<typeof setTimeout> = setTimeout(() => {
    });

    afterThisMove(board: Board, piece: Piece) {
        this.#updateSquares(board, piece);
    }

    afterOtherMove(board: Board, piece: Piece) {
        this.#updateSquares(board, piece);
    }

    beforeInit(board: Board, piece: Piece) {
        piece.royal = true;
    }

    beforeThisMove(board: Board, piece: Piece) {
        board.unmarkChecked(piece.pos);
    }

    beforeOtherMove(board: Board, piece: Piece) {
        this.beforeThisMove(board, piece);
    }

    afterThisAdded(board: Board, piece: Piece) {
        this.#updateSquares(board, piece);
    }

    afterOtherAdded(board: Board, piece: Piece) {
        this.#updateSquaresAsync(board, piece);
    }

    afterThisSetVariant(board: Board, piece: Piece) {
        this.#updateSquares(board, piece);
    }

    afterOtherSetVariant(board: Board, piece: Piece) {
        this.#updateSquares(board, piece);
    }

    #updateSquares(board: Board, piece: Piece) {
        if (board.isAttacked(piece, piece.pos)) {
            board.markChecked(piece.pos);
        }
    }

    #updateSquaresAsync(board: Board, piece: Piece) {
        clearTimeout(this.#updateSquaresTimeout);
        this.#updateSquaresTimeout = setTimeout(() => {
            this.#updateSquares(board, piece)
        });
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


interface PieceEvents {
    setVariant: Subject<PieceVariant>,
    setPos: Subject<Pos>
}

class Piece {
    events: PieceEvents = {
        setVariant: new Subject(),
        setPos: new Subject()
    }
    // id: number;
    #variant!: PieceVariant
    moved: boolean = false; // restrictions
    royal: boolean = false;
    alive: boolean = false; // For disposal reasons
    #pos: Pos = new Pos(); // Initialized by assignment to this.pos which is called in constructor

    constructor(pos: Pos, variant: PieceVariant) {
        // this.id = Math.random();
        // this.graphics = new PieceGraphics(variant, graphicsConfig);
        this.variant = variant;
        // setInterval(()=>{console.log(this.pos.uci)},0);
        this.pos = pos;
    }

    get pos() {
        return this.#pos;
    }

    set pos(pos: Pos) {
        // console.log('setPos!', pos.uci);
        this.#pos.set(pos);
        this.events.setPos.next(pos);
    }

    get uci(): UCIPiece {
        return UCIPiece[this.variant.category][this.variant.color];
    }

    set uci(uciPiece: UCIPiece) {
        this.variant = ReverseUCIPiece[uciPiece];
    }

    get variant(): PieceVariant {
        return this.#variant;
    }

    set variant(variant: PieceVariant) {
        this.#variant = variant;
        this.events.setVariant.next(variant);
        // this.events.setPos.next(this.pos);
    }

    /**
     * NOTE: Use Board.movePiece instead!
     * @deprecated
     * @param move
     */
    _slide(move: DeltaMove): DeltaMove {
        let out = this.pos.slide(move);
        //console.log('afterwards:', this.pos)
        this.events.setPos.next(this.pos);
        return out;
    }
}

interface AnnotationEvents {
    setVariant: Subject<AnnotationVariant>,
    setPos: Subject<Pos>
}

class Annotation {
    events: AnnotationEvents = {
        setVariant: new Subject(),
        setPos: new Subject()
    }
    // graphics: AnnotationGraphics
    variant!: AnnotationVariant
    #pos!: Pos // Initialized indirectly in constructor

    constructor(pos: Pos, variant: AnnotationVariant/*, graphicsConfig: GraphicsConfig*/) {
        // this.graphics = new AnnotationGraphics(variant, graphicsConfig);
        this.setVariant(variant);
        this.pos = pos;
        // console.log(pos.posvec.origin);
    }

    get pos() {
        return this.#pos;
    }

    set pos(pos: Pos) {
        this.#pos = pos;
        this.events.setPos.next(pos);
    }

    setVariant(variant: AnnotationVariant) {
        this.variant = variant;
        this.events.setVariant.next(variant);
        // this.events.setPos.next(this.pos);
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

interface BoardEvents {
    addPiece: Subject<Piece>,
    addAnnotation: Subject<Annotation>,
    delPiece: Subject<Piece>,
    delAnnotation: Subject<Annotation>
}

class Board {
    events: BoardEvents = {
        addPiece: new Subject(),
        addAnnotation: new Subject(),
        delPiece: new Subject(),
        delAnnotation: new Subject(),
    }
    board: Map<Pos, Piece> = new Map();
    annotationBoard: Map<Pos, AnnotationGroup> = new Map();
    /**
     * Maps Object3D.id to logical object (e.g. This Board, Piece, Annotation, etc.)
     */
    meshBoard: Map<number, Piece | Annotation | Board> = new Map();
    royalPieces: Array<Piece> = [];
    rules: ChessRules; // TODO: Add game variants
    possibleMovesCache: Map<Piece, Array<Pos>> = new Map();
    boardCache: Map<Pos, Piece> = new Map();

    constructor(rules: ChessRules) {
        this.rules = rules;
        // this.graphics = new BoardGraphics(graphicsConfig);
        // this.graphicsConfig = graphicsConfig;
        // this.meshBoard.set(this.graphics.boardObject.id, this); // NOTE: boardObject is the one with collision, not object!
        //this.board = new Array(6).fill(undefined).map(u => new Array(8).fill(undefined).map(u => new Array(8).fill(undefined)))
    }

    // region Piece Management

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
                    } else {
                        if (!out.at(-1) || isNaN(Number(out.at(-1)))) out += '1';
                        else out = out.slice(0, -1) + (Number(out.at(-1)!) + 1).toString();
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
                    } else {
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

    addPiece(pos: Pos, variant: PieceVariant) {
        const piece = new Piece(pos, variant);
        this._addExternalPiece(pos, piece);
        return piece;
    }

    _addExternalPiece(pos: Pos, piece: Piece) {
        pos = new Pos(pos.side, pos.surfacePos);
        const kv = this.getPiece(pos);
        if (kv[0]) {
            this.delPiece(kv[0]);
        }
        // piece.pos = pos; // Just makign sure
        this.board.set(pos, piece);
        //console.log('piece"s pos')
        //console.log(piece.variant.category);
        PieceObservers[piece.variant.category].beforeInit(this, piece);
        if (piece.royal) this.royalPieces.push(piece);
        piece.alive = true;
        this.invalidateBoard();
        for (let selectedPiece of this.board.values()) {
            if (selectedPiece == piece) PieceObservers[selectedPiece.variant.category].afterThisAdded(this, selectedPiece);
            else PieceObservers[selectedPiece.variant.category].afterOtherAdded(this, selectedPiece);
        }
        this.events.addPiece.next(piece);
        //console.log(piece.pos.uci);
    }

    getPiece(pos: Pos): [AnyPos, AnyPiece] {
        let t = this.boardCache.get(pos);
        if (t) return [pos, t];
        const kv = [...this.board].filter(([key]) => pos.equals(key)).pop();
        if (!kv) return [undefined, undefined];
        this.boardCache.set(kv[0], kv[1]);
        return kv;
    }

    movePiece(pos: Pos, newPos: Pos) {
        newPos = new Pos(newPos.side, newPos.surfacePos);
        //console.log(newPos.surfacePos, newPos.side)
        const [k, v] = this.getPiece(pos);
        if (k == undefined || v == undefined) throw Error('No piece at Pos!');
        for (let piece of this.board.values()) {
            if (piece == v) PieceObservers[piece.variant.category].beforeThisMove(this, piece);
            else PieceObservers[piece.variant.category].beforeOtherMove(this, piece);
        }
        if (this.getPiece(newPos)[0]) this.delPiece(newPos);
        this.board.set(newPos, v);
        //console.log('predelete', this.board.get(k), k.surfacePos);
        this.board.delete(k);
        //console.log('deleted', this.board.get(k));
        v.pos = newPos;
        this.invalidateBoard();
        //console.log(v.pos.surfacePos);
        for (let piece of this.board.values()) {
            if (piece == v) PieceObservers[piece.variant.category].afterThisMove(this, piece);
            else PieceObservers[piece.variant.category].afterOtherMove(this, piece);
        }

    }

    setPieceVariant(pos: Pos, variant: PieceVariant) {
        const [k, v] = this.getPiece(pos);
        if (!v) throw Error('No piece at Pos!');
        v.variant = variant;
        for (let piece of this.board.values()) {
            if (piece == v) PieceObservers[piece.variant.category].afterThisSetVariant(this, piece);
            else PieceObservers[piece.variant.category].afterOtherSetVariant(this, piece);
        }
    }

    // endregion Piece Management

    // region Annotation Management

    delPiece(pos: Pos) {
        const [k, v] = this.getPiece(pos);
        if (k == undefined || v == undefined) throw Error('No piece at Pos!');
        // this.meshBoard.delete(v.graphics.object.id);
        let i = this.royalPieces.indexOf(v);
        if (i >= 0) this.royalPieces.splice(i, 1);
        this.board.delete(k);
        v.alive = false;
        this.invalidateBoard();
        this.events.delPiece.next(v);
    }

    delAllPieces() {
        for (let piece of [...this.board.values()]) {
            this.delPiece(piece.pos);
        }
    }

    getAnnotationGroup(groupPos: Pos) {
        const kv = [...this.annotationBoard].filter(
            ([key]) =>
                /*groupPos === key
                || (groupPos instanceof Pos && key instanceof Pos && */groupPos.equals(key)/*)*/
        ).pop();
        if (kv) return kv;
        return [undefined, undefined];
    }

    /**
     * @param groupPos - What position the AnnotationGroup is linked to
     * @param annotationPos - Where the Annotation is actually rendered on the board
     * @param variant - Details about the Annotation
     */
    addAnnotation(groupPos: Pos, annotationPos: Pos, variant: AnnotationVariant) {
        const annotation = new Annotation(annotationPos, variant);
        this._addExternalAnnotation(groupPos, annotation);
        return annotation;
    }

    _addExternalAnnotation(groupPos: Pos, annotation: Annotation) {
        const kv = this.getAnnotationGroup(groupPos);
        //console.log('kv', kv);
        if (kv[1]) kv[1].addAnnotation(annotation);
        else this.annotationBoard.set(groupPos, new AnnotationGroup([annotation]));
        // this.meshBoard.set(annotation.graphics.object.id, annotation);
        this.events.addAnnotation.next(annotation);
    }

    delAnnotation(groupPos: Pos, annotation: Annotation) {
        const kv = this.getAnnotationGroup(groupPos);
        if (kv[1]) {
            //const annotation = kv[1].getAnnotation(pos);
            //if (annotation) {
            kv[1].delAnnotation(annotation);
            // this.meshBoard.delete(annotation.graphics.object.id);
            this.events.delAnnotation.next(annotation);
            return;
            //}
        }
        throw Error('No annotationGroup at Pos!');
    }

    delAllAnnotations(groupPos: Pos) {
        const kv = this.getAnnotationGroup(groupPos);
        if (kv[1]) {
            // @tds-ignore kv[1] is NOT undefined because I checked already (see previous line)
            for (let annotation of kv[1].annotations) {
                this.delAnnotation(groupPos, annotation);
            }
            // kv[1].annotations.forEach(annotation => {kv[1]?.delAnnotation(annotation)});
        } else throw Error('No annotationGroup at Pos!');
    }

    delAllAllAnnotations() {
        [...this.annotationBoard.keys()].forEach(this.delAllAnnotations.bind(this));
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

    /**
     * Shows all legal moves
     * @param pos1
     * @param prospective - Optional; If `true`, then `AnnotationVariant.ProspectiveMove` is used
     */
    showPossibleMoves(pos1: Pos, prospective?: boolean) {
        const [pos, piece] = this.getPiece(pos1);
        if (!pos || !piece) throw Error('No piece at Pos!');
        let destinations = this.enumeratePossibleMoves(pos);
        for (let destination of destinations) {
            if (prospective) {
                this.addAnnotation(pos, destination, AnnotationVariant.ProspectiveMove);
            } else if (this.isAttacked(piece, destination)) {
                this.addAnnotation(pos, destination, AnnotationVariant.DangerousPossibleMove);
            } else {
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

    // }
    invalidateBoard() {
        this.possibleMovesCache.clear();
        this.boardCache.clear();
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

    isHighlighted(pos: Pos) {
        return !!this.getAnnotationGroup(pos)[1]?.annotations.some(annotation => annotation.variant == AnnotationVariant.Highlight);
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

    /**
     * @deprecated
     */
    highlightMultiple(posarray: Array<Pos>) {
        for (let pos of posarray) {
            this.highlight(pos);
        }
    }

    /**
     * @deprecated
     */
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

    // endregion Annotation Management

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

    /**
     * Moves a piece from point A to point B
     * @param move - A Move object
     */
    move(move: Move) {
        this.movePiece(move.from, move.to);
    }

    /**
     * Lists all legal moves a piece can make
     * @param piecePos - the Pos of the piece in question
     */
    enumeratePossibleMoves(piecePos: Pos) {
        const [pos, piece] = this.getPiece(piecePos);
        if (!pos || !piece) throw Error('No piece at Pos!');
        let res = this.possibleMovesCache.get(piece) || this.rules.enumeratePossibleMoves(this, piece, pos);
        this.possibleMovesCache.set(piece, res);
        return res;
    }

    // region Parsing

    isAttacked(piece: Piece, pos: Pos) {
        return this.rules.isAttacked(this, piece, pos);
    }

    /**
     * Checks if a move is legal for the piece at `move.from`
     * @param move
     */
    isPossibleMove(move: Move) {
        return this.enumeratePossibleMoves(move.from).some(move.to.equals.bind(move.to));
    }

    // endregion Parsing
}

interface GameEvents {
    // updateThisColor: Subject<Color>
    // addBoard: Subject<Board>
}

class Game {
    // graphics: GameGraphics
    events: GameEvents = {
        // updateThisColor: new Subject<Color>()
        // addBoard: new Subject()
    };
    board!: Board
    variant: GameVariant
    selected?: Pos
    // #thisColor!: Color;
    moveHistory: Array<Move> = [];
    #activeColor!: Color;

    // #invalid!: boolean;

    /**
     * @param variant
     */
    constructor(variant: GameVariant) {
        // this.graphics = new GameGraphics();
        // this.thisColor = thisColor;
        this.variant = variant;
        this.activeColor = Rulebook[this.variant].startingColor;
        // this.invalid = true;
        this.board = new Board(Rulebook[this.variant]);
        // console.log('triggering addboard')
        // this.events.addBoard.next(this.board);
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
        // this.events.setPerspective.next(this.#activeColor)
    }

    get recentMove(): Move | undefined {
        return this.moveHistory.at(-1);
    }

    set recentMove(move: Move) {
        this.moveHistory.push(move);
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

    advanceActiveColor() {
        this.activeColor = Rulebook[this.variant].nextColor(this);
        // this.thisColor = this.activeColor; // TODO: Only for pass & play
    }

    clearMoveHistory() {
        this.moveHistory = [];
    }

    /**
     * Determines if play can continue or is halted (e.g. no royal pieces left)
     */
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
        } else this.board.move(move);
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

    isHighlighted(pos: Pos) {
        return this.board.isHighlighted(pos);
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

    reset() {
        this.unselect();
        this.clearMoveHistory();
        this.hideAllAnnotations();
    }

    /**
     * Call this BEFORE clearMoveHistory();
     */
    hideAllAnnotations() {
        this.unselect();
        this.board.delAllAllAnnotations();
    }

    validateFen6(fenState: string): boolean {
        let split = fenState.split(':');
        return split.length == 2
            && Object.values(FEN6Color).includes(split[1])
            && split[0].split('|').length == 6
            && !split[0].split('|').some(
                part => part.split('/').length != 8);
    }
}

// endregion Logic

// region Exports

export {
    Vector2,
    Vector3,

    Side,
    Category,
    Color,
    PieceVariant,
    AnnotationVariant,

    CardinalDirection,
    DiagonalDirection,
    Direction,
    DeltaMove,
    SurfacePos,

    UCISide,
    ReverseUCISide,
    UCIFile,
    ReverseUCIFile,
    UCIRank,
    ReverseUCIRank,
    UCIPos,
    UCIPiece,
    ReverseUCIPiece,
    UCIMove,

    FEN6Piece,
    ReverseFEN6Piece,
    FEN6Color,
    ReverseFEN6Color,
    FEN6Board,
    FEN6State,

    Pos,
    Move,
    BaseVector,

    GameVariant,
    MotionRestriction,
    MotionVerdict,
    MotionRange,
    MotionRanges,
    GameState,
    ChessRules,
    Rulebook,

    PieceObserver,
    PawnObserver,
    KingObserver,
    PieceObservers,

    AnyPiece,
    AnyPos,

    PieceEvents,
    Piece,
    AnnotationEvents,
    Annotation,
    AnnotationGroup,
    BoardEvents,
    Board,
    GameEvents,
    Game
};

// endregion Exports