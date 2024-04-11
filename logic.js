try{
// WHITE: ♙♔♕♗♘♖ ▞ &#x1F680;🚀
// BLACK: ♟♚♛♝♞♜ █
// ⒶⒷⒸⒹⒺⒻ
// 🄰🄱🄲🄳🄴🄵
// https://www.thingiverse.com/thing:5091952
let board, board1;
if (true){
    board1 = Array(6).fill(Array(8).fill(Array(8).fill("▞")));
    board = [
        [//1
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "P", "P", "P", "P", "P", "P", "-"], 
            ["-", "P", "B", "N", "N", "B", "P", "-"], 
            ["-", "P", "N", "R", "K", "N", "P", "-"], 
            ["-", "P", "N", "Q", "R", "N", "P", "-"], 
            ["-", "P", "B", "N", "N", "B", "P", "-"], 
            ["-", "P", "P", "P", "P", "P", "P", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"]
        ],
        [//2
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "K", "-"], 
            ["-", "-", "-", "M", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "m", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"]
        ],
        [//3
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "M", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "m", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"]
        ],
        [//4
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "M", "-", "-", "-"], 
            ["-", "-", "-", "m", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"]
        ],
        [//5
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "m", "-", "-", "-"], 
            ["-", "-", "-", "M", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"], 
            ["-", "-", "-", "-", "-", "-", "-", "-"]
        ],
        [//6
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
}
//console.log(board);
function getmoves(loc, board){
    let piece = board[loc[2]][loc[1]][loc[0]];
    switch (piece) {
    case 'Oranges':
        console.log('Oranges are $0.59 a pound.');
        break;
    case 'Mangoes':
    case 'Papayas':
        console.log('Mangoes and papayas are $2.79 a pound.');
        // Expected output: "Mangoes and papayas are $2.79 a pound."
        break;
    default:
        console.log(`Empty piece selected`);
    }

}

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

}catch(e){alert(e)}