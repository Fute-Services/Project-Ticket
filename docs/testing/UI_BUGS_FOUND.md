# UI Bugs Found — Live QA Pass (2026-09-05)

### UI-BUG-01: IT Tickets Queue "All" tab count/list goes stale after a status change
- **Severity:** Medium
- **Page:** `/it/dashboard` → Tickets Queue
- **Steps to reproduce:**
  1. Log in as IT (`system.it.test@futeservices.com`).
  2. Open Tickets Queue with 8 total tickets (header reads "8 total tickets"; Open: 1, Resolved: 7).
  3. Before any change, the "All" tab badge already read **1**, not 8 — mismatched with the page header and the Open+Resolved breakdown.
  4. Change the one Open ticket's status to Closed via the inline dropdown.
  5. The status-change toast and Closed action succeed, but the "All" tab now shows **0** and the table renders "No tickets have been raised yet. They appear here as employees submit them." — even though the header still says "8 total tickets" and "Resolved: 8".
- **Expected:** The "All" tab should always show/count every ticket (8), regardless of status.
- **Actual:** "All" tab's badge and list only reflect a subset (apparently just tickets matching whatever filter was last active), and its list rendering falls back to an empty-state message that contradicts the page's own header count.
- **Likely cause:** The "All" tab's count/list is being derived from the currently-selected status filter's cached result set instead of the full unfiltered ticket list.

### UI-BUG-02: Toast notification persists across sign-out into a different account's session
- **Severity:** Low
- **Steps to reproduce:**
  1. Log in as Employee, raise an IT ticket (toast: "IT Ticket raised — IT can see it now...").
  2. Sign out, then log in as IT (`system.it.test@futeservices.com`).
  3. The same "IT Ticket raised" toast from the previous (Employee) session is still visible on the IT dashboard.
- **Expected:** Toast/notification state should be scoped to the session that triggered it and cleared on sign-out.
- **Actual:** The toast (and its dismiss control) carries over into a completely different user's freshly-loaded dashboard.
- **Likely cause:** Toast state stored in a global store/localStorage key that isn't cleared on logout.

### UI-BUG-03 (cosmetic): Missing space in welcome message
- **Severity:** Trivial
- **Page:** Post-login transition screen
- **Actual:** Displays "Welcome,HR Tester" (no space after the comma).
- **Expected:** "Welcome, HR Tester".

### UI-BUG-04 (cosmetic/layout): HR dashboard "HR Tickets" panel content clips at standard desktop width
- **Severity:** Low
- **Page:** `/hr/overview`
- **Actual:** The status pill row ("Open: 1", "In Progress: 0", "Waiting Approval: 0", "Resolved: ...") overflows the right edge of the HR Tickets card at ~1568px viewport width, with "Resolved" cut off.
- **Expected:** Pills should wrap or the card should scroll/shrink content to stay within its container.

## Not confirmed as bugs
- Responsive/mobile layout was not conclusively tested — see "Responsive check" note in `PAGE_TEST_RESULTS.md`. Not counted as a finding either way.
- No JS console errors were observed on any page in this pass.

## Cleanup performed
- Test data created during this pass (ticket `FT-IT-GIFKZR`, title prefixed `QA-TEST-`) was closed via the IT dashboard's status control before ending the session, per the data-safety convention used in prior QA passes.
