// firebase-admin v14 dropped the old `admin.auth()`/`admin.credential.cert()`
// namespace API in favor of these modular imports (the SDK version that
// fixed the uuid vulnerability npm audit flagged — see package.json).
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
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

// Falls back to the project's default bucket name convention when
// FIREBASE_STORAGE_BUCKET isn't set explicitly in .env.
const storageBucket = hasRealCredentials
  ? process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
  : undefined;

let app;
if (hasRealCredentials) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    storageBucket,
  });
} else {
  // Emulators need these env vars set before initializeApp — no service
  // account cert required, the Admin SDK auto-detects the emulator hosts.
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  app = initializeApp({ projectId });
  console.log(`[firebase] No real credentials in .env — using Local Emulator Suite (project "${projectId}"). Run "npm run emulators" first.`);
}

module.exports = {
  auth: getAuth(app),
  db: getFirestore(app),
  // Only real credential setups have a usable Storage bucket — the emulator
  // fallback above never sets `storageBucket`, so `bucket()` would throw.
  bucket: hasRealCredentials ? getStorage(app).bucket() : null,
  usingEmulator: !hasRealCredentials,
};
