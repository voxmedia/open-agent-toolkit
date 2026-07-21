---
id: BL-260720-fix-cross-machine-flakiness
title: Fix cross-machine flakiness in explainer visual-validation release gate
status: closed
priority: high
scope: task
scope_estimate: S
labels:
  - release-gate
  - explainer-kit
  - reproducibility
assignee: null
created: 2026-07-20T14:01:28.009Z
updated: '2026-07-21T04:18:16Z'
associated_issues: []
external_plans: []
---

## Description

The release:validate visual leg (tools/release/validate-explainer-visuals.mjs, added in PR 166) fails on the Mac Mini while passing 65/65 on the laptop - identical failure on pristine origin/main, so machine-environmental, not change-induced. Failure mode: the keyboard-navigation probe (presses Tab via the automation API then checks document.activeElement moved to a visible focusable element) reports no focus movement on 5 deck cases under headless Chromium 147. Known headless-Chromium sensitivity: pages may lack real window focus so Tab does not move activeElement unless the harness forces focus first. Evidence: dist/explainer-visual-validation.json from 2026-07-19 Mini runs (5 keyboard-navigation issues: profile-clean-deck 320/768, profile-editorial-deck 768/1440, profile-technical-deck 320) + commit message of 1597095c. Candidate fixes: page.bringToFront()/explicit focus before the Tab probe; pin the browser revision the gate downloads; or make the probe assert focusability semantics rather than live focus movement. A release gate that fails per-machine erodes trust in release:validate. Related one-line goodwill fix to ride the same PR: no-shadow in .agents/skills/explainer-kit/scripts/lib/durability.mjs:169 (inner 'error' shadows outer ~533) - consumer-repo strict linters hit bundled skill scripts; note the broader class (shipped-script lint portability) may deserve its own item if it recurs.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
