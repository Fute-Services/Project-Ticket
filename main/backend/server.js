const express = require('express');
const cors = require('cors');
require('dotenv').config();
// Patches Express 4's router so a rejected promise thrown inside any async
// route handler is forwarded to the error-handling middleware below instead
// of leaving the request hanging with no response — must load before any
// routes are required.
require('express-async-errors');

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
  'http://localhost:5173',
].filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // No Origin header (curl, server-to-server, same-origin) — allow.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
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
app.use('/api/approvals', require('./routes/approvalRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));
app.use('/api/coordinator', require('./routes/coordinatorRoutes'));
app.use('/api/production/renders', require('./routes/renderRoutes'));
app.use('/api/hr-desk', require('./routes/hrDeskRoutes'));

app.get('/', (req, res) => res.json({ message: 'Fute Portal API running' }));

// Catch-all — with express-async-errors, this now also receives rejected
// promises from any async route handler, not just synchronous throws.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.message === 'Not allowed by CORS' ? 403 : 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
