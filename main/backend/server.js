const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();
// Patches Express 4's router so a rejected promise thrown inside any async
// route handler is forwarded to the error-handling middleware below instead
// of leaving the request hanging with no response — must load before any
// routes are required.
require('express-async-errors');

// Without this, a missing JWT_SECRET started the server successfully and
// only surfaced on the first login attempt (jwt.sign throwing inside the
// request handler) — a config mistake turning into a production incident
// instead of a failed deploy/CI smoke check.
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}

const { db } = require('./config/db');
const { ok, fail } = require('./utils/respond');
const csrfMiddleware = require('./middleware/csrfMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Vercel terminates TLS and proxies every request through one internal hop,
// setting X-Forwarded-For to the real client IP. Without this, Express falls
// back to the raw socket address — identical for every visitor behind the
// proxy — so express-rate-limit's default per-IP key buckets all traffic
// together instead of throttling individual clients.
app.set('trust proxy', 1);

app.use(helmet());

// Baseline throttle for every route below, on top of the stricter limiter
// authRoutes.js already applies to /login, /register and /verify-password —
// this just stops any other endpoint (complaints, tasks, assets, ...) from
// being hammered with zero limit at all by a compromised or careless client.
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later', error: { code: 'RATE_LIMITED', details: null } },
}));

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
  // Required for the browser to actually send/receive the httpOnly session
  // cookie cross-origin (frontend and backend are separate Vercel domains).
  // Safe specifically because origin above is never a wildcard — the CORS
  // spec forbids combining credentials:true with Access-Control-Allow-Origin: *.
  credentials: true,
  maxAge: 600,
}));
app.use(express.json());
app.use(cookieParser());
// Global: every mutating request needs a matching CSRF cookie+header pair
// (see middleware/csrfMiddleware.js) now that auth lives in a SameSite=None
// cross-origin cookie instead of a JS-attached header.
app.use(csrfMiddleware);

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
app.use('/api/sales-desk', require('./routes/salesDeskRoutes'));

app.get('/', (req, res) => ok(res, { message: 'Fute Portal API running' }));

// GET /healthz — unlike '/' above, this actually reaches Mongo, so an
// orchestrator can tell "process is up" apart from "the database it depends
// on is reachable" instead of treating a wedged connection as healthy.
app.get('/healthz', async (req, res) => {
  const start = Date.now();
  try {
    await db.ping();
    ok(res, { mongo: 'reachable', pingMs: Date.now() - start });
  } catch (err) {
    // This endpoint is unauthenticated (orchestrators/uptime checks hit it
    // pre-login) — err.message could echo driver internals, so log the
    // detail server-side and only confirm "unreachable" to the caller.
    console.error('healthz check failed:', err);
    fail(res, { status: 503, message: 'Database unreachable', code: 'SERVICE_UNAVAILABLE' });
  }
});

// No route matched — without this, an unmapped URL fell through to Express's
// own default 404 handler, which sends an HTML error page instead of the
// same JSON envelope every other response on this API uses.
app.use((req, res) => fail(res, { status: 404, message: 'Not found', code: 'NOT_FOUND' }));

app.use(errorMiddleware);

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
