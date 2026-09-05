# 18 — Logging & Monitoring

Teacher's summary: this app's "logging" is plain `console.log`/`console.error` calls — there is no structured logger, no request-logging middleware, and no external error-tracking/APM service wired in anywhere. Its closest thing to real monitoring is one health-check endpoint and one audit-trail collection.

## What's actually logged

**`console.error()`** is scattered through controllers and middleware wherever something fails in a way that shouldn't crash the request but is worth a server-side record of. Representative examples actually in the code:

- `middleware/errorMiddleware.js` — `console.error(err)` runs for **every single error** that reaches this middleware, before it decides what to tell the client. This is the one place you can reliably find the true error for anything that 500s.
- `server.js`'s `/healthz` handler — `console.error('healthz check failed:', err)` when the MongoDB ping fails, before returning a generic 503 to the (unauthenticated) caller.
- `controllers/complaintControllerFactory.js` and `controllers/approvalController.js` and `controllers/hrDeskController.js` — each wraps its `sendMail(...)` calls in `try/catch` and logs `console.error('Mail error:', e.message)` (or `'Failed to notify founder:', e.message`) rather than failing the whole request just because a notification email didn't go out.
- `controllers/hrDeskController.js` — local file write failures (`fs.writeFileSync` throwing) are caught and logged as `console.error('Local file storage write failed:', e.message)` before being re-thrown as a clean `502` for the client.
- `controllers/hrController.js`/`itController.js` (via the shared factory) — `console.error('Failed to lookup user data:', e.message)` when a best-effort user lookup during ticket creation fails.

**`console.log()`** is used only for process lifecycle events in `server.js`: the server starting (`Server running on port ${PORT}`) and the graceful-shutdown sequence (`${signal} received, shutting down gracefully...`, `Server closed.`).

## What is NOT present

- **No structured logging library.** `package.json`'s dependencies (already reviewed — see [19-dependencies.md](19-dependencies.md)) include no `winston`, `pino`, `bunyan`, or similar. Every log line is a raw `console.*` call with no consistent field structure, no log level, and no machine-parseable format.
- **No HTTP request-logging middleware.** No `morgan` (or equivalent) — there is no line-per-request access log anywhere in `server.js`'s middleware stack. Incoming requests are not logged at all unless they happen to error.
- **No correlation/request IDs.** Nothing attaches a per-request trace id to `req` or to log lines, so correlating multiple log entries from the same request (e.g. across a transaction's several `tx.get`/`tx.update` calls) isn't directly supported by the logging itself.
- **No APM or error-tracking service.** No Sentry, Datadog, New Relic, or similar SDK is imported or configured anywhere in `main/backend`.

## `/healthz` — the one real monitoring surface

`server.js`:

```js
app.get('/healthz', async (req, res) => {
  const start = Date.now();
  try {
    await db.ping();
    ok(res, { mongo: 'reachable', pingMs: Date.now() - start });
  } catch (err) {
    console.error('healthz check failed:', err);
    fail(res, { status: 503, message: 'Database unreachable', code: 'SERVICE_UNAVAILABLE' });
  }
});
```

Unlike `GET /` (which just confirms the Node process itself is up, with no dependency check), this endpoint actually reaches MongoDB via `db.ping()` (`config/db.js`, which runs `client.db(dbName).command({ ping: 1 })`) and reports both reachability and round-trip latency. This is what an external uptime monitor or deploy orchestrator should point at to distinguish "the process is running" from "the process is running but its database is unreachable." See [20-deployment.md](20-deployment.md) and `docs/DEPLOYMENT_PIPELINE_STATUS.pdf` for how this has actually been used to verify the self-hosted deployment live.

## `audit_logs` — the closest thing to an audit trail

`utils/auditLog.js`'s `logAudit({ actor, action, target, details })` writes one document per call into the `audit_logs` MongoDB collection: `actor_id`, `actor_email`, `actor_name`, `action`, `target`, `details`, `created_at`. It's explicitly "fire-and-forget from the caller's perspective" — callers `await` it, but the action it's recording has already succeeded by the time it runs, so a failed audit write never rolls back or blocks the real action.

**What calls `logAudit`** (grep-confirmed across the controllers):

| Action string | Controller |
|---|---|
| `create_department`, `update_department`, `delete_department` | `departmentController.js` |
| `update_user_permissions`, `create_user`, `update_user`, `reactivate_user`/`deactivate_user`, `delete_user`, `reset_user_password` | `superAdminUserController.js` |
| `revoke_session`, `force_logout_user`, `unlock_account` | `securityController.js` |
| `update_role_permissions`, `update_action_permissions` | `permissionController.js` |
| `update_sla_policies` | `slaController.js` |
| `update_system_settings` | `systemSettingsController.js` |
| `update_notification_rules` | `notificationController.js` |

**What is NOT recorded in `audit_logs`** — and therefore has no admin-visible history beyond its own `created_at`/`updated_at` fields: ticket creation/status changes/field edits (`hrController.js`/`itController.js`), approval creation/decisions (`approvalController.js`), leave applications/decisions (`leaveController.js`), chat messages (`chatController.js`), sales leads and their import (`salesDeskController.js`), tasks/projects (`taskProjectController.js`), assets (`assetController.js`), and render jobs (`renderController.js`). `controllers/dashboardController.js`'s `getActivityTimeline` endpoint partially compensates for tickets/approvals by merging their raw `submitted_at`/`updated_at`/`createdAt`/`decidedAt` timestamps into one feed alongside real `audit_logs` entries — but that's a read-time reconstruction from existing fields, not a true write-time audit record of every ticket transition.

`GET /api/founder/audit-logs` (superadmin-only, `superAdminUserController.getAuditLogs`) is the only read path for this collection, capped at 500 rows per request (`Math.min(parseInt(req.query.limit, 10) || 100, 500)`).
