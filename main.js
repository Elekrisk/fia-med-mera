let stage;

const sceneWidth = 1000;
const sceneHeight = 1000;

let colors = ["red", "green", "yellow", "blue"];

function newGamestate(layer, players) {

    for (let player of players) {
        player.active = true;
    }

    let gamestate = {
        currentTurn: 0,
        currentPlayer: players[0],
        turnState: 'start',
        players: players,
        pieces: [],
        ranking: [],
        over: false,
        layer: layer,
    };

    for (let player of players) {
        for (let i = -1; i >= -4; --i) {
            // Create piece
            let piece = newPiece(player, i);
            // Add piece to gamestate
            gamestate.pieces.push(piece);
            // Add piece to drawing layer
            layer.add(piece.sprite);
        }
    };

    return gamestate;
}

// When we resize the document we need to change sizes
function onResizeDocument() {
    let container = document.getElementById("container-container");

    let containerWidth = container.offsetWidth;

    let scale = containerWidth / sceneWidth;
    stage.width(sceneWidth * scale);
    stage.height(sceneHeight * scale);
    stage.scale({x: scale, y: scale});
}

let gamestate;

window.onload = () => {
    let params = new URLSearchParams(window.location.search);

    let names = params.getAll("username");
    console.log(names);

    let players = [];

    for (let i = 0; i < names.length; ++i) {
        players.push({
            name: names[i],
            color: colors[i],
            turnSkip: 0
        })
    }


    // We create a new konva stage
    stage = new Konva.Stage({
        container: 'konva-container',
        width: 500,
        height: 500,
    });

    onResizeDocument();
    
    let pieceLayer = new Konva.Layer();
    gamestate = newGamestate(pieceLayer, players);
    
    // We create our GameBoard and add it to our stage
    let board = createBoard();
    stage.add(board);
    stage.add(pieceLayer);

    console.log(players);


    selectNormalGameMode(players.length);

    for (let piece of gamestate.pieces) {
        updatePieceSpritePosition(piece);
    }

    board.draw();
    pieceLayer.draw();
    updateTurnIndicator();
};

window.onresize = () => {
    onResizeDocument();
};

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

// When the roll button is clicked
function onClickRollDiceButton() {
    let result = rollDice();
    document.getElementById("dice-number").textContent = result;
    document.getElementById("dice-number").className = "";

    console.log(result);

    gamestate.turnState = 'selectToMove';
    gamestate.lastRoll = result;

    
    // Roll-button is disabled after we have rolled
    document.getElementById("roll-button").disabled = true;

    let canMovePiece = false;

    // We iterate through the pieces and check which pieces are of the color of the current turn
    for (let piece of gamestate.pieces) {
        if (piece.player != gamestate.currentPlayer) {
            continue;
        }

        // We check whether the pieces are in "spawn"/"home"
        if (piece.pos.index < 0) {
            // If we roll a 6 we can move pieces that are currently in spawn
            if (result == 1) {
                setPieceMovable(piece, 0);
                canMovePiece = true;
            }
            if (result == 6) {
                setPieceMovable(piece, 3);
                canMovePiece = true;
            }
            continue;
        }
        
        // If the piece is not in spawn we can always move it,
        // as long as it is not in the center
        if (piece.pos.index != 44) {
            let target = Math.min(piece.pos.index + result, 44);
            setPieceMovable(piece, target);
            canMovePiece = true;
        }
    }

    if (!canMovePiece) {
        info(gamestate.currentPlayer.name + " cannot move");
        endTurn();
    }
}

function endMove() {
    removePieceClickListeners();

    document.getElementById("mera-button").disabled = false;
    document.getElementById("end-button").disabled = false;
}

function onClickMeraButton() {
    document.getElementById("mera-button").disabled = true;
    document.getElementById("end-button").disabled = true;
    doRandomMera(() => {
        endTurn();
    });
}

function onClickEndButton() {
    document.getElementById("mera-button").disabled = true;
    document.getElementById("end-button").disabled = true;
    endTurn();
}

function endTurn() {
    removePieceClickListeners();

    for (let piece of gamestate.pieces) {
        if (piece.player != gamestate.currentPlayer) {
            continue;
        }

        if (piece.shield > 0) {
            piece.shield -= 1;
            if (piece.shield == 0) {
                let shield = piece.extraSprites.get("shield");
                shield.destroy();
                piece.extraSprites.delete("shield");
            }
        }
    }

    onEndRound();

    document.getElementById("dice-number").className = "gray";

    if (gamestate.over) {
        showGameOverScreen();
        return;
    }
    nextTurn();
}

function nextTurn() {
    let t = gamestate.currentTurn;
    while (true) {
        t += 1;
        if (t >= gamestate.players.length) {
            t = 0;
        }

        let prospectivePlayer = gamestate.players[t];

        if (prospectivePlayer.turnSkip > 0) {
            prospectivePlayer.turnSkip -= 1;
            info(prospectivePlayer.name + ": turn skipped");
            continue;
        }

        if (prospectivePlayer.active) {
            break;
        }
    }
    gamestate.currentTurn = t;
    gamestate.currentPlayer = gamestate.players[t];
    
    gamestate.turnState = "start";
    document.getElementById("roll-button").disabled = false;
    updateTurnIndicator();
}

function updateTurnIndicator() {
    let turnIndicator = document.getElementById("roll-button");
    turnIndicator.className = gamestate.currentPlayer.color;
}

function showGameOverScreen() {
    let layer = new Konva.Layer();

    let box = new Konva.Rect({
        x: 500,
        y: 500,
        width: 500,
        height: 300,
        fill: 'white',
        stroke: 'black',
    });

    let text = "Game Over\n";

    let index = 0;

    for (let player of gamestate.ranking) {
        console.log(player);
        text += "\n" + ++index + ". " + player.name
    }

    text = new Konva.Text({
        x: 500,
        y: 500,
        text: text,
        fontSize: 30,
        fontFamily: 'Calibri',
        fill: "black",
    });


    let box1 = new Konva.Rect({
        x: 250,
        y: 675,
        width: 225,
        height: 75,
        fill: "white",
        stroke: "black"
    });

    box1.on("click", () => {
        window.location.reload();
    })

    let text1 = new Konva.Text({
        x: 250 + 225/2,
        y: 675 + 75/2,
        text: "Restart",
        fontSize: 30,
        fontFamily: 'Calibri',
        fill: "black",
        listening: false,
    });

    text1.offsetX(text1.width() / 2);
    text1.offsetY(text1.height() / 2);

    let box2 = new Konva.Rect({
        x: 525,
        y: 675,
        width: 225,
        height: 75,
        fill: "white",
        stroke: "black"
    });

    box2.on("click", () => {
        window.location.href = "/";
    })

    let text2 = new Konva.Text({
        x: 525 + 225/2,
        y: 675 + 75/2,
        text: "Back to Main",
        fontSize: 30,
        fontFamily: 'Calibri',
        fill: "black",
        listening: false,
    });

    text2.offsetX(text2.width() / 2);
    text2.offsetY(text2.height() / 2);

    box.offsetX(box.width() / 2);
    box.offsetY(box.height() / 2);
    text.offsetX(text.width() / 2);
    text.offsetY(text.height() / 2);
    layer.add(box);
    layer.add(text);
    layer.add(box1);
    layer.add(text1);
    layer.add(box2);
    layer.add(text2);
    stage.add(layer);
}
