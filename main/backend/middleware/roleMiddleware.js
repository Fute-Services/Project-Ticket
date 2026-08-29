const { fail } = require('../utils/respond');

// Returns middleware that only allows specified roles
function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return fail(res, { status: 403, message: 'Access denied', code: 'FORBIDDEN' });
    }
    next();
  };
}

module.exports = roleMiddleware;
