const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

const port = new SerialPort({ path: 'COM5', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

let lastSaved = 0;
let wasHigh = false;

// Sketch sends: mq135,mq2,temp,humidity
parser.on('data', async (line) => {
  const [mq135, mq2, temp, hum] = line.trim().split(',').map(Number);
  if (isNaN(mq135) || isNaN(mq2)) return;

  const threshold = await db.getThreshold();
  const highMQ135 = mq135 > threshold;
  const highMQ2 = mq2 > threshold;
  const isHigh = highMQ135 || highMQ2;

  io.emit('sensorData', { mq135, mq2, temp, hum, threshold });

  const now = Date.now();
  if (now - lastSaved > 5000) {
    await db.addReading(mq135, mq2, temp, hum);
    lastSaved = now;
  }

  if (isHigh && !wasHigh) {
    if (highMQ135) { await db.addAlert('MQ135', mq135); io.emit('newAlert', { sensor: 'MQ135', value: mq135 }); }
    if (highMQ2)   { await db.addAlert('MQ2', mq2);     io.emit('newAlert', { sensor: 'MQ2', value: mq2 }); }
  }
  wasHigh = isHigh;
});

app.get('/api/history', async (req, res) => {
  const limit = Number(req.query.limit) || 100;
  res.json(await db.getReadings(limit));
});

app.get('/api/settings', async (req, res) => {
  res.json({ threshold: await db.getThreshold() });
});

app.post('/api/settings', async (req, res) => {
  const { threshold } = req.body;
  if (!threshold || isNaN(threshold)) return res.status(400).json({ error: 'Invalid threshold' });
  await db.setThreshold(Number(threshold));
  res.json({ success: true, threshold });
});

app.get('/api/export', async (req, res) => {
  const rows = await db.getReadings(5000);
  let csv = 'id,mq135,mq2,temp,hum,timestamp\n';
  rows.forEach(r => { csv += `${r.id},${r.mq135},${r.mq2},${r.temp},${r.hum},${r.timestamp}\n`; });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sensor_readings.csv');
  res.send(csv);
});

app.get('/api/alerts', async (req, res) => {
  res.json(await db.getAlerts(100));
});

server.listen(3000, () => console.log('Dashboard running at http://localhost:3000'));