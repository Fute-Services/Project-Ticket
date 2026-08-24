const express = require('express');
const cors = require('cors');
require('dotenv').config();
// Patches Express 4's router so a rejected promise thrown inside any async
// route handler is forwarded to the error-handling middleware below instead
// of leaving the request hanging with no response — must load before any
// routes are required.
require('express-async-errors');

// Without this, a missing JWT_SECRET started the server successfully and
// only surfaced on the first login attempt (jwt.sign throwing inside the
// request handler) — a config mistake turning into a production incident
// instead of a failed deploy/CI smoke check. Firebase creds already have
// their own check (config/firebase.js falls back to the emulator); this is
// the one required secret with no safe fallback.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}

const { db, usingEmulator } = require('./config/firebase');

const app = express();

// Only the app's own known frontend origins may call this API cross-origin
// — it handles real employee PII, so an unrestricted `cors()` default is
// too wide. FRONTEND_URL lets the deployed origin be set without a
// redeploy; localhost stays allowed for local dev regardless of env.
// maxAge caches the browser's preflight (OPTIONS) response so it isn't
// re-sent before every single polled request — without it, each poll tick
// costs two round trips (OPTIONS + the real call) instead of one.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://project-ticket-plum.vercel.app',
].filter(Boolean);
// Vite picks the next free port when 5173 is taken (5174, 5178, ...), so
// match any localhost port in dev rather than hardcoding one.
const isLocalhost = (origin) => /^http:\/\/localhost:\d+$/.test(origin);
app.use(cors({
  origin(origin, callback) {
    // No Origin header (curl, server-to-server, same-origin) — allow.
    if (!origin || allowedOrigins.includes(origin) || isLocalhost(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  maxAge: 600,
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/hr', require('./routes/hrRoutes'));
app.use('/api/it', require('./routes/itRoutes'));
app.use('/api/founder', require('./routes/founderRoutes'));
app.use('/api/founder/security', require('./routes/securityRoutes'));
app.use('/api/approvals', require('./routes/approvalRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));
app.use('/api/coordinator', require('./routes/coordinatorRoutes'));
app.use('/api/production/renders', require('./routes/renderRoutes'));
app.use('/api/hr-desk', require('./routes/hrDeskRoutes'));

app.get('/', (req, res) => res.json({ message: 'Fute Portal API running' }));

// GET /healthz — unlike '/' above, this actually reaches Firestore, so an
// orchestrator can tell "process is up" apart from "the database it depends
// on is reachable" instead of treating a wedged Firestore connection as healthy.
app.get('/healthz', async (req, res) => {
  const start = Date.now();
  try {
    await db.collection('users').limit(1).get();
    res.json({ status: 'ok', firestore: 'reachable', pingMs: Date.now() - start, usingEmulator });
  } catch (err) {
    res.status(503).json({ status: 'error', firestore: 'unreachable', error: err.message });
  }
});

// Catch-all — with express-async-errors, this now also receives rejected
// promises from any async route handler, not just synchronous throws.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || (err.message === 'Not allowed by CORS' ? 403 : 500);
  // Controllers that intentionally throw Object.assign(new Error(...), {status})
  // want that message shown to the client. Anything else is an unexpected
  // error (Firestore/driver internals, TypeErrors, etc.) whose raw message
  // could leak internal details — send a generic message for those instead,
  // the real error is already logged above.
  const message = err.status ? err.message : (status === 403 ? err.message : 'Internal server error');
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  // Without this, a rolling deploy/restart hard-kills in-flight requests
  // instead of letting them finish — server.close() stops accepting new
  // connections but lets existing ones complete first.
  function shutdown(signal) {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
    // Don't hang forever if a connection never closes on its own.
    setTimeout(() => process.exit(1), 10_000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
