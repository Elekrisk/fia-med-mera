let gamemode;

function selectNormalGameMode(playerCount) {
    gamemode = {
        playerCount: playerCount,
        winCondition: "noPieces",
        rankingStyle: "winOrder",
        centerStyle: "removePiece"
    }
}

function selectKothGameMode(playerCount) {
    gamemode = {
        playerCount: playerCount,
        winCondition: "pointCap",
        rankingStyle: "oneWinner",
        centerStyle: "pointPerPiecePerRound",
        pointCap: 10,
    }
    for (let player of gamestate.players) {
        player.points = 0;
    }
}

function pieceReachedCenter(piece) {
    switch (gamemode.centerStyle) {
        case "removePiece":
            piece.alive = false;
            let index = gamestate.pieces.indexOf(piece);
            if (index > -1) {
                gamestate.pieces.splice(index, 1);
                let tween = new Konva.Tween({
                    node: piece.sprite,
                    rotation: 720,
                    scaleX: 5,
                    scaleY: 5,
                    opacity: 0,
                    duration: 1,
                    easing: Konva.Easings.EaseIn
                });
                tween.play();
                setTimeout(() => piece.sprite.destroy(), 1000);
            }
            break;
        case "pointPerPiecePerRound":
            break;
    }
}

function onEndRound() {
    let player = gamestate.currentPlayer;

    let won;

    if (gamemode.centerStyle == "pointPerPiecePerRound") {
        for (let piece of piecesAt(500)) {
            piece.player.points += 1;
        }
    }

    switch (gamemode.winCondition) {
        case "noPieces":
            won = true;
            for (let piece of gamestate.pieces) {
                if (piece.player == player) {
                    won = false;
                    break;
                }
            }
            break;
        case "pointCap":
            if (player.points >= gamemode.pointCap) {
                won = true;
            }
            break;
    }

    if (won) {
        player.active = false;
        gamestate.ranking.push(player);
        switch (gamemode.rankingStyle) {
            case "winOrder":
                let activePlayers = gamestate.players.filter(p => p.active);
                if (activePlayers.length == 1) {
                    activePlayers[0].active = false;
                    gamestate.ranking.push(activePlayers[0]);
                    gamestate.over = true;
                } else if (activePlayers.length == 0) {
                    gamestate.over = true;
                }
                break;
            case "oneWinner":
                gamestate.over = true;
        }
    }
}