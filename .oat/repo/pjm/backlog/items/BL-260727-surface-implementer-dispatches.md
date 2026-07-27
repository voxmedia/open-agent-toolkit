---
id: BL-260727-surface-implementer-dispatches
title: Surface implementer dispatches that sit at the ceiling without classification
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - dispatch
  - observability
assignee: null
created: 2026-07-27T22:27:24.550Z
updated: 2026-07-27T22:27:24.550Z
associated_issues: []
external_plans: []
---

## Description

Implementer dispatch is supposed to classify a phase's preferred effort from its
scope, then select `min(preferred, cap)`. `oat-project-implement`'s
`references/dispatch-and-dry-run.md` defines the classification bands: `low` for
trivial docs-only, narrow single-file, or mechanical changes; `medium` for normal
multi-file work; `high` for broad architecture, security boundaries, or repeated
substantive review failures.

Nothing enforces that step. The resolver validates only that a candidate is
present in the configured ladder and is not above the ceiling. It has no way to
tell that a candidate is higher than the phase warrants, so a root that skips
classification and passes the ceiling as its candidate resolves cleanly and
leaves no trace of the omission. The failure is silent and produces no error,
which makes it indistinguishable after the fact from a phase that genuinely
needed the top rung.

Verified against the resolver on 2026-07-27: under `--ceiling-tier high`,
candidates from `economy`, `balanced`, and `high` were all accepted, each
reporting its true `candidateTier`, while an above-ceiling candidate was
rejected. Downshifting works. The gap is that choosing not to downshift costs
nothing and is not visible.

This is an observability request, not a proposal to have the resolver overrule
the root. Classification depends on phase content the resolver cannot see, so
the root must remain the decider. The aim is to make the decision legible enough
that a pattern of always dispatching at the cap becomes apparent.

Related: `Dispatch Report V1` already carries per-dispatch report context
(`--report-scope`, `--report-action`), so it is a plausible home for the
classification field.

## Acceptance Criteria

- Implementer and fix resolver invocations accept an explicit classified
  preferred effort or tier, distinct from the ceiling and from the selected
  candidate.
- The dispatch report records the classified preference alongside the selected
  candidate, so `preferred == cap` is distinguishable from an unclassified
  dispatch that defaulted to the cap.
- A dispatch whose candidate equals the ceiling without an accompanying
  classification is reported as such. Warn rather than block; the root retains
  authority to dispatch at the cap when the phase warrants it.
- Guidance in `dispatch-and-dry-run.md` states that the ceiling is a maximum
  rather than a default target, and that passing the cap unclassified is a
  defect rather than a neutral shortcut.
- Regression coverage asserts that a below-ceiling candidate from a lower tier
  resolves successfully and that its classified preference survives into the
  dispatch report.
