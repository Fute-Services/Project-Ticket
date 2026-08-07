# Fute Services — Brand Guidelines

**Theme: Modernist (warm)**

This file documents the system **as the product actually implements it**.

```
main/frontend/src/styles/tokens.css   ← source of truth (the app reads this)
        ↓  documented by hand
docs/brand-guidelines.md              ← you are here
        ↓  node scripts/sync-brand-to-tokens.cjs
assets/design-tokens.json             ← tooling mirror (not read by the app)
```

> **Caveat on the sync script.** `sync-brand-to-tokens.cjs` only round-trips
> three values per role — base, dark, and light — and fills the rest of each
> 50–900 ramp with a brightness curve. Those generated mid- and dark-tones do
> **not** match the hand-tuned ramps in `tokens.css` (the curve pushes the dark
> end toward maroon instead of the warm browns the product ships). After
> running it, re-seed the ramps from `tokens.css` rather than accepting the
> generated values.

> **History.** This started as a port of a red, zero-radius "Modernist" design
> prototype. The product moved away from that: the accent is now warm orange,
> corners are rounded, and surfaces are darker. Earlier revisions of this file
> still described the red/square system and claimed `tokens.css` carried the
> same values — it did not. The values below are read off `tokens.css` and the
> shipped components.

---

## Quick Reference

| Element | Value |
|---------|-------|
| Primary Color | #E86024 |
| Secondary Color | #C7A34D |
| Accent Color | #4FAE7C |
| Heading Font | Archivo |
| Body Font | Archivo |
| Base Radius | 12px |

---

## Brand Concept

A **near-black interface carried by one warm accent**. The neutrals do the
work; the orange is reserved for the primary action and the thing that needs
attention.

Three rules that hold across the product:

1. **One accent.** `--acc` orange marks the primary action, the brand mark, and
   P1 priority. If two things on a screen are orange, neither reads as primary.
2. **Tint, don't fill.** Icon badges are a 10%-alpha tint of their colour with
   the icon in the full colour — not a saturated gradient fill. Gradient tiles
   read as decoration and flatten hierarchy when every card has one.
3. **Colour must mean something.** Department accents, status, and priority all
   map to a fixed hex. Colour applied for variety alone is noise.

**We are:** direct, structural, unfussy, confident.
**We are not:** decorative for its own sake, or reliant on colour to carry
meaning that the layout should carry.

This is internal business software. Someone opens it because something needs
doing. The interface should get out of the way.

---

## Color Specifications

### Primary Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Fute Orange | #E86024 | 232, 96, 36 | Primary actions, brand mark, links, P1 priority |
| Fute Orange Dark | #D4521A | 212, 82, 26 | Hover on primary |
| Fute Orange Light | #FDF1E7 | 253, 241, 231 | Tinted backgrounds on light surfaces |

Full ramp in `tokens.css` as `--acc-100 … --acc-900`.

### Secondary Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Muted Gold | #C7A34D | 199, 163, 77 | Tonal support beside the primary — charts, secondary series, warm rules |
| Muted Gold Dark | #A9843A | 169, 132, 58 | Gold on light surfaces |
| Muted Gold Light | #FBF5E7 | 251, 245, 231 | Rare, tinted fills |

### Accent Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Signal Green | #4FAE7C | 79, 174, 124 | Resolved / healthy state |
| Signal Green Dark | #2F7D55 | 47, 125, 85 | The same on light surfaces |

> **Read this before using Secondary or Accent.** This is deliberately a
> one-accent system. Muted Gold and Signal Green exist for tonal support and
> status — they are not a second and third brand colour. If a screen needs
> three colours to make its point, the layout is doing too little work.

### Neutrals

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | #0C0C0E | Page |
| `--sf` | #141418 | Raised surface, cards, sidebar, filter bars |
| `--pn` | #1A1A1F | Inputs, panels, menus |
| `--ink` | #F5F1EC | Text |
| `--mut` | #8E8E93 | Secondary text, captions, timestamps |
| `--line` | rgba(255,255,255,0.10) | Borders and rules |

