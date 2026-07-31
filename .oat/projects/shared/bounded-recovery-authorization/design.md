---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-31
oat_generated: false
oat_template: true
oat_template_name: design
---

# Design: bounded-recovery-authorization

## Overview

The change combines prevention with bounded recovery. Before each planned task
commit, the phase implementer runs the task's declared verification plus every
applicable check that is discoverable and proportionate to that task's changed
surface. Broad tests and builds remain phase-level when running them per task
would be disproportionate. This ordering catches task-local defects before
history is written without pretending that lint or type-check can detect
composition failures such as missing build output.

When task-transition or phase verification discovers an obvious in-scope
defect after commit, the already-authorized phase continues on the same
implementation target and creates a separate recovery commit. The accepted
task commit is never amended. Recovery is automatic only while scope,
mechanical certainty, safety, target identity, verification evidence, and the
project-level retry budget all remain valid; otherwise the phase stops for
operator direction.

The contracts explicitly distinguish three cases: accepted-launch route/model
replacement remains forbidden; bounded same-target append-only repair is a
continuation under existing phase authority; and consequential or
scope-expanding recovery requires new user direction. Canonical assets own this
policy, provider agents are regenerated views, and behavioral contract tests
pin both the allowed recovery path and every stop boundary.

## Architecture

### System Context

`oat-project-implement` remains the lifecycle owner. It resolves the existing
`oat_orchestration_retry_limit` once for the phase (default `2`, valid range
`0`–`5`) and passes that value, the original request ID, and the exact
implementation target in the Phase Scope. The limit becomes the maximum number
of automatic post-commit recovery rounds across task-transition and phase-wide
verification for that phase attempt. A value of `0` disables automatic
post-commit repair. Review-fix and gate loops keep their existing separately
counted bounds and the independent three-cycle review governance cap is not
changed.

The canonical project implementation contract owns recovery eligibility,
budget, report validation, and bookkeeping. The phase implementer owns
pre-commit prevention and executes eligible recovery within the accepted phase
handle. The shared dispatch contract owns the provider-neutral distinction
between continuation and fallback. Generated Claude, Codex, and Cursor agents
inherit the canonical phase-agent contract through normal synchronization.

### Key Components

- **Phase lifecycle root:** Resolves the budget and target, validates recovery
  reports and commit history, records normal bookkeeping, and asks the user only
  at a declared stop boundary.
- **Phase implementer:** Runs proportionate pre-commit checks, classifies
  post-commit verification failures, creates one append-only recovery commit
  per eligible round, and re-verifies before continuing.
- **Shared dispatch policy:** Keeps accepted-launch replacement forbidden while
  allowing same-handle continuation and explicitly linked fresh same-target
  recovery only where the lifecycle contract permits it.
- **Provider materialization:** Regenerates equivalent phase-agent instructions
  for Claude, Codex, and Cursor without provider-specific policy forks.
- **Contract validation:** Checks behaviorally meaningful policy clauses,
  report/provenance fields, stop conditions, and generated parity.

### Component Diagram

```text
phase authorization
        |
        v
oat-project-implement -- resolve exact target + recovery limit
        |
        v
phase implementer -- task checks --> immutable task commit
        |                                  |
        |                         transition/phase check fails
        |                                  |
        |                    eligible and budget remains?
        |                       /                    \
        |                     yes                    no
        |                      |                      |
        |           append recovery commit      return stop boundary
        |                      |
        +<------------- focused + phase verification
```

### Data Flow

1. The root records the phase base, request ID, exact target, and resolved
   recovery limit in the Phase Scope.
2. Before each task commit, the phase implementer runs declared task
   verification and applicable discoverable checks whose cost is proportionate
   to the task surface.
3. After a task commit, transition or phase verification may expose a defect.
   The implementer evaluates scope, ambiguity, consequence, destructiveness,
   target continuity, file boundaries, evidence, and remaining budget.
4. An eligible round preserves the original commit, applies only the bounded
   correction, creates one recovery commit, records its trigger and original
   task/request linkage, and reruns focused plus relevant phase verification.
5. A passing result continues the phase. Each recovery commit consumes one
   phase recovery round.
6. An ineligible result or exhausted budget returns `DONE_WITH_CONCERNS` or
   `BLOCKED`; the root records the evidence and requests user direction without
   launching a fallback.
7. Root validation confirms original commits were not amended, every recovery
   commit is append-only and in scope, provenance is same-target, the reported
   range matches Git history, and verification passed before normal phase
   bookkeeping continues.

## Component Design

_Pending collaborative validation._

## Error Handling

_Pending collaborative validation._

## Testing Strategy

_Pending collaborative validation._

## References

- Discovery: `discovery.md`
