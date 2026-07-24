const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const db = require('./database'); // your existing Firestore Admin functions

const port = new SerialPort({ path: 'COM5', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

let lastSaved = 0;
let wasHigh = false;

console.log('Arduino bridge running — reading Serial and writing to Firestore...');

// Sketch sends: mq135,mq2,temp,humidity
parser.on('data', async (line) => {
  const [mq135, mq2, temp, hum] = line.trim().split(',').map(Number);
  if (isNaN(mq135) || isNaN(mq2)) return;

  console.log('Reading:', mq135, mq2, temp, hum);

  const threshold = await db.getThreshold();
  const highMQ135 = mq135 > threshold;
  const highMQ2 = mq2 > threshold;
  const isHigh = highMQ135 || highMQ2;

  const now = Date.now();
  if (now - lastSaved > 5000) {
    await db.addReading(mq135, mq2, temp, hum);
    lastSaved = now;
  }

  if (isHigh && !wasHigh) {
    if (highMQ135) await db.addAlert('MQ135', mq135);
    if (highMQ2) await db.addAlert('MQ2', mq2);
    console.log('ALERT: High air quality detected!');
  }
  wasHigh = isHigh;
});

port.on('error', (err) => console.error('Serial port error:', err.message));