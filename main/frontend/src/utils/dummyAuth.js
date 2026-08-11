// Standalone demo auth — works entirely in the browser, no backend required.
// Used automatically when the real API is unreachable (e.g. Firebase isn't
// configured yet), and available directly via the "Demo mode" quick-login
// links on the login page.

const STORE_KEY = 'fute_dummy_users';
// Exported so AuthContext can listen for cross-tab changes to this exact
// key (a founder editing a demo user's permissionOverrides in one tab).
export const DUMMY_USERS_STORAGE_KEY = STORE_KEY;

const SEED_USERS = [
  { email: 'founder@futeservices.com', password: 'demo1234', full_name: 'Founder Demo', role: 'founder', department: 'Leadership', permissionOverrides: {} },
  // Manually seeded, same as founder — not reachable via self-signup's
  // email-pattern role detection. The real top authority: owns Role
  // Permissions, which Founder itself no longer has.
  { email: 'superadmin.demo@futeservices.com', password: 'demo1234', full_name: 'Super Admin Demo', role: 'superadmin', department: 'Platform Admin', permissionOverrides: {} },
  { email: 'hr.demo@futeservices.com', password: 'demo1234', full_name: 'HR Demo', role: 'hr', department: 'Human Resources', permissionOverrides: {} },
  { email: 'system.demo@futeservices.com', password: 'demo1234', full_name: 'IT Demo', role: 'it', department: 'IT', permissionOverrides: {} },
  { email: 'coordinator.demo@futeservices.com', password: 'demo1234', full_name: 'Coordinator Demo', role: 'coordinator', department: 'Project Management', permissionOverrides: {} },
  { email: 'employee@futeservices.com', password: 'demo1234', full_name: 'Employee Demo', role: 'employee', department: 'Operations', permissionOverrides: {} },
  // These five have no backend or real workflow behind them yet — same
  // illustrative data as the Founder's department views (data/deptDemoData.js).
  // The accounts exist so that data is reachable without going through the
  // Founder's dashboard first.
  { email: 'sales.demo@futeservices.com', password: 'demo1234', full_name: 'Sales Demo', role: 'sales', department: 'Sales', permissionOverrides: {} },
  { email: 'dev.demo@futeservices.com', password: 'demo1234', full_name: 'Developer Demo', role: 'developers', department: 'Engineering', permissionOverrides: {} },
  { email: 'marketing.demo@futeservices.com', password: 'demo1234', full_name: 'Marketing Demo', role: 'marketing', department: 'Marketing', permissionOverrides: {} },
  { email: 'branding.demo@futeservices.com', password: 'demo1234', full_name: 'Branding Demo', role: 'branding', department: 'Branding', permissionOverrides: {} },
  { email: 'production.demo@futeservices.com', password: 'demo1234', full_name: 'Production Demo', role: 'production', department: 'Production', permissionOverrides: {} },
];

export const DEMO_ACCOUNTS = SEED_USERS.map(({ email, password, role }) => ({ email, password, role }));

function readUsers() {
  let stored;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) throw new Error('empty');
    stored = JSON.parse(raw);
  } catch {
    localStorage.setItem(STORE_KEY, JSON.stringify(SEED_USERS));
    return SEED_USERS;
  }

  // A browser that used this app before a new SEED_USERS entry (e.g.
  // superadmin.demo@) was added has that stale list cached — merge in any
  // seed account missing by email so it appears without wiping whatever the
  // user has since created or changed on their own accounts.
  const missing = SEED_USERS.filter(
    (seed) => !stored.some((u) => u.email.toLowerCase() === seed.email.toLowerCase())
  );
  if (missing.length) {
    stored = [...stored, ...missing];
    writeUsers(stored);
  }
  return stored;
}

function writeUsers(users) {
  localStorage.setItem(STORE_KEY, JSON.stringify(users));
}

// Mirrors authController.detectRole on the backend — same email patterns.
function detectRole(email) {
  if (/hr\.fute/i.test(email)) return 'hr';
  if (/system\.fute/i.test(email) || /system\.futeservice/i.test(email)) return 'it';
  if (/coordinator\.fute/i.test(email)) return 'coordinator';
  return 'employee';
}

function fakeToken(user) {
  return `dummy.${btoa(unescape(encodeURIComponent(JSON.stringify({ id: user.email, role: user.role }))))}.token`;
}

// Toggle: flip to `true` to require the password again — mirrors
// authController's PASSWORD_LOGIN_ENABLED on the backend, and LoginPage's
// own copy of the same flag. Keep all three in sync.
const PASSWORD_LOGIN_ENABLED = false;

// Shaped like the axios response the pages expect: { data: {...} }
export function dummyLogin({ email, password }) {
  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || (PASSWORD_LOGIN_ENABLED && user.password !== password)) {
    const err = new Error('Invalid credentials');
    err.response = { status: 401, data: { error: 'Invalid credentials' } };
    throw err;
  }
  return {
    data: {
      id: user.email,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      department: user.department,
      permissionOverrides: user.permissionOverrides || {},
      token: fakeToken(user),
    },
  };
}

export function dummyRegister({ full_name, email, department, password }) {
  const users = readUsers();
  if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    const err = new Error('Account exists');
    err.response = { status: 400, data: { error: 'An account with this email already exists' } };
    throw err;
  }
  const user = { email, password, full_name, department: department || null, role: detectRole(email), permissionOverrides: {} };
  writeUsers([...users, user]);
  return {
    data: {
      id: user.email,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      department: user.department,
      permissionOverrides: user.permissionOverrides,
      token: fakeToken(user),
    },
  };
}

export function isDummyToken(token) {
  return typeof token === 'string' && token.startsWith('dummy.');
}

// Founder's per-user overrides panel — same shape as the real backend's
// GET /api/founder/users, minus the password (this demo store keeps it in
// plaintext locally, so it's stripped before handing rows back to the UI).
export function listDummyUsers(role) {
  return readUsers()
    .filter((u) => !role || u.role === role)
    .map(({ password, ...rest }) => ({ id: rest.email, ...rest, permissionOverrides: rest.permissionOverrides || {} }));
}

export function updateDummyUserPermissions(email, permissionOverrides) {
  const users = readUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (idx === -1) throw new Error('User not found');
  users[idx] = { ...users[idx], permissionOverrides };
  writeUsers(users);
  const { password, ...rest } = users[idx];
  return { id: rest.email, ...rest };
}

// AuthContext calls this on reload for dummy sessions to pick up any
// permissionOverrides a founder changed since this user last logged in.
export function getDummyUserByEmail(email) {
  const user = readUsers().find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return null;
  const { password, ...rest } = user;
  return { id: rest.email, ...rest, permissionOverrides: rest.permissionOverrides || {} };
}

// Mirrors the real backend's POST /api/founder/users: unlike dummyRegister
// (self-signup, role always auto-detected from the email pattern), this
// lets the Founder assign the role explicitly — they're deliberately
// creating the account for whichever role tab is open, regardless of
// whether the email happens to match a pattern like system.fute*.
export function createDummyUser({ email, password, full_name, role, department }) {
  const users = readUsers();
  if (users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    const err = new Error('Account exists');
    err.response = { status: 400, data: { error: 'An account with this email already exists' } };
    throw err;
  }
  const user = { email, password, full_name, role, department: department || null, permissionOverrides: {} };
  writeUsers([...users, user]);
  const { password: _pw, ...rest } = user;
  return { id: rest.email, ...rest };
}
