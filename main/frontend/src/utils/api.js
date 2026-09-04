import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : ''),
  // The session lives in an httpOnly cookie now (backend/controllers/authController.js) -
  // without this, the browser won't send it on cross-origin requests
  // (frontend and backend are separate Vercel domains), and won't store the
  // Set-Cookie from a login/register response either.
  withCredentials: true,
});

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// The CSRF cookie is deliberately NOT httpOnly (backend/utils/cookies.js) -
// this is what lets it be echoed back as a header. See
// backend/middleware/csrfMiddleware.js for why that pair proves the request
// came from our own frontend, not a forged cross-site one.
//
// Re-reading document.cookie on every single request used to race a
// concurrent silent refresh (AuthContext/PermissionsContext poll every
// 15s): the interceptor could read the *old* cookie value into the header
// a moment before the browser's own cookie jar picked up a *new* value
// from an in-flight /api/auth/refresh response, so the header and the
// cookie the browser actually attached no longer matched - an intermittent,
// hard-to-reproduce "CSRF token missing or invalid" for real, logged-in
// users. Caching the value in memory and updating it explicitly, in the
// same response handler that processes login/register/refresh (below),
// removes that race entirely - there's no longer a gap between "the value
// changed" and "the frontend knows it changed".
//
// Seeded from the cookie once at module load so a page that already has a
// session (refreshed the tab, opened a new tab) doesn't send an empty
// header on its very first request before any login/refresh response has
// run in this particular tab.
let csrfToken = readCookie('fute_csrf');
export function setCsrfToken(token) {
  csrfToken = token || null;
}

api.interceptors.request.use((config) => {
  // Prefer the cached value (race-free - see above) but fall back to a live
  // cookie read if we don't have one yet. The cache only ever gets *set* by
  // a login/register/refresh response actually completing in this tab - a
  // tab that inherited an already-logged-in session (reload, new tab) and
  // hasn't hit a 401-triggered refresh yet would otherwise be stuck sending
  // no header at all for its entire first access-token lifetime (up to 15
  // min), since nothing in that scenario ever populates the cache.
  const token = csrfToken || readCookie('fute_csrf');
  if (token) {
    config.headers['X-CSRF-Token'] = token;
    // Belt-and-suspenders: a handful of browser extensions strip
    // non-standard headers on cross-site requests (frontend and backend are
    // separate domains here) without touching the body - sending the same
    // value as a body field too means the request still succeeds even if
    // the header gets stripped in transit. Only for a plain JSON body -
    // FormData uploads (file attachments) aren't touched.
    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.data = { ...config.data, _csrf: token };
    }
  }
  return config;
});

function isAuthEndpoint(url) {
  return /\/api\/auth\/(login|register|refresh)(\?|$)/.test(url || '');
}

// GET /me is how AuthContext asks "am I logged in" on every page load,
// including the very first one from a visitor who never logged in at all -
// a 401 there is a normal, expected outcome, not an interrupted action, so
// it should never force a hard navigation (AuthContext already handles it
// by quietly setting user to null, which is what shows the login screen).
function isMeEndpoint(url) {
  return /\/api\/auth\/me(\?|$)/.test(url || '');
}

// Used to skip a pointless refresh attempt on a logged-out page load (GET
// /me 401s, then POST /refresh would 401 too - there was never anything to
// refresh into). This used to check for the CSRF cookie's presence via
// document.cookie, on the theory that it's a reliable "a session exists"
// signal even with the real session cookies being httpOnly and unreadable
// here - but some browsers block page JS from reading *any* cookie that
// way entirely (confirmed live: document.cookie returned '' while the
// cookie was still visibly attached to every request), which made this
// always report "no session" and silently break the refresh-and-retry path
// for real, logged-in users in exactly those browsers. Trading the minor
// optimization away entirely is safer than a cookie-based signal that can
// go quietly wrong per-browser: worst case now is one extra POST /refresh
// call (which itself just 401s, same as today) on a first-ever anonymous
// page view.

