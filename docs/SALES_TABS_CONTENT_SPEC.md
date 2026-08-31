# Sales Desk: What Belongs in Each Tab

A content spec for the 9-tab Sales Desk sidebar, written the way a 10+ year sales manager would review a CRM — not "does the screen exist" but "does it actually help me run a sales floor." For each tab: what's already shipped, then what's still missing and why it matters.

**Status:** Reference/spec document, no code written. **Prepared:** 31 Aug 2026.

---

## 1. Dashboard

**Already shipped:** Calls Today / New Leads / Meetings / Revenue Closed stat row, a follow-ups-need-attention banner, pipeline stage bars with ₹ value, a monthly-target donut, a Priority Leads table, Team Activity (calls per rep), Today's Schedule.

**Still missing, and why it matters:**
- **Speed-to-lead.** How long between a lead entering the system and its first call. This is the single biggest lever on conversion in any cold-calling operation — a lead called within an hour converts at a completely different rate than one called two days later. Nothing on the dashboard shows this today.
- **Stale/stuck leads alert.** Follow-ups only surfaces leads with a `nextCallDate` set. A lead with no next-call date at all — the ones that fell through the cracks — never shows up anywhere. This is the most common way real pipeline quietly dies.
- **Weighted pipeline / forecast.** ₹42L of raw pipeline value isn't a forecast — a lead in "New" and a lead in "Proposal" don't have the same odds of closing. A per-stage win-probability weighting (e.g. New 10%, Contacted 25%, Meeting 40%, Proposal 65%, Closure 90%) turns the pipeline total into a number worth reporting upward.
- **Stage-to-stage conversion %.** The pipeline bars show counts per stage but not the drop-off between them (e.g. "76% of New leads reach Contacted, only 58% of those reach Meeting"). That drop-off is exactly where a manager finds out where the team is actually losing deals.
- **Rep quality, not just activity.** "58 calls today" rewards busyness. Win rate and average deal size per rep is what actually separates a productive rep from a busy one.
- **At-risk big deals.** A ₹15L deal sitting untouched for 5 days is a bigger fire than a ₹50K deal that's overdue by the same amount. Priority Leads sorts by Hot/Warm/Cold only — deal value should factor into what surfaces first.
- **Trend arrows (WoW / MoM).** "34 new leads" means nothing without knowing if that's up or down from last week. Every stat card needs a small ↑/↓ comparison.
- **Recent Wins/Losses ticker.** A live feed of what just closed or just fell through — keeps the team's attention on outcomes, not just activity counts.
- **New business vs. existing-client split.** Are we growing the base or just re-servicing it — a distinction any sales leader tracks.

---

## 2. Leads (Directory)

**Already shipped:** Search (company/contact/city), filter by status/priority/rep, card grid with priority + status badges + deal value, view↔edit Lead Profile popup, Excel import, manual Add Lead.

**Still missing:**
- **Bulk actions.** Reassign 20 leads to a different rep, or bulk-update status, in one action — one-lead-at-a-time editing doesn't scale past a small list.
- **"Days since last activity" as a sortable column.** Currently the only time signals are `lastCalledDate`/`nextCallDate`; a manager scanning for neglected leads needs to sort by staleness directly.
- **Duplicate warning on manual add.** A phone number or company name that already exists should flag before creating a second record — the Excel import already dedupes; manual entry currently doesn't.
- **Export the current filtered view.** "Give me a CSV of every Hot lead assigned to Akshay" as a one-click export, not just the full email-campaign list.

---

## 3. Daily Calls

**Already shipped:** Today's worklist (due-today or never-called), sorted priority-first then longest-waiting, one-click "Call Now" into a Log Call action with outcome + comment.

**Still missing:**
- **Click-to-call.** A `tel:` link on the mobile number so the call actually dials from the same screen the outcome gets logged on, instead of switching apps and losing the row.
- **Skip / snooze for later today.** Not every lead on the list gets reached first try — a quick "come back to this in an hour" without opening the full profile.
- **End-of-day summary.** "42 of 50 calls made" as a running total against the rep's own daily target, visible on this same screen, not just on the Dashboard.

---

## 4. Follow-ups

**Already shipped:** Overdue and Due Today sections, priority-sorted, live sidebar badge count.

