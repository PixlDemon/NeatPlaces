var WebSocketServer = require("websocket").server;
var http = require("http");
var fs = require("fs");
var url = require("url");
var httpServer;
var clients = [];
var places = [];
fs.readFile("./places.json", function (err, json) {
    if (err) {
        throw err;
    }
    places = JSON.parse(json);
});
httpServer = http.createServer(function (req, res) {
    var request = url.parse(req.url, true);
    var action = request.pathname;
    var extension = action.split(".").pop();
    console.log(extension);
    console.log("[+] Serving " + action);
    if (extension == "png") {
        var img = fs.readFileSync("." + action);
        res.writeHead(200, { "Content-Type": "image/png" });
        res.end(img, "binary");
    }
    else if (extension == "js") {
        var js = fs.readFileSync("." + action);
        res.writeHead(200, { "Content-Type": "text/javascript" });
        res.write(js);
        res.end();
    }
    else if (extension == "css") {
        var css = fs.readFileSync("." + action);
        res.writeHead(200, { "Content-Type": "text/css" });
        res.write(css);
        res.end();
    }
    else {
        var html = fs.readFileSync("./index.html");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.write(html);
        res.end();
    }
});
httpServer.listen(8000, function (x) {
    console.log("[!] Server listening on port 8000...\n");
});
var wsServer = new WebSocketServer({
    httpServer: httpServer
});
wsServer.on("request", function (request) {
    var connection = request.accept(null, request.origin);
    clients.push(connection);
    places.forEach(function (p) { return connection.send(JSON.stringify(p)); });
    connection.on("message", function (msg) {
        console.log(msg.utf8Data);
        clients.forEach(function (c) { return c.send(msg.utf8Data); });
        places.push(JSON.parse(msg.utf8Data));
        console.log(clients[0]);
        fs.writeFile("./places.json", JSON.stringify(places), function (err) {
            if (err) {
                throw err;
            }
        });
    });
});
