const { db } = require('../config/db');

const NOTIFICATION_RULES_DOC = db.collection('settings').doc('notification_rules');

// Only the triggers that actually exist in the app today (see itController/
// hrController) — no in-app/push rules since neither channel exists yet.
// recipientEmail is only meaningful for the two "new complaint" triggers,
// which default to IT_EMAIL/HR_EMAIL; status-update mail always goes to the
// ticket's own submitter, so there's no recipient to override there.
const DEFAULT_NOTIFICATION_RULES = {
  it_new_complaint: { enabled: true, recipientEmail: '' },
  it_status_update: { enabled: true },
  hr_new_complaint: { enabled: true, recipientEmail: '' },
  hr_status_update: { enabled: true },
};

// Called from the mail-sending code paths in itController/hrController
// before they send — a disabled rule means the send is skipped entirely,
// not just hidden from a UI that never affected backend behavior.
async function loadNotificationRules() {
  const doc = await NOTIFICATION_RULES_DOC.get();
  const stored = doc.exists ? doc.data() : {};
  const merged = {};
  for (const key of Object.keys(DEFAULT_NOTIFICATION_RULES)) {
    merged[key] = { ...DEFAULT_NOTIFICATION_RULES[key], ...stored[key] };
  }
  return merged;
}

module.exports = { NOTIFICATION_RULES_DOC, DEFAULT_NOTIFICATION_RULES, loadNotificationRules };
