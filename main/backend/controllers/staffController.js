const { db } = require('../config/db');
const { UNPAGINATED_READ_LIMIT } = require('../utils/constants');
const { ok } = require('../utils/respond');

// GET .../staff — just enough (id, name) for a "Resolved By" dropdown to
// list whoever currently holds this role, instead of a hardcoded name list
// that goes stale the moment someone new is given the role. Deliberately
// thinner than founderRoutes.js's GET /users (email, permissionOverrides,
// etc. aren't needed here and shouldn't be exposed to hr/it staff).
function listStaffByRole(roleName) {
  return async function (req, res) {
    const snap = await db.collection('users').where('role', '==', roleName).limit(UNPAGINATED_READ_LIMIT).get();
    const staff = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u) => u.active !== false)
      .map((u) => ({ id: u.id, full_name: u.full_name }));
    ok(res, staff);
  };
}

module.exports = { listStaffByRole };
