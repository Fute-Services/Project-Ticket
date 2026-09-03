const { db } = require('../config/db');

const AUDIT_LOGS = db.collection('audit_logs');

// Fire-and-forget from the caller's perspective — an audit-log write should
// never fail the action it's recording, so callers `await` this but the
// action itself has already succeeded by the time this runs.
async function logAudit({ actor, action, target, details }) {
  await AUDIT_LOGS.add({
    actor_id: actor?.id || null,
    actor_email: actor?.email || null,
    actor_name: actor?.full_name || null,
    action,
    target: target || null,
    details: details || null,
    created_at: new Date().toISOString(),
  });
}

module.exports = { logAudit, AUDIT_LOGS };
