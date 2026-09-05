# 21 — Testing

**There is no automated test suite for this backend.** This file states that plainly, as required, rather than describing hypothetical coverage.

## What was checked

- `main/backend/package.json` has no `"test"` script (its `scripts` block only has `"start"` and `"dev"`).
- No test framework (`jest`, `mocha`, `vitest`, `supertest`, `chai`, etc.) appears in either `dependencies` or `devDependencies`.
- No `*.test.js` / `*.spec.js` files, and no `test/` or `__tests__/` folder, exist anywhere under `main/backend`.
- No CI workflow files (e.g. `.github/workflows/*.yml`) were found in the repository that would run tests on push/PR. Not determinable whether any test gate exists in a system outside this repository (a separate CI service, a pre-receive hook on the self-hosted server, etc.) — nothing of that kind is visible from the code and configuration reviewed.

By contrast, `main/frontend/tests/e2e/` **does** contain Playwright end-to-end spec files (`auth.spec.js`, `crud.spec.js`, `it-and-production.spec.js`, `navigation.spec.js`, `overlays-and-responsive.spec.js`, `search-and-tables.spec.js`, `tabs.spec.js`) — these exercise the frontend (and transitively, the backend API it calls) through a real browser, but they live in the frontend project and are out of scope for backend-specific unit/integration coverage. Whether these are run in any automated pipeline is not determinable from the files present in this repository.

## Consequences — what is untested, ranked by risk

1. **Authentication, session, and CSRF logic** ([07-authentication.md](07-authentication.md)) — login lockout counting, refresh-token rotation and reuse detection (`utils/sessions.js`'s `consumeRefreshToken`), the double-submit CSRF check, and cookie attribute selection (`SameSite`/`Secure` depending on `VERCEL`) are all security-critical and entirely unverified by any automated check. A subtle regression here (e.g. accidentally weakening the reuse-detection branch) would not be caught before reaching production.
2. **The sales-desk Excel import's normalization functions** (`controllers/salesDeskController.js`) — `normalizeName`, `normalizeCity`, `normalizeStatus`, `mapSaleStatus`, `designationLevelOf`, and the several `normalize*Campaign`/`normalize*Verified` functions are all highly branchy string-matching logic built against the quirks of specific real spreadsheet files (see the code comments referencing `docs/SALES_FILTERS_IMPLEMENTATION_PLAN.md` and specific typos like `hydarebad`). This is exactly the kind of logic that silently regresses when someone tweaks one branch and doesn't notice it changed behavior for a different input shape, and there is no test pinning any of these functions' expected output for a given input.
3. **Transactional flows** — `complaintControllerFactory.js`'s `updateStatus` (ticket + approval record written atomically) and `approvalController.js`'s `decideApproval` (approval + linked ticket + linked extra-hours record) both rely on MongoDB session transactions behaving correctly under concurrent access; `utils/sessions.js`'s `consumeRefreshToken` similarly relies on its own transaction to prevent a race between two simultaneous refresh calls. None of this concurrency-sensitive logic has a test that actually exercises concurrent calls.
4. **Role/permission gating** — the combination of `roleMiddleware`, `permissionMiddleware.requirePermission`, and the many per-endpoint ownership checks scattered through controllers (e.g. "only the ticket's own submitter can delete it") is the entire authorization surface of the app ([08-authorization.md](08-authorization.md)) and has no regression protection beyond manual testing.

## Recommendation (not a current fact — a suggestion)

Given the existing stack (Express, MongoDB), the lowest-friction addition would be `jest` + `supertest` for route-level integration tests against a real (or `mongodb-memory-server`) MongoDB instance, focused first on the authentication/session flow and the transactional approval/status-update paths. Separately, plain `jest` unit tests (no HTTP layer needed) for the sales-desk `normalize*` functions would be cheap to write, since they're pure functions with no database dependency, and would directly protect the highest-churn, highest-complexity logic in the codebase. Neither of these exists today — this is a suggestion for future work, not a description of anything currently implemented.
