declare function require(name: string);
let WebSocketServer = require("websocket").server;
let http = require("http");
let fs = require("fs");
let url = require("url");

interface Place {
    name: string;
    lat: number;
    long: number;
    description: string;
    creator: string;
    type: string;
}

let httpServer;
let clients: any[] = [];
let places: Place[] = [];

fs.readFile("./places.json", (err: string, json: string)=>{
	if(err) {
		throw err;
	}
	places = JSON.parse(json);
});

httpServer = http.createServer(function(req, res){
	let request = url.parse(req.url, true);
	let action: string = request.pathname;
	
	let extension: string = action.split(".").pop();
	console.log(extension);
	console.log("[+] Serving " + action);
	
	if (extension == "png") {
		let img: string = fs.readFileSync("." + action);
		res.writeHead(200, {"Content-Type": "image/png" });
		res.end(img, "binary");
	} else if (extension == "js") {
		let js: string = fs.readFileSync("." + action);
		res.writeHead(200, {"Content-Type": "text/javascript"});
		res.write(js);
		res.end();
	} else if (extension == "css") {
		let css: string = fs.readFileSync("." + action);
		res.writeHead(200, {"Content-Type": "text/css"});
		res.write(css);
		res.end();
	} else { 
		let html: string = fs.readFileSync("./index.html");
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
	clients.push(connection);
	places.forEach(p=>connection.send(JSON.stringify(p)));
	
	connection.on("message", msg=>{
		console.log(msg.utf8Data);
		clients.forEach(c=>c.send(msg.utf8Data));
        places.push(JSON.parse(msg.utf8Data));
		
		fs.writeFile("./places.json", JSON.stringify(places), (err: string)=>{
			if(err) {
				throw err;
			}
		})
	});
});