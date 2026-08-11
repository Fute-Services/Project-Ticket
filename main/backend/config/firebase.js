const admin = require('firebase-admin');
require('dotenv').config();

// Real service-account credentials aren't checked in — the placeholder
// values in .env.example fail Admin SDK's PEM parsing immediately, which
// used to crash the whole server on boot before a single request could be
// served. When no real key is configured, fall back to the Firebase Local
// Emulator Suite (`npm run emulators`) instead of hard-crashing — same
// Admin SDK API, just pointed at localhost, so every controller/route
// works unmodified either way.
const hasRealCredentials =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY &&
  !process.env.FIREBASE_PROJECT_ID.startsWith('your_') &&
  !process.env.FIREBASE_PRIVATE_KEY.startsWith('your_');

const projectId = hasRealCredentials ? process.env.FIREBASE_PROJECT_ID : 'fute-portal-dev';

if (hasRealCredentials) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
} else {
  // Emulators need these env vars set before initializeApp — no service
  // account cert required, the Admin SDK auto-detects the emulator hosts.
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  admin.initializeApp({ projectId });
  console.log(`[firebase] No real credentials in .env — using Local Emulator Suite (project "${projectId}"). Run "npm run emulators" first.`);
}

module.exports = {
  auth: admin.auth(),
  db: admin.firestore(),
  usingEmulator: !hasRealCredentials,
};
