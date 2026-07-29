---
id: BL-260707-declare-gate-review-target
title: 'Declare gate review target project'
status: closed # open | in_progress | closed | wont_do
priority: low # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels: [workflow-gates, reviews, provenance]
assignee: null
created: '2026-07-07T11:47:53Z'
updated: '2026-07-10T18:15:13Z'
associated_issues:
  [BL-260707-record-gate-review-model, BL-260707-ask-to-enable-phase-review]
---

## Description

`oat gate review` has no explicit project parameter, so the dispatched cross-runtime
reviewer resolves "the current project" from ambient `activeProject` state
(`.oat/config.local.json`). Observed incident (2026-07-07, `dispatch-fixes-round-2`):
a plan-skill gate review ran while `activeProject` pointed at a sibling project on the
same branch. The reviewer reviewed the wrong project's (already-shipped) plan, wrote a
review artifact and a `plan | artifact | received` row into that project's lifecycle
files, committed the bookkeeping, and exited 0 — a false-green gate that never examined
the artifact it was gating, plus corrupted bookkeeping in a bystander project (both
manually reverted).

Root cause: the caller (the skill executing the gate step) knows exactly which project
is being gated but has no channel to declare it; the configured gate prompt says "use
project state to determine the most appropriate review scope," delegating target
resolution to the reviewer's ambient environment. Identity inferred from ambient state
instead of declared by the party that knows it — the same failure class the
`multi-family-dispatch` design addresses for producer-model identity, one level up.

Priority is low by deliberate calibration: having a different project active than the
one being gated is unusual (it requires multiple projects on one branch plus an
`activeProject` switch mid-flow), so this is not a common path — but when it hits, the
failure is silent and green, which is the worst kind.

Detection already half-exists: gate-produced artifacts carry `oat_project:` frontmatter
(how the incident was caught). Prevention and enforcement do not. The fix is the
declared + observed corroboration pattern:

1. **Declare:** add `--project <path>` to `oat gate review`; thread it into the
   dispatched review prompt as an explicit instruction; skill gate configs templatize
   the project path (e.g. `{PROJECT_PATH}`) instead of "use project state".
2. **Corroborate:** after the review completes, the gate wrapper verifies the returned
   artifact's `oat_project` frontmatter matches the declared target; a mismatch is a
   launch-failure-class gate failure (escalation-biased, does not consume a
   remediation attempt) — never a pass.

Related: [BL-260707-record-gate-review-model](./BL-260707-record-gate-review-model.md)
covers _who_ reviewed (model/target provenance); this item covers _what_ was reviewed
(target-project declaration + verification).

## Acceptance Criteria

- `oat gate review` accepts an explicit `--project <path>` and injects the declared
  target into the dispatched review prompt.
- Bundled lifecycle skill gate configs pass the active skill run's project path
  explicitly instead of instructing the reviewer to resolve it from project state.
- After a gate review completes, the gate flow verifies the produced artifact's
  `oat_project` frontmatter against the declared target; a mismatch fails the gate as
  a launch-failure-class outcome (escalation-biased, not a spent remediation attempt).
- When no `--project` is declared (legacy/manual invocations), current behavior is
  preserved, and the gate output states that the target was ambient-resolved.
- Docs for workflow gates describe the declared-target contract and the mismatch
  failure mode.
