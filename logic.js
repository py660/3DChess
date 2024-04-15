try{

if (!/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)){
//var firebug=document.createElement('script');firebug.setAttribute('src','https://py660.github.io/firebug-lite-debug.js');document.body.appendChild(firebug);(function(){if(window.firebug.version){firebug.init();}else{setTimeout(arguments.callee);}})();void(firebug);
console.log = function(){
    let out = [];
    for (var i = 0; i < arguments.length; i++) {
        out.push(JSON.stringify(arguments[i], null, 2)); 
    }
    alert(out.join(", "));
}
}

// WHITE: ♙♔♕♗♘♖ ▞ &#x1F680;🚀
// BLACK: ♟♚♛♝♞♜ █
// ⒶⒷⒸⒹⒺⒻ
// 🄰🄱🄲🄳🄴🄵
// https://www.thingiverse.com/thing:5091952
let board, board1;
if (true){
    board1 = Array(6).fill(Array(8).fill(Array(8).fill("▞")));
    board1 = [
        [//0
            ["-", "K", "-", "-", "-", "-", "-", "-"], 
            ["-", "P", "P", "P", "P", "P", "P", "-"], 
            ["-", "P", "B", "N", "N", "B", "P", "-"], 
            ["-", "P", "N", "R", "K", "N", "P", "-"], 
            ["-", "P", "N", "Q", "R", "N", "P", "-"], 
            ["-", "P", "B", "N", "N", "B", "P", "-"], 
            ["-", "P", "P", "P", "P", "P", "P", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"]
        ],
        [//1
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "K", "-"], 
            ["-", "-", "-", "M", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "m", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "K", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"]
        ],
        [//2
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "M", "-", "-", "-", "-"], 
            ["-", "K", "-", "-", "m", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"]
        ],
        [//3
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "M", "-", "-", "-"], 
            ["-", "-", "-", "m", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"]
        ],
        [//4
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "m", "-", "-", "-"], 
            ["-", "-", "-", "M", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"]
        ],
        [//5
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "p", "p", "p", "p", "p", "p", "-"], 
            ["-", "p", "b", "n", "n", "b", "p", "-"], 
            ["-", "p", "n", "r", "q", "n", "p", "-"], 
            ["-", "p", "n", "k", "r", "n", "p", "-"], 
            ["-", "p", "b", "n", "n", "b", "p", "-"], 
            ["-", "p", "p", "p", "p", "p", "p", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"]
        ],
    ];
    board = [];
    accents = ""
}
class Pos{
    constructor(x,y,z){
        this.x = x;
        this.y = y;
        this.z = z;
    }
    clone(){
        return structuredClone(this);
    }
}
class Delta{
    constructor(dx,dy){
        this.dx = dx;
        this.dy = dy;
    }
}

function getpos(loc, delta){
    loc = loc.clone();
    let [dx, dy] = [delta.dx, delta.dy];
    //console.log(dx, dy);
    loc.x += dx;
    loc.y += dy;
    switch (loc.z){
        case 0:{
            console.log("Surface 0");
            let moved = false;
            if (loc.x < 0){//Surface 1
                loc.z = 1;
                loc.x += 8;
                moved = true;
            }
            if (loc.x >= 8){//Surface 3
                loc.z = 3;
                loc.x -= 8;
                moved = true;
            }
            if (loc.y < 0){//Surface 2
                if (moved){
                    loc = null;
                    break;
                }
                loc.z = 2;
                loc.y += 8;
            }
            if (loc.y >= 8){//Surface 4
                if (moved){
                    loc = null;
                    break;
                }
                loc.z = 4;
                loc.y -= 8;
            }
            break;
        }
        case 1:{
            console.log("Surface 1");
            let moved = false;
            if (loc.x < 0){//Surface 5
                loc.z = 5;
                loc.x += 8;
                moved = true;
            }
            if (loc.x >= 8){//Surface 0
                loc.z = 0;
                loc.x -= 8;
                moved = true;
            }
            if (loc.y < 0){//Surface 2
                if (moved){
                    loc = null;
                    break;
                }
                loc.z = 2;
                let temp = loc.x;
                loc.x = loc.y;
                loc.x += 1;
                loc.x *= -1;
                loc.y = temp;
            }
            if (loc.y >= 8){//Surface 4
                if (moved){
                    loc = null;
                    break;
                }
                loc.z = 4;
                let temp = loc.x;
                loc.x = loc.y;
                console.log(loc.y);
                loc.x -= 8;
                loc.y = 7 - temp;
            }
            break;
        }
        case 2:{
            console.log("Surface 2");
            let moved = false;
            if (loc.x < 0){//Surface 1
                loc.z = 1;
                let temp = loc.y;
                loc.y = loc.x;
                loc.y += 1;
                loc.y *= -1;
                loc.x = temp;
                moved = true;
            }
            if (loc.x >= 8){//Surface 0
                loc.z = 0;
                let temp = loc.y;
                loc.y = loc.x;
                loc.y -= 8;
                loc.x = 7 - temp;
                moved = true;
            }
            if (loc.y < 0){//Surface 5
                if (moved){
                    loc = null;
                    break;
                }
                loc.z = 5;
                loc.y += 8;
            }
            if (loc.y >= 8){//Surface 0
                if (moved){
                    loc = null;
                    break;
                }
                loc.z = 0;
                loc.y -= 8;
            }
            break;
        }
        case 3:{
            console.log("Surface 3");
            let moved = false;
            if (loc.x < 0){//Surface 0
                loc.z = 0;
                loc.x += 8;
                moved = true;
            }
            if (loc.x >= 8){//Surface 5
                loc.z = 5;
                loc.x -= 8;
                moved = true;
            }
            if (loc.y < 0){//Surface 2
                if (moved){
                    loc = null;
                    break;
                }
                loc.z = 2;
                let temp = loc.x;
                loc.x = loc.y;
                loc.x += 8;
                loc.y = temp;
                loc.y *= -1;
            }
            if (loc.y >= 8){//Surface 4
                if (moved){
                    loc = null;
                    break;
                }
                loc.z = 4;
                let temp = loc.x;
                loc.x = loc.y;
                loc.y = 
            }
            break;
        }
        default:{
            console.log("Invalid position.");
        }
    }
    //console.log(loc);
    return loc;
}
let origp = new Pos(1, 4, 2);
let d     = new Delta(-5, 2);
let p = getpos(origp, d);
console.log(p);
board[p.z][p.y][p.x] = board[origp.z][origp.y][origp.x];
//console.log(origp);
board[origp.z][origp.y][origp.x] = "-"

//console.log(board);
function getmoves(loc){
    console.log(loc);
    let piece = board[loc.z][loc.y][loc.x];
    let out = [];
    switch (piece){
        case 'K':{
            console.log(`Found King at position ${loc}`);
            let candidates = [
                getpos(loc, new Delta(1,0)),
                getpos(loc, new Delta(0,1)),
                getpos(loc, new Delta(1,1)),
                getpos(loc, new Delta(-1,0)),
                getpos(loc, new Delta(0,-1)),
                getpos(loc, new Delta(-1,-1)),
                getpos(loc, new Delta(-1,1)),
                getpos(loc, new Delta(1,-1))
            ];
            for (let pos of candidates){
                if (!pos) continue;
                let tempboard = board;
                tempboard[loc.z][loc.y][loc.x] = "-";
                tempboard[pos.z][pos.y][pos.x] = "K";
                if (ValidityState(tempboard)){
                    out.push(pos)
                }
            }
            break;
        }
        default:{
            console.log("Empty piece selected.");
        }
    }
    return out;
}

//getmoves(new Pos(6, 2, 1));
//let { z, x, y } = loc;
//x = x.toUpperCase().charCodeAt(0) - 65;
//y = 8-parseInt(y);
//z = parseInt(z)-1;
//loc = new Pos(x, y, z);
//getmoves("2G6")

function chessify(pieces){
    let chars = {
        "-": " ",

        "P": "♙",
        "K": "♔",
        "Q": "♕",
        "B": "♗",
        "N": "♘",
        "R": "♖",
        "M": "M",

        "p": "♟",
        "k": "♚",
        "q": "♛",
        "b": "♝",
        "n": "♞",
        "r": "♜",
        "m": "m"
    }

    let out = [];
    for (let piece of pieces){
        if (/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform) && piece in chars){
            out.push("<span class='unstretch'>" + chars[piece] + "</span>");
        }
        else{
            out.push("<span class='unstretch'>" + ((piece=="-") ? " ":piece) + "</span>");
        }
    }
    return out;
}

