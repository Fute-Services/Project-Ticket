const crypto = require('crypto');
const { db } = require('../config/firebase');

const SESSIONS = db.collection('sessions');
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Refresh tokens are opaque random values, not JWTs — there's nothing to
// decode, their only job is "does this match what we stored." Only the hash
// is ever persisted, same principle as a password: if the sessions
// collection were ever read by someone who shouldn't, a hash alone can't be
// replayed as a cookie value.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// One doc per successful login/register. `sid` is embedded in the access
// JWT so a revoke can take effect immediately instead of waiting out the
// token's life — without this, "force logout" would be cosmetic.
// `remember` is stored here (not just used once at login) so a later
// rotation in consumeRefreshToken() knows whether to keep re-issuing a
// persistent or a browser-session refresh cookie without the client having
// to resend the original checkbox state.
async function createSession({ uid, ip, userAgent, refreshToken, remember }) {
  const doc = {
    uid,
    ip: ip || null,
    userAgent: userAgent || null,
    loginAt: new Date().toISOString(),
    revoked: false,
    remember: remember !== false,
    refreshTokenHash: hashToken(refreshToken),
    previousRefreshTokenHash: null,
    refreshExpiresAt: new Date(Date.now() + REFRESH_TTL_MS).toISOString(),
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

// Rotates a session's refresh token if `presentedHash` matches its CURRENT
// one — the normal case, every refresh call. If it instead matches the
// PREVIOUS (already-rotated-out) hash, that token was reused: the
// legitimate client already moved past it via an earlier rotation, so
// whoever just presented it again is working from a copied/stolen value —
// the whole session is revoked outright rather than issuing yet another
// token to an attacker. Wrapped in a transaction so two refresh calls
// racing for the same session can't both "succeed" off the same stale read.
async function consumeRefreshToken(presentedHash, { ip, userAgent } = {}) {
  const result = await db.runTransaction(async (tx) => {
    const currentSnap = await tx.get(SESSIONS.where('refreshTokenHash', '==', presentedHash).limit(1));
    if (!currentSnap.empty) {
      const doc = currentSnap.docs[0];
      const data = doc.data();
      if (data.revoked) return { ok: false, reason: 'revoked' };
      if (new Date(data.refreshExpiresAt).getTime() < Date.now()) return { ok: false, reason: 'expired' };

      const newRawToken = crypto.randomBytes(32).toString('hex');
      tx.set(
        doc.ref,
        {
          refreshTokenHash: hashToken(newRawToken),
          previousRefreshTokenHash: presentedHash,
          refreshExpiresAt: new Date(Date.now() + REFRESH_TTL_MS).toISOString(),
          rotatedAt: new Date().toISOString(),
          ip: ip || data.ip,
          userAgent: userAgent || data.userAgent,
        },
        { merge: true }
      );

      return {
        ok: true,
        uid: data.uid,
        newRawRefreshToken: newRawToken,
        session: { id: doc.id, remember: data.remember },
      };
    }

    const reuseSnap = await tx.get(SESSIONS.where('previousRefreshTokenHash', '==', presentedHash).limit(1));
    if (!reuseSnap.empty) {
      const doc = reuseSnap.docs[0];
      tx.set(doc.ref, { revoked: true, revokedAt: new Date().toISOString(), revokedReason: 'refresh_token_reuse' }, { merge: true });
      return { ok: false, reason: 'reused', sessionId: doc.id };
    }

    return { ok: false, reason: 'not_found' };
  });

  const affectedId = result.session?.id || result.sessionId;
  if (affectedId) clearRevokedCache(affectedId);
  return result;
}

module.exports = { SESSIONS, createSession, isSessionRevoked, clearRevokedCache, consumeRefreshToken, hashToken };
