try{
// ♙♔♕♗♘♖
// ♟♚♛♝♞♖
// ⒶⒷⒸⒹⒺⒻ
// 🄰🄱🄲🄳🄴🄵
let board = Array(6).fill(Array(8).fill(Array(8).fill("R")));
//console.log(board);
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
            out += (8.5 - i/2).toString() + "│" + board[2][Math.floor(i/2)].join("│") + "│"
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
            out += (8.5 - i/2).toString() + "│" + board[5][Math.floor(i/2)].join("│") + "│"
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
            out += (8.5 - i/2).toString() + "│" + board[1][Math.floor(i/2)].join("│") + "│"
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
            out += (8.5 - i/2).toString() + "│" + board[0][Math.floor(i/2)].join("│") + "│"
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
            out += (8.5 - i/2).toString() + "│" + board[3][Math.floor(i/2)].join("│") + "│"
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
            out += (8.5 - i/2).toString() + "│" + board[4][Math.floor(i/2)].join("│") + "│"
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