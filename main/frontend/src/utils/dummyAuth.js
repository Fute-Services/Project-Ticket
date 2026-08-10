// Standalone demo auth — works entirely in the browser, no backend required.
// Used automatically when the real API is unreachable (e.g. Firebase isn't
// configured yet), and available directly via the "Demo mode" quick-login
// links on the login page.

const STORE_KEY = 'fute_dummy_users';

const SEED_USERS = [
  { email: 'founder@futeservices.com', password: 'demo1234', full_name: 'Founder Demo', role: 'founder', department: 'Leadership' },
  { email: 'hr.demo@futeservices.com', password: 'demo1234', full_name: 'HR Demo', role: 'hr', department: 'Human Resources' },
  { email: 'system.demo@futeservices.com', password: 'demo1234', full_name: 'IT Demo', role: 'it', department: 'IT' },
  { email: 'coordinator.demo@futeservices.com', password: 'demo1234', full_name: 'Coordinator Demo', role: 'coordinator', department: 'Project Management' },
  { email: 'employee@futeservices.com', password: 'demo1234', full_name: 'Employee Demo', role: 'employee', department: 'Operations' },
  // These five have no backend or real workflow behind them yet — same
  // illustrative data as the Founder's department views (data/deptDemoData.js).
  // The accounts exist so that data is reachable without going through the
  // Founder's dashboard first.
  { email: 'sales.demo@futeservices.com', password: 'demo1234', full_name: 'Sales Demo', role: 'sales', department: 'Sales' },
  { email: 'dev.demo@futeservices.com', password: 'demo1234', full_name: 'Developer Demo', role: 'developers', department: 'Engineering' },
  { email: 'marketing.demo@futeservices.com', password: 'demo1234', full_name: 'Marketing Demo', role: 'marketing', department: 'Marketing' },
  { email: 'branding.demo@futeservices.com', password: 'demo1234', full_name: 'Branding Demo', role: 'branding', department: 'Branding' },
  { email: 'production.demo@futeservices.com', password: 'demo1234', full_name: 'Production Demo', role: 'production', department: 'Production' },
];

export const DEMO_ACCOUNTS = SEED_USERS.map(({ email, password, role }) => ({ email, password, role }));

function readUsers() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) throw new Error('empty');
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORE_KEY, JSON.stringify(SEED_USERS));
    return SEED_USERS;
  }
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

// Shaped like the axios response the pages expect: { data: {...} }
export function dummyLogin({ email, password }) {
  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user || user.password !== password) {
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
  const user = { email, password, full_name, department: department || null, role: detectRole(email) };
  writeUsers([...users, user]);
  return {
    data: {
      id: user.email,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      department: user.department,
      token: fakeToken(user),
    },
  };
}

export function isDummyToken(token) {
  return typeof token === 'string' && token.startsWith('dummy.');
}
