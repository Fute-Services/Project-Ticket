const { db } = require('../config/firebase');

const SESSIONS = db.collection('sessions');

// One doc per successful login. `sid` is embedded in the JWT so a revoke can
// take effect immediately instead of waiting out the token's 7-day life —
// without this, "force logout" would be cosmetic (the token would still work
// everywhere until it expired on its own).
async function createSession({ uid, ip, userAgent }) {
  const doc = {
    uid,
    ip: ip || null,
    userAgent: userAgent || null,
    loginAt: new Date().toISOString(),
    revoked: false,
  };
  const ref = await SESSIONS.add(doc);
  return { id: ref.id, ...doc };
}

// Short-lived cache, same shape/reasoning as authMiddleware's profile cache:
// checking Firestore on every single request blew through the read quota
// once before (see authMiddleware.js) — a revoke landing within ~30s of
// being clicked is an acceptable tradeoff for not repeating that.
const CACHE_MS = 30_000;
const revokedCache = new Map(); // sessionId -> { revoked, expiresAt }

// A token with no `sid` predates this feature (issued before this session
// tracking existed) — treat it as not revocable rather than locking out
// everyone who logged in before the deploy that added this.
async function isSessionRevoked(sessionId) {
  if (!sessionId) return false;
  const cached = revokedCache.get(sessionId);
  if (cached && cached.expiresAt > Date.now()) return cached.revoked;

  const doc = await SESSIONS.doc(sessionId).get();
  const revoked = !doc.exists || !!doc.data().revoked;
  revokedCache.set(sessionId, { revoked, expiresAt: Date.now() + CACHE_MS });
  return revoked;
}

function clearRevokedCache(sessionId) {
  revokedCache.delete(sessionId);
}

module.exports = { SESSIONS, createSession, isSessionRevoked, clearRevokedCache };
