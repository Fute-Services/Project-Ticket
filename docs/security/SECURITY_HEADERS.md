# Security Headers — Observed vs Recommended

Live `curl -i` output, 2026-09-05, no authentication required. No code changed.

## Backend — `http://192.168.1.23:5000`

`curl -i http://192.168.1.23:5000/` (identical header set on `/`, `/healthz`, a 404, and a CORS-rejected OPTIONS — helmet runs before routing):

```
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
RateLimit-Policy: 300;w=900
RateLimit-Limit: 300
RateLimit-Remaining: <n>
RateLimit-Reset: <n>
Vary: Origin
Access-Control-Allow-Credentials: true
```

**Correction to `docs/15-security.md`'s "Potential Weaknesses" entry** — that doc says helmet runs with "default configuration only — no custom Content-Security-Policy... is present." That's accurate about the *code* (no explicit `helmet({ contentSecurityPolicy: {...} })` call), but it undersells the live result: `helmet@8`'s **default** posture, confirmed above, already includes a real, fairly strict CSP (`script-src 'self'`, `object-src 'none'`, `frame-ancestors 'self'`), HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and more. This is a materially better baseline than "no headers." The only real gap is that this default CSP was never *tuned* for this app's actual origins (e.g. `font-src`/`style-src` allow any `https:` origin rather than pinning to `fonts.gstatic.com`/`fonts.googleapis.com` specifically) — a hardening opportunity, not an absent control.

**HSTS over plain HTTP is a no-op today.** The header is present, but per `docs/20-deployment.md` the backend is reached at `http://192.168.1.23:5000` (plain HTTP, per the live curl above establishing a connection on `:5000` without TLS). Browsers only honor `Strict-Transport-Security` on a response actually delivered over HTTPS — received over plain HTTP, it is ignored. So this header currently provides no real protection; it will start working automatically if/when the backend gets a TLS-terminating reverse proxy in front of it.

## Frontend — `http://192.168.1.23/`

```
HTTP/1.1 200 OK
Content-Length: 952
Content-Disposition: inline; filename="index.html"
Accept-Ranges: bytes
ETag: "1c7bf869d5fe6a622e494ff7d508697f529e7b18"
Content-Type: text/html; charset=utf-8
Vary: Accept-Encoding
```

**No security headers at all** — no CSP, no `X-Content-Type-Options`, no `X-Frame-Options`, no `Referrer-Policy`, no HSTS. This is the static file server hosting the built `dist/` on the same Windows box (self-hosted `192.168.1.23:80`, distinct from the Vercel-hosted copy of the same frontend at `https://project-ticket-plum.vercel.app`, which Vercel's edge network adds its own baseline headers to and was not independently curled here since it isn't the "new work" this pass targets). Whatever is serving port 80 on `192.168.1.23` (no server code for this was found under `main/backend` or `main/frontend` — likely a generic static-file server, e.g. `serve`/IIS/nginx, configured outside this repo) applies none of Helmet's protections, because Helmet is Express middleware and this static server is a separate process.

## CORS spot-checks

| Request | Result |
|---|---|
| `OPTIONS` with `Origin: https://evil-attacker.example` | `403 CORS_NOT_ALLOWED` — rejected, matches `server.js`'s allowlist logic |
| `GET /api/auth/me` with `Origin: https://project-ticket-plum.vercel.app` (no cookie) | `401 UNAUTHORIZED`, with `Access-Control-Allow-Origin: https://project-ticket-plum.vercel.app` and `Access-Control-Allow-Credentials: true` echoed back correctly (allow-listed origin reflected, not a wildcard) |

Matches the allow-list documented in `docs/15-security.md` §6 exactly — no drift found between code and live behavior.

## Recommended additions

| Header/gap | Recommendation |
|---|---|
| Frontend static host (port 80) | Add the same class of headers Helmet gives the API — `X-Content-Type-Options: nosniff`, `X-Frame-Options`/`frame-ancestors`, a CSP for the SPA, `Referrer-Policy` — at whatever serves `main/frontend/dist` on `192.168.1.23`. This is outside `main/backend`/`main/frontend` application code (it's the static-hosting layer), so it can't be fixed by editing this repo alone. |
| Backend CSP `font-src`/`style-src: https:` | Narrow from any `https:` origin to the specific origins actually used (`fonts.googleapis.com`, `fonts.gstatic.com`) once the app's real script/style/connect sources are enumerated — matches the existing recommendation in `docs/15-security.md`. |
| Backend HSTS | No code change needed now; becomes effective automatically once the backend sits behind TLS. Flag for the infra owner rather than the codebase. |
