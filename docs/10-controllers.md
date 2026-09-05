# 10 — Controllers

All controllers follow the same conventions unless noted: they receive `(req, res)`, read `req.user` (set by `authMiddleware`), respond via `utils/respond.js` (`ok`/`created`/`fail`), and let `express-async-errors` forward any thrown error to `middleware/errorMiddleware.js`. Validation failures call `fail(res, {status:400, code:'VALIDATION_ERROR', ...})` directly; business-rule conflicts thrown inside a `db.runTransaction()` use `Object.assign(new Error(msg), {status})` so the transaction's `.catch()` can map it to the right HTTP status. Full business-rule reasoning lives in `11-business-logic.md` — this file covers responsibilities, inputs, and DB/error-handling shape only.

## `authController.js`
- **Responsibilities:** `register`, `login`, `refresh`, `getMe`, `verifyPassword`, `logout` — the entire session lifecycle.
- **Inputs:** `req.body` (`email`, `password`, `full_name`, `department`, `remember`), cookies (`fute_refresh` on `refresh`), `req.user` (on `getMe`/`verifyPassword`/`logout`).
- **DB collections:** `users`, `failed_logins` (via `db`), plus `auth` (the `_auth_credentials` collection abstraction in `config/db.js`), and `sessions` (via `utils/sessions.js`).
- **Error handling:** explicit `fail()` calls for validation/lockout/deactivation; relies on `auth.createUser`/`auth.getUserByEmail` throwing on duplicate/missing accounts, caught and converted to `fail()`.
- **Notable:** owns the account-lockout counter (`LOCK_THRESHOLD = 5`) and the `PASSWORD_LOGIN_ENABLED` toggle. See `07-authentication.md` for the full flow.

