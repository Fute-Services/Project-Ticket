# Infrastructure & Subscription Plan

Prepared 2026-08-14. Stack: Vercel + Firebase. Sized for 1,000–2,000 daily logins in production.

## Recommendation

Stay on the current stack — no platform migration needed. Upgrade **Firebase to Blaze** and **Vercel to Pro**; both are required at this scale, not optional extras. Everything else below stays on free tier.

## Subscription decisions

| Service | Plan | Cost | When | Why |
|---|---|---|---|---|
| Firebase (Firestore + Auth) | Blaze (pay-as-you-go) | ~₹800–4,000/mo | **Now** | Free tier caps at 50k reads/day. At 1–2k active users this is exceeded within hours — the app fails without this. |
| Vercel (backend + frontend hosting) | Pro | $20/mo | **Now** | Hobby plan's terms restrict it to personal, non-commercial use. A company app serving daily active users needs Pro regardless of traffic volume. |
| Sentry (error tracking) | Developer (free) | ₹0 | Later | 5k errors/month free covers this scale comfortably. |
| UptimeRobot (uptime alerts) | Free | ₹0 | Later | 50 monitors, 5-min checks, free forever at this scale. |
| Custom domain | Registrar of choice | ~$12/yr | Optional | Cosmetic only — the Vercel-issued URL works fine. |

**Realistic monthly total (Now items): ≈ ₹2,500 – ₹7,300**

The range is wide because Firebase cost depends entirely on the read pattern below — the same feature can cost 5× more or less depending on one implementation choice.

## Why the Firebase cost has a range

- **If 20s polling stays as-is: ~₹4,000–4,500/mo.** Tickets and Approvals currently poll every 20 seconds per user regardless of whether anything changed. At 1,000+ concurrent users this alone generates millions of billable reads a day.
- **If switched to real-time listeners: ~₹800–1,200/mo.** Firestore's `onSnapshot` listener only bills a read when data actually changes. Same feature, same users — a fraction of the cost, and updates arrive instantly instead of within 20s.

## What NOT to add

Railway, Render, or a dedicated VM — none of these buy anything here. They exist for persistent connections (websockets) and long-running background jobs, and this backend has neither. Adding one means a second hosting bill and a migration for zero functional gain.

## Production hardening checklist (separate from billing)

| # | Action | Priority |
|---|---|---|
| 1 | Remove `docs/login-credentials.pdf` / `cost-estimate-100-users.pdf` from the repo (real employee passwords) | High |
| 2 | Add `helmet` + `express-rate-limit` to the backend | High |
| 3 | Review Firestore security rules (client SDK usage needs role-based rules) | High |
| 4 | Switch 20s polling → Firestore `onSnapshot` listeners | Medium |
| 5 | Enable Firestore automated backups | Medium |
| 6 | Add error tracking (Sentry) | Medium |
| 7 | Add `morgan` request logging | Low |
| 8 | Uptime monitor (UptimeRobot) | Low |

Figures are estimates based on published Vercel and Firebase pricing; confirm actual Firebase cost against the Blaze calculator once traffic is live.
