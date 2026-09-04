const { db } = require('../config/db');
const { ok, created, fail } = require('../utils/respond');

const messagesCollection = db.collection('chat_messages');
const HISTORY_LIMIT = 50;

// A DM channel id encodes both participants (dm-<uidA>-<uidB>, sorted so
// either side opening the thread lands on the same id). Fixed channels
// (general, it-support, ...) and project-<id> channels carry no such
// encoding — they're open to any authenticated user, same posture
// taskProjectController.getProjects already takes with project data itself.
function isDmChannel(channelId) {
  return channelId.startsWith('dm-');
}

function dmParticipants(channelId) {
  return channelId.slice(3).split('-');
}

function canAccessChannel(channelId, userId) {
  if (!isDmChannel(channelId)) return true;
  return dmParticipants(channelId).includes(userId);
}

function makeDmChannelId(uidA, uidB) {
  return `dm-${[uidA, uidB].sort().join('-')}`;
}

// GET /api/chat/:channelId/messages?since=<ISO> — no `since` returns the
// last HISTORY_LIMIT messages (oldest first); with `since`, only messages
// newer than that (the poll's incremental fetch, see TeamChatDrawer.jsx).
async function listMessages(req, res) {
  const { channelId } = req.params;
  if (!canAccessChannel(channelId, req.user.id)) {
    return fail(res, { status: 403, message: 'Forbidden: Insufficient permissions', code: 'FORBIDDEN' });
  }

  const { since } = req.query;
  let query = messagesCollection.where('channelId', '==', channelId);
  if (since) query = query.where('created_at', '>', since);

  const snap = since
    ? await query.orderBy('created_at', 'asc').limit(HISTORY_LIMIT).get()
    : await query.orderBy('created_at', 'desc').limit(HISTORY_LIMIT).get();

  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (!since) docs = docs.reverse(); // desc-fetched history displayed oldest-first
  ok(res, docs);
}

// POST /api/chat/:channelId/messages — { text }. Sender identity always
// comes from the JWT (req.user), never the request body.
async function sendMessage(req, res) {
  const { channelId } = req.params;
  if (!canAccessChannel(channelId, req.user.id)) {
    return fail(res, { status: 403, message: 'Forbidden: Insufficient permissions', code: 'FORBIDDEN' });
  }

  const text = (req.body.text || '').trim();
  if (!text) return fail(res, { status: 400, message: 'text is required', code: 'VALIDATION_ERROR' });

  const docData = {
    channelId,
    senderId: req.user.id,
    senderName: req.user.full_name,
    senderRole: req.user.role,
    text,
    created_at: new Date().toISOString(),
  };
  const ref = await messagesCollection.add(docData);
  created(res, { id: ref.id, ...docData }, 'Message sent');
}

// GET /api/chat/directory — lightweight people list for the DM picker.
// Deliberately minimal (no email/permissions/etc.) since it's readable by
// any authenticated user, unlike superAdminUserController.listUsers.
async function directory(req, res) {
  const snap = await db.collection('users').limit(500).get();
  const people = snap.docs
    .filter((d) => d.id !== req.user.id && d.data().active !== false)
    .map((d) => ({ id: d.id, full_name: d.data().full_name, role: d.data().role, department: d.data().department || d.data().designation || '' }));
  ok(res, people);
}

// GET /api/chat/dm/:otherUserId — resolves (without creating a doc — the
// channel id itself IS the resource, chat_messages just accumulates into
// it) the DM channel id for the caller + the given user.
async function resolveDmChannel(req, res) {
  const { otherUserId } = req.params;
  if (otherUserId === req.user.id) {
    return fail(res, { status: 400, message: "Can't start a DM with yourself", code: 'VALIDATION_ERROR' });
  }
  ok(res, { channelId: makeDmChannelId(req.user.id, otherUserId) });
}

module.exports = { listMessages, sendMessage, directory, resolveDmChannel };