function flattenErrorBody(err) {
  // Flatten {success:false, message, error:{code,details}} down to a plain
  // `.error` string, matching what every existing catch block
  // (`e.response?.data?.error || e.message`) already reads.
  const body = err.response?.data;
  if (body && typeof body === 'object' && body.success === false) {
    err.response.data = { ...body, error: body.message || body.error?.details || body.error?.code || 'Request failed' };
  }
  return err;
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') window.location.href = '/login';
}

// The access token is short-lived (15 min - backend/utils/jwt.js) by design;
// this is what makes that invisible to the user instead of logging them out
// every 15 minutes. One in-flight refresh call is shared by every request
// that hits a 401 around the same time (several widgets polling at once,
// say) - without this, each would independently call /refresh, and the
// second one to land would find the first had already rotated the refresh
// token out from under it and get treated as reuse (utils/sessions.js).
let refreshPromise = null;
function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = api.post('/api/auth/refresh').finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// The backend wraps every response in a standard envelope -
// {success:true, message, data} on success, {success:false, message, error:{code,details}}
// on failure (backend/utils/respond.js). Every context/component in this app
// was written against the OLD bare-payload shape (`response.data` being the
// complaint/array/whatever directly, and `err.response.data.error` being a
// plain string) - rather than rewrite every one of those ~40 call sites,
// this single interceptor pair unwraps the envelope right here so the rest
// of the frontend keeps working unchanged.
api.interceptors.response.use(
  (res) => {
    // CSV export etc. - a blob has no envelope to unwrap.
    if (res.config?.responseType === 'blob') return res;
    const body = res.data;
    if (body && typeof body === 'object' && typeof body.success === 'boolean') {
      res.data = body.data;
    }
    // Login/register/refresh each return a fresh csrfToken (see
    // authController.js's issueSessionCookies) - caching it here, in the
    // one place all three responses pass through, is what keeps the header
    // interceptor above from ever needing to re-read document.cookie.
    if (res.data && typeof res.data === 'object' && 'csrfToken' in res.data) {
      setCsrfToken(res.data.csrfToken);
    }
    return res;
  },
  async (err) => {
    const original = err.config;
    const status = err.response?.status;

    // A stale in-memory csrfToken (see the cache comment above) surfaces as
    // this 403, not a 401 — e.g. another tab logged out and cleared the
    // shared CSRF cookie, but this tab's cached value never got told. A
    // fresh document.cookie read picks up whatever's actually there now: a
    // new value if only the cache was stale (this tab is still logged in,
    // just retry once), or nothing at all if the session is really gone
    // (falls through to the logged-out handling below instead of looping).
    if (
      status === 403 &&
      err.response?.data?.error?.code === 'CSRF_INVALID' &&
      original &&
      !original._retriedAfterCsrf
    ) {
      original._retriedAfterCsrf = true;
      const fresh = readCookie('fute_csrf');
      if (fresh && fresh !== csrfToken) {
        setCsrfToken(fresh);
        return api(original);
      }
      // No fresh cookie to recover with — the session really is gone (e.g.
      // logged out in another tab), not just a stale cache. Same clean
      // redirect the 401 path below uses, instead of surfacing a raw CSRF
      // error for what's actually a normal logged-out state.
      if (!isAuthEndpoint(original.url) && !isMeEndpoint(original.url)) redirectToLogin();
      return Promise.reject(flattenErrorBody(err));
    }

    if (status === 401 && original && !isAuthEndpoint(original.url) && !original._retriedAfterRefresh) {
      original._retriedAfterRefresh = true;
      try {
        await refreshOnce();
        return api(original); // new access cookie is already set - replay the original call
      } catch (refreshErr) {
        // A failed refresh on /me just means "not logged in (any more)" -
        // AuthContext's own .catch already handles that quietly. Forcing a
        // hard redirect here is what caused the reload loop: /me 401s on a
        // visitor's very first page view, this refresh attempt naturally
        // fails too, and window.location.href='/login' fired even though
        // there was nothing to interrupt.
        if (!isMeEndpoint(original.url)) redirectToLogin();
        return Promise.reject(flattenErrorBody(refreshErr));
      }
    }

    // A 401 that's already been through a refresh attempt, or arrived with
    // no session cookie at all to try refreshing, really does mean logged
    // out. Login/register 401s are excluded (that's just a wrong password,
    // not a reason to bounce someone off the form they're filling in) and
    // so is /me (see above - that's the "am I logged in" probe itself).
    if (status === 401 && !isAuthEndpoint(original?.url) && !isMeEndpoint(original?.url)) {
      redirectToLogin();
    }

    return Promise.reject(flattenErrorBody(err));
  }
);

