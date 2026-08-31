const multer = require('multer');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);

// Documents module (§7 of the requirements doc) — PDF / JPG / Word only,
// enforced here rather than trusting the file extension alone. Memory
// storage: files are small (single documents, not media) and go straight to
// Firebase Storage, never touch disk.
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

module.exports = { upload, uploadSpreadsheet };
