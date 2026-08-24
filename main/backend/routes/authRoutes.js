const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, getMe, verifyPassword, logout } = require('../controllers/authController');
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
  message: { error: 'Too many attempts, please try again later' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, getMe);
// Rate-limited like login/register — otherwise a stolen JWT lets an attacker
// brute-force the account's real password here with no throttle at all.
router.post('/verify-password', authLimiter, authMiddleware, verifyPassword);
router.post('/logout', authMiddleware, logout);

module.exports = router;
