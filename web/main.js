const sendButton = document.getElementById("send-button");
const textInput = document.getElementById("text-input");
const messageContainer = document.getElementById("messages");

let name = localStorage.getItem("name") || "Bob";
localStorage.setItem("name",name);
const validateName = function(name) {
    if(name.length > maxNameLength) {
        alert("Your name is too long");
        return false;
    }
    for(let character of name) {
        if(!validCharacterLookup[character]) {
            alert(`Names cannot contain the character '${character}'`);
            return false;
        }
    }
    name = name.trim();
    if(!name) {
        alert("You cannot not have a name");
        return false;
    }
    return name;
}
const getMyName = function() {
    return name;
}
const changeName = function() {
    const newName = prompt("What do you want your new name to be?",name);
    if(!newName) {
        return;
    }
    const validatedName = validateName(newName);
    if(validatedName) {
        name = validatedName;
        localStorage.setItem("name",validatedName);
    }
}
const addMessageToInterface = function(message) {
    const messageElement = document.createElement("div");
    messageElement.className = "message";
    const titleElement = document.createElement("p");
    titleElement.className = "message-title";
    const textElement = document.createElement("p");
    textElement.className = "message-text";
    titleElement.appendChild(document.createTextNode(
        `message from ${message.name}`
    ));
    textElement.appendChild(document.createTextNode(
        message.text
    ));
    messageElement.appendChild(titleElement);
    messageElement.appendChild(textElement);
    messageContainer.prepend(messageElement);
}
const socket = io.connect("/hello-world");

socket.on("incoming-message", function(data) {
    const message = JSON.parse(data);
    addMessageToInterface(message);
});
socket.on("receive-old-messages", function(data) {
    while(messageContainer.lastChild) {
        messageContainer.removeChild(messageContainer.lastChild);
    }
    const messages = JSON.parse(data).messages;
    messages.reverse().forEach(addMessageToInterface);
});
const sendMessageToServer = function(message) {
    socket.emit("world-message",JSON.stringify(message));
}

const maxNameLength = "Kyndrajauna".length;
const maxTextLength = 256;
const validCharacters = " abcdefghjijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789!@#$%^&*()-=_+[]{};:'\",./?<>\\";
const validCharacterLookup = {};
validCharacters.split("").forEach(character => validCharacterLookup[character] = true);
const textLengthErrorMessage = `Text length cannot be greater than ${maxNameLength} character${maxNameLength===1?"":"s"}`;

const sendMessage = function() {
    const text = textInput.value.trim();
    if(text) {
        if(text.length > maxTextLength) {
            alert(textLengthErrorMessage);
            return;
        }
        for(let character of text) {
            if(!validCharacterLookup[character]) {
                alert(`Text cannot contain the character '${character}'`);
                return;
            }
        }
        const name = getMyName();
        if(!name) {
            alert("You must have a name to send a message");
            return;
        }
        textInput.value = "";
        sendMessageToServer({
            name: name,
            text: text
        });
    } else {
        alert("Empty text cannot be sent");
    }
}

sendButton.onclick = sendMessage;

textInput.onkeydown = function(event) {
    if(event.key === "Enter") {
        sendMessage();
        event.preventDefault();
    }
}
