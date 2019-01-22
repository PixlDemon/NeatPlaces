let WebSocketServer = require("websocket").server;
let http = require("http");
let fs = require("fs");
let url = require("url");

let httpServer;
let clients = [];
let places = [];

fs.readFile("./places.json", (err, json)=>{
	if(err) {
		throw err;
	}
	places = JSON.parse(json);
	console.log(typeof(places));
});

fs.readFile("./index.html", (err, html)=>{
    if (err) {
        throw err;
    }       
	httpServer = http.createServer(function(req, res){
		let request = url.parse(req.url, true);
		let action = request.pathname;
	  
		if (action == "/indicator.png" || action == "/map-marker.png") {
		   let img = fs.readFileSync("." + action);
		   res.writeHead(200, {"Content-Type": "image/png" });
		   res.end(img, "binary");
		} else { 
		   res.writeHead(200, {"Content-Type": "text/html" });
		   res.write(html);
		   res.end();
		}
	});
	httpServer.listen(8000, x=>{
		console.log("[!] Server listening on port 8000...\n");
	});

	let wsServer = new WebSocketServer({
		httpServer: httpServer
	});

	wsServer.on("request", (request)=>{
		let connection = request.accept(null, request.origin);
		console.log("[+] New connection from " + connection.origin);
		clients.push(connection);
		places.forEach(p=>connection.send(JSON.stringify(p)));

		connection.on("message", msg=>{
			console.log(msg.utf8Data);
			clients.forEach(c=>c.send(msg.utf8Data));
			places.push(JSON.parse(msg.utf8Data));
			
			fs.writeFile("./places.json", JSON.stringify(places), (err)=>{
				if(err) {
					throw err;
				}
			})
		});
	});
});