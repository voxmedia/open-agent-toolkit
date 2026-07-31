---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-31
oat_generated: false
oat_template: false
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

`oat-project-implement` remains the lifecycle owner. It resolves a dedicated
project-state `oat_phase_recovery_policy` once for the phase and passes the
effective limit, the original request ID, and the exact implementation target
in the Phase Scope. The default permits `10` automatic attempts per phase,
chosen to cover the observed nine-event disruption with one attempt of headroom;
project or phase overrides accept `0`–`20`. A value of `0` explicitly disables
automatic post-commit repair. Review-fix and gate loops keep
`oat_orchestration_retry_limit`; their counters and the independent three-cycle
review governance cap are unchanged.

```yaml
oat_phase_recovery_policy:
  default_attempt_limit: 10
  phase_attempt_limits: {} # optional pNN: 0-20 overrides
```

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
4. An eligible round records its evidence and consumes one attempt before
   editing. It preserves the original commit, applies only the bounded
   correction, creates one recovery commit when the repair succeeds, records
   its trigger and original task/request linkage, and reruns focused plus
   relevant phase verification.
5. A passing result continues the phase. A failed edit, commit, or verification
   has already consumed the attempt and cannot retry for free.
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
- Make standing recovery authority default-deny: it exists only when a
  caller-specific lifecycle contract explicitly supplies scope, target,
  budget, record, and stop conditions.
- Require new operator direction for scope-expanding, consequential,
  destructive, ambiguous, or retry-exhausted recovery.

**Canonical surface:** `.agents/skills/oat-dispatch-subagents/SKILL.md`.

**Design decision:** Replace the absolute "new explicit action" wording with
authorization-aware wording: recovery must be explicitly authorized, but the
authorization may be standing phase authority established before launch only
for `oat-project-implement`. Wave execution, autonomous projects, cloud-project
orchestration, reviewers, and every other consumer remain outside that grant
unless their own future contract independently defines the complete boundary.
No post-acceptance outcome makes another route eligible.

### Project Implementation Recovery Policy

**Purpose:** Own eligibility, retry accounting, dispatch continuity, validation,
and bookkeeping for post-commit defects.

**Responsibilities:**

- Resolve `oat_phase_recovery_policy` and pass the effective
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
- `.oat/templates/state.md`

**Retry semantics:** The default of ten permits at most ten automatic
post-commit recovery attempts during one phase implementation attempt. Initial
task work and one no-edit rerun of a suspected infrastructure/flake failure do
not consume the budget. An attempt is consumed when bounded code repair begins,
so a failed edit, verification, or commit cannot loop for free. Every successful
attempt produces exactly one append-only recovery commit. At three events, the
phase report flags elevated recovery volume but continues. Review-fix and gate
loops retain `oat_orchestration_retry_limit`; the three-cycle review governance
cap remains separate and unchanged.

Boundedness controls authorization, not accounting. A trivial or obvious repair
still consumes an attempt when it begins after commit. Fixes completed before
the task commit do not consume recovery budget because they are prevention, not
recovery.

On exhaustion, operator direction has defined semantics:

1. **Add N attempts:** persist the active phase's total limit as
   `used_attempts + N` under `phase_attempt_limits`, capped at `20`; do not reset
   the counter.
2. **Authorize a changed scope:** create a newly recorded consequential or
   scope-expanding action outside automatic recovery.
3. **Stop:** preserve the worktree and evidence for later resumption.

An extension preserves the exact implementation target unless the operator
explicitly authorizes a separate route decision. Repeated exhaustion cannot
silently reset or lift the bound.

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
- Permit one no-edit rerun when evidence indicates infrastructure or flake; a
  repeated failure must be classified as a code defect or stopped as ambiguous.
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
- Authorization: phase-standing | operator-extension | operator-scope
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
- Assert that wave execution, autonomous projects, cloud-project orchestration,
  and reviewers do not inherit implementation standing authority from the
  shared dispatch taxonomy.
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
- Include the post-release migration note: run `oat tools update`, then
  `oat sync --scope all`, before expecting global phase agents to use the new
  contract.
- Preserve isolation from the active `review-plan-workflow`; no interim
  mitigation is applied by this project.

## Error Handling

### Automatic Recovery Eligibility

Automatic recovery proceeds only when every condition is true:

- a declared task, transition, or phase verification discovered the failure;
- the correction is mechanically bounded and unambiguous;
- the correction remains within declared phase intent and public requirements;
- any file-boundary expansion is mechanically derived and remains in-phase;
- architecture, security policy, product scope, and requirements are unchanged;
- the work is non-destructive, reversible, and does not cross protected-branch,
  credential, or other consequential boundaries;
- the accepted implementation handle and launcher-owned target remain intact;
- a phase recovery attempt remains; and
- focused plus relevant phase verification can prove the correction.

The implementer records the eligibility evidence before editing. Starting the
repair consumes one attempt. A successful attempt creates exactly one recovery
commit and returns to normal phase execution without a prompt.

### Direction-Required Boundaries

The phase stops with `DONE_WITH_CONCERNS` or `BLOCKED`, emits a
`direction-required` recovery event, and leaves the original commit unchanged
when any of these applies:

- the appropriate fix is ambiguous or evidence conflicts;
- architecture, security, product, requirements, or public behavior needs a
  decision;
- scope or declared file boundaries widen non-mechanically;
- the operation is destructive, irreversible, credential-bearing, or
  protected-branch sensitive;
