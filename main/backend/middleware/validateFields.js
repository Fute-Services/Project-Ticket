const { fail } = require('../utils/respond');

// Several routes assumed every body field was already a string — sending a
// number/object/array instead made a later .trim()/.toLowerCase()/etc throw,
// which surfaced as an opaque 500 (errorMiddleware's generic "Internal
// server error") instead of a clear 400. There was also no cap on free-text
// fields (ticket descriptions, chat messages, email bodies), so a large
// enough body could fill the server's disk.
//
// Usage: validateFields({ description: 5000, name: 200 }) — checks each
// named field, when present in req.body, is a string within maxLength.
// Fields not listed, or missing from the body, are left to the route's own
// required-field checks (this only validates shape/size of what's there).
function validateFields(limits) {
  return (req, res, next) => {
    for (const [field, maxLength] of Object.entries(limits)) {
      const value = req.body[field];
      if (value === undefined || value === null) continue;
      if (typeof value !== 'string') {
        return fail(res, { status: 400, message: `${field} must be text`, code: 'VALIDATION_ERROR' });
      }
      if (value.length > maxLength) {
        return fail(res, { status: 400, message: `${field} must be at most ${maxLength} characters`, code: 'VALIDATION_ERROR' });
      }
    }
    next();
  };
}

module.exports = validateFields;
