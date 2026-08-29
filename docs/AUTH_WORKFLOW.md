# How Logging In Works: Secure Cookies and Refresh Tokens

**Last updated:** 2026-08-29 · **Related doc:** `docs/SECURITY.md`

This document explains, step by step, how a person's login session is kept secure in Project-Ticket. It replaces an older approach (one long-lived login token saved in the browser's local storage) with a safer one: a short-lived "access" token plus a longer-lived "refresh" token, both stored in a special kind of cookie called `httpOnly`, which JavaScript running on the page cannot read. That matters because if a malicious script ever ran on the site, it still couldn't steal these cookies directly.

## Summary

| Token | How long it lasts | Where it's stored | What it's for |
|---|---|---|---|
| Access token (`fute_token`) | 15 minutes | An `httpOnly` cookie (hidden from page scripts), used on every page | Sent with every request. This is what the server actually checks to confirm who you are. |
| Refresh token (`fute_refresh`) | 7 days (or just until the browser closes, if "Remember me" was left unchecked) | An `httpOnly` cookie, but only sent to the login-related pages, not everywhere | Used to get a new access token once the old one expires. It is never sent anywhere else, which limits where it could ever be exposed. |
| CSRF token (`fute_csrf`) | Matches however long the refresh token lasts | A regular cookie (not hidden from scripts), used everywhere | Sent back as a special header on any request that changes data, as proof the request really came from this app's own website and not a forged request from somewhere else. |

The refresh token is **replaced every time it's used**: a new one is issued and the old one stops working. If someone ever tries to reuse an old, already-replaced refresh token, the system treats that as a sign the token was stolen. It immediately shuts down that whole login session, forcing everyone, including the real user, to log in again.

## Complete flow

```mermaid
flowchart TD
    Start([User opens the app]) --> Cred{Session cookie present?}
    Cred -->|No| LoginForm[Login / Register form]
    LoginForm --> LoginReq["POST /api/auth/login or /register"]
    LoginReq --> Verify[Backend verifies credentials<br/>via Firebase Identity Toolkit]
    Verify -->|Invalid| LoginFail["401 Invalid credentials<br/>+ failed-login logged<br/>+ account locked after 5 attempts"]
    LoginFail --> LoginForm
    Verify -->|Valid| CreateSession["Create session doc in Firestore<br/>uid, ip, userAgent, remember"]
    CreateSession --> IssueTokens["Issue Access JWT (15 min)<br/>+ Refresh token (7d, hash stored)<br/>+ CSRF token"]
    IssueTokens --> SetCookies["Set 3 cookies:<br/>fute_token: httpOnly, path /<br/>fute_refresh: httpOnly, path /api/auth<br/>fute_csrf: readable, path /"]
    SetCookies --> App[Dashboard loads]
    Cred -->|Yes| App

    App --> Req[Any API request]
    Req --> CORS{Known origin?}
    CORS -->|No| Reject1["403 Not allowed by CORS"]
    CORS -->|Yes| CSRFCheck{"Mutating request?<br/>(POST / PUT / PATCH / DELETE)"}
    CSRFCheck -->|Yes| CSRFMatch{"CSRF cookie value ==<br/>X-CSRF-Token header?"}
    CSRFMatch -->|No| Reject2["403 CSRF_INVALID"]
    CSRFMatch -->|Yes| AuthCheck
    CSRFCheck -->|No, safe GET| AuthCheck{"Access cookie valid,<br/>signature OK,<br/>session not revoked?"}

    AuthCheck -->|Valid| Controller["Controller runs:<br/>role + ownership checks,<br/>reads/writes Firestore"]
    Controller --> Response["JSON response<br/>{success, message, data}"]

    AuthCheck -->|"Expired / missing (401)"| Interceptor["Frontend response interceptor<br/>catches the 401"]
    Interceptor --> InFlight{Refresh already in flight?}
    InFlight -->|Yes| WaitShared["Await that same<br/>in-flight refresh call"]
    InFlight -->|No| CallRefresh["POST /api/auth/refresh<br/>(refresh cookie sent automatically)"]

    CallRefresh --> Lookup{"Refresh token hash matches<br/>a session's CURRENT hash?"}
    Lookup -->|"Yes, and not expired"| Rotate["Rotate:<br/>new access JWT + new refresh token<br/>+ new CSRF token.<br/>Old refresh hash kept as<br/>'previousRefreshTokenHash'"]
    Rotate --> SetCookies2[Set fresh cookies]
    SetCookies2 --> Retry["Retry the original request<br/>with the new access cookie"]
    Retry --> Controller

    Lookup -->|"Matches a PREVIOUS,<br/>already-rotated-out hash"| Theft["Reuse detected:<br/>revoke the ENTIRE session<br/>(revokedReason: refresh_token_reuse)"]
    Theft --> ClearAll[Clear all 3 cookies]
    ClearAll --> ForceLogin[Redirect to login]

    Lookup -->|"Not found / expired / revoked"| ClearAll

    WaitShared --> Retry

    App --> LogoutBtn[User clicks Logout]
    LogoutBtn --> LogoutReq["POST /api/auth/logout"]
    LogoutReq --> RevokeSession["Mark session doc<br/>revoked = true"]
    RevokeSession --> ClearAll

    classDef bad fill:#f6dedb,stroke:#9c2b2b,color:#7a2020
    classDef good fill:#dfeee2,stroke:#3c6e4a,color:#2c5236
    classDef warn fill:#f0e7cd,stroke:#8a6d1f,color:#6b551a
    class Reject1,Reject2,LoginFail,Theft bad
    class Response,App,Controller good
    class Interceptor,CallRefresh,Rotate warn
```

