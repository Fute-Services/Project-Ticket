const { db } = require('../config/firebase');
const { logAudit } = require('../utils/auditLog');
const { SESSIONS, clearRevokedCache } = require('../utils/sessions');

// GET /api/founder/security/sessions?uid=&includeRevoked=
async function listSessions(req, res) {
  const { uid, includeRevoked } = req.query;
  let query = SESSIONS.orderBy('loginAt', 'desc').limit(200);
  if (uid) query = SESSIONS.where('uid', '==', uid).limit(200);
  const snap = await query.get();
  let sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (includeRevoked !== 'true') sessions = sessions.filter((s) => !s.revoked);
  sessions.sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt));

  // Join in email/name for display — bounded to the uids actually present.
  const uids = [...new Set(sessions.map((s) => s.uid))];
  const userDocs = await Promise.all(uids.map((id) => db.collection('users').doc(id).get()));
  const userMap = {};
  userDocs.forEach((d) => { if (d.exists) userMap[d.id] = d.data(); });

  res.json(sessions.map((s) => ({
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
  if (!doc.exists) return res.status(404).json({ error: 'Session not found' });

  await ref.set({ revoked: true, revokedAt: new Date().toISOString() }, { merge: true });
  clearRevokedCache(id);

  await logAudit({ actor: req.user, action: 'revoke_session', target: { type: 'session', id, uid: doc.data().uid }, details: reason ? { reason } : null });
  res.json({ id, revoked: true });
}

// PATCH /api/founder/security/users/:uid/force-logout — revokes every
// active session for this user in one shot, so "force logout" actually
// signs them out everywhere instead of just one device.
async function forceLogoutUser(req, res) {
  const { uid } = req.params;
  const { reason } = req.body;
  const snap = await SESSIONS.where('uid', '==', uid).where('revoked', '==', false).get();
  if (snap.empty) return res.json({ uid, revokedCount: 0 });

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
  res.json({ uid, revokedCount: snap.size });
}

// GET /api/founder/security/failed-logins?limit=100
async function listFailedLogins(req, res) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const snap = await db.collection('failed_logins').orderBy('at', 'desc').limit(limit).get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

// GET /api/founder/security/locked-accounts
async function listLockedAccounts(req, res) {
  const snap = await db.collection('users').where('locked', '==', true).get();
  res.json(snap.docs.map((d) => ({
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
  if (!doc.exists) return res.status(404).json({ error: 'User not found' });

  await ref.set({ locked: false, failedLoginAttempts: 0 }, { merge: true });
  await logAudit({ actor: req.user, action: 'unlock_account', target: { type: 'user', id: uid, email: doc.data().email } });
  res.json({ id: uid, locked: false });
}

module.exports = { listSessions, revokeSession, forceLogoutUser, listFailedLogins, listLockedAccounts, unlockAccount };
