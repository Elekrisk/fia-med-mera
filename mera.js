
function effect(name, func, cond) {
    return {name: name, func: func, cond: cond};
}

function doRandomMera(cb) {
    let effects = [
        effect("Additional Piece", additionalPiece),
        // effect("Last Won Player Back", addLastWonPlayerBack, "playerHasWon"),
        // effect("Missile! Click to Blast", missile, "enemyHasPiece"),
        // effect("Skip Next Turn", skipNextTurn),
        // effect("Shield! Choose Your Champion", shield, "playerHasPiece"),
        // effect("Random Teleport", teleportLastMoved, "lastPieceExists"),
        // effect("Undo Move", undoMove, "lastPieceExists"),
        // effect("Double Move", doubleMove, "lastPieceExists"),
        // effect("Step Forward", moveForward, "lastPieceExists"),
        // effect("Step Backward", moveBack, "lastPieceExists"),
        effect("Swap Pieces between You and an Enemy!", swapPieces, ["playerHasPiece", "enemyHasPiece", () => 
            gamestate.players.filter(p => p.player == gamestate.currentPlayer && p.pos.index >= 0 && p.pos.index < 40).length > 0 &&
            gamestate.players.filter(p => p.player != gamestate.currentPlayer && p.pos.index >= 0 && p.pos.index < 40).length > 0
        ])
    ];

    while (true) {
        let index = Math.floor(Math.random() * effects.length);
        let chosenEffect = effects[index];

        let valid = true;

        function checkCond(cond) {
            if (typeof cond == "undefined") {
                return true;
            }

            console.log(typeof cond);
            let valid = false;
            if (typeof cond == "object") {
                for (let c of chosenEffect.cond) {
                    valid = valid && checkCond(c);
                }
            } else if (typeof cond == "string") {
                switch (cond) {
                    case "lastPieceExists":
                        valid = gamestate.lastMovedPiece.alive;
                        break;
                    case "playerHasWon":
                        valid = gamestate.ranking.length != 0;
                        break;
                    case "playerHasPiece":
                        valid = gamestate.pieces.filter(p => p.player == gamestate.currentPlayer).length > 0;
                        break;
                    case "enemyHasPiece":
                        valid = gamestate.pieces.filter(p => p.player != gamestate.currentPlayer).length > 0;
                        break;
                    default:
                        break;
                }
            } else {
                valid = cond();
            }
            return valid;
        }

        valid = checkCond(chosenEffect.cond);

        if (!valid) {
            continue;
        }

        info(chosenEffect.name);
        chosenEffect.func(cb);
        break;
    }
}

function additionalPiece(cb) {
    let player = gamestate.currentPlayer;
    let piece = newPiece(player, -1);
    gamestate.pieces.push(piece);
    gamestate.layer.add(piece.sprite);
    movePiece(piece, piece.pos.index, false);
    cb();
}

function addLastWonPlayerBack(cb) {
    if (gamestate.ranking.length == 0) {
        cb();
        return;
    }

    let player = gamestate.ranking.pop();
    player.active = true;
    
    let piece = newPiece(player, -1);
    gamestate.pieces.push(piece);
    gamestate.layer.add(piece.sprite);
    movePiece(piece, piece.pos.index);
    cb();
}

function missile(cb) {
    for (let piece of gamestate.pieces) {
        if (piece.player == gamestate.currentPlayer) {
            continue;
        }

        piece.sprite.on("click", () => {
            launchMissileTo(colorLocalToGlobal(piece.pos), cb);
        });
        piece.sprite.shadowColor("black");
        piece.sprite.shadowBlur(20);
        piece.sprite.shadowOffset({x: 0, y: 0});
        piece.sprite.shadowOpacity(1.0);
    }
}

function launchMissileTo(global, cb) {
    for (let piece of gamestate.pieces) {
        piece.sprite.off("click");
        piece.sprite.shadowOpacity(0.0);
    }

    let poss = {
        red: [0.5, 0.5],
        green: [9.5, 0.5],
        blue: [0.5, 9.5],
        yellow: [9.5, 9.5],
    };

    let [gridX, gridY] = poss[gamestate.currentPlayer.color];

    let [targetX, targetY] = globalToGrid(global);

    let vector = [targetX - gridX, targetY - gridY];
    let len = Math.sqrt(vector[0]*vector[0] + vector[1]*vector[1]);
    let norm = [vector[0] / len, vector[1] / len];

    let points = [norm[0] * 50, norm[1] * 50];

    let missile = new Konva.Arrow({
        ...pos(gridX, gridY),
        points: [0, 0, ...points],
        stroke: "black",
        fill: "black",
        strokeWidth: 10,
    });

    gamestate.layer.add(missile);

    new Konva.Tween({
        node: missile,
        ...pos(targetX, targetY),
        duration: 1,
        easing: Konva.Easings.EaseIn,
        onFinish: () => {
            for (let piece of piecesAt(global)) {
                returnToHome(piece);
            }

            missile.destroy();
            cb();
        }
    }).play();
}

