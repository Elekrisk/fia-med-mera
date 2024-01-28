
function newPiece(player, index) {
    let piece = {
        player: player,
        pos: { color: player.color, index: index },
        sprite: new Konva.Rect({
            x: 0,
            y: 0,
            fill: player.color,
            stroke: 'black',
            strokeWidth: 2,
            width: 20,
            height: 20,
            offsetX: 10,
            offsetY: 10,
        }),
        extraSprites: new Map(),
        shield: 0,
        alive: true,
    };
    return piece;
}

function setPieceMovable(piece, targetPosition) {
    let layer;

    piece.sprite.on("click", () => {
        movePiece(piece, targetPosition);
        gamestate.lastMovedPiece = piece;

        layer.destroy();
        endMove();
    });

    piece.sprite.on("mouseenter", () => {
        layer = new Konva.Layer();

        let points = [];

        if (piece.pos.index < 0) {
            let global1 = colorLocalToGlobal(piece.pos);
            let [gridX1, gridY1] = globalToGrid(global1);
            let {x: x1, y: y1} = pos(gridX1, gridY1);
            let global2 = colorLocalToGlobal({ color: piece.player.color, index: targetPosition });
            let [gridX2, gridY2] = globalToGrid(global2);
            let {x: x2, y: y2} = pos(gridX2, gridY2);
            points = [x1, y1, x2, y2];
        } else {
            for (let index = piece.pos.index; index <= targetPosition; ++index) {
                let global = colorLocalToGlobal({ color: piece.player.color, index: index });
                let [gridX, gridY] = globalToGrid(global);
                let {x: x, y: y} = pos(gridX, gridY);
    
                points.push(x);
                points.push(y);
            }
        }

        let line = new Konva.Line({
            points: points,
            stroke: "black",
            strokeWidth: 2,
            lineCap: 'round',
            lineJoin: 'round',
            listening: false
        });

        layer.add(line);
        stage.add(layer);
        layer.moveDown();
        layer.draw();

        piece.predictionLayer = layer;
    });

    piece.sprite.on("mouseleave", () => {
        layer.destroy();
    })
    
    piece.sprite.shadowColor('black');
    piece.sprite.shadowBlur(10);
    piece.sprite.shadowOffset({x: 0, y: 0});
    piece.sprite.shadowOpacity(1.0);
}

function unsetPieceMovable(piece) {
    piece.sprite.off("click");
    piece.sprite.off("mouseenter");
    piece.sprite.off("mouseleave");
    piece.sprite.shadowOpacity(0);
}

function removePieceClickListeners() {
    for (let piece of gamestate.pieces) {
        unsetPieceMovable(piece);
    }
}

function piecesAt(global) {
    let result = [];
    for (let piece of gamestate.pieces) {
        if (colorLocalToGlobal(piece.pos) == global) {
            result.push(piece);
        }
    }
    return result;
}

function movePiece(piece, target, knock = true, easing = Konva.Easings.EaseIn) {
    let orig = colorLocalToGlobal(piece.pos);
    let global = colorLocalToGlobal({ color: piece.player.color, index: target });

    if (knock) {
        for (let p of piecesAt(global)) {
            if (p.player != piece.player) {
                returnToHome(p, 250);
            }
        }
    }

    piece.pos.index = target;

    for (let piece of piecesAt(orig)) {
        updatePieceSpritePosition(piece, easing);
    }
    for (let piece of piecesAt(global)) {
        updatePieceSpritePosition(piece, easing);
    }

    if (global == 500) {
        pieceReachedCenter(piece);
    }
}

function returnToHome(piece, delay) {
    if (piece.shield > 0) {
        return;
    }

    let pos = piece.pos;

    for (let i = -1; i >= -4; --i) {
        if (i == -4 || piecesAt(colorLocalToGlobal({ color: piece.player.color, index: i })).length == 0) {
            if (!delay) {
                movePiece(piece, i, false, Konva.Easings.EaseOut);
            } else {
                setTimeout(() => movePiece(piece, i, false, Konva.Easings.EaseOut), delay);
            }
            break;
        }
    }
}

function updatePieceSpritePosition(piece, easing = Konva.Easings.EaseIn) {
    let globalPos = colorLocalToGlobal(piece.pos);

    let pieces = piecesAt(globalPos);

    let offsetX = 0;
    let offsetY = 0;

    if (pieces.length > 1) {
        let angle = 2*Math.PI / pieces.length;
        let startAngle = 0;
        if (pieces.length == 2) {
            startAngle = Math.PI / 2;
        } else if (pieces.length == 4) {
            startAngle = Math.PI / 4;
        }
        
        let index = pieces.indexOf(piece);

        angle *= index;

        offsetX = 15 * Math.sin(angle);
        offsetY = 15 * Math.cos(angle);
    }


    let gridPos = globalToGrid(globalPos);
    let {x: x, y: y} = pos(...gridPos);
    // piece.sprite.x(x + offsetX);
    // piece.sprite.y(y + offsetY);

    let tween = new Konva.Tween({
        node: piece.sprite,
        duration: 0.25,
        x: x + offsetX,
        y: y + offsetY,
        easing: easing,
    });

    tween.play();

    for (let [key, value] of piece.extraSprites) {
        new Konva.Tween({
            node: value,
            duration: 0.25,
            x: x + offsetX,
            y: y + offsetY,
            easing: easing,
        }).play();
    }
}