// Auth
export const registerUser = (data) => api.post('/api/auth/register', data);
export const loginUser = (data) => api.post('/api/auth/login', data);
export const getMe = () => api.get('/api/auth/me');
export const verifyPassword = (password) => api.post('/api/auth/verify-password', { password });
export const logoutUser = () => api.post('/api/auth/logout').finally(() => setCsrfToken(null));

// Founder - role permissions' per-user overrides
export const getUsers = (role) => api.get('/api/founder/users', { params: { role } });
export const createUser = (data) => api.post('/api/founder/users', data);
export const updateUserPermissions = (uid, permissionOverrides) =>
  api.patch(`/api/founder/users/${uid}/permissions`, { permissionOverrides });

// Super Admin - full user management
export const updateUser = (uid, data) => api.patch(`/api/founder/users/${uid}`, data);
export const setUserActive = (uid, active, reason) => api.patch(`/api/founder/users/${uid}/active`, { active, reason });
export const resetUserPassword = (uid, password) => api.patch(`/api/founder/users/${uid}/reset-password`, { password });
export const deleteUser = (uid, reason) => api.delete(`/api/founder/users/${uid}`, { data: { reason } });

// Super Admin - audit log, analytics, system settings
export const getAuditLogs = (limit) => api.get('/api/founder/audit-logs', { params: { limit } });
export const getAnalytics = (params) => api.get('/api/founder/analytics', { params });
export const exportAnalyticsCsv = (params) => api.get('/api/founder/analytics/export', { params, responseType: 'blob' });

// Super Admin - global search across users/tickets/assets/departments
export const globalSearch = (q) => api.get('/api/founder/search', { params: { q } });
export const getActivityTimeline = (limit) => api.get('/api/founder/activity-timeline', { params: { limit } });
export const getDashboardOverview = () => api.get('/api/founder/dashboard-overview');
export const updateDashboardLayout = (widgets) => api.patch('/api/founder/dashboard-layout', { widgets });

// Super Admin - SLA policies (per-priority, per-queue) and compliance
export const getSlaPolicies = () => api.get('/api/founder/sla-policies');
export const updateSlaPolicies = (policies) => api.put('/api/founder/sla-policies', { policies });
export const getSlaCompliance = () => api.get('/api/founder/sla-compliance');

// Super Admin - Security Center
export const getSessions = () => api.get('/api/founder/security/sessions');
export const revokeSession = (id, reason) => api.patch(`/api/founder/security/sessions/${id}/revoke`, { reason });
export const forceLogoutUser = (uid, reason) => api.patch(`/api/founder/security/users/${uid}/force-logout`, { reason });
export const getFailedLogins = (limit) => api.get('/api/founder/security/failed-logins', { params: { limit } });
export const getLockedAccounts = () => api.get('/api/founder/security/locked-accounts');
export const unlockAccount = (uid) => api.patch(`/api/founder/security/users/${uid}/unlock`);

// Super Admin - notification rules
export const getNotificationRules = () => api.get('/api/founder/notification-rules');
export const updateNotificationRules = (rules) => api.put('/api/founder/notification-rules', { rules });
export const getSystemSettings = () => api.get('/api/founder/system-settings');
export const updateSystemSettings = (settings) => api.put('/api/founder/system-settings', { settings });

// Super Admin - departments
export const getDepartments = () => api.get('/api/founder/departments');
export const createDepartment = (data) => api.post('/api/founder/departments', data);
export const updateDepartment = (id, data) => api.patch(`/api/founder/departments/${id}`, data);
export const deleteDepartment = (id, reason) => api.delete(`/api/founder/departments/${id}`, { data: { reason } });

// Super Admin - granular action-level permissions (resource -> allowed actions)
export const getActionPermissions = () => api.get('/api/founder/action-permissions');
export const updateActionPermissions = (permissions) => api.put('/api/founder/action-permissions', { permissions });

