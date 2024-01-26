let stage;

const sceneWidth = 1000;
const sceneHeight = 1000;


// Function that gets the x and y position representing the grid numbers we want
function pos(gridX, gridY) {
    let segmentLength = sceneWidth / 11;
    let x = gridX * segmentLength + segmentLength / 2;
    let y = gridY * segmentLength + segmentLength / 2;

    return {x: x, y: y};
}

// { color: 'red', index: 10 }
// Get the global coordinate from a color-local coordinate.
// The outer rim is numbered 0-39, starting from red's starting cell.
// Each color's inner cells are number 100-104, 200-204 etc, in
// clockwise color order, starting with red.
// Middle is 400.
function colorLocalToGlobal(coord) {
    let color = coord.color;
    let index = coord.index;

    function colorToOffset(color) {
        switch (color) {
            case 'red':
                return 0
            case 'green':
                return 10;
            case 'yellow':
                return 20;
            case 'blue':
                return 30;
            default:
                return 0;
        }
    }

    let offset = colorToOffset(color);

    // When the player is inside one of the outer rim cells
    if (index >= 0 && index < 40) {
        let global = (index + offset) % 40;
        return global;
    }

    // When the player is inside its goal strectch cls
    if (index >= 40 && index < 44) {
        return (offset + 10) * 10 + index - 40;
    }
    
    // When the player is inside the "goal" cell
    if (index == 44) {
        return 500;
    }

    if (index < 0) {
        return -offset + index;
    }
}

function globalToGrid(coord) {
    
    // Grid coordinates for the current map
    let outerRim = [
        [0, 4],
        [1, 4],
        [2, 4],
        [3, 4],
        [4, 4],
        [4, 3],
        [4, 2],
        [4, 1],
        [4, 0],
        [5, 0],
        [6, 0],
        [6, 1],
        [6, 2],
        [6, 3],
        [6, 4],
        [7, 4],
        [8, 4],
        [9, 4],
        [10, 4],
        [10, 5],
        [10, 6],
        [9, 6],
        [8, 6],
        [7, 6],
        [6, 6],
        [6, 7],
        [6, 8],
        [6, 9],
        [6, 10],
        [5, 10],
        [4, 10],
        [4, 9],
        [4, 8],
        [4, 7],
        [4, 6],
        [3, 6],
        [2, 6],
        [1, 6],
        [0, 6],
        [0, 5],
    ];

    // Goal stretches
    let innerRed = [
        [1, 5],
        [2, 5],
        [3, 5],
        [4, 5],
    ];

    let innerGreen = [
        [5, 1],
        [5, 2],
        [5, 3],
        [5, 4],
    ];

    let innerYellow = [
        [9, 5],
        [8, 5],
        [7, 5],
        [6, 5],
    ];

    let innerBlue = [
        [5, 9],
        [5, 8],
        [5, 7],
        [5, 6],
    ];

    // Homes
    let homeRed = [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
    ];

    let homeGreen = [
        [9, 0],
        [9, 1],
        [10, 0],
        [10, 1],
    ];

    let homeYellow = [
        [9, 9],
        [9, 10],
        [10, 9],
        [10, 10],
    ];

    let homeBlue = [
        [0, 9],
        [0, 10],
        [1, 9],
        [1, 10],
    ];


    switch (true) {
        case (coord < -30):
            return homeBlue[-coord - 31];
        case (coord < -20):
            return homeYellow[-coord - 21];
       case (coord < -10):
            return homeGreen[-coord - 11];
        case (coord < 0):
            return homeRed[-coord - 1];
        case (coord < 40):
            return outerRim[coord];
        case (coord < 200):
            return innerRed[coord - 100];
        case (coord < 300):
            return innerGreen[coord - 200];
        case (coord < 400):
            return innerYellow[coord - 300];
        case (coord < 500):
            return innerBlue[coord - 400];
        case (coord == 500):
            return [5, 5];
    }
}

function updatePieceSpritePosition(piece) {
    let globalPos = colorLocalToGlobal(piece.pos);
    let gridPos = globalToGrid(globalPos);
    let {x: x, y: y} = pos(...gridPos);
    piece.sprite.x(x);
    piece.sprite.y(y);
}

