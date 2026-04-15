/**
 * Capital Pyre — File Upload Middleware
 * Adapted from IAMS (UB CSI341).
 * Extended with financial document MIME types (XLSX, DOCX) for Capital Pyre.
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Ensure upload subdirectories exist
['pitchdecks', 'financials', 'documents', 'avatars'].forEach(dir => {
  const full = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

// ── Storage config ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Route to subfolder based on fieldname
    const map = {
      pitch_deck:    'pitchdecks',
      financial_doc: 'financials',
      document:      'documents',
      avatar:        'avatars',
    };
    const sub = map[file.fieldname] || 'documents';
    cb(null, path.join(UPLOAD_DIR, sub));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

// ── MIME type whitelist ───────────────────────────────────
const ALLOWED_MIME_TYPES = {
  // Documents
  'application/pdf':                                                    true,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true, // .docx
  'application/msword':                                                 true, // .doc
  // Spreadsheets (financials)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true, // .xlsx
  'application/vnd.ms-excel':                                          true, // .xls
  // Images (avatars, pitch assets)
  'image/jpeg': true,
  'image/png':  true,
  'image/webp': true,
};

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
  }
};

// ── Configured uploader ───────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024,
  },
});

module.exports = upload;
