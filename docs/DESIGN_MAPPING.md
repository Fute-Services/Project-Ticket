# Design → Product Mapping

How the Claude Design prototype **"Fute Services design prototype"** (file
`Fute Platform v2 modern.dc.html`, design system `modernist`) maps onto the
product defined in `PRD.md` and `USER_FLOW.md`.

---

## 1. The gap to be aware of

The prototype is a **full HR + IT platform**. The PRD is a **complaint token
portal**. They are not the same size:

| | Prototype | PRD |
|---|---|---|
| Screens | 13 | 9 |
| Scope | Employees, recruitment, attendance, payroll, leave, assets, inventory, helpdesk, reports | Raise / track / manage HR & IT complaints |
| Ticket identity | `HD-4192` | `FT-HR-XXXXXX` / `FT-IT-XXXXXX` |
| Auth | Login + MFA + SSO + forgot + welcome | Email + password, role from email pattern |

**Decision: the visual system is adopted wholesale, the screen list is not.**
Only prototype screens that answer to a PRD requirement get built. The rest are
recorded below as "not in scope" so nobody wonders later whether they were
missed.

---

## 2. Screen mapping

| PRD screen (§) | Prototype source | Status |
|---|---|---|
| Login (§4.1) | Auth view — `authStep: "login"` | ✅ **Built** |
| Register (§4.1) | Auth view — layout reused | ⬜ Next |
| Employee dashboard (§4.2) | `dashboard` + `helpdesk` table | ⬜ |
| HR complaint form (§4.3) | `openAdd()` modal + form components | ⬜ |
| IT complaint form (§4.4) | Same, plus category/sub-category | ⬜ |
| HR dashboard (§4.6) | `helpdesk` — queue, KPIs, chips, table | ⬜ |
| IT dashboard (§4.7) | `helpdesk` — same shell, IT filters | ⬜ |
| Founder dashboard (§4.8) | `dashboard` — KPI row + unified table | ⬜ |
| Token search (§4.9) | Prototype search field in the top bar | ⬜ |

### Prototype screens deliberately not built

`employees`, `employee`, `recruitment`, `attendance`, `payroll`, `leave`,
`assets`, `inventory`, `reports`, `settings`.

None appear in the PRD. Several — `assets`, `reports`, `settings` — line up with
items in `TICKETING_FEATURES_AND_WORKFLOWS.md` and are worth revisiting when
that roadmap is picked up.

### Prototype auth steps not built

- **MFA** — not in the PRD.
- **SSO ("Continue with company SSO")** — not in the PRD; auth is email + password.
- **Forgot password** — not in the PRD, but it is a genuine gap. Worth adding.
- **Welcome / onboarding checklist** — not in the PRD.

---

## 3. Design system

Ported from `_ds/modernist-…/styles.css` into the app:

| Concern | Where it now lives |
|---|---|
| Tokens (colour, type, space, elevation) | `src/styles/tokens.css` |
| Base elements + component classes | `src/styles/globals.css` (`@layer base` / `@layer components`) |
| Tailwind bindings | `tailwind.config.js` — utilities point at the CSS variables |
| Font | `Archivo` (400–800), loaded in `index.html` |

**The system's three rules:** no radius, 2px rules, one red.

| Token | Value | Use |
|---|---|---|
| `--acc` | `#ec3013` | The one accent. Primary actions, links, brand mark |
| `--bg` | `#141314` | Page |
| `--sf` | `#1a1919` | Raised surface |
| `--pn` | `#1f1e1e` | Inputs, panels |
| `--ink` | `#f1efee` | Text |
| `--mut` | `#8d8988` | Secondary text |
| `--line` | `rgba(241,239,238,.12)` | Borders, rules |
| `--ok` / `--warn` / `--info` | `#4fae7c` / `#d9a13c` / `#7d9ede` | Status |
| `--radius` | `0px` | Everything. Square is the identity |

Dark is the default — the prototype ships `dark: true`. A light set is defined
under `:root[data-theme="light"]` and is unused until a theme toggle exists.

### Component classes available now

`.btn` (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-block`), `.field`
+ `.label` + `.input`, `.panel`, `.rule`, `.tag`, `.table`, `.kicker`.

Build new screens on these rather than ad-hoc utilities, so a token change
reaches every screen at once.

---

## 4. Status → token mapping

The prototype's `tone()` map, reconciled with the PRD's three statuses and
three priorities.

| PRD value | Token | Prototype equivalent |
|---|---|---|
| Status `Pending` | `--warn` | Pending |
| Status `In Progress` | `--info` | Open / In review |
| Status `Completed` | `--ok` | Resolved / Complete |
| Priority `P1` (High) | `--acc` | Urgent / High |
| Priority `P2` (Medium) | `--warn` | Normal |
| Priority `P3` (Low) | `--mut` | Low |

Tags render as `color-mix(in srgb, <token> 18%, transparent)` background with
the token itself as foreground — the prototype's own recipe.

---

## 5. Adaptations made, and why

1. **Ticket IDs stay `FT-HR-XXXXXX`.** The prototype's `HD-4192` is discarded —
   PRD §4.9 defines the token format, and the token is the product's core idea.
2. **Right-hand accent panel copy rewritten.** The prototype advertises "248
   employees, 612 devices". This product is a complaint portal, so the panel
   speaks to tickets and tokens instead of headcount.
3. **Login errors are written for humans.** No status codes, no raw server text
   — `401` becomes "That email and password do not match."
4. **`btn-block` left-aligns its label.** That is the prototype's own styling,
   kept rather than centring it, so the button matches the design's rhythm.
5. **The accent panel is hidden below `lg`.** In the prototype it collapses to a
   single column on tablet and mobile; a full-width red block above the form
   would only push the fields off-screen.
6. **The opening curtain sequence is not from the prototype.** It was requested
   separately and now uses these tokens.

---

## 6. Source of truth

The design lives at
`https://claude.ai/design/p/8d98f9eb-cfea-4bde-900c-3d9934a4b035`.

When it changes, re-read `_ds/modernist-…/styles.css` and update
`src/styles/tokens.css` — not the component files.
