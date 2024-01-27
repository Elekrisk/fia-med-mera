
function addUsernameInputs(numberOfUsers) {
    let playerDiv = document.getElementById("playerNameSelection");

    document.getElementById("play-button").disabled = false;

    let buttonContainerDiv = document.getElementsByClassName("nrOfPlayerSelection")[0];
    for (let button of buttonContainerDiv.children) {
        button.disabled = false;
    }

    buttonContainerDiv.children[numberOfUsers - 1].disabled = true;

    playerDiv.innerHTML = "";

    for (let i = 0; i < numberOfUsers; i++ ){

        let playerName = document.createElement("div");
        playerName.setAttribute("class", "playerName");

       let playerNameLabel = document.createElement("label");
       playerNameLabel.textContent="Player " + (i+1); 

       let playerNameInput = document.createElement("input");
       playerNameInput.setAttribute("type", "text")
       playerNameInput.setAttribute("id", "player" + i)

       playerName.appendChild(playerNameLabel)
       playerName.appendChild(playerNameInput)

       playerDiv.appendChild(playerName)

    }

}

function playGame() {


    let  playerNames = document.getElementById("playerNameSelection").children;

    let hrefString = "/game.html?"

    for (let playerName of playerNames)
    {
        
        let name = playerName.children[1].value;
        
        hrefString += "username=" + name + "&";
    }

    console.log(hrefString)

    window.location.href = hrefString;





    
}