function skipNextTurn(cb) {
    gamestate.currentPlayer.turnSkip += 1;
    cb();
}

function shield(cb) {
    for (let piece of gamestate.pieces) {
        if (piece.player != gamestate.currentPlayer) {
            continue;
        }

        piece.sprite.on("click", () => {
            shieldPiece(piece, cb);
        });
        piece.sprite.shadowColor("black");
        piece.sprite.shadowBlur(20);
        piece.sprite.shadowOffset({x: 0, y: 0});
        piece.sprite.shadowOpacity(1.0);
    }
}

function shieldPiece(piece, cb) {
    piece.shield += 3;
    let shield = new Konva.Circle({
        x: piece.sprite.x(),
        y: piece.sprite.y(),
        radius: 30,
        fill: "lightblue",
        opacity: 0.5,
        listening: false
    });
    piece.extraSprites.set("shield", shield);
    gamestate.layer.add(shield);
    updatePieceSpritePosition(piece);
    cb();
}

function teleportLastMoved(cb) {
    let target = Math.floor(Math.random() * 40);
    movePiece(gamestate.lastMovedPiece, target);
    cb();
}

function undoMove(cb) {
    movePiece(gamestate.lastMovedPiece, gamestate.lastMovedPiece.pos.index - gamestate.lastRoll);
    cb();
}

function doubleMove(cb) {
    movePiece(gamestate.lastMovedPiece, Math.min(gamestate.lastMovedPiece.pos.index + gamestate.lastRoll, 44));
    cb();
}

function moveForward(cb) {
    movePiece(gamestate.lastMovedPiece, Math.min(gamestate.lastMovedPiece.pos.index + 1, 44));
    cb();
}

function moveBack(cb) {
    movePiece(gamestate.lastMovedPiece, gamestate.lastMovedPiece.pos.index - 1);
    cb();
}

function swapPieces(cb) {
    for (let piece of gamestate.pieces) {
        if (piece.player != gamestate.currentPlayer || piece.pos.index < 0 || piece.pos.index >= 40) {
            continue;
        }

        piece.sprite.on("click", () => {
            swapPiecesStepTwo(piece, cb);
        });
        piece.sprite.shadowColor("black");
        piece.sprite.shadowBlur(20);
        piece.sprite.shadowOffset({x: 0, y: 0});
        piece.sprite.shadowOpacity(1.0);
    }
}

function swapPiecesStepTwo(piece, cb) {
    for (let piece of gamestate.pieces) {
        piece.off("click");
        piece.sprite.shadowOpacity(0.0);
    }

    for (let enemyPiece of gamestate.pieces) {
        if (enemyPiece.player == gamestate.currentPlayer || piece.pos.index < 0 || piece.pos.index >= 40) {
            continue;
        }

        enemyPiece.sprite.on("click", () => {
            swapPiecesFinalStep(piece, enemyPiece, cb);
        });
        enemyPiece.sprite.shadowColor("black");
        enemyPiece.sprite.shadowBlur(20);
        enemyPiece.sprite.shadowOffset({x: 0, y: 0});
        enemyPiece.sprite.shadowOpacity(1.0);
    }
}

function swapPiecesFinalStep(piece, enemyPiece, cb) {
    let pos1 = colorLocalToGlobal(piece.pos);
    let pos2 = colorLocalToGlobal(enemyPiece.pos);

    piece.pos.index = -1;
    enemyPiece.pos.index = -1;

    let myNewPos = globalToColorLocal(pos2, piece.player.color);
    let theirNewPos = globalToColorLocal(pos1, enemyPiece.player.color);

    movePiece(piece, myNewPos);
    movePiece(enemyPiece, theirNewPos);
    cb();
}

let infoOffset = 0;

function info(msg) {
    let layer = new Konva.Layer();
    let text = new Konva.Text({
        x: 0,
        y: 200 + infoOffset,
        text: msg,
        fontSize: 30,
        fontFamily: 'Calibri',
        fill: 'black',
    });

    text.x(-text.width() - 50);

    let box = new Konva.Rect({
        x: -text.width() - 75,
        y: 175 + infoOffset,
        width: text.width() + 50,
        height: text.height() + 50,
        fill: "white",
        stroke: "black"
    });
    layer.add(box);
    layer.add(text);
    stage.add(layer);

    new Konva.Tween({
        node: box,
        x: 50,
        duration: 0.25
    }).play();

    new Konva.Tween({
        node: text,
        x: 75,
        duration: 0.25
    }).play();

    setTimeout(() => {
        new Konva.Tween({
            node: box,
            y: -box.height(),
            duration: 0.25
        }).play();
    
        new Konva.Tween({
            node: text,
            y: -box.height() + 25,
            duration: 0.25,
            onFinish: () => {
                layer.destroy();
                infoOffset -= box.height() + 25;
            }
        }).play();
    }, 3000);

    infoOffset += box.height() + 25;
}
