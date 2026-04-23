import express from 'express';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {Server} from 'socket.io';
// import {Matrix3, Quaternion, Ray, Vector2, Vector3} from "three";
import {Color, FEN6State, Game, GameState, GameVariant, Move, Rulebook, UCIMove} from 'logic';

throw Error('Work in progress; Do not run!');

// region Server Logic

let CODE_LENGTH = 4; // Length of game codes

type ActionType = 'move' | 'abort' | 'resign'; // | 'offerdraw' | 'acceptdraw'
type Action = {
    type: ActionType,
    move?: UCIMove
}

class Controller {
    // graphics: GraphicsManager
    game: Game
    code: string
    players: Map<Color, Player> = new Map();

    constructor(code: string) {
        this.game = new Game(GameVariant.Standard);
        this.code = code;
        // this.graphics = new GraphicsManager(this);
        // this.update();
    }

    get vacantColors(): Array<Color> {
        return Object.values(Color).filter((color) => !this.players.has(color))
    }

    get canStart(): boolean {
        return this.players.size == Object.values(Color).length;
    }

    addPlayer(player: Player) {
        if (this.players.has(player.color)) throw Error('Player already exists!');
        this.players.set(player.color, player);
    }

    getPlayer(color: Color) {
        return this.players.get(color);
    }

    delPlayer(player: Player) {
        this.players.delete(player.color);
    }

    start() {

    }

    end() {

    }

    loadPositionFromFEN(fenState: FEN6State) {
        this.game.fen6 = fenState;
        // this.update();
    }

    savePositionAsFEN(): FEN6State {
        return this.game.fen6;
    }

    getMoveHistory(): Array<Move> {
        return this.game.moveHistory;
    }

    clearMoveHistory() {
        this.game.clearMoveHistory();
        // this.update();
    }

    getActiveColor(): Color {
        return this.game.activeColor;
    }

    getGameState(): GameState {
        return this.game.getGameState();
    }

    newGame() {
        this.clearMoveHistory();
        this.loadPositionFromFEN(Rulebook[GameVariant.Standard].startingFen6);
        // this.game.focus(new Pos(Side.Front, 6, 7));
        // this.update();
    }

    // update() {
    //     setTimeout(()=> {
    //         //console.log(this.graphics);
    //         this.graphics.update();
    //     }, 0);
    // }

    // animateForever() {
    //     this.game.graphics.animateForever();
    // }
}

class Player {
    game: Controller
    #color!: Color

    constructor(color: Color, game: Controller) {
        this.color = color;
        this.game = game;
    }

    get color(): Color {
        return this.#color;
    }

    set color(color: Color) {
        this.#color = color;
    }
}

class Manager {
    players: Map<string, Player> = new Map();
    games: Map<string, Controller> = new Map();

    constructor() {

    }

    // region SocketIO

    getPlayer(sid: string) {
        return this.players.get(sid);
    }

    addPlayer(sid: string, color: Color, game: Controller) {
        let player = new Player(color, game);
        this.players.set(sid, player);
        return player;
    }

    delPlayer(sid: string) {
        this.players.delete(sid);
    }

    // endregion SocketIO

    // region Game Management

    getGame(code: string) {
        return this.games.get(code);
    }

    addGame() {
        let code = this.#rand_code();
        let controller = new Controller(code);
        this.games.set(code, controller);
        return controller;
    }

    delGame(code: string) {
        this.games.delete(code);
    }

    canStartGame(game: Controller) {
        return game.canStart;
    }

    startGame(game: Controller) {
        game.start();
    }

    #rand_code() { // min and max included
        if (Object.keys(this.games).length > 2 * 10 ** (CODE_LENGTH - 1)) CODE_LENGTH++;
        let code: string;
        while (
            (code = Math.floor(Math.random() * ((10 ** CODE_LENGTH - 1) - 10 ** CODE_LENGTH + 1) + 10 ** CODE_LENGTH).toString())
            in Object.values) {
        }
        return code;
    }

    // endregion Game Management
}

// endregion Server Logic

interface ServerToClientEvents {
    joinGame: (code: string) => void;
    begin: () => void;
    pong: (time: number) => void;
    resetGame: (fen6state: FEN6State) => void;
    opponentAction: (action: Action) => void;
    gameState: (state: GameState) => void;
}

interface ClientToServerEvents {
    createGame: (color: Color) => void;
    joinGame: (code: string) => void;
    ping: (time: number) => void;
    action: (action: Action) => void;
}

interface InterServerEvents {
    //ping: () => void;
}

interface SocketData {
    //name: string;
    //age: number;
}

const app = express();
const server = createServer(app);
const io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> = new Server(server, {connectionStateRecovery: {}});
const __dirname = dirname(fileURLToPath(import.meta.url));
const manager = new Manager();
app.use(express.static('client/public'))

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    //const auth = socket.handshake.auth;
    socket.on('createGame', (color: Color) => {
        let game = manager.addGame();
        manager.addPlayer(socket.id, color, game);
        if (manager.canStartGame(game)) {
            manager.startGame(game);
        }
    });
    socket.on('joinGame', (code: string) => {
        let game = manager.getGame(code);

    });
    socket.on('disconnect', (reason) => {
        console.log(socket.id, 'disconnected:', reason);
    });
});

server.listen(process.env.PORT || 3000, () => {
    console.log('server running at http://localhost:3000');
});