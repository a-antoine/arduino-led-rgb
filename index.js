const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const SerialPort = require("serialport");

const maxR = 50;
const maxG = 252;
const maxB = 235;

let currentH = 0;
let currentS = 0;
let currentV = 0;

let fadeLoopContinue = true;


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server});

app.use(express.static("public"));

app.get("/fade/start", (req, res) => {
	fadeLoopContinue = true;
	fadeMorning();
	res.send("OK");
});

app.get("/fade/stop", (req, res) => {
	fadeLoopContinue = false;
	setRGB(0, 0, 0);
	res.send("OK");
});

wss.on("connection", (ws) => {

	ws.isAlive = true;

    ws.on('pong', () => {
        ws.isAlive = true;
	});

    ws.on("message", (message) => {
		const color = message.split(" ");
		const h = parseFloat(color[0]);
		const s = parseFloat(color[1]);
		const v = parseFloat(color[2]);
		currentH = h;
		currentS = s;
		currentV = v;
		const {r, g, b} = HSVtoRGB(h, s, v);
		setRGB(r, g, b);
		wss.clients.forEach(function each(client) {
			if (client !== ws && client.readyState === WebSocket.OPEN) {
			  client.send(h + " " + s + " " + v);
			}
		});
    });

    ws.send(currentH + " " + currentS + " " + currentV);
});

server.listen(process.env.PORT || 3001, () => {
    console.log('Server started on port ' + server.address().port);
});

setInterval(() => {
    wss.clients.forEach((ws) => {

        if (!ws.isAlive) return ws.terminate();

        ws.isAlive = false;
        ws.ping(null, false, true);
    });
}, 10000);


const port = new SerialPort("/dev/ttyUSB0", {
	baudRate: 115200
});

port.on('data', function (data) {

	const str = data.toString('utf-8');
	process.stdout.write(str);
	if (str === "Pret.\r\n") {
		// fade2Loop();
	}
});

port.on('error', function (err) {
  console.log('Error: ', err.message);
});


if (process.platform === "win32") {
	var rl = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.on("SIGINT", function () {
		process.emit("SIGINT");
	});
}

process.on("SIGINT", async function () {
	console.log("Exit");
	fadeLoopContinue = false;
	await delay(200);
	setRGB(0, 0, 0);
	await delay(200);
	process.exit();
});


async function fadeLoop () {
	loop:
	while (true) {
		for (let i = 0; i <= 255; i++) {
			if (!fadeLoopContinue) {
				break loop;
			}
			setRGB(i, i, i);
			await delay(5);
		}
		for (let i = 255; i >= 0; i--) {
			if (!fadeLoopContinue) {
				break loop;
			}
			setRGB(i, i, i);
			await delay(5);
		}
	}
}

async function fade2Loop () {
	loop:
	while (true) {
		for (let i = 0; i < 1; i+=0.01) {
			if (!fadeLoopContinue) {
				break loop;
			}
			const {r, g, b} = HSVtoRGB(i, 1, 0.2);
			setRGB(r, g, b);
			await delay(30);
		}
	}
}

async function fadeMorning () {
	loop:
	while (true) {
		for (let i = 0.05; i <= 0.15; i+= 0.001) {
			if (!fadeLoopContinue) {
				break loop;
			}
			const {r, g, b} = HSVtoRGB(0.1, 1, i);
			setRGB(r, g, b);
			await delay(250);
		}
		for (let i = 0.15; i >= 0.05; i-=0.001) {
			if (!fadeLoopContinue) {
				break loop;
			}
			const {r, g, b} = HSVtoRGB(0.1, 1, i);
			setRGB(r, g, b);
			await delay(250);
		}
	}
}

function setRGB (r, g, b) {
	r = Math.min(Math.max(parseInt(r), 0), 255);
	g = Math.min(Math.max(parseInt(g), 0), 255);
	b = Math.min(Math.max(parseInt(b), 0), 255);

	r = parseInt(r * (maxR / 255));
	g = parseInt(g * (maxG / 255));
	b = parseInt(b * (maxB / 255));

	port.write(r + " " + g + " " + b + "\n", function(err) {
		if (err) {
			console.error("Error on write: ", err.message);
		}
	});
}

function HSVtoRGB (h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
	}
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

const delay = ms => new Promise(res => setTimeout(res, ms));
