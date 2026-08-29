# Infrastructure Memo: Subscriptions for Fute Portal

What to pay for, what to keep free, and why. Sized for 1,000 to 2,000 daily logins in production.

Prepared 2026-08-14. Stack: Vercel + Firebase. Scale: 1 to 2 thousand daily users.

## Recommendation

Stay on the current stack. Upgrade Firebase to its "Blaze" (pay-as-you-go) plan and Vercel to its "Pro" plan. Both are required at this scale, not optional extras. Everything else on this page is free-tier and stays that way.

## 1. Subscription decisions

| Service | Plan | Cost | When | Why |
|---|---|---|---|---|
| Firebase Firestore + Auth (the database and login system) | Blaze (pay-as-you-go) | About ₹800 to ₹4,000/month | Now | The free tier caps at 50,000 database reads a day. At 1 to 2 thousand active users this gets used up within hours, not days. The app will start failing without this. |
| Vercel (backend + frontend hosting, meaning where the website and its server-side code run) | Pro | $20/month | Now | The free "Hobby" plan's terms restrict it to personal, non-commercial use. A company app serving daily active users needs the Pro plan regardless of how much traffic it gets. |
| Sentry (error tracking) | Developer (free) | ₹0 | Later | 5,000 errors a month, free, comfortably covers this scale. Add it when you're ready to wire it in. No rush to pay. |
| UptimeRobot (uptime alerts, which tell you if the site goes down) | Free | ₹0 | Later | 50 monitors, checks every 5 minutes, free forever at this scale. No paid tier needed. |
| Custom domain | Registrar of choice | About $12/year | Optional | This is cosmetic only. The Vercel-issued web address works fine as-is. Add a custom domain only if you want a branded link. |

**Realistic monthly total (the "Now" items):** roughly ₹2,500 to ₹7,300.

The range is wide because the Firebase cost depends entirely on the read pattern described below. The same feature can cost 5 times more or less depending on one implementation choice.

## 2. Why the Firebase cost has a range

**If polling stays as-is:** about ₹4,000 to ₹4,500/month. Tickets and Approvals currently poll (automatically check for updates) every 20 seconds per user, regardless of whether anything actually changed. At 1,000+ people using the app at once, this alone generates millions of billable database reads a day.

**If switched to listeners:** about ₹800 to ₹1,200/month. Firestore's "onSnapshot" real-time listener (a way of watching for changes that only reports back when data actually changes) only bills a read when data actually changes. Same feature, same number of users, but a fraction of the cost, and updates arrive instantly instead of within 20 seconds.

## 3. What NOT to add

Railway, Render, or a dedicated virtual server: none of these buy you anything here. They exist for things like persistent connections (websockets) and long-running background jobs, and this backend has neither. Adding one would mean paying for a second hosting bill and doing a migration, for zero functional gain.

---

Fute Portal, internal infrastructure memo. Figures are estimates based on published Vercel and Firebase pricing. Actual Firebase cost should be confirmed against the Blaze calculator once traffic is live.
