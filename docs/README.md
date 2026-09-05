# Fute Portal Backend Documentation

Beginner-friendly, teacher-style documentation for the Fute Portal backend (`main/backend`), generated entirely from reading the actual source code. Nothing here was guessed — where the code didn't answer a question, the relevant document says "Not determinable from the current codebase" instead of filling the gap.

**Start here:** [`BACKEND_MASTER_DOCUMENTATION.md`](./BACKEND_MASTER_DOCUMENTATION.md) — the single-page overview that synthesizes everything below.

## Detail documents

| # | Document | Covers |
|---|---|---|
| 01 | [Backend Architecture](./01-backend-architecture.md) | Layered request flow: routes → middleware → controllers → DB shim |
| 02 | [Folder Structure](./02-folder-structure.md) | Every backend folder/file, its purpose, what breaks if removed |
| 03 | [File-by-File Explanation](./03-file-by-file-explanation.md) | Deep dive on every non-trivial source file (imports, functions, callers/callees, security notes) |
| 04 | [API Documentation](./04-api-documentation.md) | Every endpoint: method, path, auth/authz, request/response shape, status codes, examples |
| 05 | [Request/Response Flow](./05-request-response-flow.md) | Full lifecycle traces for login, ticket creation, file upload, chat |
| 06 | [Database](./06-database.md) | MongoDB collections, fields, relationships, the Firestore-shaped shim's mechanics |
| 07 | [Authentication](./07-authentication.md) | Login, JWT, refresh rotation, CSRF, logout — as implemented today |
| 08 | [Authorization](./08-authorization.md) | Role checks, the permission matrix, ownership checks |
| 09 | [Middleware](./09-middleware.md) | Every middleware: purpose, order, what it checks |
| 10 | [Controllers](./10-controllers.md) | Every controller module's responsibilities and DB interactions |
| 11 | [Business Logic](./11-business-logic.md) | Non-trivial rules (ticket workflow, approvals, SLA, imports) and why they exist |
| 12 | [External Services](./12-external-services.md) | MongoDB + self-hosted SMTP only — explicitly no other integrations |
| 13 | [Environment Variables](./13-environment-variables.md) | Every env var read in code, purpose, required/optional, defaults |
| 14 | [Error Handling](./14-error-handling.md) | Error middleware, response envelope, error code catalog |
| 15 | [Security](./15-security.md) | Auth/CSRF/rate-limiting/validation/headers/uploads — Implemented vs. Weaknesses vs. Recommendations |
| 16 | [File Storage](./16-file-storage.md) | Upload paths, local-disk storage, path-traversal protection, download gating |
| 17 | [Background Jobs](./17-background-jobs.md) | None found — documents the in-memory caches that exist instead |
| 18 | [Logging & Monitoring](./18-logging-monitoring.md) | What's logged, `/healthz`, the audit log's actual coverage |
| 19 | [Dependencies](./19-dependencies.md) | Every production/dev dependency and where it's used |
| 20 | [Deployment](./20-deployment.md) | Self-hosted backend (192.168.1.23) + Vercel frontend, known gaps |
| 21 | [Testing](./21-testing.md) | No automated tests exist — what that leaves untested |
| 22 | [Feature Flows](./22-feature-flows.md) | Step-by-step flows for tickets, approvals, HR desk docs, sales import, chat, auth |
| 23 | [Code Call Graph](./23-code-call-graph.md) | Route → middleware → controller → DB call chains for key endpoints |
| 24 | [Data Flow](./24-data-flow.md) | How a ticket, a session, and an uploaded file move through the system |
| 25 | [Teacher Explanation](./25-teacher-explanation.md) | WHAT/WHY/HOW/WHERE/WHEN/WHAT-IF on middleware, JWT, the DB shim, CSRF, roles |
| 26 | [Glossary](./26-glossary.md) | Terms used throughout this stack, tied back to real files |
| 27 | [Troubleshooting](./27-troubleshooting.md) | Ten real problems (CSRF race, Mongo config, CORS, lockouts...) with cause and fix |

## Related existing documents (not part of this set)

- [`BACKEND_ARCHITECTURE_STATUS.md`](./BACKEND_ARCHITECTURE_STATUS.md) — migration status snapshot, used as ground truth for §20 Deployment.
- [`DEPLOYMENT_PIPELINE_STATUS.md`](./DEPLOYMENT_PIPELINE_STATUS.md) / [`.pdf`](./DEPLOYMENT_PIPELINE_STATUS.pdf) — independently-verified deployment pipeline status, also used as ground truth for §20.

## PDF

[`BACKEND_DOCUMENTATION.pdf`](./BACKEND_DOCUMENTATION.pdf) — a PDF export of `BACKEND_MASTER_DOCUMENTATION.md`.

## Scope note

This set documents `main/backend` only. `main/frontend` is referenced only where needed to explain a backend contract (e.g. the axios response-envelope unwrapping in `main/frontend/src/utils/api.js`), per the scope of this documentation task. No code in `main/backend` or `main/frontend` was modified while producing these documents.
