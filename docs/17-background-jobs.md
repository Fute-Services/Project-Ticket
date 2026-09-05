# 17 — Background Jobs

**None found.** This file exists to say so explicitly, per the documentation requirements, rather than silently skipping the topic.

## What was checked

A search across `main/backend` (excluding `node_modules`) for any of the usual signs of a scheduler or job queue found nothing:

- No `node-cron`, `agenda`, `bull`, `bullmq`, or any other job/queue package in `package.json`.
- No recurring `setInterval`-based job anywhere in the source (the one `grep` hit for "cron" was a false positive — the word "participants" in `hrDeskController.js`'s `meetings` field list, not an actual scheduler).
- No `/api/*` route that triggers a deferred or queued task — every controller in this codebase does its work synchronously within the HTTP request/response cycle.

## What might look like a background job but isn't

The app has several short-lived **in-memory caches**, each implemented as a plain `Map` with a manual expiry timestamp, living inside the same request-handling code that reads them. These are not background jobs — nothing runs on a timer to refresh or evict them; a cache entry simply gets ignored and recomputed the next time it's read past its `expiresAt`:

| Cache | File | TTL | What it caches |
|---|---|---|---|
| `profileCache` | `middleware/authMiddleware.js` | 60s | A user's Firestore-shaped profile doc, keyed by uid — avoids re-reading `users/{uid}` on every single authenticated request. |
| Action-permissions cache | `middleware/permissionMiddleware.js` | 30s | The `settings/action_permissions` document. |
| `revokedCache` | `utils/sessions.js` | 30s | Whether a given session id has been revoked. |
| `dashboardCache` | `controllers/dashboardController.js` | 30s | The whole computed Super Admin dashboard-overview payload. |
| `analyticsCache` | `controllers/analyticsController.js` | 60s | The computed analytics result, keyed by the `from|to` date-range query. |

Each of these is a deliberate tradeoff documented in its own code comment: re-checking the underlying MongoDB/Firestore data on literally every request would either blow through a read-quota (the historical reason, back when this ran on Firestore) or repeat an expensive multi-collection scan on every dashboard/analytics page load. A cache miss or expiry just means the *next* request pays the real read cost and repopulates the cache — there's no separate process keeping these warm.

## Operational consideration

Because these caches are plain in-memory `Map`s scoped to a single Node.js process, they are **not shared** across multiple server instances. If this backend is ever run as more than one process (e.g. behind a load balancer, or in a multi-instance deployment), each instance would hold its own independent cache — meaning a permission change, session revoke, or department update could take up to that cache's TTL (30–60 seconds) to become visible on an instance that isn't the one that made the change, not just the one commonly described in each cache's own comment. Today's deployment (see [20-deployment.md](20-deployment.md)) runs a single self-hosted process, so this isn't currently an observed problem — it's a scaling consideration to keep in mind if that changes.

## Recommendation (not a current gap in behavior)

If a genuine background job is ever needed — say, a nightly SLA-breach digest email, or session cleanup for expired refresh tokens that are never explicitly deleted (see [06-database.md](06-database.md) on the `sessions` collection's lack of a TTL index) — the natural fit given the existing dependency set would be `node-cron` or a simple `setInterval` inside `server.js`, since no queue infrastructure (Redis, etc.) exists elsewhere in this stack to justify a heavier job-queue library.
