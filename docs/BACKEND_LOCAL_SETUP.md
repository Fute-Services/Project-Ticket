# Running the backend locally

`main/backend/.env` ships with placeholder Firebase values (`your_firebase_project_id`, and similar), so there's no real Firebase project's credentials stored in this code repository. Plugging in real ones is the normal path once you have your own Firebase project set up. Until then, the backend runs against the **Firebase Local Emulator Suite** instead (a stand-in version of Firebase that runs on your own computer), with no code changes needed either way.

## How it decides which one to use

`main/backend/config/firebase.js` checks whether the values in `.env` look like real credentials, rather than the `your_...` placeholder text. If they do, it connects to your actual Firebase project. If not, it points the backend at the local stand-in versions of Firestore (the database) and Auth (the login system) running on your own machine, and logs this message:

```
[firebase] No real credentials in .env — using Local Emulator Suite (project "fute-portal-dev"). Run "npm run emulators" first.
```

Everything else (the routes, the controllers that handle each request, login token checks, and role-based permission checks) works exactly the same either way.

## Running it

```bash
cd main/backend
npm install
npm run emulators   # terminal 1: starts the Firestore + Auth stand-ins
npm run dev          # terminal 2: starts the API on port 5000 (use npm start instead if you don't want it to auto-reload on changes)
```

The frontend (the website itself) already points at `http://localhost:5000` by default when running locally, so starting it with `npm run dev` in `main/frontend` will connect to this automatically. You'll get real registration and login instead of the built-in fallback demo accounts.

## Java requirement

The Firestore stand-in needs Java (specifically JDK 21 or newer) installed to run; the tools it depends on no longer support older versions. If your system's Java is older than that (check with `java -version`), running `npm run emulators` will automatically look for a separate, portable copy of Java at `../../.tools/jdk-21.0.12+8` and use that just for this process, leaving whatever Java you already have installed untouched either way.

If that folder doesn't exist on your machine, download a Java 21 zip file (no installer needed, no admin permissions required) from [Adoptium](https://adoptium.net/temurin/releases/?version=21), and unzip it into a folder called `.tools/` at the top of this repository. Alternatively, install Java 21 properly on your system and remove the check for that `.tools/` folder in `run-emulators.js`. Either approach works.

## Switching to a real Firebase project

Fill in the real `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_API_KEY` values in `.env` (you'll find these in your Firebase project's service account settings and its web API key), and you can skip running the emulators entirely. `firebase.js` will detect that the credentials are real and connect directly. No other changes are needed.
