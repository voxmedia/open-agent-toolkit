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
- **Recovery-event ledger:** Uses one append-only implementation bookkeeping
  shape for every post-commit defect disposition so defect volume, prompt
  volume, and recovery outcomes are independently measurable.

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
7. Every branch appends the same recovery-event record with defect class,
   discovering check, disposition, authorization source, attempt/budget,
   original request and target, recovery commit when present, and verification
   outcome.
8. Root validation confirms original commits were not amended, every recovery
   commit is append-only and in scope, provenance is same-target, the reported
   range matches Git history, and verification passed before normal phase
   bookkeeping continues.

Base anchoring is deliberately unchanged. The root captures a fresh phase base
immediately before each phase launch, so earlier recovery commits are already
part of the next phase's base. PR #176 is not part of the causal or corrective
design.

## Component Design

### Shared Dispatch Recovery Taxonomy

**Purpose:** Preserve accepted-launch terminality while making clear that
bounded same-target repair can be covered by an earlier phase authorization.

**Responsibilities:**

- Define automatic route/model/provider replacement after accepted launch as
  forbidden fallback.
- Define continuation in the same accepted handle, and a lifecycle-authorized
  fresh launch with the identical target plus original-request linkage, as
  same-target recovery rather than fallback.
- Require new operator direction for scope-expanding, consequential,
  destructive, ambiguous, or retry-exhausted recovery.

**Canonical surface:** `.agents/skills/oat-dispatch-subagents/SKILL.md`.

**Design decision:** Replace the absolute "new explicit action" wording with
authorization-aware wording: recovery must be explicitly authorized, but the
authorization may be standing phase authority established before launch. No
post-acceptance outcome makes another route eligible.

### Project Implementation Recovery Policy

**Purpose:** Own eligibility, retry accounting, dispatch continuity, validation,
and bookkeeping for post-commit defects.

**Responsibilities:**

- Resolve `oat_orchestration_retry_limit` and pass a distinct
  `phase_recovery_limit` counter with the original request and exact target.
- State the complete automatic-recovery predicate and stop conditions once in
  the canonical phase-execution contract.
- Keep implementer recovery pinned to the original target and prevent
  retry-loop route escalation from applying to implementation recovery.
- Validate append-only commit order, declared or mechanically derived in-phase
  file boundaries, report provenance, and focused/phase verification.
- Append a canonical recovery-event record to normal implementation
  bookkeeping for both recovered and stopped dispositions.

**Canonical surfaces:**

- `.agents/skills/oat-project-implement/SKILL.md`
- `.agents/skills/oat-project-implement/references/phase-execution.md`
- `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`

**Retry semantics:** The default of two permits at most two automatic
post-commit recovery commits during one phase implementation attempt. Initial
task work does not consume the budget. Each appended recovery commit consumes
one round. Review-fix and gate loops continue using their own existing counters;
the three-cycle review governance cap remains separate and unchanged.

### Phase Implementer Prevention and Recovery

**Purpose:** Prevent discoverable defects before commit and repair eligible
post-commit defects without returning for redundant authorization.

**Responsibilities:**

- Before each task commit, run formatting, declared task verification, and
  repository-discovered cheap checks applicable to the changed surface.
- Run a scoped test or build before commit when the task changes test/build
  configuration, emitted output, packaging, or another behavior for which that
  scoped command is discoverable and proportionate. A full repository build is
  not required per task.
- Keep broad repository tests/builds at the phase boundary when per-task cost is
  disproportionate.
- On task, transition, or phase verification failure, evaluate the eligibility
  predicate before returning.
- For an eligible failure, preserve the accepted task commit, apply only the
  mechanical correction, create exactly one recovery commit, consume one
  attempt, and rerun the failing focused check plus relevant phase verification.
- Stop without repair when evidence is ambiguous, scope or file boundaries
  widen non-mechanically, consequence/destructiveness is present, or the budget
  is exhausted.

**Canonical surface:** `.agents/agents/oat-phase-implementer.md`.

**Commit contract:** Planned tasks still create exactly one task commit.
Recovery commits are additional, explicitly typed append-only commits associated
with the original task/phase; they are never assigned a fake planned task ID and
never amend or replace the task commit.

### Recovery Event Record

**Purpose:** Make defect frequency and authorization behavior measurable across
projects regardless of prose conventions.

**Record shape:**

```markdown
### Recovery Event {event-id}

- Phase/task: {phase and originating task when known}
- Original request: {request_id}
- Original commit: {immutable task commit}
- Defect class: lint | type | test | build | composition | other
- Discovered by: {exact verification command or transition check}
- Disposition: recovered | direction-required
- Authorization: phase-standing | operator
- Attempt: {used}/{phase_recovery_limit}
- Dispatch target: {same launcher-owned implementation target}
- Recovery commit: {sha or -}
- Verification: {focused and phase result}
- Reason: {bounded eligibility or stop-boundary evidence}
```

**Rules:** Append one event whenever a post-commit defect is dispositioned,
including a stop with no repair. Reuse dispatch `continuation_events` when a
fresh same-target recovery launch is required; do not invent a second dispatch
schema. Root bookkeeping copies validated report facts rather than free-form
summaries.

### Tests and Generated Providers

**Purpose:** Pin the behavioral contract and prevent provider drift.

**Responsibilities:**

- Extend existing skill/agent contract tests with scenario-oriented assertions
  for automatic recovery, immutability, same-target provenance, no fallback,
  ambiguity/destructiveness stops, retry exhaustion, prevention ordering, and
  the canonical event record.
- Extend sync/materialization tests to assert equivalent semantics in generated
  Claude, Codex, base Cursor, and representative materialized Cursor variants.
- Run canonical validation and `oat sync --scope all`; never hand-edit provider
  copies.
- Keep a cheap base-anchoring assertion only if it naturally fits an existing
  contract test; do not treat it as corrective scope.

### Documentation and Distribution

**Purpose:** Explain the policy and ship it through normal OAT asset delivery.

**Responsibilities:**

- Update implementation-execution documentation with verification tiers,
  recovery eligibility/budget, event records, and the distinction from
  fallback.
- Explain that append-only history requires a separate commit, not repeated
  approval.
- Bump every changed canonical skill once, synchronize providers, and advance
  the five public packages plus bundled inventory in lockstep.
- Include the post-release migration note: update bundled OAT tools, then run
  provider sync before expecting global phase agents to use the new contract.
- Preserve isolation from the active `review-plan-workflow`; no interim
  mitigation is applied by this project.

## Error Handling

_Pending collaborative validation._

## Testing Strategy

_Pending collaborative validation._

## References

- Discovery: `discovery.md`
