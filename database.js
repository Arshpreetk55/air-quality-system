const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const readingsRef = db.collection('readings');
const alertsRef = db.collection('alerts');
const settingsRef = db.collection('settings').doc('config');

// Single threshold applied to both MQ135 and MQ2 — matches the simple
// two-state (Good / Alert) system used on the dashboard's Live page.
async function getThreshold() {
  const doc = await settingsRef.get();
  return doc.exists ? doc.data().threshold : 250;
}

async function setThreshold(value) {
  await settingsRef.set({ threshold: value }, { merge: true });
}

async function addReading(mq135, mq2, temp, hum) {
  await readingsRef.add({
    mq135, mq2, temp, hum,
    timestamp: FieldValue.serverTimestamp()
  });
}

async function getReadings(limit) {
  const snapshot = await readingsRef.orderBy('timestamp', 'desc').limit(limit).get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      mq135: data.mq135,
      mq2: data.mq2,
      temp: data.temp,
      hum: data.hum,
      timestamp: data.timestamp ? data.timestamp.toDate().toLocaleString() : ''
    };
  }).reverse();
}

// sensor: 'MQ135' or 'MQ2' — records which sensor triggered the alert
async function addAlert(sensor, value) {
  await alertsRef.add({
    sensor, value,
    timestamp: FieldValue.serverTimestamp()
  });
}

async function getAlerts(limit) {
  const snapshot = await alertsRef.orderBy('timestamp', 'desc').limit(limit).get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      sensor: data.sensor,
      value: data.value,
      timestamp: data.timestamp ? data.timestamp.toDate().toLocaleString() : ''
    };
  });
}

module.exports = { getThreshold, setThreshold, addReading, getReadings, addAlert, getAlerts };