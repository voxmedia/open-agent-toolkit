---
id: BL-260902-make-autonomous-project-recap
title: Make autonomous project recap capability-aware and non-blocking
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - explainer
  - lifecycle
  - autonomy
assignee: null
created: 2026-09-02T23:48:48.908Z
updated: 2026-09-03T00:08:42Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/230
external_plans:
  - .oat/repo/reference/external-plans/2026-09-02-make-autonomous-project-recap-capability-aware.md
---

## Description

`workflow.explainers.projectRecap` exists and defaults to `ask`, but autonomous mode overrides it to always generate, and the recap tail requires real browser and visual-critic seams, so an unattended closeout on a fresh host blocks on capability that is not configured. Make the autonomous recap tail probe capability first and take an explicit, non-prompting, recorded skip or bounded fail-safe when seams are unavailable, without weakening recap evidence when they are present. Source: GitHub issue #230. Related but distinct: BL-260727 explainer run durability and BL-260817 RC explainer browser coverage.

## Acceptance Criteria

- The autonomous recap tail probes required seams (author, critic, browser, visual critic) before generation and records the probe result.
- When a required seam is unavailable, the tail takes an explicit non-prompting skip or bounded fail-safe, records the reason in the lifecycle receipt, and completion proceeds.
- When seams are available, recap evidence requirements are unchanged.
- Human and JSON output explain why a recap was generated, skipped, or degraded.
- Focused tests cover unconfigured-host skip, configured-host generation, and the receipt shape.
