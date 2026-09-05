# 04 — API Documentation

Every HTTP endpoint the Fute Portal backend exposes, as actually wired in `server.js` and its 12 route modules. All endpoints live under `/api/*` except the two health/root endpoints and the catch-all.

## Response envelope (applies to every endpoint below)

Defined in `utils/respond.js`:

- **Success** (`ok`/`created`): `{ "success": true, "message": "...", "data": <payload>, "meta"?: {...} }` — status 200 (`ok`) or 201 (`created`).
- **Failure** (`fail`): `{ "success": false, "message": "...", "error": { "code": "STRING_CODE", "details": null|object } }` — status per call site.
- **No content**: `noContent` → HTTP 204, empty body (defined but not currently called by any controller read in this pass — not determinable that it's used anywhere).

Common error codes seen across controllers: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `INVALID_TOKEN` (401), `ACCOUNT_NOT_FOUND` (401), `SESSION_REVOKED` (401), `INVALID_CREDENTIALS` (401), `ACCOUNT_LOCKED` (423), `ACCOUNT_DEACTIVATED` (403), `FORBIDDEN` (403), `CSRF_INVALID` (403), `CORS_NOT_ALLOWED` (403), `NOT_FOUND` (404), `ASSET_ALREADY_EXISTS` (409), `CONFLICT` (409), `DEPARTMENT_IN_USE` (400), `RATE_LIMITED` (429), `SESSION_EXPIRED` (401), `EMAIL_SEND_FAILED` (502), `SERVICE_UNAVAILABLE` (503), `INTERNAL_ERROR` / `HTTP_<status>` (500), `REQUEST_FAILED` (varies).

## Rate limiting

| Limiter | Window | Limit | Applied to |
|---|---|---|---|
| Global (`server.js`) | 15 min | 300 req/IP | Every route (baseline) |
| `authLimiter` (`routes/authRoutes.js`) | 15 min | 10 req/IP | `/api/auth/register`, `/login`, `/refresh`, `/verify-password` |
| `expensiveReadLimiter` (`routes/founderRoutes.js`) | 60 s | 20 req/IP | `/api/founder/analytics`, `/analytics/export`, `/dashboard-overview`, `/sla-compliance` |

All rate-limit rejections return `429` with `code: RATE_LIMITED`.

## Endpoint summary

| Method | Path | Auth | Roles / gate |
|---|---|---|---|
| GET | `/` | No | — |
| GET | `/healthz` | No | — |
| POST | `/api/auth/register` | No | — (creates `employee`) |
| POST | `/api/auth/login` | No | — |
| POST | `/api/auth/refresh` | No (refresh cookie) | — |
| GET | `/api/auth/me` | Yes | any |
| POST | `/api/auth/verify-password` | Yes | any (own password) |
| POST | `/api/auth/logout` | Yes | any |
| POST | `/api/hr/complaints` | Yes | any |
| GET | `/api/hr/complaints` | Yes | hr, founder |
| GET | `/api/hr/complaints/my` | Yes | any |
| GET | `/api/hr/complaints/search` | Yes | any |
| PATCH | `/api/hr/complaints/:id/status` | Yes | hr, founder |
| PATCH | `/api/hr/complaints/:id/fields` | Yes | owner or hr/founder/superadmin |
| DELETE | `/api/hr/complaints/:id` | Yes | owner only |
| PATCH | `/api/hr/complaints/:id/reopen` | Yes | owner only |
| GET | `/api/hr/staff` | Yes | hr, founder |
| POST | `/api/it/complaints` | Yes | any |
| GET | `/api/it/complaints` | Yes | it, founder |
| GET | `/api/it/complaints/my` | Yes | any |
| GET | `/api/it/complaints/search` | Yes | any |
| PATCH | `/api/it/complaints/:id/status` | Yes | it, founder |
| PATCH | `/api/it/complaints/:id/fields` | Yes | owner or it/founder/superadmin |
| DELETE | `/api/it/complaints/:id` | Yes | owner only |
| PATCH | `/api/it/complaints/:id/reopen` | Yes | owner only |
| GET | `/api/it/staff` | Yes | it, founder |
| POST | `/api/it/assets` | Yes | it, founder + `assets.create` |
| GET | `/api/it/assets` | Yes | it, founder |
| PUT | `/api/it/assets/:id` | Yes | it, founder + `assets.edit` |
| DELETE | `/api/it/assets/:id` | Yes | it, founder + `assets.delete` |
| POST | `/api/approvals` | Yes | it, hr, founder |
| GET | `/api/approvals` | Yes | it, hr, founder |
| PATCH | `/api/approvals/:id/decide` | Yes | founder (or hr for `document`/`extra-hours`) |
| POST | `/api/approvals/:id/remarks` | Yes | it, hr, founder |
| POST | `/api/leave` | Yes | any |
| GET | `/api/leave` | Yes | hr, founder |
| GET | `/api/leave/my` | Yes | any |
| PATCH | `/api/leave/:id/decide` | Yes | hr, founder (Admin/Ops & IT leave: founder only) |
| GET | `/api/coordinator/projects` | Yes | any |
| GET | `/api/coordinator/tasks` | Yes | any (employee sees only own) |
| POST | `/api/coordinator/tasks` | Yes | coordinator, founder |
| PATCH | `/api/coordinator/tasks/:id/status` | Yes | assignee, coordinator, or founder |
| PATCH | `/api/coordinator/tasks/:id` | Yes | coordinator, founder |
| GET | `/api/production/renders` | Yes | any |
| POST | `/api/production/renders` | Yes | any |
| PATCH | `/api/production/renders/:id` | Yes | any |
| GET/POST/PATCH/DELETE | `/api/hr-desk/*` (see below) | Yes | mostly hr/founder; some self-service |
| GET/POST/PATCH/DELETE | `/api/sales-desk/*` (see below) | Yes | sales, founder |
| GET/POST | `/api/chat/*` (see below) | Yes | any (channel/DM scoped) |
| GET/POST/PATCH/DELETE | `/api/founder/*` (see below) | Yes | mostly superadmin |
| GET/PATCH | `/api/founder/security/*` | Yes | superadmin only |

**Total documented endpoints: 92** (counting each route line in the 12 route files + root + healthz + 404 fallback).

---

## `/api/auth` (`routes/authRoutes.js` → `controllers/authController.js`)

### POST /api/auth/register
- Auth: No. Rate-limited (`authLimiter`).
- Body: `{ email, password (min 10 chars), full_name, department? }`
- Always creates role `employee` — self-registration cannot pick a role.
- Success: 201, `data: { id, role, full_name, email, permissionOverrides: {}, csrfToken }`. Sets `fute_token`, `fute_refresh`, `fute_csrf` cookies.
- Errors: 400 `VALIDATION_ERROR` (missing fields / short password), 400 `REGISTRATION_FAILED` (email already exists — from `auth.createUser`).
- Example request:
```json
POST /api/auth/register
{ "email": "jane@fute.com", "password": "correcthorsebattery", "full_name": "Jane Doe", "department": "Design" }
```
- Example response:
```json
{ "success": true, "message": "Account created successfully",
  "data": { "id": "AbCdEf...", "role": "employee", "full_name": "Jane Doe", "email": "jane@fute.com", "permissionOverrides": {}, "csrfToken": "<token>" } }
```

### POST /api/auth/login
- Auth: No. Rate-limited (`authLimiter`).
- Body: `{ email, password, remember? = true }`
- Locks account after 5 failed attempts (`LOCK_THRESHOLD` in `authController.js`) → 423 `ACCOUNT_LOCKED`.
- Success: 200, `data: { id, role, full_name, email, department, designation, employeeId, permissionOverrides, dashboardLayout, csrfToken }`. Sets the 3 cookies as above.
- Errors: 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS`, 423 `ACCOUNT_LOCKED`, 400 `NOT_FOUND` (profile missing), 403 `ACCOUNT_DEACTIVATED`.

### POST /api/auth/refresh
- Auth: No `authMiddleware` — authenticates itself via the `fute_refresh` httpOnly cookie. Rate-limited. CSRF-exempt.
- Body: none.
- Success: 200, `data: { refreshed: true, csrfToken }`. Rotates refresh token, re-issues access + csrf cookies.
- Errors: 401 `UNAUTHORIZED` (no cookie), 401 `SESSION_EXPIRED` (expired/revoked/reused — see `utils/sessions.js`), 401 `ACCOUNT_NOT_FOUND`.

### GET /api/auth/me
- Auth: Yes.
- Success: 200, `data: { id, email, role, full_name, department, designation, employeeId, permissionOverrides, dashboardLayout, csrfToken }`.
- Errors: 404 `NOT_FOUND`.

### POST /api/auth/verify-password
- Auth: Yes. Rate-limited.
- Body: `{ password }` — checked against the **caller's own** email.
- Success: 200, `data: { valid: boolean }`.
- Errors: 400 `VALIDATION_ERROR`.

### POST /api/auth/logout
- Auth: Yes.
- Revokes the caller's session (`SESSIONS.doc(sid)`), clears all 3 cookies.
- Success: 200, `data: { loggedOut: true }`.

---

## `/api/hr` and `/api/it` (`hrController.js`/`itController.js`, both built by `complaintControllerFactory.createComplaintController`)

Both queues share identical routes/shapes; IT additionally requires `category`/`sub_category` on create and exposes `vpnNo`/`department` fields.

### POST /api/hr/complaints · POST /api/it/complaints
- Auth: Yes (any role).
- Body: `{ name, role?, department, description, complaint_date, priority, employeeId? }` (+ IT requires `category`, `sub_category`; IT also accepts `approval`, `vpnNo`).
- Success: 201, `data: { complaint: {...full doc, id}, token: "FT-HR-XXXXXX" | "FT-IT-XXXXXX" }`.
- Side effect: sends a "New Complaint" email to HR_EMAIL/IT_EMAIL (or configured override) if `notificationRules` enables it.
- Errors: 400 `VALIDATION_ERROR`.

### GET /api/hr/complaints · GET /api/it/complaints
- Auth: hr/founder or it/founder. Cursor-paginated (`?after=<cursor>`).
- Success: 200, `data: { items: [...], nextCursor: string|null }`.

### GET /api/hr/complaints/my · GET /api/it/complaints/my
- Auth: any. Returns caller's own tickets (capped at 200, `UNPAGINATED_READ_LIMIT`).
- Success: 200, `data: [...]` (plain array, not paginated envelope).

### GET .../complaints/search?token=FT-XX-XXXXXX
- Auth: any.
- Success: 200, `data: {...ticket}`. Errors: 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`.

### PATCH .../complaints/:id/status
- Auth: hr/founder or it/founder.
- Body: `{ status }` — one of `Pending`, `In Progress`, `Waiting Approval`, `Completed`.
- Transitioning into `Waiting Approval` atomically creates an `approvals` doc (single MongoDB transaction).
- Success: 200, `data: {...updated ticket}`. Sends a status-update email to the submitter if enabled.
- Errors: 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`.

### PATCH .../complaints/:id/fields
- Auth: owner (restricted field set) or hr/it/founder/superadmin (full field set — see `11-business-logic.md`).
- Body: any subset of the allowed fields for the caller's role.
- Errors: 403 `FORBIDDEN`, 400 `VALIDATION_ERROR` (no editable fields sent), 404 `NOT_FOUND`.

### DELETE .../complaints/:id
- Auth: owner only. Also deletes any linked `approvals` doc.
- Success: 200, `data: { id, deleted: true }`. Errors: 403 `FORBIDDEN`, 404 `NOT_FOUND`.

### PATCH .../complaints/:id/reopen
- Auth: owner only, and only from status `Completed`.
- Errors: 403 `FORBIDDEN`, 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`.

### GET /api/hr/staff · GET /api/it/staff
- Auth: hr/founder or it/founder. Returns `[{ id, full_name }]` for active users of that role (`controllers/staffController.js`).

### IT-only: `/api/it/assets`
- POST (create): body `{ id, type, model, serialNo?, assignedTo?, department?, purchaseDate?, warrantyEnd?, status?, approvalStatus?, hardDisk?, componentsList?, componentsLog?, history? }`. `id` must match `/^[\w-]+$/`. Gated by role **and** `requirePermission('assets','create')`. 409 `ASSET_ALREADY_EXISTS` if id taken.
- GET (list): cursor-paginated, `data: { items, nextCursor }`.
- PUT `:id` (update): full-record edit of the same field list. Gated by `requirePermission('assets','edit')`.
- DELETE `:id`: gated by `requirePermission('assets','delete')`.

---

## `/api/approvals` (`controllers/approvalController.js`)

| Method | Path | Roles |
|---|---|---|
| POST | `/api/approvals` | it, hr, founder |
| GET | `/api/approvals?after=` | it, hr, founder |
| PATCH | `/api/approvals/:id/decide` | hr, founder (route-level: hr+founder; category-level: only `document` is HR-decidable, see below) |
| POST | `/api/approvals/:id/remarks` | it, hr, founder |

- POST body: `{ title, sub?, requestedBy?, priority?, category?, source?, assetIdRef? }` → 201 `data: {...approval}`.
- GET: paginated `data: { items, nextCursor }` sorted by `createdAt` desc.
- PATCH `:id/decide` body: `{ status: "approved"|"rejected" }`. Runs a MongoDB transaction updating the approval, its linked ticket (if any), and its linked `extra_hours` doc (if any). Role check inside the transaction: founder can decide anything; hr can only decide `category === 'document'` (constant `HR_DECIDABLE_CATEGORIES`, currently `['document']` — the code comment also mentions `extra-hours` as founder-only, i.e. **not** HR-decidable). Errors: 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`, 409 `CONFLICT` (already decided), 403 `FORBIDDEN`.
- POST `:id/remarks` body: `{ text }` → appends `{ text, by, at }` to `remarks[]`, emails founders. Errors: 400 `VALIDATION_ERROR`, 404 `NOT_FOUND`.

---

## `/api/leave` (`controllers/leaveController.js`)

| Method | Path | Roles |
|---|---|---|
| POST | `/api/leave` | any |
| GET | `/api/leave?after=` | hr, founder |
| GET | `/api/leave/my` | any |
| PATCH | `/api/leave/:id/decide` | hr, founder (Admin/Ops or IT department: founder only) |

- POST body: `{ type, from, to, days, reason? }`. Success 201, `data: {...leave request}`.
- PATCH decide body: `{ status: "Approved"|"Rejected"}`. 403 `FORBIDDEN` if an hr user tries to decide an Admin/Ops or IT department request.

---

## `/api/coordinator` (`controllers/taskProjectController.js`)

| Method | Path | Roles |
|---|---|---|
| GET | `/api/coordinator/projects` | any |
| GET | `/api/coordinator/tasks?after=` | any (employees see only their own, filtered by `assignee === full_name`) |
| POST | `/api/coordinator/tasks` | coordinator, founder |
| PATCH | `/api/coordinator/tasks/:id/status` | task's own assignee, coordinator, or founder |
| PATCH | `/api/coordinator/tasks/:id` | coordinator, founder |

- POST body: `{ projectId, title, assignee, priority?, dueDate?, duration?, figma?, pr? }`.
- PATCH `:id/status` body: `{ status }`.
- PATCH `:id` body: any of `title, assignee, priority, dueDate, duration, comments, attachments, figma, pr, status`.

---

## `/api/production/renders` (`controllers/renderController.js`)

| Method | Path | Roles |
|---|---|---|
| GET | `/api/production/renders?after=` | any |
| POST | `/api/production/renders` | any |
| PATCH | `/api/production/renders/:id` | any |

- POST body: `{ personName (required), date?, sequence?, frameNo?, endDate?, allocatedSystems?, status? }`.
- No role restriction on any of these three routes.

---

## `/api/hr-desk` (`controllers/hrDeskController.js`)

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/send-email` | hr, founder | `{to, subject, body}`, sends real SMTP mail + logs to `sent_emails` |
| GET | `/send-email` | hr, founder | Sent folder history |
| GET | `/employees` | hr, founder, coordinator | Roster read (coordinator needs it to pick task assignees) |
| GET | `/attendance/me/today` | hr, founder, employee | Self only |
| GET | `/attendance/me` | hr, founder, employee | Self only |
| POST | `/attendance/check-in` | hr, founder, employee | `{workMode?: 'Office'|'WFH'|'Leave', toDate?, reason?}` |
| POST | `/attendance/check-out` | hr, founder, employee | none |
| POST | `/employees/:id/documents/:docType` | hr, founder | multipart, field `file` |
| GET | `/employees/:id/documents/:docType/download` | hr, founder | streams the file |
| GET | `/leave/me` | hr, founder, employee | Self only |
| GET | `/performance/me` | hr, founder, employee | Self only |
| GET | `/extra-hours/me` | hr, founder, employee | Self only |
| GET | `/extra-hours/mentions` | hr, founder, employee | Self (matched by name) |
| POST | `/extra-hours` | hr, founder, employee | `{projectCode, hours, date, fromTime?, toTime?, teammates?}` |
| GET | `/extra-hours` | hr, founder | Everyone's entries |
| GET/POST/PATCH/DELETE | `/document-templates` (+`/:id`, `/:id/download`) | hr, founder | POST/PATCH are multipart (`file`) |
| GET/POST/PATCH/DELETE | `/employees`, `/candidates`, `/interviews`, `/meetings`, `/attendance` (read-only, no POST/PATCH), `/feedback`, `/jobs`, `/performance`, `/leave-entries` | hr, founder | Generated by the `makeCrud` loop in `hrDeskRoutes.js` |

Request/response bodies for the `makeCrud`-generated resources mirror each resource's `editableFields` array declared in `hrDeskController.js` (see `03-file-by-file-explanation.md` for the full per-resource field lists — too long to repeat per-endpoint here).

Document upload success: `data: { id, [urlField]: downloadUrl, [fileNameField]: originalname, approvalId }`. Upload also creates an `approvals` doc (`category: 'document'`) and emails founders.

Extra-hours submit success: `data: {...entry, approvalId}`. Also creates an `approvals` doc (`category: 'extra-hours'`) and emails founders.

Check-in/out conflict responses: 409 `CONFLICT` ("Already checked in", "Already checked out", "You have not checked in today").

---

## `/api/sales-desk` (`controllers/salesDeskController.js`) — all routes `sales`/`founder` only

| Method | Path | Notes |
|---|---|---|
| GET | `/leads` | Up to 3000 leads (`SALES_LEADS_READ_LIMIT`) |
| POST | `/leads` | `{companyName (required), ...EDITABLE_FIELDS}` |
| PATCH | `/leads/:id` | Partial update of `EDITABLE_FIELDS` |
| DELETE | `/leads/:id` | — |
| POST | `/leads/:id/log-call` | `{outcome (required), comment?, nextCallDate?}` — appends to `callLog[]` via `FieldValue.arrayUnion` |
| POST | `/leads/import` | multipart, field `file` (.xlsx). Auto-detects Bangalore-list vs Marketing-Master-Sheet format. `data: {imported, created, updated}` |
| GET | `/email-campaign/export` | CSV download (`Content-Type: text/csv`) |
| GET/PATCH | `/settings` | `{monthlyRevenueTarget, dailyCallTargetPerRep}` |
| GET/POST/DELETE | `/campaigns` (+`/:id`) | `{name (required), sourceTag?, targetCity?, sentDate?}` |

Errors: 400 `VALIDATION_ERROR` (missing companyName/outcome/name, unreadable workbook, no leads found), 404 `NOT_FOUND`.

---

## `/api/chat` (`controllers/chatController.js`)

| Method | Path | Notes |
|---|---|---|
| GET | `/directory` | Lightweight people list, excludes self and inactive users, capped at 500 |
| GET | `/dm/:otherUserId` | Resolves (doesn't create) a deterministic DM channel id `dm-<sortedUidA>-<sortedUidB>` |
| GET | `/:channelId/messages?since=` | `since` omitted → last 50 messages oldest-first; `since` given → only newer messages, ascending |
| POST | `/:channelId/messages` | `{text (required, trimmed non-empty)}` |

- DM channels (`dm-*`) are access-checked: only the two participants (parsed from the id) may read/post — 403 `FORBIDDEN` otherwise. Fixed channels (`general`, `it-support`, ...) and `project-<id>` channels are open to any authenticated user.
- POST success: 201, `data: {id, channelId, senderId, senderName, senderRole, text, created_at}`.
- 400 `VALIDATION_ERROR` for empty text or self-DM.

---

## `/api/founder` (multiple controllers, see `routes/founderRoutes.js`)

| Method | Path | Roles | Controller |
|---|---|---|---|
| GET | `/complaints` | founder | `superAdminUserController.getAllComplaints` (merged HR+IT, capped 200/collection) |
| GET | `/users?role=` | superadmin | `superAdminUserController.listUsers` |
| POST | `/users` | superadmin | `createUser` — `{email, password (min 10), full_name, role}`, role ∈ `ASSIGNABLE_ROLES` (`it,hr,sales,coordinator,employee`) |
| PATCH | `/users/:uid` | superadmin | `updateUser` — cannot edit own account; role ∈ `EDITABLE_ROLES` (adds `founder`) |
| PATCH | `/users/:uid/permissions` | superadmin | `updateUserPermissions` — `{permissionOverrides}` |
| PATCH | `/users/:uid/active` | superadmin | `setUserActive` — `{active, reason?}`, cannot deactivate self |
| PATCH | `/users/:uid/reset-password` | superadmin | `resetUserPassword` — `{password (min 10)}` |
| DELETE | `/users/:uid` | superadmin | `deleteUser` — cannot delete self, irreversible |
| GET | `/audit-logs?limit=` | superadmin | `getAuditLogs` (max 500) |
| GET | `/analytics?from=&to=` | superadmin | `analyticsController.getAnalytics` (rate-limited) |
| GET | `/analytics/export?from=&to=` | superadmin | `getAnalyticsCsv` → CSV download (rate-limited) |
| GET | `/search?q=` | superadmin | `dashboardController.search` |
| GET | `/activity-timeline?limit=` | superadmin | `getActivityTimeline` (max 300) |
| PATCH | `/dashboard-layout` | superadmin | `updateDashboardLayout` — `{widgets: []}` |
| GET | `/dashboard-overview` | superadmin | `getDashboardOverview` (rate-limited, 30s cache) |
| GET | `/sla-policies` | any logged in | `slaController.getSlaPolicies` |
| PUT | `/sla-policies` | superadmin | `updateSlaPolicies` — `{policies}` |
| GET | `/sla-compliance` | superadmin | `getSlaCompliance` (rate-limited) |
| GET/PUT | `/notification-rules` | superadmin | `notificationController` |
| GET | `/role-permissions` | any logged in | `permissionController.getRolePermissions` |
| PUT | `/role-permissions` | superadmin | `updateRolePermissions` — `{permissions}` |
| GET/PUT | `/system-settings` | any (GET) / superadmin (PUT) | `systemSettingsController` — `{settings}` |
| GET | `/departments` | any logged in | `departmentController.listDepartments` |
| POST/PATCH/DELETE | `/departments(/:id)` | superadmin | `{name, head?}` / `{name?,head?,active?}` / `{reason?}` |
| GET/PUT | `/action-permissions` | any (GET) / superadmin (PUT) | `permissionController` — `{permissions}` |
| GET | `/permissions` | any logged in | Combined `{pages, actions}` |

## `/api/founder/security` (`controllers/securityController.js`) — superadmin only

| Method | Path | Notes |
|---|---|---|
| GET | `/sessions?uid=&includeRevoked=` | Joined with user email/name |
| PATCH | `/sessions/:id/revoke` | `{reason?}` |
| PATCH | `/users/:uid/force-logout` | Revokes every active session for the user |
| GET | `/failed-logins?limit=` | Max 500 |
| GET | `/locked-accounts` | — |
| PATCH | `/users/:uid/unlock` | Resets `locked` + `failedLoginAttempts` |

---

## Root / health / fallback

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/` | No | `data: { message: "Fute Portal API running" }` |
| GET | `/healthz` | No | `data: { mongo: "reachable", pingMs }` or 503 `SERVICE_UNAVAILABLE` |
| * | (unmatched) | — | 404 `NOT_FOUND` JSON (not Express's default HTML page) |

Any unhandled error anywhere falls through to `middleware/errorMiddleware.js`, which logs it server-side and returns a generic 500 `INTERNAL_ERROR` (or the error's own `.status`/`.code` if it was deliberately thrown with those, e.g. `Object.assign(new Error(...), {status: 404})`).
