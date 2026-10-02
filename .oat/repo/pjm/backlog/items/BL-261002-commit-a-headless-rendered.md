---
id: BL-261002-commit-a-headless-rendered
title: Commit a headless rendered-site QA tour for the docs app
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - docs
  - docs-tooling
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T19:38:42.452Z
updated: 2026-10-02T19:38:42.452Z
associated_issues: []
external_plans: []
---

## Description

Final QA for the docs overhaul used an ad hoc Playwright script against a static export. It found problems no static check found: four pages without an H1 and a diagram whose smallest text was 5.8px at 390px wide. Earlier attempts to use a desktop browser touched the user's own window. Commit the tour as repository tooling that runs headless on the execution host. Source: docs-improvement-overhaul retro RP-04.

## Acceptance Criteria

- A script under `apps/oat-docs/scripts/` serves the static export and runs a
  headless browser on the execution host, never a user's desktop browser.
- It crawls every page reachable from Home and reports: exactly one H1 per
  page (content container `article#nd-page`), horizontal overflow at 1440px
  and 390px, the smallest rendered Mermaid text at 390px, console errors, and
  404 recovery on a sample of removed routes.
- It waits for client-side navigation to settle before asserting page
  content.
- Documented in the docs app's AGENTS.md as the final visual check.
