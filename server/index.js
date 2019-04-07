const express = require("express");
const fs = require("fs");
const app = express();
var https = require("https");
var server = https.createServer({
    key: fs.readFileSync("./private key.pem"),
    cert: fs.readFileSync("./certificate.pem"),
    requestCert: false,
    rejectUnauthorized: false
},app);

server.listen(8080);
const io = require("socket.io")(server);
const path = require("path");

let cacheTimeout = null;
const messageCacheTimeout = 20000;
const serverPort = 8080;

const maxNameLength = "Kyndrajauna".length;
const maxTextLength = 256;

const validCharacters = " abcdefghjijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789!@#$%^&*()-=_+[]{};:'\",./?<>\\";
const validCharacterLookup = {};
validCharacters.split("").forEach(character => validCharacterLookup[character] = true);

const messageBuffer = [];
const cacheMessages = function() {
    let fileData = "";
    messageBuffer.forEach(message => {
        fileData += JSON.stringify(message);
        fileData += "\n";
    });
    fs.writeFile("messages.txt",fileData,() => {
        console.log("Saved message cache to disk (probably)");
    });
}
const loadOldMessages = function(callback) {
    fs.readFile("messages.txt",(error,data) => {
        if(error) {
            console.log(error);
            return;
        }
        data = data.toString();
        if(!data) {
            console.log("Message cache was empty, loaded nothing into the cache");
            callback();
            return;
        }
        const lines = data.toString().split("\n");
        if(!lines.length) {
            console.log("Message cache was empty, loaded nothing into the cache");
            callback();
            return;
        }
        lines.forEach(line => {
            let message;
            let hadError = false;
            try {
                message = JSON.parse(line);
            } catch(exception) {
                console.log(exception);
                hadError = true;
            }
            if(!hadError) {
                const processedMessage = processMessage(message);
                if(processedMessage) {
                    messageBuffer.push(processedMessage);
                } else {
                    console.log("There was an invalid message in the message cache, skipping this one");
                }
            } else {
                console.log("JSON parsing error for a cached message, skipping this one");
            }
        });
        callback();
    });
}
const containsValidCharacters = function(text) {
    for(let character of text) {
        if(!validCharacterLookup[character]) {
            return false;
        }
    }
    return true;
}
const nameIsTooLong = function(name) {
    return name.length > maxNameLength;
}
const textIsTooLong = function(text) {
    return text.length > maxTextLength;
}
const processMessage = function(message) {
    let messageData = typeof message === "object" ? message : null;
    try {
        if(!messageData) {
            messageData = JSON.parse(message);
        }
    } catch(exception) {
        return false;
    }
    if(Object.keys(messageData).length !== 2) {
        return false;
    }
    if(messageData.name && (messageData.name = messageData.name.trim()).length > 0) {
        if(nameIsTooLong(messageData.name)) {
            return false;
        }
        if(!containsValidCharacters(messageData.name)) {
            return false;
        }
    } else {
        return false;
    }
    if(messageData.text && (messageData.text = messageData.text.trim()).length > 0) {
        if(textIsTooLong(messageData.text)) {
            return false;
        }
        if(!containsValidCharacters(messageData.text)) {
            return false;
        }
        return messageData;
    } else {
        return false;
    }
}

app.use("/",express.static(path.join(__dirname,"../web/")));

app.get("/", function(_,response) {
    response.sendFile("index.html");
});
const namespace = io.of("hello-world");
const sendMessageToClients = function(message) {
    namespace.emit("incoming-message",JSON.stringify(message));
    messageBuffer.unshift(message);
    clearTimeout(cacheTimeout);
    cacheTimeout = setTimeout(cacheMessages,messageCacheTimeout);
}
const incomingMessage = function(message) {
    const processedMessage = processMessage(message);
    if(processedMessage) {
        console.log(processedMessage);
        sendMessageToClients(processedMessage);
    } else {
        console.log("Received an invalid message");
    }
}
const handleConnection = function(socket) {
    if(socket.handshake && socket.handshake.address) {
        console.log(socket.handshake.address);
    }
    socket.emit("receive-old-messages",JSON.stringify({
        messages: messageBuffer
    }));
    socket.on("world-message",incomingMessage);
}
namespace.on("connection",handleConnection);

loadOldMessages(() => {server.listen(serverPort)});
