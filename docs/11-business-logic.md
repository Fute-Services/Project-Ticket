# 11 — Business Logic

This document explains the non-obvious *rules* baked into the backend's controllers — not what the code does mechanically, but **why** it does it that way. Where the source has an explicit comment explaining the reasoning, it's quoted. Where there's no comment, the rule is still described but marked **Inferred** — a best-effort reading of intent, not a quoted fact.

---

## 1. Ticket token generation

`controllers/complaintControllerFactory.js`, `generateToken(prefix)`

Every HR or IT ticket gets a human-readable token like `FT-HR-A3F9K2` or `FT-IT-7QW1ZZ` — a fixed `FT-` prefix, the queue's prefix (`HR`/`IT`), and 6 random alphanumeric characters. This is generated in-process (`Math.random()` over a 36-character alphabet), not a database auto-ID, because the token is meant to be **spoken/typed by an employee** (e.g. searched via `GET /complaints/search?token=...`) — a Mongo/Firestore-style 20-character ID would be unusable for that.

**Inferred**: no uniqueness check is performed at creation time — a collision is astronomically unlikely at this app's scale (36⁶ ≈ 2.2 billion combinations) and isn't worth the extra read.

---

## 2. Ticket → "Waiting Approval" creates a linked approval atomically

`complaintControllerFactory.js`, `updateStatus()`

When staff sets a ticket's status to `Waiting Approval`, the controller does two writes — updating the ticket and creating a doc in `approvals` — inside a single `db.runTransaction(...)`:

> "The ticket update and its approval record are written in one transaction, so a failure between the two writes can't leave the ticket stuck showing 'Waiting Approval' with no approval record for the founder to ever act on."

The transaction also reads the ticket's **previous** status before writing, and only creates the approval doc if the transition is genuinely *into* `Waiting Approval` from something else:

> "Only create an approval record on the transition INTO 'Waiting Approval' — without the previousStatus check, re-sending the same status (e.g. a UI double-click before the approvals list has refreshed) created a fresh duplicate approvals/{id} every time."

The approval doc's exact shape (title, category, requestedBy, etc.) is queue-specific and supplied via `opts.buildApprovalRecord(data, previousStatus, id)` — HR and IT each pass their own version into `createComplaintController(opts)`.

---

## 3. Owner vs. staff field-edit permissions

`complaintControllerFactory.js`, `updateFields()`

A ticket's own submitter (`isOwner`) and staff (`isStaff` = the queue's staff role, `founder`, or `superadmin`) can both PATCH `.../fields`, but staff get the full `editableFields` list (includes `employeeStatus`, `solver`, `remarks`, `employeeId`, `vpnNo` for IT) while a non-staff owner is restricted to `ownerEditableFields` (just `description`, `category`, `sub_category`, `priority`):

> "A non-staff owner is restricted to ownerEditableFields (ticket content only) — without this, isOwner alone let the submitter also set employeeStatus/solver/remarks and self-resolve or reassign their own ticket, since editableFields is staff's full field set."

This closes a real self-service-privilege-escalation bug: without the split, an employee editing their own ticket's `description` could also silently set `employeeStatus: 'Resolved'` on the same request.

---

## 4. Ticket delete cascades to linked approvals

`complaintControllerFactory.js`, `deleteComplaint()`

Only the ticket's own submitter can delete it (staff resolve/close via status instead). Deleting a ticket that was sent for approval also deletes its `approvals/{id}` record in the same `db.batch()`:

> "A ticket sent for approval leaves a linked approvals/{id} record behind ... without this, the Founder's Approval Center would keep showing (and letting someone decide on) an approval for a ticket that no longer exists."

The linked approval is found by querying `approvals` on `complaintRef.collection` + `complaintRef.id`, not by a stored back-reference on the ticket itself.

---

## 5. Ticket reopen rules

`complaintControllerFactory.js`, `reopenComplaint()`

