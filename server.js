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

parser.on('data', async (line) => {
  const [ppm, temp, hum] = line.trim().split(',').map(Number);
  if (isNaN(ppm)) return;

  const threshold = await db.getThreshold();
  const isHigh = ppm > threshold;

  io.emit('sensorData', { ppm, temp, hum, threshold });

  const now = Date.now();
  if (now - lastSaved > 5000) {
    await db.addReading(ppm, temp, hum);
    lastSaved = now;
  }

  if (isHigh && !wasHigh) {
    await db.addAlert(ppm);
    io.emit('newAlert', { ppm });
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
  let csv = 'id,ppm,temp,hum,timestamp\n';
  rows.forEach(r => { csv += `${r.id},${r.ppm},${r.temp},${r.hum},${r.timestamp}\n`; });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sensor_readings.csv');
  res.send(csv);
});

app.get('/api/alerts', async (req, res) => {
  res.json(await db.getAlerts(100));
});

server.listen(3000, () => console.log('Dashboard running at http://localhost:3000'));