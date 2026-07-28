---
id: BL-260727-surface-implementer-dispatches
title: Surface implementer dispatches that sit at the ceiling without classification
status: open
priority: medium
scope: task
scope_estimate: S
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

A managed-capped implementer dispatch is supposed to select a concrete candidate
before resolving. Each provider owns how that selection is made: Codex classifies
a preferred effort and takes `min(preferred, cap)`, while Cursor has no effort
axis and resolves through the Task-Class Resolution contract in
`oat-dispatch-subagents/references/provider-cursor.md`, intersecting the dated
class guidance with what the dispatcher advertises, the policy and ceiling, and
the class floor.

Nothing enforces that a selection happened. The resolver validates only that a
candidate is present in the configured ladder and is not above the ceiling. It
cannot see phase content, so it has no way to tell that a candidate is higher
than the phase warranted. A root that skips selection resolves cleanly and
leaves no error behind.

Two distinct failure modes hide here, and they are not equally hard to catch.

The first is a skipped selection: the root passes no candidate at all, the
resolver takes the capped branch, and the selected value becomes the policy
value. The second is a deliberate selection that happens to land on the cap.
Only the second requires judgment to evaluate.

Verified against the resolver on 2026-07-27 under a managed-capped `high` policy:

| what the root did           | `selectionMode` | selected             |
| --------------------------- | --------------- | -------------------- |
| passed nothing              | `capped`        | `gpt-5.6-sol-high`   |
| passed the cap deliberately | `candidate`     | `gpt-5.6-sol-high`   |
| passed below the cap        | `candidate`     | `gpt-5.6-sol-medium` |

`selectionMode` already separates the two modes, so the record can distinguish a
skipped selection from a deliberate one without any new field. Candidates from
`economy`, `balanced`, and `high` were all accepted under a `high` ceiling, each
reporting its true `candidateTier`, while an above-ceiling candidate was
rejected. Downshifting works; choosing not to downshift is what costs nothing.

That leaves a cheap half and a real half.

The cheap half needs no schema change. A managed-capped implementer or fix route
takes the exact-candidate branch, so `selectionMode=capped` on such a route is a
contract violation by definition and is mechanically detectable without knowing
anything about the phase.

The real half is the original request, now narrower: when the mode is
`candidate` and the selection equals the cap, nothing records why. That
reasoning depends on phase content the resolver cannot see, so the root must
remain the decider. The aim is to make the decision legible enough that a
pattern of always dispatching at the cap becomes apparent — not to have the
resolver overrule the root.

`Dispatch Report V1` already carries per-dispatch report context
(`--report-scope`, `--report-action`), so it is a plausible home for a recorded
classification.

## Acceptance Criteria

- A managed-capped implementer or fix dispatch that resolves with
  `selectionMode=capped` is reported as a skipped selection. Warn rather than
  block, and keep the message specific enough to distinguish it from a
  deliberate at-cap dispatch.
- Implementer and fix resolver invocations accept a recorded classification in
  whatever shape the active provider uses — a preferred effort for Codex, a
  resolved task class for Cursor — carried separately from the ceiling and from
  the selected candidate.
- The dispatch report records that classification alongside the selected
  candidate, so a deliberate at-cap dispatch can be evaluated after the fact
  rather than merely identified.
- Regression coverage asserts that a below-ceiling candidate from a lower tier
  resolves successfully and that its recorded classification survives into the
  dispatch report.

## Notes

Guidance stating that a ceiling is a maximum rather than a default target, and
that reaching it without a selection is a defect, shipped with the Cursor
selection criterion in the same change that added this item. That part of the
original request is already delivered; what remains is the tooling.
