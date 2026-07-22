const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const db = require('./database'); // your existing Firestore Admin functions

const port = new SerialPort({ path: 'COM5', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

let lastSaved = 0;
let wasHigh = false;

console.log('Arduino bridge running — reading Serial and writing to Firestore...');

parser.on('data', async (line) => {
  const [ppm, temp, hum] = line.trim().split(',').map(Number);
  if (isNaN(ppm)) return;

  console.log('Reading:', ppm, temp, hum);

  const threshold = await db.getThreshold();
  const isHigh = ppm > threshold;

  const now = Date.now();
  if (now - lastSaved > 5000) {
    await db.addReading(ppm, temp, hum);
    lastSaved = now;
  }

  if (isHigh && !wasHigh) {
    await db.addAlert(ppm);
    console.log('ALERT: High air quality detected!');
  }
  wasHigh = isHigh;
});

port.on('error', (err) => console.error('Serial port error:', err.message));