## `complaintControllerFactory.js` (+ `hrController.js`, `itController.js`)
- **Responsibilities:** `createComplaintController(opts)` returns `{createComplaint, getAllComplaints, getMyComplaints, searchByToken, updateStatus, updateFields, deleteComplaint, reopenComplaint}` — shared logic for both ticket queues. `hrController.js` and `itController.js` are thin `opts` objects (collection name, token prefix, editable fields, notification rule keys, approval-record shape) passed into the factory.
- **Inputs:** `req.body` (ticket fields), `req.params.id`, `req.query.after` (pagination cursor), `req.query.token` (search).
- **DB collections:** `hr_complaints`/`it_complaints` (per instantiation), `users` (role/employee lookups), `approvals` (created inside `updateStatus`'s transaction).
- **Error handling:** `updateStatus` and the approval-record write happen inside one `db.runTransaction()`; a thrown `{status:404}` inside it is caught and mapped via `codeByStatus`. Mail-send failures are caught and logged, never fail the request.
- **Notable:** this factory exists because HR's and IT's controllers were previously hand-copied and had started drifting — see `11-business-logic.md` for the owner-vs-staff field-edit rule and the transactional approval hand-off.

## `approvalController.js`
- **Responsibilities:** `createApproval` (manual requests), `listApprovals`, `decideApproval`, `addRemark`.
- **Inputs:** `req.body` (`title`, `status`, `text`, etc.), `req.params.id`.
- **DB collections:** `approvals`, `users` (to find founders to email), plus reads/writes into whatever collection `complaintRef`/`extraHoursId` point at (`hr_complaints`/`it_complaints`/`extra_hours`).
- **Error handling:** `decideApproval` runs entirely inside `db.runTransaction()`; re-reads the approval's status before writing so a double-decide is rejected with 409, not silently re-applied.
- **Notable:** HR may decide `document`/`extra-hours`... actually only `document` is HR-decidable per `HR_DECIDABLE_CATEGORIES` (see `08-authorization.md`); role check happens *inside* the transaction since the category isn't known until the approval doc is read.

## `assetController.js`
- **Responsibilities:** `createAsset`, `getAllAssets`, `updateAsset`, `deleteAsset` — IT inventory.
- **Inputs:** `req.body` (asset fields, including a caller-chosen `id` used as the Mongo document id), `req.params.id`.
- **DB collections:** `assets`.
- **Error handling:** validates `id` against `/^[\w-]+$/`; 409 `ASSET_ALREADY_EXISTS` if the id is taken; 404 on missing asset for update/delete.
- **Notable:** writes are additionally gated by `requirePermission('assets', 'create'|'edit'|'delete')` at the route level (`routes/itRoutes.js`), on top of the `role('it','founder')` check.

## `chatController.js`
- **Responsibilities:** `listMessages`, `sendMessage`, `directory`, `resolveDmChannel`.
- **Inputs:** `req.params.channelId`/`otherUserId`, `req.query.since`, `req.body.text`.
- **DB collections:** `chat_messages`, `users` (directory).
- **Error handling:** 403 `FORBIDDEN` via `canAccessChannel()` if a DM channel id doesn't include the caller's uid.
- **Notable:** DM channel ids are deterministic (`dm-<sorted-uids>`) and computed, never stored as a separate "channel" document — see `24-data-flow.md`.

## `dashboardController.js`
- **Responsibilities:** `getDashboardOverview` (Super Admin landing page), `search` (global search), `getActivityTimeline`, `updateDashboardLayout`.
- **Inputs:** `req.query.q`/`limit`, `req.body.widgets`.
- **DB collections:** `users`, `departments`, `it_complaints`, `hr_complaints`, `approvals`, `leave_requests`, `assets`, `settings/sla_policies`, `sessions`, `failed_logins`.
- **Error handling:** mostly read-only aggregation; `updateDashboardLayout` validates `widgets` is an array.
- **Notable:** `computeDashboardOverview()` is cached 30s in-process (`dashboardCache`); imports `SLA_POLICIES_DOC`/`DEFAULT_SLA_POLICIES` from `slaController.js` and `DEPARTMENTS` from `departmentController.js` directly (module-level cross-controller imports, not HTTP calls).

## `departmentController.js`
- **Responsibilities:** `listDepartments`, `createDepartment`, `updateDepartment`, `deleteDepartment`.
- **Inputs:** `req.body` (`name`, `head`, `active`, `reason`), `req.params.id`.
- **DB collections:** `departments`, `users` (in-use check).
- **Error handling:** `deleteDepartment` 400s with `DEPARTMENT_IN_USE` if any user still references the department name.
- **Notable:** every write calls `logAudit()`. Exports `DEPARTMENTS` for `dashboardController.js`'s reuse.

## `hrDeskController.js` (largest controller — see `03-file-by-file-explanation.md` for full detail)
- **Responsibilities:** email sending/history; a generic `makeCrud(collectionName, requiredFields, editableFields, options)` factory instantiated for `employees`, `candidates`, `interviews`, `meetings`, `attendance`, `interview_feedback`, `open_jobs`, `performance_entries`, `leave_entries`, `document_templates`; employee document upload/download (local disk); document-template upload/download; self-service attendance check-in/check-out; extra-hours submission/listing/mentions; self-scoped leave summary and performance reads.
- **Inputs:** varies per sub-resource; multipart (`req.file`) for document uploads.
- **DB collections:** `sent_emails`, `approvals`, `employees`, `candidates`, `interviews`, `meetings`, `attendance`, `interview_feedback`, `open_jobs`, `performance_entries`, `leave_entries`, `document_templates`, `extra_hours`.
- **Error handling:** file-write failures thrown as `Object.assign(new Error(...), {status:502})`; unknown `docType` or missing employee → `fail()` with 400/404.
- **Notable:** document uploads/downloads include path-traversal containment checks (`absolutePath.startsWith(UPLOAD_ROOT)`) even though the path is always server-generated — see `15-security.md`.

## `leaveController.js`
- **Responsibilities:** `applyLeave`, `getAllLeaves`, `getMyLeaves`, `decide`.
- **Inputs:** `req.body` (`type`, `from`, `to`, `days`, `reason`, `status`), `req.params.id`.
- **DB collections:** `leave_requests`, `users` (department lookup).
- **Error handling:** 403 if a non-founder tries to decide Admin/Ops or IT department leave (`isFounderApproval()`).

## `notificationController.js`
- **Responsibilities:** `getNotificationRules`, `updateNotificationRules`.
- **Inputs:** `req.body.rules`.
- **DB collections:** `settings/notification_rules` (via `utils/notificationRules.js`).
- **Error handling:** 400 if `rules` isn't an object.

## `permissionController.js`
- **Responsibilities:** `getRolePermissions`, `updateRolePermissions`, `getActionPermissions`, `updateActionPermissions`, `getPermissions` (combined read).
- **Inputs:** `req.body.permissions`.
- **DB collections:** `settings/role_permissions`, `settings/action_permissions` (via `middleware/permissionMiddleware.js`'s exported `ACTION_PERMISSIONS_DOC`).
- **Error handling:** 400 if `permissions` isn't an object; `updateActionPermissions` calls `clearActionPermissionsCache()` so the change is effective immediately, not after the 30s cache window.

## `renderController.js`
- **Responsibilities:** `getAllRenders`, `addRender`, `updateRender` — Production render-job tracker.
- **Inputs:** `req.body` (job fields), `req.params.id`.
- **DB collections:** `renders`.
- **Error handling:** standard 400/404 `fail()` calls.

## `salesDeskController.js` (see `11-business-logic.md`/`22-feature-flows.md` for the Excel import logic in full)
- **Responsibilities:** `listLeads`, `createLead`, `updateLead`, `deleteLead`, `logCall`, `importLeads` (Excel), `exportEmailCampaign` (CSV), `getSettings`/`updateSettings`, `listCampaigns`/`createCampaign`/`deleteCampaign`.
- **Inputs:** `req.body` (lead/campaign fields), `req.file` (multipart .xlsx for import), `req.params.id`.
- **DB collections:** `sales_leads`, `sales_campaigns`, `sales_settings`.
- **Error handling:** `importLeads` 400s if the file can't be parsed as `.xlsx` or yields zero leads; uses `db.batch()` in chunks of 400 (under Mongo's underlying batch-write session).
- **Notable:** contains two independent Excel-parsing pipelines (legacy Bangalore-list `Frist`/`Second` sheets vs. the newer "Marketing Master Sheet" multi-tab, per-contact format), auto-detected by header shape, not filename.

## `securityController.js`
- **Responsibilities:** `listSessions`, `revokeSession`, `forceLogoutUser`, `listFailedLogins`, `listLockedAccounts`, `unlockAccount`.
- **Inputs:** `req.query` (`uid`, `includeRevoked`, `limit`), `req.params` (`id`/`uid`), `req.body.reason`.
- **DB collections:** `sessions` (`SESSIONS` from `utils/sessions.js`), `users`, `failed_logins`.
- **Error handling:** 404 on missing session/user; every mutating action calls `logAudit()`.
- **Notable:** `forceLogoutUser` batch-revokes every active session for a user in one `db.batch()`.

## `slaController.js`
- **Responsibilities:** `getSlaPolicies`, `updateSlaPolicies`, `getSlaCompliance` (+ exported `summarizeSlaForQueue` reused by `dashboardController.js`).
- **Inputs:** `req.body.policies`.
- **DB collections:** `settings/sla_policies`, `it_complaints`, `hr_complaints`.
- **Error handling:** 400 if `policies` isn't an object.

## `staffController.js`
- **Responsibilities:** `listStaffByRole(roleName)` — a factory returning a handler that lists active users of one role.
- **DB collections:** `users`.
- **Notable:** deliberately thinner than `superAdminUserController.listUsers` — returns only `{id, full_name}`.

## `superAdminUserController.js`
- **Responsibilities:** `getAllComplaints` (merged HR+IT view), `listUsers`, `updateUserPermissions`, `createUser`, `updateUser`, `setUserActive`, `deleteUser`, `resetUserPassword`, `getAuditLogs`.
- **Inputs:** `req.body` (user fields, `permissionOverrides`, `active`, `password`, `reason`), `req.query.role`, `req.params.uid`.
- **DB collections:** `users`, `hr_complaints`, `it_complaints` (merged view), `audit_logs` (via `AUDIT_LOGS`).
- **Error handling:** self-action guards (`uid === req.user.id`) 400 on edit/deactivate/delete-self; role values validated against `ASSIGNABLE_ROLES`/`EDITABLE_ROLES`; every mutation calls `logAudit()`.
- **Notable:** `getAllComplaints` sets `X-Results-Truncated: true` if either collection scan hit its cap — see `14-error-handling.md`/`15-security.md` for why silent truncation was considered unacceptable here.

## `systemSettingsController.js`
- **Responsibilities:** `getSystemSettings`, `updateSystemSettings`.
- **DB collections:** `settings/system_config`.
- **Error handling:** 400 if `settings` isn't an object.

## `taskProjectController.js`
- **Responsibilities:** `getProjects`, `getTasks`, `createTask`, `updateTaskStatus`, `updateTask`.
- **Inputs:** `req.body` (task fields), `req.params.id`, `req.query.after`.
- **DB collections:** `tasks`, `projects`.
- **Error handling:** 403 if a non-owner, non-coordinator/founder tries `updateTaskStatus`.
- **Notable:** `getTasks` scopes the query to `assignee === req.user.full_name` for employees — a documented fix for a prior over-exposure bug (any employee could previously read the whole org's task backlog client-side).

## `analyticsController.js`
- **Responsibilities:** `getAnalytics`, `getAnalyticsCsv` (both driven by shared `computeAnalytics({from, to})`).
- **Inputs:** `req.query.from`/`to` (ISO date strings).
- **DB collections:** `users`, `hr_complaints`, `it_complaints`, `approvals`, `leave_requests`.
- **Error handling:** read-only; no validation errors possible beyond malformed dates being silently excluded by `inDateRange()`.
- **Notable:** 60-second in-process cache keyed by `from|to`; CSV export neutralizes formula-injection characters (`csvEscape()`).

See `11-business-logic.md` for the *why* behind each controller's non-obvious rules, and `23-code-call-graph.md` for concrete route→controller→DB call chains on the most important endpoints.
