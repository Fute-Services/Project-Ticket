const admin = require('firebase-admin');
require('dotenv').config();

// Firebase Admin SDK — full access to Auth + Firestore for backend
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});

module.exports = {
  auth: admin.auth(),
  db: admin.firestore(),
};
