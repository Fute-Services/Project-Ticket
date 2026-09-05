# Data Exposure Audit — Frontend Secrets & Business-Logic-Only Gating

Scope: `main/frontend` source and build output, plus API response shape cross-checked against `docs/testing/API_TEST_RESULTS.md`. No code changed.

## 1. Frontend environment variables

`main/frontend/.env` and `.env.example` define exactly one variable:

```
VITE_API_BASE_URL=http://localhost:5000
```

Read once, in `main/frontend/src/utils/api.js`:
```js
baseURL: import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : ''),
```

This is not a secret — it's a public URL, and it's the *only* `VITE_`-prefixed variable in the codebase (confirmed by grepping `import.meta.env` across `main/frontend/src` — one hit). **No server-only secret is accidentally bundled via a `VITE_` prefix.** Vite only inlines variables explicitly prefixed `VITE_` into client bundles, and nothing else in `.env`/`.env.example` exists to leak.

## 2. Hardcoded API keys/secrets in frontend source

Grepped `main/frontend/src` for key/secret/token literals. No hardcoded backend or third-party secret was found. One real, more interesting finding:

### Finding: Founder's Gemini API key — client-supplied, localStorage-persisted, sent as a URL query param

`main/frontend/src/components/FounderAiAdvisorView.jsx` (the "AI Agent Command Room" on the Founder dashboard) lets the founder paste a **personal Google Gemini API key** into a settings field:

```js
const [apiKey, setApiKey] = useState(() => localStorage.getItem('fs_gemini_key') || '');
...
localStorage.setItem('fs_gemini_key', apiKey);
```

`main/frontend/src/utils/aiCabinet.js`'s `callGeminiCabinet()` then calls Google's API **directly from the browser**, with the key in the URL:
```js
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
```

This is not a leaked *application* secret (it's a BYOK field — the founder brings their own key, it isn't shipped in the codebase or `.env`), but it is a real exposure surface for whoever's key gets entered:
- **Persisted in `localStorage`**, which is plain-text and readable by any JS running on that origin — if an XSS vulnerability were ever found on the frontend (none is known today), this key would be trivially exfiltrated.
- **Sent as a URL query parameter**, not a header — URLs are more likely to be captured in browser history, proxy access logs, and (depending on the founder's network) any TLS-terminating middlebox's request logs, versus a header which is at least conventionally excluded from most such logs.
- **Called directly from the browser to a third-party API**, bypassing the backend entirely — the backend never sees or mediates this call, so none of this app's auth/CSRF/rate-limiting/audit-logging applies to it.

Severity is Low-Medium: it's a self-inflicted risk the founder opts into (typing their own key into their own browser), not something an attacker can reach without already controlling that browser or that key's owner. See `VULNERABILITIES_FOUND.md` for the formal entry.

## 3. What the built frontend bundle actually contains

`main/frontend/dist/` exists (a prior production build). Checked:
- **No `.map` files anywhere under `dist/`** — confirmed no source maps ship in the current build (see `PRODUCTION_HARDENING.md` for the config reason why).
- Asset filenames are content-hashed (`index-BiltxFZJ.js`, etc.) — normal Vite output, not a concern.
- `index.html` references only first-party hashed assets plus Google Fonts (`fonts.googleapis.com`/`fonts.gstatic.com`) — no unexpected third-party script tags.
- Since Vite bundles are plain JS (not compiled/obfuscated), anyone can read the built `main` chunk's source — this is normal for an SPA and not a vulnerability by itself, but it does mean **any string literal in frontend source (including the Gemini system prompt in `aiCabinet.js`, and any hardcoded value) ships to every visitor's browser, logged-in or not**, once the app shell loads. No secret currently lives in that source per the grep above, so this is a "be aware of this" note rather than a finding.

## 4. Frontend-only business-logic/permission gating vs backend enforcement

Cross-checked every frontend role-based UI gate found against `docs/08-authorization.md`'s backend enforcement table. `main/frontend/src/pages/SuperAdminUsersPage.jsx`/`SuperAdminSecurityPage.jsx` and department dashboards conditionally render admin actions (delete user, reset password, force logout, unlock account) based on `req.user.role` held client-side, but every one of those actions maps to a backend route independently gated by `authMiddleware` + `roleMiddleware('superadmin')` (per `08-authorization.md` — `/api/founder/users/*`, `/api/founder/security/*` are `superadmin`-only at the route level, not just hidden in the UI). Sampled and confirmed backend-enforced, not frontend-only, for every UI gate found:

| Frontend gate (hides a button/page) | Backend enforcement | Confirmed in |
|---|---|---|
| Super Admin user management screen | `role('superadmin')` on `/api/founder/users*` routes | `08-authorization.md` §Layer 1 |
| Security Center (unlock/revoke/force-logout) | `role('superadmin')` on all `/api/founder/security/*` routes | `08-authorization.md` |
| "Delete ticket" only shown to the ticket owner | `complaintControllerFactory.deleteComplaint` — server-side owner check on `doc.user_id === req.user.id`, independent of what the UI shows | `08-authorization.md` Layer 3 |
| IT asset delete button (visible to `it`/`founder`) | `requirePermission('assets','delete')` — can be revoked for `it` server-side by a Super Admin even if the button is still rendered | `08-authorization.md` Layer 2 |
| Approval "Decide" button shown to `hr` for any category | `approvalController.decideApproval` rejects non-`extra-hours`/`document` categories for `hr` server-side (`403`) even though the button renders | `08-authorization.md` Layer 3 |

**No case was found where a sensitive action is enforced only in the frontend with no backend check.** This matches the pattern already documented in `08-authorization.md` — every permission layer in this app has a server-side counterpart; the frontend gates are a UX convenience (don't show a button that will 403), not the actual security boundary.

## 5. API response field exposure

`docs/testing/API_TEST_RESULTS.md`'s response samples were reviewed for anything that shouldn't be in a client-facing payload. No password hash, no internal file-system path, and no other server-only field was found in any sampled response — `config/db.js`'s user-profile reads never `SELECT *` a document that includes the credentials collection (`_auth_credentials` is a physically separate collection from `users`, per `docs/06-database.md` and `docs/15-security.md` §1), and file-storage responses hand back only the download-route URL, never the raw on-disk `storagePaths.<docType>` value (`docs/16-file-storage.md` §"Upload type 1" — the real path is kept in a field "nothing outside the download route ever needs (or is shown)"). This was a documentation cross-check only; it was not independently re-tested live in this pass (see `docs/testing/API_TEST_RESULTS.md` for the original live response samples).
