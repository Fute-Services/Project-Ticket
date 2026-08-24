const { logAudit } = require('../utils/auditLog');
const { NOTIFICATION_RULES_DOC, loadNotificationRules } = require('../utils/notificationRules');

// GET /api/founder/notification-rules — Super Admin only (no other page
// consumes this; the backend mail-sending code reads loadNotificationRules
// directly, not this HTTP endpoint).
async function getNotificationRules(req, res) {
  res.json(await loadNotificationRules());
}

// PUT /api/founder/notification-rules — { rules: { [trigger]: {...} } }
async function updateNotificationRules(req, res) {
  const { rules } = req.body;
  if (!rules || typeof rules !== 'object') {
    return res.status(400).json({ error: 'rules object is required' });
  }
  await NOTIFICATION_RULES_DOC.set(rules);
  await logAudit({ actor: req.user, action: 'update_notification_rules', details: { rules } });
  res.json(await loadNotificationRules());
}

module.exports = { getNotificationRules, updateNotificationRules };