// Complaints - the queue each role is allowed to see
export const getFounderComplaints = () => api.get('/api/founder/complaints');
// "Load More" pagination - pass the previous response's nextCursor to fetch
// the next page; response is { items, nextCursor }.
export const getHrComplaints = (after) => api.get('/api/hr/complaints', { params: after ? { after } : {} });
export const getItComplaints = (after) => api.get('/api/it/complaints', { params: after ? { after } : {} });
export const getMyHrComplaints = () => api.get('/api/hr/complaints/my');
export const getMyItComplaints = () => api.get('/api/it/complaints/my');

// Create - any logged-in user can raise a ticket for themself
export const createHrComplaint = (data) => api.post('/api/hr/complaints', data);
export const createItComplaint = (data) => api.post('/api/it/complaints', data);

// Lookup by ticket token (FT-HR-XXXXXX / FT-IT-XXXXXX)
export const searchHrByToken = (token) => api.get('/api/hr/complaints/search', { params: { token } });
export const searchItByToken = (token) => api.get('/api/it/complaints/search', { params: { token } });

// Status changes - HR/IT staff and founders only; the API 403s for anyone else
export const updateHrStatus = (id, status) => api.patch(`/api/hr/complaints/${id}/status`, { status });
export const updateItStatus = (id, status) => api.patch(`/api/it/complaints/${id}/status`, { status });

// Editable columns (employeeStatus, solver, remarks, vpnNo, employeeId) - HR/IT staff and founders only
export const updateHrFields = (id, fields) => api.patch(`/api/hr/complaints/${id}/fields`, fields);
export const updateItFields = (id, fields) => api.patch(`/api/it/complaints/${id}/fields`, fields);

// Delete - only the employee who raised the ticket can delete it
export const deleteHrComplaint = (id) => api.delete(`/api/hr/complaints/${id}`);
export const deleteItComplaint = (id) => api.delete(`/api/it/complaints/${id}`);

// Reopen - only the employee who raised the ticket can reopen it, and only
// once it's resolved
export const reopenHrComplaint = (id) => api.patch(`/api/hr/complaints/${id}/reopen`);
export const reopenItComplaint = (id) => api.patch(`/api/it/complaints/${id}/reopen`);

// Active staff for a department's queue, for the "Resolved By" dropdown -
// HR/IT staff and founders only
export const getHrStaff = () => api.get('/api/hr/staff');
export const getItStaff = () => api.get('/api/it/staff');

// Approvals - IT/HR desks submit and read, founder decides
export const getApprovals = (after) => api.get('/api/approvals', { params: after ? { after } : {} });
export const submitApprovalRequest = (data) => api.post('/api/approvals', data);
export const decideApproval = (id, status) => api.patch(`/api/approvals/${id}/decide`, { status });

// Leave - any employee applies, HR/founder read all + decide
export const applyLeave = (data) => api.post('/api/leave', data);
export const getAllLeaves = (after) => api.get('/api/leave', { params: after ? { after } : {} });
export const getMyLeaves = () => api.get('/api/leave/my');
export const decideLeave = (id, status) => api.patch(`/api/leave/${id}/decide`, { status });

// Assets - IT desk inventory
export const getAssets = (after) => api.get('/api/it/assets', { params: after ? { after } : {} });
export const createAsset = (data) => api.post('/api/it/assets', data);
export const updateAsset = (id, data) => api.put(`/api/it/assets/${id}`, data);
export const deleteAsset = (id) => api.delete(`/api/it/assets/${id}`);

// Tasks/Projects - Coordinator, Founder, and Employee "My Tasks/Projects" all read
export const getProjects = () => api.get('/api/coordinator/projects');
export const getTasks = (after) => api.get('/api/coordinator/tasks', { params: after ? { after } : {} });
export const createTask = (data) => api.post('/api/coordinator/tasks', data);
export const updateTaskStatus = (id, status) => api.patch(`/api/coordinator/tasks/${id}/status`, { status });
export const updateTask = (id, patch) => api.patch(`/api/coordinator/tasks/${id}`, patch);

// Rendering Status - Production logs jobs, IT reads the same list
export const getRenders = (after) => api.get('/api/production/renders', { params: after ? { after } : {} });
export const addRender = (data) => api.post('/api/production/renders', data);
export const updateRender = (id, patch) => api.patch(`/api/production/renders/${id}`, patch);

