# Infrastructure and Subscription Plan

Prepared 2026-08-14. Stack: Vercel (hosting) plus Firebase (database and login system). Sized for 1,000 to 2,000 daily logins in production.

## Recommendation

Stay on the current setup. No move to a different platform is needed. Upgrade **Firebase to its "Blaze" paid plan** and **Vercel to its "Pro" plan**. Both are genuinely required at this scale, not optional extras. Everything else below can stay on the free tier.

## Subscription decisions

| Service | Plan | Cost | When | Why |
|---|---|---|---|---|
| Firebase (database and login) | Blaze (pay only for what you use) | roughly Rs. 800 to Rs. 4,000 per month | **Now** | The free tier caps out at 50,000 database reads a day. With 1,000 to 2,000 active users, that limit gets used up within hours. The app simply stops working without this upgrade. |
| Vercel (hosting for the website and the server) | Pro | $20 per month | **Now** | The free "Hobby" plan's terms only allow personal, non-commercial use. A company application serving daily active users needs the Pro plan regardless of how much traffic it actually gets. |
| Sentry (a tool that tracks errors as they happen) | Developer (free) | Rs. 0 | Later | The free plan covers 5,000 errors a month, which is comfortably enough at this scale. |
| UptimeRobot (a tool that alerts you if the site goes down) | Free | Rs. 0 | Later | 50 monitored links checked every 5 minutes, free indefinitely at this scale. |
| A custom domain name | Whichever registrar you prefer | roughly $12 per year | Optional | This is purely cosmetic. The address Vercel automatically provides works perfectly well without one. |

**A realistic monthly total for the "Now" items: about Rs. 2,500 to Rs. 7,300.**

That range is wide because the Firebase cost depends entirely on one specific technical choice, explained below. The exact same feature can end up costing five times more or five times less depending on how it's built.

## Why the Firebase cost has such a wide range

- **If the app keeps checking for updates every 20 seconds, the way it does now: roughly Rs. 4,000 to Rs. 4,500 a month.** The Tickets and Approvals sections currently check the database every 20 seconds for every single user, whether or not anything has actually changed. With 1,000 or more people using the app at once, that alone adds up to millions of billable database reads a day.
- **If it's switched to instantly push updates instead of checking on a timer: roughly Rs. 800 to Rs. 1,200 a month.** Firestore (the database) offers a feature that only counts as a "read," and therefore only costs money, when the data actually changes. Same feature, same number of users, a fraction of the cost, and updates would arrive instantly instead of taking up to 20 seconds.

## What NOT to add

Services like Railway, Render, or a dedicated virtual server don't buy anything here. Those exist for things like keeping a connection open continuously (websockets) or running long background jobs, and this backend needs neither. Adding one would just mean a second hosting bill and extra migration work for no real benefit.

## Production hardening checklist (this is separate from the billing decisions above)

| # | Action | Priority |
|---|---|---|
| 1 | Remove `docs/login-credentials.pdf` and `cost-estimate-100-users.pdf` from the repository. These contain real employee passwords and should not be stored here. | High |
| 2 | Add security headers (`helmet`) and request-rate limiting (`express-rate-limit`) to the backend. | High |
| 3 | Review Firestore's security rules (if the website ever talks to the database directly instead of only through the backend server, those rules need to enforce role-based permissions). | High |
| 4 | Replace the 20-second polling with Firestore's instant-update feature. | Medium |
| 5 | Turn on automatic backups for Firestore. | Medium |
| 6 | Add error tracking (Sentry). | Medium |
| 7 | Add request logging (`morgan`), so incoming requests are recorded for troubleshooting. | Low |
| 8 | Add an uptime monitor (UptimeRobot). | Low |

These figures are estimates, based on Vercel's and Firebase's published pricing. Confirm the actual Firebase cost using their Blaze plan's own pricing calculator once real traffic is flowing.
