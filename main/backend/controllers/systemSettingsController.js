const { db } = require('../config/firebase');
const { logAudit } = require('../utils/auditLog');
const { ok, fail } = require('../utils/respond');

const SYSTEM_SETTINGS_DOC = db.collection('settings').doc('system_config');

const DEFAULT_SYSTEM_SETTINGS = {
  slaHoursIt: 24,
  slaHoursHr: 48,
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  holidays: [],
};

// GET /api/founder/system-settings — readable by anyone logged in, same
// pattern as role-permissions (e.g. a ticket queue may want to show SLA
// countdowns), only Super Admin can write.
async function getSystemSettings(req, res) {
  const doc = await SYSTEM_SETTINGS_DOC.get();
  ok(res, doc.exists ? { ...DEFAULT_SYSTEM_SETTINGS, ...doc.data() } : DEFAULT_SYSTEM_SETTINGS);
}

async function updateSystemSettings(req, res) {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return fail(res, { status: 400, message: 'settings object is required', code: 'VALIDATION_ERROR' });
  }
  await SYSTEM_SETTINGS_DOC.set(settings, { merge: true });
  await logAudit({ actor: req.user, action: 'update_system_settings', details: settings });
  const doc = await SYSTEM_SETTINGS_DOC.get();
  ok(res, { ...DEFAULT_SYSTEM_SETTINGS, ...doc.data() }, { message: 'System settings updated successfully' });
}

module.exports = { getSystemSettings, updateSystemSettings };
