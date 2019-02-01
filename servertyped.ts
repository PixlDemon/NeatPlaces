declare function require(name: string): any;
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
interface Rating {
	totalRatings: number;
	currentAvg: number;
	ratedBy: string[];
}

let httpServer;
let clients: any[] = [];
let places: Place[] = [];
let ratings: any = {};

fs.readFile("./places.json", (err: string, json: string)=>{
	if(err) {
		throw err;
	}
	places = JSON.parse(json);
});
fs.readFile("./ratings.json", (err: string, json: string)=>{
	if(err) {
		throw err;
	}
	ratings = JSON.parse(json);
});

httpServer = http.createServer(function(req: any, res: any){
	let request = url.parse(req.url, true);
	let action: string = request.pathname;
	
	let extension: string = action.split(".").pop();
	console.log(extension);
	console.log("[+] Serving " + action);
	try {
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
	} catch(err) {
		console.log(err);
	}
});
httpServer.listen(8000, function(){
	console.log("[!] Server listening on port 8000...\n");
});

let wsServer = new WebSocketServer({
	httpServer: httpServer
});

wsServer.on("request", (request: any)=>{
	let connection = request.accept(null, request.origin);
	clients.push(connection);
	places.forEach((p: any)=>connection.send(JSON.stringify(p)));
	connection.send(JSON.stringify(ratings));

	console.log(connection.remoteAddress);

	connection.on("message", (msg: any)=>{
		let data = JSON.parse(msg.utf8Data);
		let intent: string = data.intent;
		if(intent == "submitLocation") {
			clients.forEach(c=>c.send(msg.utf8Data));
			places.push(data);
			
			fs.writeFile("./places.json", JSON.stringify(places), (err: string)=>{
				if(err) {
					throw err;
				}
			});
		}
		if(intent == "rateLocation") {
			if(ratings[data.name] && ratings[data.name].ratedBy.includes(connection.remoteAdress)) {
				return;
			}
			if(ratings.hasOwnProperty(data.name)) {
				ratings[data.name].currentAvg = ((ratings[data.name].currentAvg * ratings[data.name].totalRatings) + data.starsGiven) / (ratings[data.name].totalRatings + 1);
				ratings[data.name].totalRatings++;
			} else {
				ratings[data.name] = <Rating>{
					totalRatings: 1,
					currentAvg: data.starsGiven,
					ratedBy: [connection.remoteAddress]
				}
			}
			clients.forEach((c: any) => c.send(JSON.stringify({location: data.name, rating:ratings[data.name]})));
			fs.writeFile("./ratings.json", JSON.stringify(ratings), (err: string)=>{
				if(err) {
					throw err;
				}
			});
		}
	});
});