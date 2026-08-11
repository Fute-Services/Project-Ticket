# Running the backend locally

`main/backend/.env` ships with placeholder Firebase values (`your_firebase_project_id`, etc.) — there's no real Firebase project's credentials checked into the repo. Plugging real ones in is the normal path once you have a project; until then, the backend runs against the **Firebase Local Emulator Suite** instead, with zero code changes needed either way.

## How it decides which one to use

`main/backend/config/firebase.js` checks whether `.env`'s Firebase values look real (not `your_...` placeholders). If they do, it connects to your actual Firebase project. If not, it points the Admin SDK at `localhost:8080` (Firestore) and `localhost:9099` (Auth) and logs:

```
[firebase] No real credentials in .env — using Local Emulator Suite (project "fute-portal-dev"). Run "npm run emulators" first.
```

Everything else — routes, controllers, JWT auth, role middleware — works identically against either.

## Running it

```bash
cd main/backend
npm install
npm run emulators   # terminal 1 — starts Firestore + Auth emulators
npm run dev          # terminal 2 — starts the API on :5000 (npm start for no auto-reload)
```

The frontend already points at `http://localhost:5000` in dev by default (`VITE_API_BASE_URL`), so `npm run dev` in `main/frontend` will hit this automatically — real register/login instead of the `dummyAuth.js` fallback.

## Java requirement

The Firestore emulator needs a JDK 21+ runtime; firebase-tools no longer supports older versions. If your system Java is older (check `java -version`), `npm run emulators` (`run-emulators.js`) automatically looks for a portable JDK at `../../.tools/jdk-21.0.12+8` and uses it just for the emulator process — your system Java install is untouched either way.

If that folder doesn't exist on your machine, grab a JDK 21 zip (no installer, no admin rights needed) from [Adoptium](https://adoptium.net/temurin/releases/?version=21), extract it to `.tools/` at the repo root, or install a system-wide JDK 21 and delete the `.tools/` check in `run-emulators.js` — either works.

## Switching to a real Firebase project

Fill in the real `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` / `FIREBASE_API_KEY` values in `.env` (from your Firebase project's service account + web API key) and skip `npm run emulators` entirely — `firebase.js` detects the real credentials and connects directly, no other changes needed.
