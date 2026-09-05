const multer = require('multer');

// File-signature ("magic bytes") check — fileFilter below only sees the
// client-declared Content-Type, which a caller fully controls (e.g.
// `curl -F "file=@payload.html;type=application/pdf"`). This checks the
// actual first bytes of the uploaded content against what the declared type
// should look like, so a mislabeled file is rejected instead of being
// written to disk under `uploads/` (docs/security/VULN-02).
const SIGNATURES = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/jpg': [[0xff, 0xd8, 0xff]],
  // .doc (legacy OLE) and .docx/.xlsx (zip-based) share these signatures
  'application/msword': [[0xd0, 0xcf, 0x11, 0xe0]],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4b, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4b, 0x03, 0x04]],
  'application/vnd.ms-excel': [[0x50, 0x4b, 0x03, 0x04], [0xd0, 0xcf, 0x11, 0xe0]],
};

function matchesSignature(buffer, mimetype) {
  const candidates = SIGNATURES[mimetype];
  if (!candidates || !buffer) return false;
  return candidates.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

function validateFileSignature(req, res, next) {
  if (!req.file) return next();
  if (!matchesSignature(req.file.buffer, req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'File content does not match its declared type',
      error: { code: 'VALIDATION_ERROR', details: null },
    });
  }
  next();
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);

// Documents module (§7 of the requirements doc) — PDF / JPG / Word only,
// enforced here rather than trusting the file extension alone. Memory
// storage: files are small (single documents, not media); the controller
// writes them to local disk under uploads/ (see docs/16-file-storage.md).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(Object.assign(new Error('Only PDF, JPG, and Word (.doc/.docx) files are allowed'), { status: 400 }));
    }
    cb(null, true);
  },
});

// Sales Desk lead import — .xlsx only, same memory-storage/size-limit
// approach as the Documents upload above, just gated to spreadsheet
// mimetypes instead of PDF/JPG/Word.
const SPREADSHEET_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // some browsers send this for .xlsx too
]);
const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB — a ~1,000-row lead sheet is well under this
  fileFilter: (req, file, cb) => {
    if (!SPREADSHEET_MIME_TYPES.has(file.mimetype)) {
      return cb(Object.assign(new Error('Only Excel (.xlsx) files are allowed'), { status: 400 }));
    }
    cb(null, true);
  },
});

module.exports = { upload, uploadSpreadsheet, validateFileSignature };
