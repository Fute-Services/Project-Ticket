# Fute Portal — Brand Guidelines

Source of truth for the visual identity. Everything downstream (design tokens,
Tailwind config, CSS variables) is generated from this file — never edit the
generated files by hand.

```
docs/brand-guidelines.md          ← you are here (edit this)
        ↓  node scripts/sync-brand-to-tokens.cjs   (from the brand skill)
assets/design-tokens.json         ← canonical token set
        ↓  node scripts/tokens-to-css.cjs
main/frontend/src/styles/tokens.css  ← CSS variables the app imports
```

---

## Quick Reference

| Element | Value |
|---------|-------|
| Primary Color | #6366F1 |
| Secondary Color | #A78BFA |
| Accent Color | #38BDF8 |
| Surface Color | #0F0F13 |
| Heading Font | Inter |
| Body Font | Inter |
| Mono Font | JetBrains Mono |
| Base Radius | 16px |

---

## Brand Personality

Fute Portal is internal business software. It is used by someone who has a
problem and wants it fixed — not by someone browsing for fun.

**We are:** calm, precise, quietly confident, dimensional.
**We are not:** playful, loud, corporate-beige, cluttered.

The visual signature is **depth**. Surfaces sit at measurable heights above a
near-black canvas, lit by a single cool light source. This is what makes the
product feel physical and premium without adding noise — the 3D work on the
public pages and the elevation system inside the app are the same idea
expressed at two different budgets.

---

## Color Specifications

### Primary Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Indigo | #6366F1 | 99, 102, 241 | Primary actions, active nav, links, focus rings |
| Indigo Dark | #4F46E5 | 79, 70, 229 | Hover/pressed state of primary actions |
| Indigo Light | #E0E7FF | 224, 231, 255 | Tinted backgrounds, subtle emphasis |

### Secondary Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Violet | #A78BFA | 167, 139, 250 | HR department, gradient start, 3D key light |
| Violet Dark | #7C3AED | 124, 58, 237 | Violet on light surfaces |
| Violet Light | #EDE9FE | 237, 233, 254 | Rare — HR tinted surfaces |

### Accent Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| Accent Cyan | #38BDF8 | 56, 189, 248 | IT department, gradient end, 3D rim light |
| Accent Cyan Dark | #0EA5E9 | 14, 165, 233 | Cyan on light surfaces |

### Neutrals

| Color | Hex | Usage |
|-------|-----|-------|
| Canvas | #0F0F13 | Page background — the deepest layer |
| Surface | #17171C | Raised panels, sidebar |
| Surface Raised | #1E1E2E | Menus, popovers, native select options |
| Text Primary | #F1F1F3 | Headings and body copy |
| Text Secondary | rgba(255,255,255,0.60) | Supporting copy |
| Text Muted | rgba(255,255,255,0.40) | Captions, timestamps, hints |
| Border | rgba(255,255,255,0.08) | Default surface edge |

### Status Colors

Status must never be communicated by text alone — colour plus a dot, always.

| Status | Hex | Dot |
|--------|-----|-----|
| Pending | #FACC15 | 🟡 |
| In Progress | #3B82F6 | 🔵 |
| Completed | #22C55E | 🟢 |

### Priority Colors

| Priority | Hex | Dot | Promise |
|----------|-----|-----|---------|
| High (P1) | #F87171 | 🔴 | Response within 2 hours |
| Medium (P2) | #FACC15 | 🟡 | Response within 24 hours |
| Low (P3) | #4ADE80 | 🟢 | Response within 3 days |

### Department Colors

| Department | Hex |
|------------|-----|
| HR | #A78BFA |
| IT | #38BDF8 |

### Accessibility

- Body text contrast: 4.5:1 minimum against its own surface, not against the canvas.
- `Text Muted` is for non-essential copy only — never for the sole copy of a control.
- Colour is always paired with a shape, dot, or label. Never colour alone.

---

## Typography

| Usage | Font | Weight | Size | Tracking |
|-------|------|--------|------|----------|
| Display | Inter | 900 | 48–72px | -0.03em |
| H1 | Inter | 700 | 30px | -0.02em |
| H2 | Inter | 600 | 20px | -0.01em |
| Section label | Inter | 600 | 12px uppercase | 0.08em |
| Body | Inter | 400 | 14–16px | 0 |
| Caption | Inter | 400 | 11–12px | 0 |
| Token / code | JetBrains Mono | 700 | 12px | 0.02em |

