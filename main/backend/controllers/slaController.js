const { db } = require('../config/firebase');
const { DASHBOARD_SCAN_CAP } = require('../utils/constants');
const { logAudit } = require('../utils/auditLog');
const { ok, fail } = require('../utils/respond');

const SLA_POLICIES_DOC = db.collection('settings').doc('sla_policies');

// Minute-based, per-priority-per-queue — supersedes the flat slaHoursIt/
// slaHoursHr on system_config (which only had one threshold for every
// priority). Numbers mirror the spec's example tiers; there's no "Critical"
// priority in this app's ticket forms (only Low/Medium/High), so that tier
// isn't modeled.
const DEFAULT_SLA_POLICIES = {
  it: {
    High: { responseMinutes: 30, resolutionMinutes: 240 },
    Medium: { responseMinutes: 120, resolutionMinutes: 480 },
    Low: { responseMinutes: 240, resolutionMinutes: 1440 },
  },
  hr: {
    High: { responseMinutes: 30, resolutionMinutes: 240 },
    Medium: { responseMinutes: 120, resolutionMinutes: 480 },
    Low: { responseMinutes: 240, resolutionMinutes: 1440 },
  },
};

// GET /api/founder/sla-policies — readable by anyone logged in (a ticket
// queue may want to show SLA countdowns), only Super Admin can write.
async function getSlaPolicies(req, res) {
  const doc = await SLA_POLICIES_DOC.get();
  ok(res, doc.exists ? { ...DEFAULT_SLA_POLICIES, ...doc.data() } : DEFAULT_SLA_POLICIES);
}

async function updateSlaPolicies(req, res) {
  const { policies } = req.body;
  if (!policies || typeof policies !== 'object') {
    return fail(res, { status: 400, message: 'policies object is required', code: 'VALIDATION_ERROR' });
  }
  await SLA_POLICIES_DOC.set(policies);
  await logAudit({ actor: req.user, action: 'update_sla_policies', details: { policies } });
  const doc = await SLA_POLICIES_DOC.get();
  ok(res, { ...DEFAULT_SLA_POLICIES, ...doc.data() }, { message: 'SLA policies updated successfully' });
}

// A ticket still open past its priority's resolutionMinutes is breached;
// past 80% of it and still open is near-breach. A completed ticket is
// judged against how long it actually took, not how long it's been open.
function summarizeSlaForQueue(snap, queuePolicies) {
  const now = Date.now();
  let compliant = 0, breached = 0, nearBreach = 0, decided = 0;
  const breaches = [];
  snap.docs.forEach((d) => {
    const t = d.data();
    const policy = queuePolicies[t.priority] || queuePolicies.Medium;
    if (!policy || !t.submitted_at) return;
    if (t.status === 'Completed') {
      if (!t.updated_at) return;
      decided += 1;
      const ms = new Date(t.updated_at) - new Date(t.submitted_at);
      if (Number.isFinite(ms) && ms >= 0) {
        if (ms / 60000 <= policy.resolutionMinutes) compliant += 1;
        else breached += 1;
      }
    } else {
      const ageMinutes = (now - new Date(t.submitted_at).getTime()) / 60000;
      if (!Number.isFinite(ageMinutes)) return;
      if (ageMinutes > policy.resolutionMinutes) {
        breached += 1;
        breaches.push({
          id: d.id, token: t.token, priority: t.priority, status: t.status,
          ageMinutes: Math.round(ageMinutes), resolutionMinutes: policy.resolutionMinutes,
        });
      } else if (ageMinutes > policy.resolutionMinutes * 0.8) {
        nearBreach += 1;
      }
    }
  });
  const compliancePct = decided > 0 ? Math.round((compliant / decided) * 1000) / 10 : null;
  return { total: snap.size, compliant, breached, nearBreach, compliancePct, breaches: breaches.slice(0, 20) };
}

// GET /api/founder/sla-compliance — Super Admin only; per-ticket breach
// detail is more than the general-purpose analytics/dashboard endpoints
// expose.
async function getSlaCompliance(req, res) {
  const [itSnap, hrSnap, policiesDoc] = await Promise.all([
    db.collection('it_complaints').limit(DASHBOARD_SCAN_CAP).get(),
    db.collection('hr_complaints').limit(DASHBOARD_SCAN_CAP).get(),
    SLA_POLICIES_DOC.get(),
  ]);
  const policies = policiesDoc.exists ? { ...DEFAULT_SLA_POLICIES, ...policiesDoc.data() } : DEFAULT_SLA_POLICIES;
  ok(res, {
    it: summarizeSlaForQueue(itSnap, policies.it),
    hr: summarizeSlaForQueue(hrSnap, policies.hr),
  });
}

module.exports = {
  getSlaPolicies,
  updateSlaPolicies,
  getSlaCompliance,
  summarizeSlaForQueue,
  SLA_POLICIES_DOC,
  DEFAULT_SLA_POLICIES,
};