## Why it's built this way

- **The access token only lasts 15 minutes.** This limits how much damage a leaked or stolen token could do, without forcing the user to type their password over and over (that's what the refresh token is for).
- **The refresh token is only sent to the login-related pages.** It never travels to any of the roughly 60 other pages/features in the app, so there are far fewer places it could ever be exposed.
- **The refresh token gets replaced every time it's used, and reuse is detected.** This is the standard way to defend against a copied refresh token. The real, legitimate device always has the newest one, so if a copy is ever replayed, the system catches it the moment either the real device or the copy is used first and the token moves on to its replacement.
- **There's a separate cookie just for CSRF protection** (CSRF stands for Cross-Site Request Forgery: a trick where another website tries to make requests to this app pretending to be the logged-in user). This is needed because the login cookies have to work across two different website addresses (the frontend and the backend live on separate domains), which turns off a browser safety feature that would normally block this kind of trick automatically. The extra cookie brings that protection back: a forged request from another website can't read this cookie, so it can never produce a matching value to prove it's legitimate.
- **Only one refresh request happens at a time**, even if several parts of the page notice the login has expired at the same moment. Without this, two refresh requests could collide, and the second one would look like a stolen, already-used token by mistake.

## Simplified, step-by-step version

The same three flows above, written out in plain, linear steps.

### Complete authentication flow

```
USER
  ↓
Login (Email + Password)
  ↓
FRONTEND
  ↓
POST /api/auth/login
  ↓
BACKEND
  ↓
Verify Email + Password (Firebase Identity Toolkit)
  ↓
Create Access JWT (15 min) + Refresh Token (7d, hash stored in Firestore)
  ↓
Set HttpOnly + Secure Cookies (fute_token, fute_refresh, fute_csrf)
  ↓
BROWSER
  ↓
User opens Dashboard
  ↓
Frontend calls API
  ↓
Browser automatically sends Cookie
  ↓
CORS Check
  ↓
CSRF / SameSite Protection (mutating requests only)
  ↓
JWT Verification
  ↓
Token Valid?
  ├── NO  → 401 Unauthorized
  │
  └── YES
       ↓
     Get User ID (from JWT payload)
       ↓
     Database (Firestore)
       ↓
     Get User Data
       ↓
     Backend
       ↓
     Frontend
       ↓
     Dashboard
```

### Token refresh: what happens when the access token expires

```
API Request
    ↓
JWT Expired
    ↓
/api/auth/refresh
    ↓
Verify Refresh Token (hash match, not expired, not already rotated)
    ↓
Create New Access JWT + New Refresh Token (rotated)
    ↓
Update Cookies
    ↓
API Request continues (original request retried automatically)
```

*If the refresh token presented turns out to be an old, already-replaced one instead of the current one, things go differently: the whole session gets shut down instead of a new token being issued. See the reuse-detection path in the full diagram above for how that works.*

### Logout

```
Logout
  ↓
POST /api/auth/logout
  ↓
Revoke Refresh Token (session doc marked revoked = true)
  ↓
Clear Cookies (fute_token, fute_refresh, fute_csrf)
  ↓
User Logged Out
```