function newGamestate(layer) {
    function newPiece(color, index) {
        let piece = {
            color: color,
            pos: { color: color, index: index },
            sprite: new Konva.Rect({
                x: 0,
                y: 0,
                fill: color,
                stroke: 'black',
                strokeWidth: 2,
                width: 20,
                height: 20,
                offsetX: 10,
                offsetY: 10,
            }),
        };

        updatePieceSpritePosition(piece);

        return piece;
    }

    let gamestate = {
        pieces: []
    };

    ["red", "green", "yellow", "blue"].forEach(color => {
        for (let i = -1; i >= -4; --i) {
            // Create piece
            let piece = newPiece(color, i);
            // Add piece to gamestate
            gamestate.pieces.push(piece);
            // Add piece to drawing layer
            layer.add(piece.sprite);
        }
    });

    return gamestate;
}

// When we resize the document we need to change sizes
function onResizeDocument() {
    let body = document.getElementsByTagName("body")[0];

    let containerWidth = body.offsetWidth;

    let scale = containerWidth / sceneWidth;
    stage.width(sceneWidth * scale);
    stage.height(sceneHeight * scale);
    stage.scale({x: scale, y: scale});
}

let gamestate;

window.onload = () => {
   
    // We create a new konva stage
    stage = new Konva.Stage({
        container: 'konva-container',
        width: 500,
        height: 500,
    });

    onResizeDocument();
    
    // We create our GameBoard and add it to our stage
    let board = createBoard();
    stage.add(board);
    
    let pieceLayer = new Konva.Layer();
    stage.add(pieceLayer);
    gamestate = newGamestate(pieceLayer);

    board.draw();
    pieceLayer.draw();
};

window.onresize = () => {
    onResizeDocument();
};


// Function to
function createBoard() {
    let layer = new Konva.Layer();

    // Draw homes

    function drawCircle(x, y, color) {
        layer.add(new Konva.Circle({
            ...pos(x, y),
            radius: sceneWidth / 22 - 5,
            fill: color,
            stroke: 'black',
            strokeWidth: 4,
        }));
    }

    // Function that draws a home for the wanted color and part of the board
    function drawHome(x, y, color) {
        drawCircle(x, y, color);
        drawCircle(x + 1, y, color);
        drawCircle(x, y + 1, color);
        drawCircle(x + 1, y + 1, color);
    }

    // We draw homes for the 4 different players in each respective corner
    drawHome(0, 0, 'red');
    drawHome(9, 0, 'green');
    drawHome(0, 9, 'blue');
    drawHome(9, 9, 'yellow');

    
    // Starting squares
    drawCircle(0, 4, 'red');
    drawCircle(6, 0, 'green');
    drawCircle(10, 6, 'yellow');
    drawCircle(4, 10, 'blue');

    // Outer paths
    
    // Horizontals (skip middle 1)
    for (let i = 0; i < 10; ++i) {
        if (i != 4) {
            drawCircle(i + 1, 4, 'white');
        }
        if (i != 5) {
            drawCircle(i, 6, 'white');
        }
    }

    // Verticals (skip middle 3)
    for (let i = 0; i < 10; ++i) {
        if (i < 4 || i > 6) {
            drawCircle(4, i, 'white');
        }
        if (i < 3 || i > 5) {
            drawCircle(6, i + 1, 'white');
        }
    }

    // Capstones
    drawCircle(0, 5, 'white')
    drawCircle(10, 5, 'white')
    drawCircle(5, 0, 'white')
    drawCircle(5, 10, 'white')

    // Red goal
    for (let i = 1; i < 5 ; ++i) {
        drawCircle(i, 5, "red")
        
    }

    // Yellow goal
    for (let i = 6; i < 10 ; ++i) {
        drawCircle(i, 5, "yellow")
        
    }

    // Green goal
    for (let i = 1; i < 5; ++i) {
        drawCircle(5, i, 'green');
    }

    // Blue goal
    for (let i = 6; i < 10; ++i) {
        drawCircle(5, i, 'blue');
    }

    drawCircle(5, 5, 'black');

    return layer;
}