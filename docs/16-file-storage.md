# 16 — File Storage

Teacher's summary: this app stores every uploaded file (employee documents, blank document templates, sales lead spreadsheets on the way in) as a plain file on the server's own local disk — there is no S3, no Firebase Storage, no cloud bucket anywhere in the current code. Everything lives under `main/backend/uploads/`.

## Where uploads land — `UPLOAD_ROOT`

`controllers/hrDeskController.js`:

```js
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
```

That resolves to `main/backend/uploads/`. Two subfolders exist under it today (confirmed on disk): `uploads/document-templates/` and, once any employee document is uploaded, `uploads/employee-documents/<employeeId>/`.

## Upload type 1 — Employee documents

Route: `POST /api/hr-desk/employees/:id/documents/:docType` (auth + `role('hr','founder')`, per `routes/hrDeskRoutes.js`), handled by `uploadEmployeeDocument` in `controllers/hrDeskController.js`.

- Multer config: `utils/upload.js`'s `upload` — `multer.memoryStorage()` (file bytes land in `req.file.buffer`, never touch disk until the controller explicitly writes them), `fileFilter` restricted to `ALLOWED_MIME_TYPES` (`application/pdf`, `image/jpeg`, `image/jpg`, `application/msword`, `.docx`'s mimetype), 10MB size limit.
- `DOCUMENT_TYPES` in `hrDeskController.js` maps a `docType` key (`olSigned`, `nda`, `leavePolicy`, `coc`, `aadharCard`, `panCard`, ... plus three free `other1`/`other2`/`other3` slots) to the two fields it writes on the `employees` doc: a URL field and a filename field.
- The uploaded file is written to `uploads/employee-documents/<id>/<docType>-<timestamp>-<sanitizedOriginalName>`. The original filename is sanitized with `req.file.originalname.replace(/[^\w.\-]/g, '_')` before being used in the path.
- The employee doc is updated with the **download route URL** (e.g. `/api/hr-desk/employees/<id>/documents/<docType>/download`), the original filename, and a separate `storagePaths.<docType>` field holding the real on-disk relative path — kept apart from the URL field specifically so nothing outside the download route ever needs (or is shown) the real path.
- An `approvals` record (category `document`) is created afterward for HR/founder sign-off, and the Founder is emailed — see [11-business-logic.md](11-business-logic.md) and [22-feature-flows.md](22-feature-flows.md).

Download: `GET /api/hr-desk/employees/:id/documents/:docType/download` (same auth + role gate) — reads `storagePaths.<docType>` off the employee doc, resolves it under `UPLOAD_ROOT`, and calls `res.download(absolutePath, originalFileName)`.

## Upload type 2 — Document templates

Route: `POST /api/hr-desk/document-templates` / `PATCH .../:id` (auth + `role('hr','founder')`), handled by `createDocumentTemplate`/`updateDocumentTemplate` via `saveTemplateFile()`.

- Same `upload` multer config (PDF/JPG/Word, 10MB, memory storage).
- Stored at `uploads/document-templates/<sanitizedCategory>/<timestamp>-<sanitizedFileName>`, where `category` is caller-supplied (`req.body.category`) and sanitized with `replace(/[^\w.\- ]/g, '_')`.
- On update, a new file is optional — editing a template's name/category doesn't force re-uploading the PDF.

Download: `GET /api/hr-desk/document-templates/:id/download` (same role gate) via `downloadDocumentTemplate`.

## Upload type 3 — Sales lead spreadsheet import

Route: `POST /api/sales-desk/leads/import` (auth + `role('sales','founder')`), handled by `importLeads` in `controllers/salesDeskController.js`.

- Multer config: `utils/upload.js`'s `uploadSpreadsheet` — memory storage, `.xlsx` mimetypes only, 15MB limit.
- This one is **never written to disk** — the buffer is parsed in-memory with the `exceljs` library (`ExcelJS.Workbook().xlsx.load(req.file.buffer)`) and only the parsed lead rows are persisted, into the `sales_leads` MongoDB collection, not as a stored file. See [11-business-logic.md](11-business-logic.md) for the parsing/normalization logic itself.

## Filename and path safety

Two layers of protection appear consistently across all disk-writing code:

1. **Filename sanitization at write time** — every user-supplied filename or category string is run through a regex that strips anything except word characters, dots, and hyphens (`[^\w.\-]` or `[^\w.\- ]` for categories that allow spaces) before it becomes part of a path.
2. **Containment check at write and read time** — this is the path-traversal protection referenced in the task brief. Every place that turns a stored/derived path into an absolute filesystem path checks it before touching the filesystem:

```js
// downloadEmployeeDocument, downloadDocumentTemplate, saveTemplateFile
if (!absolutePath.startsWith(UPLOAD_ROOT)) {
  return fail(res, { status: 400, message: 'Invalid document path', code: 'VALIDATION_ERROR' });
}
```

The comment on `downloadEmployeeDocument`'s check is explicit about the reasoning: `storagePath` there is always server-generated (built from `path.join()` with a sanitized filename, never taken raw from client input) — but the check "costs nothing and rules out any path-escape regression as this code evolves." `saveTemplateFile`'s version guards the one place where the input (`category`) genuinely is caller-supplied, even though it's sanitized first — the comment there calls this containment check "what actually rules out a path-escape regardless of how it got past sanitization." This is the currently-implemented defense, not a hypothetical fix.

## Auth gating — files are never served statically

There is no `express.static()` mount pointing at `uploads/` anywhere in `server.js`. Every single file read goes through one of the three authenticated download routes above (`auth` + `role('hr','founder')` middleware), which resolve the real path server-side and stream it with `res.download()`. A client can never guess or request a raw file path directly — only `/api/hr-desk/employees/:id/documents/:docType/download` and `/api/hr-desk/document-templates/:id/download` exist as read paths, and both require a valid session with the right role.

## Operational note: no redundancy

Because storage is local disk on one self-hosted server (see [20-deployment.md](20-deployment.md) for the `192.168.1.23` host), an uploaded employee document or template exists in exactly one place. There is no automatic backup, replication, or cloud redundancy for these files in the code or configuration reviewed. This is a durability risk worth flagging to whoever operates the server (disk failure = data loss for anything under `uploads/`) — it is an operational/infrastructure consideration, not a bug in the application code itself.
