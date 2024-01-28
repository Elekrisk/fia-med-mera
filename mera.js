let uilayer;

function effect(name, func, cond) {
    return {name: name, func: func, cond: cond};
}

function doRandomMera(cb) {
    let effects = [
        effect("Additional Piece", additionalPiece),
        effect("Last Won Player Back", addLastWonPlayerBack, ["playerHasWon", "playerHasNoPieces"]),
        effect("Missile! Click to Blast", missile, "enemyHasPiece"),
        effect("Skip Next Turn", skipNextTurn, "playerHasPiece"),
        effect("Shield! Choose Your Champion", shield, "playerHasPiece"),
        effect("Random Teleport", teleportLastMoved, "lastPieceExists"),
        effect("Undo Move", undoMove, "lastPieceExists"),
        effect("Double Move", doubleMove, "lastPieceExists"),
        effect("Triple Move!", tripleMove, "lastPieceExists"),
        effect("Step Forward", moveForward, "lastPieceExists"),
        effect("Step Backward", moveBack, "lastPieceExists"),
        effect("Swap Pieces between You and an Enemy!", swapPieces, ["playerHasPiece", "enemyHasPiece", () => 
            gamestate.pieces.filter(p => p.player == gamestate.currentPlayer && p.pos.index >= 0 && p.pos.index < 40).length > 0 &&
            gamestate.pieces.filter(p => p.player != gamestate.currentPlayer && p.pos.index >= 0 && p.pos.index < 40).length > 0
        ]),
        effect("AK-47! Blast in a Line", ak47, "lastPieceExists")
    ];

    let tries = 0;

    while (true) {
        if (tries > 100 || effects.length == 0) {
            info("No effect");
            break;
        }
        tries += 1;
        let index = Math.floor(Math.random() * effects.length);
        let chosenEffect = effects[index];

        let valid = true;

        function checkCond(cond) {
            if (typeof cond == "undefined") {
                return true;
            }

            console.log(typeof cond);
            let valid = true;
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
                    case "playerHasNoPieces":
                        valid = gamestate.pieces.filter(p => p.player == gamestate.currentPlayer).length == 0;
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

function tripleMove(cb) {
    movePiece(gamestate.lastMovedPiece, Math.min(gamestate.lastMovedPiece.pos.index + gamestate.lastRoll * 2, 44));
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
        piece.sprite.off("click");
        piece.sprite.shadowOpacity(0.0);
    }

    for (let enemyPiece of gamestate.pieces) {
        if (enemyPiece.player == gamestate.currentPlayer || enemyPiece.pos.index < 0 || enemyPiece.pos.index >= 40) {
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

function ak47(cb) {
    if (uilayer == undefined) {
        uilayer = new Konva.Layer();
        stage.add(uilayer);
    }

    let piece = gamestate.lastMovedPiece;
    let {x: x, y: y} = pos(...globalToGrid(colorLocalToGlobal(piece.pos)));

    let group = new Konva.Group({
        x: x,
        y: y,
    });

    let button_left = new Konva.Rect({
        x: -30,
        y: 0,
        width: 30,
        height: 30,
        offsetX: 15,
        offsetY: 15,
        fill: "white",
        stroke: "black",
    });

    let arrow_left = new Konva.Arrow({
        x: -30,
        y: 0,
        points: [10, 0, -10, 0],
        stroke: "black",
        fill: "black",
        listening: false
    });

    let button_right = new Konva.Rect({
        x: 30,
        y: 0,
        width: 30,
        height: 30,
        offsetX: 15,
        offsetY: 15,
        fill: "white",
        stroke: "black",
    });

    let arrow_right = new Konva.Arrow({
        x: 30,
        y: 0,
        points: [-10, 0, 10, 0],
        stroke: "black",
        fill: "black",
        listening: false
    });

    let button_up = new Konva.Rect({
        x: 0,
        y: -30,
        width: 30,
        height: 30,
        offsetX: 15,
        offsetY: 15,
        fill: "white",
        stroke: "black",
    });

    let arrow_up = new Konva.Arrow({
        x: 0,
        y: -30,
        points: [0, 10, 0, -10],
        stroke: "black",
        fill: "black",
        listening: false
    });

    let button_down = new Konva.Rect({
        x: 0,
        y: 30,
        width: 30,
        height: 30,
        offsetX: 15,
        offsetY: 15,
        fill: "white",
        stroke: "black",
    });

    let arrow_down = new Konva.Arrow({
        x: 0,
        y: 30,
        points: [0, -10, 0, 10],
        stroke: "black",
        fill: "black",
        listening: false
    });

    group.add(button_left);
    group.add(arrow_left);
    group.add(button_right);
    group.add(arrow_right);
    group.add(button_up);
    group.add(arrow_up);
    group.add(button_down);
    group.add(arrow_down);

    button_left.on("click", () => ak47stepTwo(piece, "left", group, cb));
    button_right.on("click", () => ak47stepTwo(piece, "right", group, cb));
    button_up.on("click", () => ak47stepTwo(piece, "up", group, cb));
    button_down.on("click", () => ak47stepTwo(piece, "down", group, cb));

    uilayer.add(group);
}

function ak47stepTwo(piece, direction, group, cb) {
    group.destroy();

    let [tx, ty] = globalToGrid(colorLocalToGlobal(piece.pos));
    
    let cond;
    switch (direction) {
        case "left":
            cond = ([x, y]) => y == ty && x < tx;
            break;
        case "right":
            cond = ([x, y]) => y == ty && x > tx;
            break;
        case "up":
            cond = ([x, y]) => x == tx && y < ty;
            break;
        case "down":
            cond = ([x, y]) => x == tx && y > ty;
            break;
    }

    let pieces = [];

    for (let piece of gamestate.pieces) {
        if (cond(globalToGrid(colorLocalToGlobal(piece.pos)))) {
            pieces.push(piece);
        }
    }

    let {x:x, y:y} = pos(tx, ty);

    let targetX = x;
    let targetY = y;

    switch (direction) {
        case "left":
            targetX = x - 1000;
            break;
        case "right":
            targetX = x + 1000;
            break;
        case "up":
            targetY = y - 1000;
            break;
        case "down":
            targetY = y + 1000;
            break;
    }

    for (let i = 0; i < 10; ++i) {
        setTimeout(() => {
            let shot = new Konva.Text({
                x: x,
                y: y,
                text: "BAM",
                fontSize: 15,
                fontFamily: 'Calibri',
                fontStyle: 'bold',
                fill: 'black',
            });
            gamestate.layer.add(shot);
            new Konva.Tween({
                node: shot,
                x: targetX + (Math.random() - 0.5) * 100,
                y: targetY + (Math.random() - 0.5) * 100,
                duration: 1,
                onFinish: () => {
                    shot.destroy();
                }
            }).play();
        }, i * 100);
    }

    for (let piece of pieces) {
        let [px, py] = globalToGrid(colorLocalToGlobal(piece.pos));
        let dist = Math.abs(tx - px) + Math.abs(ty - py);
        setTimeout(() => {
            returnToHome(piece);
        }, (1000 / 11) * dist);
    }

    setTimeout(cb, 1000);
}

let infoBoxes = [];
let infoOffset = 25;

function info(msg) {
    if (uilayer == undefined) {
        uilayer = new Konva.Layer();
        stage.add(uilayer);
    }
    let text = new Konva.Text({
        x: 25,
        y: 25,
        text: msg,
        fontSize: 30,
        fontFamily: 'Calibri',
        fill: 'black',
    });

    let box = new Konva.Rect({
        x: 0,
        y: 0,
        width: text.width() + 50,
        height: text.height() + 50,
        fill: "white",
        stroke: "black"
    });

    let msgGroup = new Konva.Group({
        x: -box.width(),
        y: infoOffset,
    });

    msgGroup.add(box);
    msgGroup.add(text);

    uilayer.add(msgGroup);
    infoBoxes.push(msgGroup);

    let offset = box.height() + 25;

    new Konva.Tween({
        node: msgGroup,
        x: 25,
        duration: 0.25
    }).play();

    setTimeout(() => {
        new Konva.Tween({
            node: msgGroup,
            y: -box.height(),
            duration: 0.25,
            onFinish: () => {
                let index = infoBoxes.indexOf(msgGroup);
                infoBoxes.splice(index, 1);
                console.log(msgGroup.y());
                console.log(box.height());
                msgGroup.destroy();
            }
        }).play();
        
        infoOffset -= offset;

        for (let infoBox of infoBoxes) {
            if (infoBox == msgGroup) {
                continue;
            }
            new Konva.Tween({
                node: infoBox,
                y: infoBox.y() - offset,
                duration: 0.25,
            }).play();
        }
    }, 3000);

    infoOffset += offset;
}
