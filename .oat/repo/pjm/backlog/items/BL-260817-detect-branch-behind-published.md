---
id: BL-260817-detect-branch-behind-published
title: Detect branch-behind-published-main package versions in CI
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - ci
  - release
assignee: null
created: 2026-08-17T13:29:04.420Z
updated: 2026-08-17T13:29:04.420Z
associated_issues: []
external_plans: []
---

## Description

`release:check-versions` validates version bumps against the **merge base**, so it passes when a long-lived branch's lockstep bump (e.g. 0.2.28→0.2.29) is overtaken by a main release (0.2.30) — exactly the drift that hit explainer-improvements-v2 and required a manual re-bump to 0.2.31. Verified during final-fix-003: the check passes at the drifted commit `68196ba71`, correctly by its own contract. Wiring it into CI (done in that batch) therefore does not close the original hole. Needed: a check that compares the five public package versions against `origin/main` (or npm's published versions) and fails when the branch is not strictly above, on the merge path. Source: final-fix-003 item-13 deviation note; round-3 final review Important #2.

## Acceptance Criteria

- A CI merge-path step fails when any of the five public package versions
  (`cli`, `control-plane`, `docs-config`, `docs-theme`, `docs-transforms`) is
  not strictly greater than the version on `origin/main` (or, if chosen as the
  comparison source, the latest published npm version).
- The check reproduces the explainer-improvements-v2 failure: it goes red on a
  commit shaped like `68196ba71` (branch at 0.2.29 after main released
  0.2.30), which `release:check-versions` correctly passes.
- The check's own test proves it can fail (red/green against a synthetic
  behind-main fixture), and `AGENTS.md`'s Definition of Done list is updated if
  the command is expected to run locally.
