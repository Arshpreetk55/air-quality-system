# 🌫️ Air Quality Monitoring Dashboard

A real-time air quality, temperature, and humidity monitoring system built with an Arduino Uno, Node.js, Firebase Firestore, and a live web dashboard.

## Overview

This project bridges physical IoT hardware (Arduino + MQ135 gas sensor + DHT11 sensor) to a cloud-hosted, publicly viewable dashboard. Sensor readings are streamed from the Arduino over USB serial, written to Firebase Firestore by a local bridge script, and displayed live in the browser using Firestore's real-time listeners — accessible from any device, anywhere.

## Architecture

```
Arduino Uno (MQ135 + DHT11 + LCD + Buzzer + LED)
        │  USB Serial (CSV: ppm,temp,hum)
        ▼
arduino-bridge.js (runs on local PC)
        │  Firebase Admin SDK
        ▼
Firebase Firestore (cloud database)
        │  Firebase Client SDK (real-time listeners)
        ▼
Web Dashboard (public/*.html, deployed on Vercel)
```

**Why this split?** Vercel's serverless functions can't access physical USB/serial ports, so hardware communication must happen on a local machine. The local bridge script only handles Serial → Firestore; the dashboard itself is a static site that reads live data directly from Firestore, so it works independently of whether the local bridge is running at that exact moment.

## Features

- 📊 **Live dashboard** — real-time PPM, temperature, and humidity readings with an auto-scrolling Chart.js line graph
- 🚦 **Status banner** — color-coded GOOD/HIGH air quality indicator
- 🚨 **Multi-channel alerts** — flashing screen border, audible beep, browser push notification, and toast popup when air quality crosses the threshold
- 📈 **History page** — browse past readings over selectable time ranges
- ⚙️ **Settings page** — adjust the air quality alert threshold live, no code changes needed
- 📥 **CSV export** — download all recorded readings
- 🔔 **Alerts log** — timestamped history of every high-air-quality event
- 📱 **PWA support** — installable on mobile home screens with offline-friendly service worker

## Hardware

| Component | Connection |
|---|---|
| Arduino Uno | USB to PC |
| MQ135 Air Quality Sensor | Analog pin A0 |
| DHT11 Temperature/Humidity Sensor | Digital pin 2 |
| I2C LCD (16x2) | SDA/SCL |
| Buzzer | Digital pin 8 |
| LED | Digital pin 9 |

## Tech Stack

- **Firmware:** Arduino (C++), DHT sensor library, LiquidCrystal_I2C
- **Bridge script:** Node.js, `serialport`
- **Database:** Firebase Firestore
- **Frontend:** Vanilla JS, Chart.js, Firebase Client SDK
- **Hosting:** Vercel (static frontend)

## Project Structure

```
air-quality-dashboard/
├── arduino-bridge.js      # Reads Serial data, writes to Firestore (runs locally)
├── database.js            # Firestore Admin SDK helper functions
├── package.json
├── sketch/                # Arduino .ino firmware
└── public/                # Static site deployed to Vercel
    ├── index.html          # Live dashboard
    ├── history.html        # Historical readings
    ├── settings.html       # Threshold configuration + CSV export
    ├── alerts.html         # Alert log
    ├── manifest.json       # PWA manifest
    └── sw.js               # Service worker
```

## Setup

### 1. Firebase project
- Create a Firebase project → enable Firestore (Native mode)
- Generate a service account key for the local bridge (`serviceAccountKey.json`) — **never commit this file**
- Register a Web App to get a client config for the dashboard (safe to expose publicly; protected by Firestore Security Rules)

### 2. Local bridge (on the PC connected to the Arduino)
```bash
npm install
node arduino-bridge.js
```
Update the COM port in `arduino-bridge.js` to match your Arduino's assigned port.

### 3. Frontend
Update the `firebaseConfig` object in each HTML file under `public/` with your Web App config, then deploy the `public/` folder to Vercel.

## Security

Firestore rules restrict all writes to the Admin SDK only — the public dashboard can read live data but cannot modify it:

```
allow read: if true;
allow write: if false;
```

## Status

Actively developed. Current focus: migrating from local JSON storage to Firebase Firestore, and separating the hardware bridge from the publicly hosted dashboard for remote accessibility.
