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

async function getThreshold() {
  const doc = await settingsRef.get();
  return doc.exists ? doc.data().threshold : 250;
}

async function setThreshold(value) {
  await settingsRef.set({ threshold: value }, { merge: true });
}

async function addReading(ppm, temp, hum) {
  await readingsRef.add({
    ppm, temp, hum,
    timestamp: FieldValue.serverTimestamp()
  });
}

async function getReadings(limit) {
  const snapshot = await readingsRef.orderBy('timestamp', 'desc').limit(limit).get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ppm: data.ppm,
      temp: data.temp,
      hum: data.hum,
      timestamp: data.timestamp ? data.timestamp.toDate().toLocaleString() : ''
    };
  }).reverse();
}

async function addAlert(ppm) {
  await alertsRef.add({
    ppm,
    timestamp: FieldValue.serverTimestamp()
  });
}

async function getAlerts(limit) {
  const snapshot = await alertsRef.orderBy('timestamp', 'desc').limit(limit).get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ppm: data.ppm,
      timestamp: data.timestamp ? data.timestamp.toDate().toLocaleString() : ''
    };
  });
}

module.exports = { getThreshold, setThreshold, addReading, getReadings, addAlert, getAlerts };