// HR desk sub-resources - Candidates, Interviews, Meetings, Attendance,
// Feedback, Job postings all share the same list/create/update/delete shape.
function hrDeskResource(path) {
  return {
    list: () => api.get(`/api/hr-desk/${path}`),
    create: (data) => api.post(`/api/hr-desk/${path}`, data),
    update: (id, patch) => api.patch(`/api/hr-desk/${path}/${id}`, patch),
    remove: (id) => api.delete(`/api/hr-desk/${path}/${id}`),
  };
}
export const employeesApi = hrDeskResource('employees');
// Document Template uploads - PDF/JPG/Word only (enforced server-side too).
employeesApi.uploadDocument = (employeeId, docType, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/api/hr-desk/employees/${employeeId}/documents/${docType}`, formData);
};
export const candidatesApi = hrDeskResource('candidates');
export const interviewsApi = hrDeskResource('interviews');
export const meetingsApi = hrDeskResource('meetings');
export const attendanceApi = hrDeskResource('attendance');
attendanceApi.myToday = () => api.get('/api/hr-desk/attendance/me/today');
attendanceApi.checkIn = (workMode, extra = {}) => api.post('/api/hr-desk/attendance/check-in', { workMode, ...extra });
attendanceApi.checkOut = () => api.post('/api/hr-desk/attendance/check-out');
export const feedbackApi = hrDeskResource('feedback');
export const jobsApi = hrDeskResource('jobs');
export const performanceApi = hrDeskResource('performance');
export const leaveEntriesApi = hrDeskResource('leave-entries');

// Document Templates — create/update carry a PDF file, so unlike the rest
// of hrDeskResource these send multipart/form-data, not JSON.
function templateFormData({ name, category, file }) {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('category', category);
  if (file) formData.append('file', file);
  return formData;
}
export const documentTemplatesApi = {
  list: () => api.get('/api/hr-desk/document-templates'),
  create: (data) => api.post('/api/hr-desk/document-templates', templateFormData(data)),
  update: (id, data) => api.patch(`/api/hr-desk/document-templates/${id}`, templateFormData(data)),
  remove: (id) => api.delete(`/api/hr-desk/document-templates/${id}`),
};

export const extraHoursApi = {
  submit: (data) => api.post('/api/hr-desk/extra-hours', data),
  myList: () => api.get('/api/hr-desk/extra-hours/me'),
  myMentions: () => api.get('/api/hr-desk/extra-hours/mentions'),
  list: () => api.get('/api/hr-desk/extra-hours'),
};

export const getMyLeaveSummary = () => api.get('/api/hr-desk/leave/me');
export const getMyPerformance = () => api.get('/api/hr-desk/performance/me');

// HR Email - real SMTP send via the backend's mailer, Sent folder persists across sessions
export const sendHrEmail = (data) => api.post('/api/hr-desk/send-email', data);
export const getSentHrEmails = () => api.get('/api/hr-desk/send-email');

// Sales Desk - same list/create/update/delete shape as hrDeskResource, just
// against /api/sales-desk instead. A separate desk (own role, own
// collection), not part of the HR module even though it reuses its pattern.
function salesDeskResource(path) {
  return {
    list: () => api.get(`/api/sales-desk/${path}`),
    create: (data) => api.post(`/api/sales-desk/${path}`, data),
    update: (id, patch) => api.patch(`/api/sales-desk/${path}/${id}`, patch),
    remove: (id) => api.delete(`/api/sales-desk/${path}/${id}`),
  };
}
export const salesLeadsApi = salesDeskResource('leads');
salesLeadsApi.import = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/sales-desk/leads/import', formData);
};
salesLeadsApi.logCall = (id, data) => api.post(`/api/sales-desk/leads/${id}/log-call`, data);
export const exportSalesEmailCampaign = () =>
  api.get('/api/sales-desk/email-campaign/export', { responseType: 'blob' });

export const salesCampaignsApi = salesDeskResource('campaigns');
export const getSalesSettings = () => api.get('/api/sales-desk/settings');
export const updateSalesSettings = (data) => api.patch('/api/sales-desk/settings', data);

export default api;
