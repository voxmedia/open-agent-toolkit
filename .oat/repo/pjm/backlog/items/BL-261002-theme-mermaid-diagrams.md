---
id: BL-261002-theme-mermaid-diagrams
title: Theme Mermaid diagrams and keep them readable on phones
status: open
priority: low
scope: task
scope_estimate: M
labels:
  - docs
  - docs-tooling
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T19:38:42.897Z
updated: 2026-10-31T21:08:00Z
associated_issues: []
external_plans: []
---

## Description

@open-agent-toolkit/docs-theme initializes Mermaid with the stock theme, so docs diagrams ignore the site palette added in b76c6ed0a. The ideas-lifecycle diagram renders at 7.7px text on a 390px screen. The skills docs site already gives diagrams a minimum width inside a horizontal scroll region on narrow screens. Source: docs-improvement-overhaul retro RP-06.

**Delivery status (2026-10-31):** Landed: palette theming (#382, `c4786ac33`;
`packages/docs-theme/src/pele-theme.ts` maps the Pele diagram variables to the
site's `--color-fd-*` tokens) and a full-screen zoom dialog (#350,
`packages/docs-theme/src/zoom-frame.tsx`). Remaining: narrow-screen
readability; `packages/docs-theme/src/mermaid.tsx` sets no inline minimum
width or horizontal scroll region.

## Acceptance Criteria

- On screens 640px wide or narrower, diagrams keep a readable minimum width
  inside a horizontally scrollable, keyboard-focusable region, and the page
  itself does not scroll horizontally.
- The ideas-lifecycle diagram's smallest text is at least 11px on a 390px
  screen, or the diagram scrolls at its authored size.
