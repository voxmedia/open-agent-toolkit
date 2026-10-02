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
updated: 2026-10-02T19:38:42.897Z
associated_issues: []
external_plans: []
---

## Description

@open-agent-toolkit/docs-theme initializes Mermaid with the stock theme, so docs diagrams ignore the site palette added in b76c6ed0a. The ideas-lifecycle diagram renders at 7.7px text on a 390px screen. The skills docs site already gives diagrams a minimum width inside a horizontal scroll region on narrow screens. Source: docs-improvement-overhaul retro RP-06.

## Acceptance Criteria

- Mermaid diagrams use the docs site palette in light and dark mode.
- On screens 640px wide or narrower, diagrams keep a readable minimum width
  inside a horizontally scrollable, keyboard-focusable region, and the page
  itself does not scroll horizontally.
- The ideas-lifecycle diagram's smallest text is at least 11px on a 390px
  screen, or the diagram scrolls at its authored size.
