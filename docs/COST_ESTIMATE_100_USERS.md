# Monthly Cost Estimate for 100 Users

For 100 people using this website every day. Fute Portal (Project Ticket). Generated 2026-08-12.

This app is built on **Firebase** (the database and login system) and **Vercel** (where the website and backend, the server-side code that powers the website, run). Below is a simple, easy-to-read estimate of what it would cost per month if 100 people used it every working day.

## 1. Quick summary

| Item | Estimated cost / month |
|---|---|
| Database (Firebase Firestore, reads and writes) | $15 to $70 |
| Login system (Firebase Authentication) | Free |
| Website + backend hosting (Vercel) | $20 |
| Sending emails (Gmail SMTP, the email-sending service) | Free |
| Domain name (optional, if you want a custom web address) | About $1 |
| **Total estimated cost** | **$35 to $90 / month** |

In simple terms: roughly **$1 to $3 per day** for the whole company, not per person.

**Important:** the app is currently on Firebase's free plan, which has a strict daily limit. We are already hitting that limit today with far fewer than 100 people using it. So before adding more users, the Firebase project needs to be switched to its "pay as you go" plan (called Blaze). The numbers above already assume that plan.

## 2. Why the database cost has a wide range

The website checks for new tickets, approvals, and permissions automatically every 15 to 20 seconds while someone has it open, so it feels "live" without needing a refresh button. This is convenient, but it means the database gets checked very often during the day.

- **Low end ($15/month):** if usage stays light, or the "auto-check every few seconds" behavior is later made smarter (only checking when something actually changes).
- **High end ($70/month):** if all 100 people keep the site open for a full 8-hour workday, with the current auto-check-every-15-seconds behavior running the whole time.

Everything else (login, hosting, email) does not grow much with usage at this size. It stays close to a flat monthly fee.

## 3. What each cost actually pays for

| Service | What it does | Free allowance |
|---|---|---|
| Firebase Firestore | Stores every ticket, employee, approval, and message | 50,000 database checks per day, free |
| Firebase Authentication | Handles logins and passwords securely | Free up to 50,000 monthly users, more than enough |
| Vercel | Keeps the website and its backend server online 24/7 | Included in the $20/month plan for this size of app |
| Gmail SMTP | Sends notification emails (for example, HR emails) | Free for this volume of emails |

## 4. If the company grows beyond 100 users

Costs scale roughly in a straight line with how many people are actively using the site each day, not with how many accounts exist. 200 daily users would roughly double the database cost. 500 would roughly multiply it by 5, unless the "auto-check every few seconds" behavior is optimized first, which would keep costs much flatter as the company grows.

Estimate based on Firebase Blaze (pay-as-you-go) pricing and Vercel Pro pricing, both public as of this document's generation date. Actual bills depend on real usage and can be tracked live in each platform's billing dashboard.