Ticket tokens (`FT-HR-8X2A7K`) are **always** monospace. They are identifiers
people read aloud and type — they must never reflow or look like prose.

---

## Elevation

The core of the identity. Every surface has a defined height above the canvas,
and height is expressed by shadow depth plus a brighter top edge — the same way
a real object catches light from above.

| Level | Token | Used for |
|-------|-------|----------|
| 0 | `--elev-0` | Page canvas |
| 1 | `--elev-1` | Cards at rest, stat tiles |
| 2 | `--elev-2` | Sidebar, filter bars, hovered cards |
| 3 | `--elev-3` | Modals, token reveal, popovers |
| 4 | `--elev-4` | Primary action buttons, focused 3D objects |

Rules:
- Never skip a level to look important. A card is level 1; hover takes it to 2.
- Shadows are cool-tinted (indigo-black), never neutral grey.
- Only one level-3 surface on screen at a time.

---

## Motion

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Hover / colour | 150ms | ease-out |
| Card lift & tilt | 250ms | cubic-bezier(0.22, 1, 0.36, 1) |
| Page / modal enter | 400ms | cubic-bezier(0.22, 1, 0.36, 1) |
| 3D idle rotation | continuous, ~0.15 rad/s | linear |

Motion communicates depth, not personality. Nothing bounces. Nothing spins to
draw attention.

**`prefers-reduced-motion` is honoured everywhere.** The 3D scenes stop
animating and render a single static frame; card tilt is disabled; transitions
collapse to near-instant. This is a hard requirement, not an enhancement.

---

## 3D Usage

Real WebGL is expensive, so it is spent only where it buys a first impression.

| Surface | Treatment | Why |
|---------|-----------|-----|
| Landing hero | Full WebGL scene | The one page whose job is to impress |
| Login / Register | Dimmed ambient WebGL | First impression of the product proper |
| Dashboards, forms, cards | CSS elevation + tilt | Same visual language, zero GPU cost per card |

Rules for any WebGL surface:
- Lazy-loaded in its own chunk. It must never block first paint.
- Static fallback whenever WebGL is unavailable, reduced motion is requested,
  or the device reports low capability.
- Pauses its render loop when off-screen or when the tab is hidden.
- It is decoration. Never put content, controls, or text inside the canvas.

Geometry language: faceted low-poly forms with flat shading, a wireframe
overlay, and cool rim lighting. The recurring object is the **token** — the
thing the product actually gives you.

---

## Logo Usage

**Wordmark:** `FUTE` — Inter Black, tight tracking, gradient fill
(Violet → Indigo → Cyan at 135°).

### Correct
- On canvas or surface colours only.
- Minimum size 16px cap height.
- Clear space equal to the cap height on all sides.

### Incorrect
- Don't stretch, rotate, or outline it.
- Don't place it on a busy background or over the 3D scene's focal object.
- Don't recolour the gradient per department.
- Don't add a drop shadow — the wordmark is flat; only surfaces have depth.

---

## Voice

Write like a competent colleague, not a system.

| Instead of | Write |
|-----------|-------|
| Error 500 | Something went wrong. Please try again in a few moments. |
| Complaint submitted | Your ticket is in. Here's your tracking token. |
| P1 | 🔴 High — critical issue, response within 2 hours |
| 2026-08-05T08:21:43.233Z | 2 minutes ago |
| No records found | No tickets yet. Raise one and we'll track it for you. |
| Ticket #5 | FT-IT-8X2A7K |

Rules:
- Say what happened and what to do next. Never just what failed.
- Second person ("your ticket"), active voice.
- Never expose raw server messages, stack traces, or status codes to a user.
- Time is always relative for recent events; exact timestamps live in tooltips.

---

## Consistency Checklist

Before shipping any screen:

- [ ] Every surface sits at a defined elevation level
- [ ] Status and priority show colour **and** a dot
- [ ] Timestamps are relative, with the exact value on hover
- [ ] Tokens are monospace
- [ ] Error copy is human — no codes, no raw server text
- [ ] `prefers-reduced-motion` renders a still, usable screen
- [ ] No WebGL outside the surfaces listed in **3D Usage**
- [ ] Nothing asks the user for information the account already holds
