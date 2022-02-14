const express = require('express');
const SerialPort = require('serialport');
const port = 3003;

const app = express();
const serial = new SerialPort('/dev/ttyUSB0', {baudRate: 9600});

app.post('/send', (req, res) => {
	const command = parseInt(req.query.command);
	serial.write(Buffer.alloc(1, command), (err, result) => {
		if (err) {
			res.status(500).send(err.message);
			return;
		}
		res.send(result);
	});
});

app.listen(port, () => {
	console.log(`App listening on port ${port}`);
});
