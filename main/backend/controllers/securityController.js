const { db } = require('../config/db');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { logAudit } = require('../utils/auditLog');
const { SESSIONS, clearRevokedCache } = require('../utils/sessions');
const { ok, fail } = require('../utils/respond');

// GET /api/founder/security/sessions?uid=&includeRevoked=
async function listSessions(req, res) {
  const { uid, includeRevoked } = req.query;
  let query = SESSIONS.orderBy('loginAt', 'desc').limit(UNPAGINATED_READ_LIMIT);
  if (uid) query = SESSIONS.where('uid', '==', uid).limit(UNPAGINATED_READ_LIMIT);
  const snap = await query.get();
  let sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (includeRevoked !== 'true') sessions = sessions.filter((s) => !s.revoked);
  sessions.sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt));

  // Join in email/name for display — bounded to the uids actually present.
  const uids = [...new Set(sessions.map((s) => s.uid))];
  const userDocs = await Promise.all(uids.map((id) => db.collection('users').doc(id).get()));
  const userMap = {};
  userDocs.forEach((d) => { if (d.exists) userMap[d.id] = d.data(); });

  ok(res, sessions.map((s) => ({
    ...s,
    email: userMap[s.uid]?.email || null,
    full_name: userMap[s.uid]?.full_name || null,
  })));
}

// PATCH /api/founder/security/sessions/:id/revoke
async function revokeSession(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  const ref = SESSIONS.doc(id);
  const doc = await ref.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'Session not found', code: 'NOT_FOUND' });

  await ref.set({ revoked: true, revokedAt: new Date().toISOString() }, { merge: true });
  clearRevokedCache(id);

  await logAudit({ actor: req.user, action: 'revoke_session', target: { type: 'session', id, uid: doc.data().uid }, details: reason ? { reason } : null });
  ok(res, { id, revoked: true }, { message: 'Session revoked successfully' });
}

// PATCH /api/founder/security/users/:uid/force-logout — revokes every
// active session for this user in one shot, so "force logout" actually
// signs them out everywhere instead of just one device.
async function forceLogoutUser(req, res) {
  const { uid } = req.params;
  const { reason } = req.body;
  const snap = await SESSIONS.where('uid', '==', uid).where('revoked', '==', false).get();
  if (snap.empty) return ok(res, { uid, revokedCount: 0 }, { message: 'No active sessions to revoke' });

  const batch = db.batch();
  const revokedAt = new Date().toISOString();
  snap.docs.forEach((d) => {
    batch.set(d.ref, { revoked: true, revokedAt }, { merge: true });
    clearRevokedCache(d.id);
  });
  await batch.commit();

  await logAudit({
    actor: req.user,
    action: 'force_logout_user',
    target: { type: 'user', id: uid },
    details: { sessionsRevoked: snap.size, ...(reason ? { reason } : null) },
  });
  ok(res, { uid, revokedCount: snap.size }, { message: 'User logged out of all sessions' });
}

// GET /api/founder/security/failed-logins?limit=100
async function listFailedLogins(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const snap = await db.collection('failed_logins').orderBy('at', 'desc').limit(limit).get();
  ok(res, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// GET /api/founder/security/locked-accounts
async function listLockedAccounts(req, res) {
  const snap = await db.collection('users').where('locked', '==', true).get();
  ok(res, snap.docs.map((d) => ({
    id: d.id,
    email: d.data().email,
    full_name: d.data().full_name,
    role: d.data().role,
    failedLoginAttempts: d.data().failedLoginAttempts || 0,
    lockedAt: d.data().lockedAt || null,
  })));
}

// PATCH /api/founder/security/users/:uid/unlock
async function unlockAccount(req, res) {
  const { uid } = req.params;
  const ref = db.collection('users').doc(uid);
  const doc = await ref.get();
  if (!doc.exists) return fail(res, { status: 404, message: 'User not found', code: 'NOT_FOUND' });

  await ref.set({ locked: false, failedLoginAttempts: 0 }, { merge: true });
  await logAudit({ actor: req.user, action: 'unlock_account', target: { type: 'user', id: uid, email: doc.data().email } });
  ok(res, { id: uid, locked: false }, { message: 'Account unlocked successfully' });
}

module.exports = { listSessions, revokeSession, forceLogoutUser, listFailedLogins, listLockedAccounts, unlockAccount };
