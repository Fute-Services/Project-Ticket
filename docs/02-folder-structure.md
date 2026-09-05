# 02 — Folder Structure

All paths below are relative to `main/backend/`. `node_modules/` is excluded — it's third-party code, not part of this app's own structure (see `19-dependencies.md` for what's in it).

```
main/backend/
├── server.js                  # App entrypoint — middleware, routing, startup/shutdown
├── package.json                # Dependencies + npm scripts (start, dev)
├── .env / .env.example         # Environment variables (see 13-environment-variables.md)
├── config/
│   └── db.js                   # Firestore-shaped shim over the native MongoDB driver + auth helpers
├── controllers/                # Business logic — one file per feature area (24 files)
├── middleware/                 # Express middleware — auth, CSRF, role/permission gates, error handling (5 files)
├── routes/                     # Express routers — HTTP method+path → controller wiring (12 files)
├── utils/                      # Shared helpers — JWT, cookies, sessions, pagination, mail, etc. (10 files)
├── uploads/                    # Local disk storage for uploaded files (self-hosted, no cloud bucket)
│   └── document-templates/     # HR document template PDFs (populated at runtime)
└── .vercel/                     # Leftover Vercel project link from before the backend moved to self-hosting
```

## Root files

| File | Purpose | What breaks if removed |
|---|---|---|
| `server.js` | Creates the Express app, registers all global middleware, mounts every router, defines `/`, `/healthz`, the 404 handler, and starts/stops the HTTP server. | The whole application — nothing else can run without this file. |
| `package.json` | Declares dependencies (`express`, `mongodb`, `jsonwebtoken`, etc.) and the `start`/`dev` npm scripts. | `npm install`/`npm start`/`npm run dev` stop working; dependency versions become undocumented. |
| `.env.example` | Documents which environment variables the app reads, with safe placeholder values, for anyone setting up a new environment. | No functional break (it's not loaded at runtime), but new deployments would have to guess required env vars from source. |
| `.env` / `.env.local` | Actual environment variable values for this machine (`.env` loaded by `dotenv`; `.env.local` here only holds a Vercel CLI token, unrelated to the app runtime). | The app fails fast on startup if `JWT_SECRET` is missing (`server.js`'s explicit check); other vars fall back to hardcoded defaults in `config/db.js`/`utils/mailer.js`. |

## `config/`

| File | Purpose | What breaks if removed |
|---|---|---|
| `db.js` | The single point of contact with MongoDB. Implements a Firestore-Admin-SDK-shaped API (`collection().doc().get/set/update/delete`, `.where().orderBy().limit()`, `.count()`, `db.batch()`, `db.runTransaction()`) on top of the native `mongodb` driver, plus a hand-rolled `auth` object (`createUser`, `getUserByEmail`, `updateUser`, `deleteUser`, `verifyPassword`) that replaces Firebase Auth. Also exports `FieldValue.arrayUnion` and `FieldPath.documentId()` shims. | Every controller and most utils/middleware import `{ db }` (or `{ auth }`) from here — removing it breaks the entire backend; there is no other database access path. |

## `controllers/` (24 files)

| File | One-line purpose |
|---|---|
| `authController.js` | Register/login/refresh/me/verify-password/logout — the whole session lifecycle. |
| `complaintControllerFactory.js` | Factory producing the shared HR/IT ticket CRUD logic (create/list/my/search/status/fields/delete/reopen). |
| `hrController.js` | HR ticket queue — a thin instantiation of `complaintControllerFactory` for `hr_complaints`. |
| `itController.js` | IT ticket queue — a thin instantiation of `complaintControllerFactory` for `it_complaints`. |
| `approvalController.js` | Founder/HR approval workflow for tickets escalated to "Waiting Approval", plus manual approval requests. |
| `assetController.js` | IT asset inventory CRUD. |
| `chatController.js` | Team chat — channel/DM messages, people directory, DM channel resolution. |
| `dashboardController.js` | Super Admin landing-page aggregate stats, global search, activity timeline, dashboard layout prefs. |
| `departmentController.js` | Department registry CRUD (used for dropdowns and org structure). |
| `hrDeskController.js` | HR Desk module — email sending, a generic CRUD factory (`makeCrud`) for 9 HR sub-resources, employee document uploads/downloads, document templates, attendance self-check-in/out, extra-hours logging, self-service leave/performance summaries. |
| `leaveController.js` | Employee leave request apply/list/decide, with founder-vs-HR approval routing by department. |
| `notificationController.js` | Read/update the notification-rules settings doc. |
| `permissionController.js` | Read/update role-level page permissions and action-level permission matrix. |
| `renderController.js` | Production render-job tracker CRUD. |
| `salesDeskController.js` | Sales lead CRUD, call logging, Excel (.xlsx) lead import (two source formats), CSV export, sales settings, campaign tracking. |
| `securityController.js` | Super Admin Security Center — session listing/revocation, force-logout, failed-login/locked-account views, account unlock. |
| `slaController.js` | SLA policy CRUD and per-queue SLA compliance computation. |
| `staffController.js` | Returns active staff names for a given role (used for "Resolved By" dropdowns). |
| `superAdminUserController.js` | Full user management (create/update/deactivate/delete/reset-password), merged complaints view, audit log reads. |
| `systemSettingsController.js` | Read/update global system settings (SLA hours, working hours, holidays). |
| `taskProjectController.js` | Coordinator task/project board CRUD, with employee-scoped task visibility. |
| `analyticsController.js` | Cross-department analytics snapshot (JSON) and CSV export. |

## `middleware/` (5 files)

| File | One-line purpose |
|---|---|
| `authMiddleware.js` | Verifies the JWT, re-checks the live user profile (cached), checks session revocation, sets `req.user`. |
| `csrfMiddleware.js` | Double-submit-cookie CSRF check for every mutating request except login/register/refresh. |
| `roleMiddleware.js` | Coarse allow-list gate: `role('hr','founder')` rejects any other `req.user.role`. |
| `permissionMiddleware.js` | Fine-grained per-resource/action gate (`requirePermission('assets','delete')`) backed by a cached Super-Admin-editable permission matrix. |
| `errorMiddleware.js` | Express error-handling middleware (4-arg signature) — converts any thrown/rejected error into the uniform JSON error envelope. |

## `routes/` (12 files)

| File | Mounted at (`server.js`) | One-line purpose |
|---|---|---|
| `authRoutes.js` | `/api/auth` | Register, login, refresh, me, verify-password, logout. |
| `hrRoutes.js` | `/api/hr` | HR ticket queue endpoints. |
| `itRoutes.js` | `/api/it` | IT ticket queue + IT asset endpoints. |
| `founderRoutes.js` | `/api/founder` | Super Admin/Founder: users, audit logs, analytics, search, dashboard, SLA policies, notification rules, role/action permissions, system settings, departments. |
| `securityRoutes.js` | `/api/founder/security` | Super Admin Security Center endpoints. |
| `approvalRoutes.js` | `/api/approvals` | Approval workflow endpoints. |
| `leaveRoutes.js` | `/api/leave` | Employee leave request endpoints. |
| `coordinatorRoutes.js` | `/api/coordinator` | Task/project board endpoints. |
| `renderRoutes.js` | `/api/production/renders` | Render-job tracker endpoints. |
| `hrDeskRoutes.js` | `/api/hr-desk` | HR Desk module endpoints (largest route file — many sub-resources). |
| `salesDeskRoutes.js` | `/api/sales-desk` | Sales Desk module endpoints. |
| `chatRoutes.js` | `/api/chat` | Team chat endpoints. |

## `utils/` (10 files)

| File | One-line purpose |
|---|---|
| `jwt.js` | Signs/verifies the short-lived (15 min) access token. |
| `cookies.js` | Central place for all cookie names, options, and set/clear helpers (access, refresh, CSRF cookies). |
| `sessions.js` | Refresh-token session storage, hashing, rotation, reuse detection, revocation cache. |
| `respond.js` | Uniform response envelope helpers: `ok`, `created`, `noContent`, `fail`. |
| `pagination.js` | Shared cursor-based pagination (`paginatedQuery`) used across most "list" endpoints. |
| `upload.js` | `multer` configuration for document uploads (PDF/JPG/Word) and spreadsheet uploads (.xlsx). |
| `mailer.js` | Nodemailer transport + HTML email templates (new complaint, status update) + `escapeHtml`. |
| `constants.js` | Shared numeric constants for read caps (`UNPAGINATED_READ_LIMIT`, `FOUNDER_LIST_CAP`, `DASHBOARD_SCAN_CAP`). |
| `auditLog.js` | Writes to the `audit_logs` collection; fire-and-forget from the caller's perspective. |
| `notificationRules.js` | Loads (with defaults merged in) the notification-rules settings doc used to gate complaint emails. |

## `uploads/`

| Path | Purpose | What breaks if removed |
|---|---|---|
| `uploads/` | Root directory for all locally-stored uploaded files (employee documents, document templates). Referenced as `UPLOAD_ROOT` in `hrDeskController.js`. | Employee document uploads/downloads and document-template uploads/downloads fail (file writes/reads target this directory; download routes also `path.startsWith(UPLOAD_ROOT)`-check against it for path-traversal protection). |
| `uploads/document-templates/` | Populated at runtime when HR uploads a document template (`createDocumentTemplate`/`updateDocumentTemplate` in `hrDeskController.js`, via `saveTemplateFile`). | Existing template downloads would 404 if the folder/files were deleted; new uploads recreate the folder automatically (`fs.mkdirSync(..., {recursive:true})`). |

## `.vercel/`

Leftover project link (`project.json` → project name `"backend"`) from when this backend was deployed on Vercel. Per `docs/BACKEND_ARCHITECTURE_STATUS.md` and `docs/DEPLOYMENT_PIPELINE_STATUS.md`, the backend is now self-hosted (Windows server at `192.168.1.23`, Node process + local MongoDB), so this folder is not part of the current deployment path — see `20-deployment.md`.

## Why controllers/middleware/routes/utils are separated this way

- **`routes/`** only wires HTTP verbs+paths to middleware+controller functions — no business logic lives here, so route files stay small and are the fastest place to answer "what can call this controller, and under what role?"
- **`middleware/`** holds only cross-cutting concerns reused across many routes (auth, CSRF, role/permission checks, error handling) — nothing here is specific to one feature.
- **`controllers/`** holds all business logic, one file per feature area, so a change to (say) the leave-approval routing rule only touches `leaveController.js`.
- **`utils/`** holds logic reused by multiple controllers/middleware that isn't itself a controller or middleware (JWT, cookies, pagination, mail, etc.) — extracting these avoided duplication that had already started drifting between `hrController.js`/`itController.js` before `complaintControllerFactory.js` existed (see that file's own header comment).

See `03-file-by-file-explanation.md` for per-file deep dives, and `01-backend-architecture.md` for how these layers connect end-to-end.
