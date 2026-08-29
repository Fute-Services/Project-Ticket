const jwt = require('jsonwebtoken');
require('dotenv').config();

// Short on purpose — this is the token that would matter if it ever leaked
// (it's the one attached to every request). The refresh token (sessions.js)
// is what actually keeps someone signed in; this just limits how long a
// stolen access token stays useful.
const ACCESS_TOKEN_TTL = '15m';

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signAccessToken, verifyAccessToken, ACCESS_TOKEN_TTL };
