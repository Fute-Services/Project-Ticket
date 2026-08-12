const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
require('dotenv').config();

// Verifies the JWT token sent in Authorization header, then re-checks the
// account against Firestore on every request. A token's `role` claim is a
// snapshot from whenever it was issued (tokens live up to a day, see
// authController.js) — without this check, an account deleted or demoted
// after login keeps its old access until the token naturally expires.
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const profile = await db.collection('users').doc(decoded.id).get();
  if (!profile.exists) {
    return res.status(401).json({ error: 'Account no longer exists' });
  }

  // Always trust Firestore's current role/full_name over the token's, so a
  // role change (or the account being disabled) takes effect on this user's
  // very next request instead of waiting out the token's lifetime.
  const data = profile.data();
  req.user = { id: decoded.id, email: data.email, role: data.role, full_name: data.full_name };
  next();
}

module.exports = authMiddleware;
