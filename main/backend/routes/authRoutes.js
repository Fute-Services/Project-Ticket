const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, refresh, getMe, verifyPassword, logout } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

// Per-account lockout (see authController.js) already throttles repeated
// guesses against one account; this adds the missing per-IP throttle so an
// attacker can't spread guesses across many accounts, or spam /register,
// from a single source. Generous limit — this is an internal tool, not a
// public signup flow under real attack traffic.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later', error: { code: 'RATE_LIMITED', details: null } },
});

// /refresh needs its own, more generous limiter: unlike login/register/
// verify-password it isn't a password-guessing target (it authenticates off
// a signed refresh cookie a client can't forge), and it fires automatically
// for every logged-in user on the same office IP, so sharing the 10/15min
// credential-guess bucket could rate-limit a real session's silent refresh
// and log the user out.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later', error: { code: 'RATE_LIMITED', details: null } },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
// No authMiddleware here on purpose — the whole point of this endpoint is to
// work once the access token has already expired. It authenticates itself
// off the refresh cookie instead (authController.js).
router.post('/refresh', refreshLimiter, refresh);
router.get('/me', authMiddleware, getMe);
// Rate-limited like login/register — otherwise a stolen JWT lets an attacker
// brute-force the account's real password here with no throttle at all.
router.post('/verify-password', authLimiter, authMiddleware, verifyPassword);
router.post('/logout', authMiddleware, logout);

module.exports = router;