Neutral ramp for anything in between: `#F8F4F4 #EAE7E7 #D7D3D3 #BAB6B6
#9B9797 #7D7979 #605D5D #444141 #2D2B2B`.

**Dark is the product default.** No light theme ships today; a light set would
go under `:root[data-theme="light"]`.

### Status Colors

Status is never communicated by text alone — colour plus a dot or word, always.

| Status | Token | Hex |
|--------|-------|-----|
| Pending | `--warn` | #D9A13C |
| In Progress | `--info` | #6BAFC2 |
| Completed | `--ok` | #4FAE7C |

### Priority Colors

| Priority | Hex | Promise |
|----------|-----|---------|
| P1 — High | #E86024 | Response within 2 hours |
| P2 — Medium | #D9A13C | Response within 24 hours |
| P3 — Low | #8E8E93 | Response within 3 days |

P1 uses the brand orange. That is the one place urgency and brand share a
colour, and it is why nothing else on a queue screen may be orange.

### Department Accents

Departments are identified by a left-border stripe and a tinted icon badge, not
a gradient fill. One hex each, fixed:

| Department | Hex |
|------------|-----|
| HR | #6366F1 |
| IT | #06B6D4 |
| Sales | #10B981 |
| Developers | #A855F7 |
| Marketing | #F97316 |
| Branding | #EC4899 |
| Production | #64748B |

These are wayfinding, not brand colours — they never appear as a page's
primary action.

### Accessibility

- Body text contrast: 4.5:1 minimum against its own surface, not the page.
- `--mut` is for non-essential copy only — never the sole label of a control.
- Colour is always paired with a dot, shape, or word.
- Focus is a 2px `--acc` outline at 2px offset. **Never remove it.**
  Tailwind's `focus:outline-none` out-specifies the global `:focus-visible`
  rule, so `globals.css` re-asserts the ring with a higher-specificity
  selector. If you add `focus:outline-none` to a control, that recovery rule
  is what keeps it accessible — don't defeat it.

---

## Typography

**Archivo** throughout — 800 for headings, 400 for body. One family, two jobs.

| Usage | Weight | Size | Tracking |
|-------|--------|------|----------|
| Display | 800 | 46–52px | -0.04em |
| H1 | 800 | 42px | -0.015em |
| H2 | 800 | 32px | -0.015em |
| H3 | 800 | 25px | -0.015em |
| Kicker / label | 800 | 10.5px uppercase | 0.13em |
| Body | 400 | 15px | 0 |
| Small | 400 | 13px | 0 |
| Caption | 400 | 11px | 0 |

Display type sets tight (-0.04em). At 46px and up, default tracking reads
loose and undermines the system's density.

Dashboard chrome runs smaller than this scale — section labels sit at 11px
uppercase in `--mut`, card titles at 12–13px. The table above governs content
and marketing surfaces; dense operational screens compress it.

Ticket tokens (`FT-HR-8X2A7K`) are always set in the heading weight and never
reflow — they are identifiers people read aloud and type.

---

## Spacing, Radius & Elevation

Spacing scale: `4 · 8 · 12 · 16 · 24 · 32`.

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 8px | Inputs, small controls, icon badges |
| `--radius` | 12px | Default panel and card radius |

Cards in the dashboards run larger — `rounded-2xl` (16px) for content cards,
`rounded-3xl` (24px) for the sidebar shell. Keep to those two so cards read as
one family.

| Shadow | Value | Use |
|--------|-------|-----|
| `--shadow-sm` | 0 1px 2px | Resting cards |
| `--shadow-md` | 0 3px 10px | Menus, popovers |
| `--shadow-lg` | 0 12px 32px | Dialogs |

Elevation is restrained. Separate things with **rules and surface colour
first**; use shadow only when something genuinely floats above the page.

---

## Components