- the exact implementation target cannot continue;
- focused and phase verification cannot establish correctness;
- the phase recovery budget is exhausted; or
- an independent governance boundary, including the review-cycle cap, is
  reached.

No stop condition makes another model, provider, route, or worker eligible.
User direction may authorize a new consequential scope, but that is a new
recorded action outside automatic phase recovery.

### Partial and Failed Recovery

- Failed edits, commit-hook failures, or failed re-verification consume the
  attempt and are recorded with no successful recovery commit.
- A suspected infrastructure/flake failure may be rerun once without edits or
  attempt consumption. A second unexplained failure is contradictory evidence
  and stops rather than triggering speculative repair.
- A dirty worktree, unverifiable commit range, missing provenance, or malformed
  recovery event blocks continuation.
- The original task commit SHA must still exist at the same history position;
  amend, reset, rebase, squashing, or concealment invalidates the report.
- Multiple mechanically related failures from one verification command may be
  corrected in one atomic recovery attempt. Independent failures use separate
  attempts and commits.
- A fresh same-target launch is allowed only when the lifecycle contract already
  authorizes recovery, the original handle cannot be resumed, the exact target
  is preserved, and `continuation_events` links the new record to the original
  request. It is never triggered by route eligibility.

## Testing Strategy

### Contract-Level Scenarios

Extend `packages/cli/src/validation/skills.test.ts` with scenario-oriented
assertions over the canonical dispatch, implementation, phase-execution, and
phase-agent contracts:

1. A post-commit lint, type, test, build, or composition failure with one
   obvious in-scope correction creates exactly one recovery commit, records
   `phase-standing` authorization, reruns focused and phase verification, and
   continues without a prompt.
2. The original task commit remains immutable and at the same history position;
   no amend, reset, replacement task ID, or concealed rewrite is permitted.
3. The recovery event and any fresh-launch continuation preserve original
   request ID, original commit, exact target, attempt/budget, discovering check,
   repair SHA, and verification outcome.
4. No second provider, model, route, or worker is launched as fallback.
5. Ambiguous, contradictory, architecture-changing, security-changing,
   product-changing, or requirements-changing repair stops for direction.
6. Destructive, irreversible, protected, credential-bearing, or out-of-scope
   repair stops without editing.
7. Attempt exhaustion stops, including attempts that fail before producing a
   commit; an operator grant adds an explicit number of attempts without
   resetting prior usage or lifting the maximum.
8. Prevention ordering requires formatting, declared task verification, and
   discoverable proportionate checks before commit; scoped build/test runs
   before commit when emitted output or build/test configuration changes.
9. Broad repository tests/builds may remain phase-level, and an obvious
   composition failure there enters the same bounded recovery path.
10. Every recovered or stopped post-commit defect emits the canonical event
    record, allowing defect count and prompt count to be measured separately.
11. Review-cycle caps, unresolved Critical/Important handling, and protected
    boundaries remain unchanged.
12. Non-implementation consumers remain default-deny and cannot infer standing
    recovery authority from the shared dispatch contract.

These assertions test relationships and stop/continue behavior, not only
isolated wording snapshots.

### Provider and Sync Parity

Extend `packages/cli/src/commands/sync/index.test.ts` and the existing provider
contract coverage to:

- materialize Claude, Codex, base Cursor, and representative pinned Cursor phase
  agents from the canonical source;
- assert equivalent prevention, budget, recovery-event, same-target, and stop
  semantics;
- assert provider-specific wrappers do not add fallback or drop provenance; and
- pass canonical asset validation and manifest parity after
  `oat sync --scope all`.

Tracked provider outputs are regenerated, then validated; tests do not make
provider copies an authored source of truth.

### Focused Verification

Run the narrow suites first:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts
pnpm oat:validate-skills
oat status --scope project
```

Then run surface-required checks for the changed skills and docs:

```bash
pnpm lint
pnpm format
pnpm build:docs
```

Run the four CI gates in repository-defined order:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
```

Finally run release and diff validation:

```bash
pnpm release:validate
git diff --check
```

`pnpm lint` and `pnpm format` are required by the `.agents/skills` surface, and
`pnpm build:docs` is required by the docs-app change; they are not CI gates.
Release validation is mandatory because canonical agent, skill, template, and
docs assets ship with the CLI.

### Success Measurement

Prompt elimination alone is insufficient. Verification evidence must establish
both:

- **Prevention:** contracts force applicable task-local checks, including a
  scoped build when emitted-output configuration changes, before the task
  commit.
- **Recovery observability:** canonical event records expose post-commit defect
  count, defect class, discovering check, repair count, and authorization source
  so future project sweeps do not depend on heading conventions.

The recorded pre-change baseline is nine recovery events and two
operator-recovery continuations in the isolated disruption project, with known
classes including lint, composition, and test-fixture failures. The project
does not import that active artifact, so exact per-class counts remain
unavailable; the canonical record makes future class/check baselines exact.

## References

- Discovery: `discovery.md`
- [PR #138 — reusable subagent dispatch](https://github.com/voxmedia/open-agent-toolkit/pull/138)
- [PR #141 — phase-agent orchestration](https://github.com/voxmedia/open-agent-toolkit/pull/141)
- [PR #187 — dispatch visibility](https://github.com/voxmedia/open-agent-toolkit/pull/187)
- Public workflow guide:
  `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
