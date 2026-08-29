const { logAudit } = require('../utils/auditLog');
const { NOTIFICATION_RULES_DOC, loadNotificationRules } = require('../utils/notificationRules');
const { ok, fail } = require('../utils/respond');

// GET /api/founder/notification-rules — Super Admin only (no other page
// consumes this; the backend mail-sending code reads loadNotificationRules
// directly, not this HTTP endpoint).
async function getNotificationRules(req, res) {
  ok(res, await loadNotificationRules());
}

// PUT /api/founder/notification-rules — { rules: { [trigger]: {...} } }
async function updateNotificationRules(req, res) {
  const { rules } = req.body;
  if (!rules || typeof rules !== 'object') {
    return fail(res, { status: 400, message: 'rules object is required', code: 'VALIDATION_ERROR' });
  }
  await NOTIFICATION_RULES_DOC.set(rules);
  await logAudit({ actor: req.user, action: 'update_notification_rules', details: { rules } });
  ok(res, await loadNotificationRules(), { message: 'Notification rules updated successfully' });
}

module.exports = { getNotificationRules, updateNotificationRules };