Reopening is owner-only and only allowed from `status === 'Completed'` — **Inferred**: reopening an already-active ticket makes no sense (the code comment confirms this directly: *"reopening an already-active ticket makes no sense"*). This exists as a separate, narrowly-scoped endpoint rather than loosening the staff-only status route, so an employee can't set their ticket to an arbitrary status:

> "...without loosening the status-route's staff-only role gate (which would otherwise let any employee set a ticket to any status, not just send a resolved one back to the queue)."

---

## 6. Approval decision authority

`controllers/approvalController.js`, `HR_DECIDABLE_CATEGORIES = ['document']`, `decideApproval()`

Every approval category is founder-only to decide, **except** `document` (and, per `hrDeskController.js`'s extra-hours approvals, `extra-hours` is explicitly called out as founder-only in the same comment block, i.e. it is *not* HR-decidable despite being HR-domain data). HR may decide `document` approvals:

> "'document' approvals are HR's own call (Payel/Soma, in the original notes — modeled as the 'hr' role, not named accounts) ... Every other category (ticket-linked 'Waiting Approval' escalations, asset/data requests) stays founder-only too, same as before either category existed."

The decision itself runs in a transaction that **re-reads the approval's current status** before writing, rejecting a decision on an approval that's already been decided:

> "The transaction also re-reads the approval's status before writing, so deciding an already-decided approval twice (a retried request, two founder tabs) is rejected instead of silently re-applying the outcome."

If the approval is linked to a ticket (`complaintRef`) or an extra-hours entry (`extraHoursId`), both are updated in the same transaction — the ticket moves to `In Progress` (approved) or back to its `previousStatus` (rejected); the extra-hours doc's own `status` mirrors the decision.

---

## 7. Extra Hours logging and its approval linkage

`controllers/hrDeskController.js`, `submitExtraHours()`, `myExtraHoursMentions()`

An employee submits extra hours against their own `employeeId` (never client-supplied — always `req.user.employeeId`). This creates both an `extra_hours` doc and a linked `approvals` doc (`category: 'extra-hours'`), and stamps the approval id back onto the extra-hours doc. The Directory page's "Extra Hours: Xh logged/approved" figures depend on this status mirroring staying correct (per `approvalController.decideApproval`, item 6 above).

`teammates` is free text (not a picker over real employee records), and `myExtraHoursMentions()` matches the calling user's own `full_name` (lower-cased, trimmed) against every entry's `teammates` array:

> "Matched by name since that field is free text, not a picker over real employee/user records. Powers the 'X included you' notification..."

This is a linear scan over the whole `extra_hours` collection (bounded by `UNPAGINATED_READ_LIMIT`) — acceptable at this app's scale, not indexed.

---

## 8. Leave approval routing

`controllers/leaveController.js`, `isFounderApproval(department)`

A leave request from the `Admin/Ops` or `IT` department routes to the **Founder** to decide; every other department routes to **HR**:

> "HR doesn't approve its own department's time off — a request from Admin/Ops or IT routes to the Founder instead. Mirrors isFounderApproval() in the frontend's LeaveContext.jsx, now driven by the requester's real profile department instead of a mock employee lookup."

`decide()` enforces this server-side (403s an HR user trying to decide an Admin/Ops or IT leave), so the rule can't be bypassed by calling the API directly even if the frontend's own routing were somehow skipped.

---

## 9. Account lockout after repeated failed logins

`controllers/authController.js`, `LOCK_THRESHOLD = 5`

After 5 consecutive failed password attempts on one account, `login()` sets `locked: true` on the user's profile doc; subsequent login attempts are rejected with `423 ACCOUNT_LOCKED` before the password is even checked. A successful login resets `failedLoginAttempts` to 0. Only a Super Admin can undo the lock, via `securityController.unlockAccount()`.

> "Accounts lock after this many consecutive failed password attempts, until a Super Admin unlocks them from the Security Center — a fixed in-code threshold rather than a configurable setting, since tuning it isn't a real operational need yet."

Every failed attempt is also recorded in `failed_logins` (uid, email, ip, timestamp) regardless of whether it crosses the lock threshold, feeding the Security Center's "Failed Logins" view and the dashboard's `failedLoginsLast24h` metric.

---

## 10. Refresh-token reuse detection

`utils/sessions.js`, `consumeRefreshToken()`

Each session doc tracks both its **current** `refreshTokenHash` and its **previous** one. A normal refresh call rotates current→new and stashes the old current as `previousRefreshTokenHash`. If a refresh call ever presents a hash that matches the *previous* (already rotated-out) value — meaning the legitimate client already moved past it — the whole session is revoked outright instead of issuing a new token:

> "...whoever just presented it again is working from a copied/stolen value — the whole session is revoked outright rather than issuing yet another token to an attacker."

This runs inside `db.runTransaction()` specifically so two concurrent refresh calls for the same session can't both read the same "current" hash and both succeed off a stale read:

> "Wrapped in a transaction so two refresh calls racing for the same session can't both 'succeed' off the same stale read."

---

## 11. SLA breach / near-breach computation

`controllers/slaController.js` (`summarizeSlaForQueue`), `controllers/dashboardController.js` (`summarizeQueueForOverview`)

SLA policies are per-priority, per-queue minute thresholds (`DEFAULT_SLA_POLICIES`, editable via `PUT /api/founder/sla-policies`). A **still-open** ticket is judged by its *age* against `resolutionMinutes`; a **completed** ticket is judged by how long it actually took (`updated_at - submitted_at`). "Near-breach" is defined as having used more than 80% of the allotted resolution time while still open:

```js
if (ageMinutes > policy.resolutionMinutes) breached / overdue
else if (ageMinutes > policy.resolutionMinutes * 0.8) nearBreach
```

Both the dashboard overview and the dedicated SLA compliance endpoint compute this independently but read the **same** `settings/sla_policies` doc, so they can't disagree about what counts as a breach — noted explicitly in `dashboardController.js`:

> "reads the same per-priority resolutionMinutes the SLA Management page configures ... so this dashboard and that page never disagree about what counts as a breach."

---

## 12. Attendance self check-in/check-out and multi-day leave rows

`controllers/hrDeskController.js`, `checkIn()`, `checkOut()`, `dateRange()`

- Times are stored as `"HH:MM"` strings (not full timestamps), matching what the frontend's `workingHours()` parser expects.
- `checkOut()` computes worked hours as `(outMinutes - inMinutes) / 60`, floored at 0.
- Setting `workMode: 'Leave'` at check-in doesn't just mark today — it accepts an optional `toDate` and writes **one attendance row per day** in the range via `dateRange(from, to)`, capped at 60 days:

> "Capped at 60 days so a typo'd year in the 'To' field can't silently create thousands of rows."

- This is deliberately the *only* code path that can set `attendance.status = 'Leave'` — called out so other code (e.g. a leave-taken count on an Employee Profile) can trust counting these rows directly rather than re-deriving leave status some other way.

---

## 13. Department deletion guard

`controllers/departmentController.js`, `deleteDepartment()`

A department can't be deleted while any `users` doc still has `department` equal to its name — the request is rejected with `400 DEPARTMENT_IN_USE` instead of silently orphaning those users' department field. **Inferred** as the same "no orphaned references" philosophy the code comment for this function states directly, matching Super Admin's own self-action guards (item 14).

---

## 14. Super Admin self-action guards

`controllers/superAdminUserController.js`, `updateUser()`, `setUserActive()`, `deleteUser()`

A Super Admin cannot edit, deactivate, or delete **their own** account through these endpoints (`uid === req.user.id` → `400 VALIDATION_ERROR`). This isn't a permissions gap — the actor already has full rights — it's a guardrail against accidentally locking themselves out of the panel:

> "Editing a user's own account through this endpoint is blocked so Super Admin can never accidentally demote/deactivate themselves out of the panel."

---

## 15. Sales Desk Excel import — union merge and field mapping

`controllers/salesDeskController.js`

Two structurally different import formats share one endpoint (`POST /api/sales-desk/leads/import`), auto-detected by header shape (`isMarketingMasterSheet()` — presence of a `Company Name` header), not by filename.

**Format A — Bangalore-list (`parseWorkbook`)**: one lead **per company**, built from up to three sheets (`Frist`, `Second`, `Moving to sales team`). This is a real *union*, not an overlay — the code comment explains why:

> "Frist and Second/Moving-to-sales-team are NOT the same list at two stages — verified against the real file: only ~67% of Second's companies are also in Frist. So this builds a true union keyed on normalized company name, not a one-way overlay."

`normalizeName()` strips legal-entity suffixes (`Private`, `Ltd`, `LLP`, etc.) and punctuation so name variants of the same company key together. `Frist` seeds the master list; `Second` and `Moving to sales team` **overlay** tracking fields (status, assignedTo, comments, dates) onto a matching `Frist` lead, or create a new tracking-only lead if the company wasn't in `Frist` at all.

**Format B — Marketing Master Sheet (`parseMarketingMasterWorkbook`)**: one lead **per contact** (a company can have several), keyed by `normalizeContactKey()` (email if present, else normalized company+contact name), scanned across every worksheet that has a `Company Name` header. A family of `normalize*` functions maps free-text sheet values onto this app's fixed enums — e.g.:
- `normalizeCity()` fixes known typos (`hydarebad` → `Hyderabad`) and title-cases the result.
- `designationLevelOf()` regex-matches job titles into `Decision Maker` / `Influencer` / `Other`.
- `mapSaleStatus()` maps free-text sales notes (`"didn't pick up the call"`, `"meeting done"`, ...) onto the same `STATUS_VALUES` enum every other lead uses, so this import lands in one shared pipeline instead of a parallel status system.

Both formats **dedupe against what's already stored** on every (re-)import, updating existing leads rather than duplicating them — but only overwrites *sheet-sourced* fields, explicitly preserving hand-entered ones like `dealValue` and `callLog`:

> "Re-importing over an existing lead must never clobber fields the sheet doesn't carry and a rep may have already filled in by hand — only the sheet-sourced fields get overwritten."

Writes are batched at 400 docs per `db.batch().commit()` (under the underlying 500-op batch limit).

---

## 16. CSV / formula-injection neutralization

`controllers/analyticsController.js` (`csvEscape`), `controllers/salesDeskController.js` (`exportEmailCampaign`'s `escapeCsv`)

Both CSV export paths prefix any cell value that starts with `=`, `+`, `-`, or `@` with a leading apostrophe before quote-escaping it:

```js
if (/^[=+\-@]/.test(s)) s = `'${s}`;
```

> "A value starting with =, +, -, or @ is interpreted as a live formula by Excel/Sheets the moment the export is opened (CSV/formula injection) — prefix with a leading apostrophe first so it's forced back to plain text."

This matters because these exports include user-entered free text (`companyName`, `contactName`, ticket metrics labels) that could otherwise carry an attacker-crafted formula that executes the moment someone opens the exported file in Excel/Sheets.

---

## 17. `enrichWithUserRole` — bounded legacy-data fallback

`controllers/complaintControllerFactory.js`, `controllers/superAdminUserController.js` (duplicated in both)

Ticket docs store `role`/`user_role` at creation time. For any doc missing both (a legacy record from before this field existed), the function falls back to looking up the submitter's `users` doc — but only for the **deduped set** of user ids actually needed, not once per ticket:

```js
const needsLookup = docs.filter((d) => !d.role && !d.user_role);
const uniqueUserIds = [...new Set(needsLookup.map((d) => d.user_id).filter(Boolean))];
```

This bounds the fallback to one read per distinct legacy user, not per legacy ticket, keeping a list endpoint's cost from scaling with how many old tickets happen to be missing the field.
