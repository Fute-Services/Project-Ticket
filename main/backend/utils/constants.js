// Default cap for endpoints that read a whole collection without cursor
// pagination — was a bare `200` literal repeated across ~18 call sites in 9
// files. One named constant means changing the cap is one edit, not a hunt.
const UNPAGINATED_READ_LIMIT = 200;

// Cap for the founder-side merged HR+IT views (getAllComplaints,
// getActivityTimeline in superAdminUserController.js/dashboardController.js)
// — same value as UNPAGINATED_READ_LIMIT today but tracked separately since
// it's specifically the threshold those two views check to know whether to
// set the X-Results-Truncated response header.
const FOUNDER_LIST_CAP = 200;

// Cap for dashboardController.js/slaController.js's full-field scans (they
// need per-document data, not just a count, so `.count()` doesn't cover
// them) — bounds worst-case read cost as the org grows.
const DASHBOARD_SCAN_CAP = 5000;

module.exports = { UNPAGINATED_READ_LIMIT, FOUNDER_LIST_CAP, DASHBOARD_SCAN_CAP };
