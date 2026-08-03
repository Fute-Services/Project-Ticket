const { auth, db } = require('../config/firebase');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Detect role from email pattern
function detectRole(email) {
  if (/hr\.fute/i.test(email)) return 'hr';
  if (/system\.fute/i.test(email) || /system\.futeservice/i.test(email)) return 'it';
  return 'employee'; // founder is set manually in DB
}

// POST /api/auth/register
async function register(req, res) {
  const { email, password, full_name, department } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password and full_name are required' });
  }

  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: full_name });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const role = detectRole(email);

  await db.collection('users').doc(userRecord.uid).set({
    email,
    full_name,
    role,
    department: department || null,
    created_at: new Date().toISOString(),
  });

  const token = jwt.sign(
    { id: userRecord.uid, email, role, full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({ token, role, full_name, email });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  // Verify password via Firebase Auth REST API (Admin SDK can't verify passwords directly)
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const authData = await resp.json();
  if (!resp.ok) return res.status(401).json({ error: 'Invalid credentials' });

  const userDoc = await db.collection('users').doc(authData.localId).get();
  if (!userDoc.exists) return res.status(400).json({ error: 'User profile not found' });
  const user = userDoc.data();

  const token = jwt.sign(
    { id: authData.localId, email: user.email, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, role: user.role, full_name: user.full_name, email: user.email });
}

module.exports = { register, login };
