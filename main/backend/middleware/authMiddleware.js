const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { isSessionRevoked } = require('../utils/sessions');
require('dotenv').config();

// Re-checking every request against Firestore (no caching at all) blew
// through the project's Firestore read quota within minutes under normal
// traffic ("8 RESOURCE_EXHAUSTED: Quota exceeded" on every endpoint,
// including login) — a much heavier cost than the stale-token risk it was
// meant to close. This short-lived per-process cache keeps that same
// protection (a deleted/demoted account loses access within CACHE_MS,
// not up to a full day) while cutting the read volume by roughly a
// cache-hit-rate's worth for any user making more than one request a
// minute.
const CACHE_MS = 60_000;
const profileCache = new Map(); // uid -> { data, expiresAt }

async function getProfile(uid) {
  const cached = profileCache.get(uid);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const snap = await db.collection('users').doc(uid).get();
  const data = snap.exists ? snap.data() : null;
  profileCache.set(uid, { data, expiresAt: Date.now() + CACHE_MS });
  return data;
}

// Verifies the JWT token sent in Authorization header, then re-checks the
// account against Firestore (via the cache above) so a role change or a
// deleted account takes effect within a minute instead of waiting out the
// token's full lifetime.
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const data = await getProfile(decoded.id);
  if (!data) {
    return res.status(401).json({ error: 'Account no longer exists' });
  }
  if (data.active === false) {
    return res.status(403).json({ error: 'This account has been deactivated' });
  }
  if (await isSessionRevoked(decoded.sid)) {
    return res.status(401).json({ error: 'This session has been signed out remotely — please log in again' });
  }

  req.user = { id: decoded.id, email: data.email, role: data.role, full_name: data.full_name, sid: decoded.sid };
  next();
}

module.exports = authMiddleware;