Build on these classes (`main/frontend/src/styles/globals.css`) and shared
components rather than ad-hoc utilities, so a token change reaches every
screen at once:

**CSS classes:** `.btn` (`.btn-primary`, `.btn-secondary`, `.btn-ghost`,
`.btn-block`) · `.field` + `.label` + `.input` · `.panel` · `.rule` · `.tag` ·
`.table` · `.kicker`

**React components** (`main/frontend/src/components/ui.jsx` and siblings):
`Card` · `SectionHeader` · `StatCard` · `Badge` · `Pill` · `Modal` · `Field` ·
`Drawer` · `EmptyState` · `DonutChart` · `DataTable`

`DataTable` is the one table used across the dashboards — it carries sortable
headers, a sticky header row, paging, and empty states. Don't hand-roll a
`<table>`; a new list gets those affordances for free by using it.

`.btn-block` left-aligns its label. That is intentional and comes from the
design — do not centre it.

---

## Logo Usage

**Mark:** a 26px solid `--acc` rounded square (`--radius-sm`).
**Wordmark:** "Fute Services" in Archivo 800, 15px, beside the mark with 10px
between them.

### Correct
- Mark and wordmark on `--bg` or `--sf`.
- Clear space equal to the mark's height on all sides.
- The mark alone is fine as a favicon or avatar.

### Incorrect
- Don't gradient-fill it, outline it, or add a glow.
- Don't recolour it per department — HR and IT are tags, not brands.
- Don't set the wordmark in any other family or weight.

---

## Motion

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Hover / colour | 120ms | ease-out |
| Enter / reveal | 400–700ms | cubic-bezier(0.22, 1, 0.36, 1) |

Motion communicates structure, not personality. Nothing bounces.

`prefers-reduced-motion` is honoured everywhere — a hard requirement, not an
enhancement.

---

## Voice

Write like a competent colleague, not a system.

| Instead of | Write |
|-----------|-------|
| Error 500 | Something went wrong. Please try again in a few moments. |
| Invalid credentials | That email and password do not match. |
| Complaint submitted | Your ticket is in. Here's your tracking token. |
| P1 | High — critical issue, response within 2 hours |
| 2026-08-05T08:21:43.233Z | 2 minutes ago |
| No records found | No tickets yet. Raise one and we'll track it for you. |
| Ticket #5 | FT-IT-8X2A7K |

Rules:
- Say what happened and what to do next — never only what failed.
- Second person, active voice.
- Never expose raw server messages, stack traces, or status codes.
- Relative time for recent events; the exact timestamp lives in the tooltip.
- Empty states name the reason and offer the next action. "No assets match
  *"foo"*" beats "No results".

---

## AI Image Generation

**Base prompt:** editorial product photography, matte surfaces, hard directional
light, deep near-black background (#0C0C0E), a single warm orange accent
(#E86024), generous negative space, square framing, no glow.

**Mood keywords:** structural, direct, confident, industrial, restrained,
high-contrast, modernist, unfussy.

**Avoid:** soft pastel gradients, glassmorphism, rounded blobs, stock-photo
smiling office workers, multiple competing accent colours.

---

## Consistency Checklist

Before shipping any screen:

- [ ] Exactly one orange thing — the primary action
- [ ] Icon badges are tinted (10% alpha + full-colour icon), not gradient fills
- [ ] Radius is `rounded-2xl` for cards, `rounded-3xl` for shells — no third value
- [ ] Every colour maps to a documented meaning (status, priority, department)
- [ ] Status and priority show colour **and** a dot or word
- [ ] Timestamps relative, exact value on hover
- [ ] Error copy is human — no codes, no raw server text
- [ ] Empty states explain the cause and offer an action
- [ ] Focus ring visible on every interactive element, including custom controls
- [ ] `prefers-reduced-motion` renders a still, usable screen
- [ ] Lists use `DataTable`, not a hand-rolled `<table>`
- [ ] Built on the component classes, not one-off utilities
- [ ] Nothing asks the user for what the account already knows
