let WebSocketServer = require("websocket").server;
let http = require("http");
let fs = require("fs");
let url = require("url");
let httpServer;
let clients = [];
let places = [];
let ratings = {};
fs.readFile("./places.json", (err, json) => {
    if (err) {
        throw err;
    }
    places = JSON.parse(json);
});
fs.readFile("./ratings.json", (err, json) => {
    if (err) {
        throw err;
    }
    ratings = JSON.parse(json);
});
httpServer = http.createServer(function (req, res) {
    let request = url.parse(req.url, true);
    let action = request.pathname;
    let extension = action.split(".").pop();
    console.log(extension);
    console.log("[+] Serving " + action);
    try {
        if (extension == "png") {
            let img = fs.readFileSync("." + action);
            res.writeHead(200, { "Content-Type": "image/png" });
            res.end(img, "binary");
        }
        else if (extension == "js") {
            let js = fs.readFileSync("." + action);
            res.writeHead(200, { "Content-Type": "text/javascript" });
            res.write(js);
            res.end();
        }
        else if (extension == "css") {
            let css = fs.readFileSync("." + action);
            res.writeHead(200, { "Content-Type": "text/css" });
            res.write(css);
            res.end();
        }
        else {
            let html = fs.readFileSync("./index.html");
            res.writeHead(200, { "Content-Type": "text/html" });
            res.write(html);
            res.end();
        }
    }
    catch (err) {
        console.log(err);
    }
});
httpServer.listen(8000, function () {
    console.log("[!] Server listening on port 8000...\n");
});
let wsServer = new WebSocketServer({
    httpServer: httpServer
});
wsServer.on("request", (request) => {
    let connection = request.accept(null, request.origin);
    clients.push(connection);
    places.forEach((p) => connection.send(JSON.stringify(p)));
    connection.send(JSON.stringify(ratings));
    console.log(connection.remoteAddress);
    connection.on("message", (msg) => {
        let data = JSON.parse(msg.utf8Data);
        let intent = data.intent;
        if (intent == "submitLocation") {
            clients.forEach(c => c.send(msg.utf8Data));
            places.push(data);
            fs.writeFile("./places.json", JSON.stringify(places), (err) => {
                if (err) {
                    throw err;
                }
            });
        }
        if (intent == "rateLocation") {
            if (ratings[data.name] && ratings[data.name].ratedBy.includes(connection.remoteAdress)) {
                return;
            }
            if (ratings.hasOwnProperty(data.name)) {
                ratings[data.name].currentAvg = ((ratings[data.name].currentAvg * ratings[data.name].totalRatings) + data.starsGiven) / (ratings[data.name].totalRatings + 1);
                ratings[data.name].totalRatings++;
            }
            else {
                ratings[data.name] = {
                    totalRatings: 1,
                    currentAvg: data.starsGiven,
                    ratedBy: [connection.remoteAddress]
                };
            }
            clients.forEach((c) => c.send(JSON.stringify({ location: data.name, rating: ratings[data.name] })));
            fs.writeFile("./ratings.json", JSON.stringify(ratings), (err) => {
                if (err) {
                    throw err;
                }
            });
        }
    });
});
//# sourceMappingURL=servertyped.js.map