# Fute Services — Brand Guidelines

**Theme: Modernist**

Ported from the Claude Design project *"Fute Services design prototype"*
(design system `modernist`). That project is upstream; this file documents it
for humans, and `assets/design-tokens.*` mirror it for tooling.

```
Claude Design · modernist          ← upstream source of truth
        ↓  ported by hand
docs/brand-guidelines.md           ← you are here
        ↓  node scripts/sync-brand-to-tokens.cjs
assets/design-tokens.json
        ↓  node scripts/tokens-to-css.cjs
assets/design-tokens.css
```

The app consumes `main/frontend/src/styles/tokens.css`, which carries the same
values. Change the design upstream, then re-port — never edit component files.

---

## Quick Reference

| Element | Value |
|---------|-------|
| Primary Color | #EC3013 |
| Secondary Color | #E15B47 |
| Accent Color | #4FAE7C |
| Heading Font | Archivo |
| Body Font | Archivo |
| Base Radius | 0px |

---

## Brand Concept

Modernist is a **monochrome system with one red**. The neutrals do the work;
the red is reserved for the single most important thing on any screen.

Three rules, and they are not negotiable:

1. **No radius.** Every corner is square. Rounding softens the system into
   something generic — it is the fastest way to make this look like every other
   dashboard.
2. **2px rules.** Structural dividers are 2px; hairlines within a group are 1px.
   The weight difference is what creates hierarchy without boxes everywhere.
3. **One red.** If two things on a screen are red, neither is urgent.

**We are:** direct, structural, unfussy, confident.
**We are not:** playful, gradient-happy, glassy, decorative.

This is internal business software. Someone opens it because something is
wrong. The interface should get out of the way.

---

## Color Specifications

### Primary Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Fute Red | #EC3013 | 236, 48, 19 | Primary actions, brand mark, links, urgent state |
| Fute Red Dark | #DD2B0F | 221, 43, 15 | Hover on primary |
| Fute Red Light | #FFF2EF | 255, 242, 239 | Tinted backgrounds on light surfaces |

### Secondary Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Ember | #E15B47 | 225, 91, 71 | Tonal support beside the primary — charts, secondary series |
| Ember Dark | #C94B39 | 201, 75, 57 | Ember on light surfaces |
| Ember Light | #FFF2EF | 255, 242, 239 | Rare, tinted fills |

### Accent Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Signal Green | #4FAE7C | 79, 174, 124 | Resolved / healthy state |
| Signal Green Dark | #2F7D55 | 47, 125, 85 | The same on light surfaces |

> **Read this before using Secondary or Accent.** Modernist is deliberately a
> one-red system. Ember and Signal Green exist for tonal support and status —
> they are not a second and third brand colour. If a screen needs three colours
> to make its point, the layout is doing too little work.

### Neutrals

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | #141314 | Page |
| `--sf` | #1A1919 | Raised surface, sidebar, filter bars |
| `--pn` | #1F1E1E | Inputs, panels, menus |
| `--ink` | #F1EFEE | Text |
| `--mut` | #8D8988 | Secondary text, captions, timestamps |
| `--line` | rgba(241,239,238,0.12) | Borders and rules |

Neutral ramp for anything in between: `#F8F4F4 #EAE7E7 #D7D3D3 #BAB6B6
#9B9797 #7D7979 #605D5D #444141 #2D2B2B`.

**Dark is the product default.** A light set is defined under
`:root[data-theme="light"]` and stays unused until a theme toggle exists.

### Status Colors

Status is never communicated by text alone — colour plus a dot, always.

| Status | Token | Hex |
|--------|-------|-----|
| Pending | `--warn` | #D9A13C |
| In Progress | `--info` | #7D9EDE |
| Completed | `--ok` | #4FAE7C |

### Priority Colors

| Priority | Hex | Promise |
|----------|-----|---------|
| P1 — High | #EC3013 | Response within 2 hours |
| P2 — Medium | #D9A13C | Response within 24 hours |
| P3 — Low | #8D8988 | Response within 3 days |

P1 uses the brand red. That is the one place urgency and brand share a colour,
and it is why nothing else on a queue screen may be red.

### Accessibility

- Body text contrast: 4.5:1 minimum against its own surface, not the page.
- `--mut` is for non-essential copy only — never the sole label of a control.
- Colour is always paired with a dot, shape, or word.
- Focus is a 2px `--acc` outline at 2px offset. Never remove it.

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

Ticket tokens (`FT-HR-8X2A7K`) are always set in the heading weight and never
reflow — they are identifiers people read aloud and type.

---

## Spacing & Elevation

Spacing scale: `4 · 8 · 12 · 16 · 24 · 32`.

| Shadow | Value | Use |
|--------|-------|-----|
| `--shadow-sm` | 0 1px 2px | Resting cards |
| `--shadow-md` | 0 3px 10px | Menus, popovers |
| `--shadow-lg` | 0 12px 32px | Dialogs |

Elevation is restrained here. Modernist separates things with **rules and
surface colour first**, shadow only when something genuinely floats above the
page. Do not reintroduce the layered-glow style this replaced.

---

## Components

Build on these classes (`main/frontend/src/styles/globals.css`) rather than
ad-hoc utilities, so a token change reaches every screen at once:

`.btn` (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-block`) · `.field`
+ `.label` + `.input` · `.panel` · `.rule` · `.tag` · `.table` · `.kicker`

`.btn-block` left-aligns its label. That is intentional and comes from the
design — do not centre it.

---

## Logo Usage

**Mark:** a 26px solid `--acc` square.
**Wordmark:** "Fute Services" in Archivo 800, 15px, beside the mark with 10px
between them.

### Correct
- Mark and wordmark on `--bg` or `--sf`.
- Clear space equal to the mark's height on all sides.
- The mark alone is fine as a favicon or avatar.

### Incorrect
- Don't round the square. It is square because the system is square.
- Don't gradient-fill it, outline it, or add a shadow.
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

---

## AI Image Generation

**Base prompt:** editorial product photography, matte surfaces, hard directional
light, deep near-black background (#141314), a single saturated red accent
(#EC3013), generous negative space, square framing, no gradients, no glow.

**Mood keywords:** structural, direct, confident, industrial, restrained,
high-contrast, modernist, unfussy.

**Avoid:** soft pastel gradients, glassmorphism, rounded blobs, stock-photo
smiling office workers, multiple competing accent colours.

---

## Consistency Checklist

Before shipping any screen:

- [ ] Every corner is square — no `rounded-*` anywhere
- [ ] Exactly one red thing on the screen
- [ ] Structural dividers 2px, in-group hairlines 1px
- [ ] Status and priority show colour **and** a dot
- [ ] Timestamps relative, exact value on hover
- [ ] Error copy is human — no codes, no raw server text
- [ ] Focus ring visible on every interactive element
- [ ] `prefers-reduced-motion` renders a still, usable screen
- [ ] Built on the component classes, not one-off utilities
- [ ] Nothing asks the user for what the account already knows
