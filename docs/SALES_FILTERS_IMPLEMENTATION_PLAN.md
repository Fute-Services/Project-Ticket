# Sales Portal — Marketing Master Sheet → Sales Filters

Implementation plan for pulling the real customer-list data (India + Australia, ~2,800+ contacts across 5 tabs of `MARKETING MASTER SHEET – CUSTOMER LIST 25-26`) into the Sales Desk's Directory, with filters that match how the sheet is actually worked.

**Scope:** Sales Portal only. **Status:** Not started — code not yet written.

## Where it goes

- **Schema**: extends the existing `sales_leads` Firestore collection — no new collection, just new fields on the same doc Directory/Pipeline/Reports already read.
- **Import**: extends the existing Excel importer in Settings → `salesDeskController.js`, the same one that already dedupes and protects manually-entered `dealValue`/`priority`/`callLog`.
- **UI**: filter bar lives in `Directory.jsx` (the master list). Pipeline and Reports get read-only versions of the same filters for consistency.

## Phase 1 — Schema additions to `sales_leads`

New fields, added alongside the existing ones (companyName, status, priority, assignedTo, etc.):

| Field | Values | Source column in sheet |
|---|---|---|
| `country` | India / Australia | inferred from which sheet tab the row came from |
| `designationLevel` | Decision Maker / Influencer / Other | derived from Designation text via a keyword map |
| `emailVerified` | Valid / Unknown / Invalid | Email Status? |
| `phoneVerified` | Correct / Unknown / Wrong | Is no. correct? |
| `emailCampaignStatus` | Not Sent / Sent / Both Done / Got Response / Bounced | Email Camp |
| `whatsappCampaignStatus` | Not Started / Going On / Done / No Response | Whatsapp Camp |
| `linkedinCampaignStatus` | Not Started / 1st Msg Sent / Follow-up Done | Linkedin Camp |
| `linkedinConnectionStatus` | Not Sent / Sent / Accepted / Already Connected | Linkedin Connection |
| `leftOrganisation` | boolean | detected from "What to do:" text |
| `nextAction` | free text | Action to be taken / What to do: |
| `lastContactedDate` | date | Last Contacted |

**Data quality note:** `city` stays the existing field, but the importer normalizes casing/typos (Bangalore/bangalore, Hyderabad/Hydarebad, Ahmedabad/Amedhabad → one canonical value each) before writing, so the filter dropdown doesn't fragment into near-duplicates.

## Phase 2 — Import pipeline

1. Add a per-tab column-mapping table — the 5 tabs use different header layouts, so one fixed column order won't cover all of them.
2. Reuse the existing dedupe-by-email/phone logic already built for Sales import.
3. Run the city-normalization lookup at import time — a fixed table maintained in code, extended as new typos show up.
4. Keep the existing rule: re-importing never overwrites `dealValue`, `priority`, or `callLog` that a rep already entered manually.

## Phase 3 — Directory.jsx filter bar

Grouped the way a rep actually scans them, left to right:

- **Country** — toggle: India / Australia (top-level, changes which City list shows)
- **City** — searchable multi-select, canonical list only, post-normalization
- **Stage/Status** and **Priority** — already exist, unchanged
- **Designation Level** — Decision Maker / Influencer / Other
- **Campaign Status** — 3 independent dropdowns (Email / WhatsApp / LinkedIn) — a lead can be mid-way on one channel and untouched on another
- **Data Quality** toggle — "Hide bad contacts" collapses wrong-email / wrong-number / left-organisation leads out of the default view (never deleted, still reachable via checkbox)
- **Assigned Rep** — already exists, maps to "marketing Head"
- **Last Contacted** — date range picker

## Phase 4 — Reports.jsx additions

- Leads by City (bar chart)
- Leads by campaign-channel status — a funnel per channel, showing where each one actually stalls (sent-but-no-response, bounced, etc.)
- India vs Australia split

## Phase 5 — QA

1. Import the real file end-to-end into a test/staging state first — confirm row counts per tab land correctly.
2. Spot-check the city-normalization map against the actual data before trusting the City filter.
3. Confirm all filters combine with AND logic and stay responsive at ~2,800+ leads (Directory already paginates, so this should hold, but worth confirming post-import).

## Out of scope

Pipeline, Daily Calls, Follow-Ups, and Meetings are workflow views, not the master filter list, so they're untouched unless the filters are explicitly wanted there too.