function display(board){
    let out = "";
    for (let i=0;i<17;i++){
        out += " ".repeat(18);

        //alert(board[2][i])
        if (i==0){
            out += " ┌" + "─┬".repeat(7) + "─┐";
        }
        else if (i==16){
            out += " └" + "─┴".repeat(7) + "─┘";
        }
        else if (i%2==0){
            out += " ├" + "─┼".repeat(7) + "─┤";
        }
        else if (i!=16){
            out += (8.5 - i/2).toString() + "│" + chessify(board[2][Math.floor(i/2)]).join("│") + "│"
        }
        else{}

        //alert(board[5][i])
        if (i==0){
            out += " ┌" + "─┬".repeat(7) + "─┐";
        }
        else if (i==16){
            out += " └" + "─┴".repeat(7) + "─┘";
        }
        else if (i%2==0){
            out += " ├" + "─┼".repeat(7) + "─┤";
        }
        else if (i!=16){
            out += (8.5 - i/2).toString() + "│" + chessify(board[5][Math.floor(i/2)]).join("│") + "│"
        }
        else{}

        out += "\n";
    }
    out += " ".repeat(18) + "3 A B C D E F G H 6 A B C D E F G H \n";
    
    for (let i=0;i<17;i++){

        //alert(board[1][i])
        if (i==0){
            out += " ┌" + "─┬".repeat(7) + "─┐";
        }
        else if (i==16){
            out += " └" + "─┴".repeat(7) + "─┘";
        }
        else if (i%2==0){
            out += " ├" + "─┼".repeat(7) + "─┤";
        }
        else if (i!=16){
            out += (8.5 - i/2).toString() + "│" + chessify(board[1][Math.floor(i/2)]).join("│") + "│"
        }
        else{}

        //alert(board[0][i])
        if (i==0){
            out += " ┌" + "─┬".repeat(7) + "─┐";
        }
        else if (i==16){
            out += " └" + "─┴".repeat(7) + "─┘";
        }
        else if (i%2==0){
            out += " ├" + "─┼".repeat(7) + "─┤";
        }
        else if (i!=16){
            out += (8.5 - i/2).toString() + "│" + chessify(board[0][Math.floor(i/2)]).join("│") + "│"
        }
        else{}

        //alert(board[3][i])
        if (i==0){
            out += " ┌" + "─┬".repeat(7) + "─┐";
        }
        else if (i==16){
            out += " └" + "─┴".repeat(7) + "─┘";
        }
        else if (i%2==0){
            out += " ├" + "─┼".repeat(7) + "─┤";
        }
        else if (i!=16){
            out += (8.5 - i/2).toString() + "│" + chessify(board[3][Math.floor(i/2)]).join("│") + "│"
        }
        else{}

        out += "\n";
    }
    out += "2 A B C D E F G H 1 A B C D E F G H 4 A B C D E F G H \n";

    for (let i=0;i<17;i++){
        out += " ".repeat(18);

        //alert(board[4][i])
        if (i==0){
            out += " ┌" + "─┬".repeat(7) + "─┐";
        }
        else if (i==16){
            out += " └" + "─┴".repeat(7) + "─┘";
        }
        else if (i%2==0){
            out += " ├" + "─┼".repeat(7) + "─┤";
        }
        else if (i!=16){
            out += (8.5 - i/2).toString() + "│" + chessify(board[4][Math.floor(i/2)]).join("│") + "│"
        }
        else{}

        out += " ".repeat(18);

        out += "\n";
    }
    out += " ".repeat(18) + "3 A B C D E F G H " + " ".repeat(18);
    
    return out;
}
document.getElementById("output").innerHTML = display(board);//JSON.stringify(board);
//console.table(board);
//console.dir(board);
// 36
//214
// 5
}catch(e){alert(e.stack);}