**Still missing:**
- **"This Week" view**, not just today/overdue — a rep planning their week needs to see what's coming in the next 5-7 days, not just what's already late.
- **Inline reschedule.** Snoozing a follow-up to a new date shouldn't require opening the full Lead Profile — a quick date-picker right on the row.
- **Filter by rep**, so a manager reviewing the team's follow-up discipline can look at one person's queue at a time.

---

## 5. Meetings

**Already shipped:** Upcoming / Needs-Outcome tabs, sorted by meeting date.

**Still missing:**
- **A calendar view**, not just a list — meetings are inherently date-anchored, and a week/month grid makes clustering and conflicts visible in a way a flat list doesn't.
- **Meeting type** (call / video / in-person) as its own field — the reference CRM and most real sales tracking distinguish these, since prep and no-show risk differ by type.
- **A pre-meeting checklist/notes template** — what to bring up, what was promised last time — so meeting notes aren't a blank box every time.

---

## 6. Pipeline

**Already shipped:** 5-stage kanban (New leads → Contacted → Meeting → Proposal → Closure, derived from `status`), click-to-advance, per-column lead count and total deal value.

**Still missing:**
- **Weighted value per column**, alongside the raw sum — same forecast logic as the Dashboard, shown where deals actually live.
- **Stuck-card highlighting** — a visual flag (e.g. a red border) on any card that's sat in its current stage longer than some threshold, so triage doesn't require opening every card.
- **Filter the board** by rep or priority — a manager who only wants to see one rep's deals shouldn't have to scan five full columns.
- **True drag-and-drop**, not just a click-to-advance button — faster for a rep triaging a full board.

---

## 7. Campaigns

**Already shipped:** Campaign records (name, source tag, target city, sent date), response rate computed against matching leads, reuses the shipped email-list CSV export.

**Still missing:**
- **Cost and ROI per campaign.** Response rate alone doesn't say whether a campaign was worth running — cost-per-campaign against revenue from its converted leads is the number that actually justifies budget.
- **Campaign status** (Planned / Active / Completed) — right now every campaign is just a logged-and-done record; a manager planning ahead needs to see what's upcoming too.

---

## 8. Reports

**Already shipped:** Revenue-closed-by-rep bar chart, calls-and-positive-outcomes-by-week line chart (last 12 weeks), Lost-reason breakdown.

**Still missing:**
- **A real date-range picker.** "Last 12 weeks" is hardcoded — a manager needs to pull last quarter, last month, or a custom range on demand.
- **A funnel conversion chart** spanning all 5 stages in one view, not just the two-metric weekly trend line.
- **Source-wise ROI table** — which channel (Referral / Outbound / Campaign / Email) actually converts best, pulled onto Reports itself rather than only visible per-campaign.
- **Export the report** — PDF or CSV, for sharing upward without a screenshot.

---

## 9. Settings

**Already shipped:** Monthly revenue target, daily call target per rep (one number for the whole team), a read-only rep roster derived from assigned leads.

**Still missing:**
- **Per-rep individual targets**, not one blanket daily-call number — a senior rep and a new hire don't have the same realistic target, and Team Activity's "on track / needs focus" read is only fair if it's measured against the right number per person.
- **Custom stage/status labels.** If the business wants to call a stage "Site Visit" instead of "Meeting," that should be a Settings change, not a code change.
- **Notification preferences** — who gets alerted when a lead goes stale, or when a high-value deal is overdue, once that alerting exists.

---

## Priority, if only a few of these get built next

Ranked by how much they'd change a sales manager's actual day-to-day decisions, not by build effort:

1. **Stale-lead alert** (Dashboard + Leads) — the single biggest blind spot right now.
2. **Speed-to-lead metric** (Dashboard) — the highest-leverage conversion driver, currently invisible.
3. **Weighted pipeline forecast** (Dashboard + Pipeline) — turns pipeline value into a number worth reporting.
4. **Stage-to-stage conversion %** (Dashboard) — shows exactly where deals are being lost.
5. **Per-rep targets** (Settings) — makes Team Activity's "needs focus" flag actually fair.

Everything else in this document is a real improvement, but these five are what separate a dashboard that looks complete from one that actually changes what a sales manager does each morning.

No code was written or changed in producing this document.
