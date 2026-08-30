---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: false
---

# Discovery: Gate Execution Contract Hardening

## Phase Guardrails (Discovery)

This quick project consolidates two discovery-only projects into one bounded,
end-to-end gate execution contract. It owns the configuration, headless runtime,
and integration seams needed to turn a configured gate command into either a
corroborated structured result or a precise terminal diagnosis.

It does not redesign receipts/events, introduce ReviewPlan, change
bookkeeping-only re-review policy, or absorb general review/gate integrity.

## Initial Request

Replace `gate-headless-no-yield` and `gate-structured-output-contract` with one
quick-workflow project, preserving and revalidating their useful discovery
evidence before deleting both superseded project directories.

The combined project owns:

- [`BL-260826-gate-targets-must-not-yield` — Gate targets must not yield on
  background work in headless mode](../../../repo/pjm/backlog/items/BL-260826-gate-targets-must-not-yield.md)
- [`BL-260726-validate-structured-output` — Validate structured-output contract
  in gate skill commands](../../../repo/pjm/backlog/items/BL-260726-validate-structured-output.md)

The requested execution contract has three boundaries:

1. Validate structured gate commands at configuration time, including the
   canonical global `--json` placement and actionable diagnostics.
2. Require headless gate targets to finish required work synchronously and
   distinguish child-without-artifact failures from actual correlation
   mismatches.
3. Prove a validated configured command launches headlessly and returns either
   the expected structured result or a precise terminal diagnosis.

Configuration and runtime phases should be independently implementable where
their file ownership permits, followed by one integration phase.

## Revalidated Evidence

### Configuration boundary

- Gate configuration normalization accepts any non-empty command and validates
  only basic fields such as `onFailure` and `maxAttempts`.
- `oat gate set` persists the command and currently reports only an unrelated
  warning for absolute development-build paths; it does not validate the
  structured-output contract.
- The current test suite explicitly accepts a durable `oat gate review` command
  with no `--json` warning, confirming the residual defect.
- The current implementation closeout contract and gate documentation require
  the canonical lifecycle shape `oat --json gate review ...`; this is stricter
  than the old scaffold's provisional acceptance of `--json` after the
  subcommand.
- Provider exec-target `baseCommand` values are a separate argv contract and
  must never receive OAT's global `--json` flag.
- `oat pjm doctor` is not a natural owner for this check: it validates repository
  project-management state and does not load layered gate configuration.

### Runtime boundary

- Headless workflow instructions already forbid fire-and-forget background
  work and require inline or synchronously awaited completion.
- The gate runner awaits the launched child process and inventories review
  artifacts only after the child closes.
- A nonzero no-artifact exit and a timeout already produce `review_failed`.
- A clean exit with no produced artifact currently falls into the same
  `targeting_correlation_failed` branch as a wrong-run or otherwise mismatched
  artifact. This is the confirmed residual diagnostic defect.
- All of those terminal paths already fail closed; the defect is classification
  and operator guidance, not receive or replacement authorization.
- A valid correlated artifact remains the only path to
  `receiveEligible: true`.

### Integration boundary

- Existing subprocess coverage proves headless environment propagation,
  refusal handling, timeouts, wrong-run rejection, and successful correlated
  completion.
- That matrix invokes `gate review` directly. It does not prove that a stored,
  validated skill-gate command resolves and launches through the same
  structured contract.
- PR #190 remains open as of 2026-08-30. The confirmed residuals above are
  independently testable without entering its ReviewPlan or receipt/event
  surfaces.

## Clarifying Questions

### Question 1: How are the old projects retired?

**Q:** Should the two early scaffolds remain as tombstones or be removed after
their evidence is absorbed?

**A:** Delete both existing project directories after absorption.

**Decision:** The combined project becomes the only project owner. Update
project references and roadmap grouping so no stale project path remains.

### Question 2: How deep should this quick workflow design go?

**Q:** Is straight-to-plan sufficient?

**A:** Use lightweight design if the configuration/runtime seam needs
clarification.

**Decision:** Revalidation found a real seam and one configuration-policy
conflict, so produce a focused lightweight design before planning.

### Question 3: What configuration failure policy replaces the old scaffold?

**Q:** Should a recognized invalid `oat gate review` command be warning-only, as
the old backlog proposed, or rejected with an actionable error under the new
end-to-end contract?

**A:** Pending lightweight-design confirmation.

**Decision:** Do not silently carry forward the old warning-only choice. The
combined brief's canonical placement and actionable-error language is the
current decision input.

## Solution Space

### Approach 1: Shared contract validator plus cause-specific runtime terminals

_(Recommended)_

Create one conservative command-shape validator for recognized OAT gate-review
commands, apply it at configuration time, and keep provider exec-target argv
outside its scope. At runtime, add a distinct clean-child-without-artifact
terminal while preserving the existing mismatch and artifact-validation paths.
Prove both through a configuration-driven subprocess integration matrix.

This approach owns exactly the requested seam, reuses the current fail-closed
envelope, and does not require a receipt or event redesign.

### Approach 2: Lifecycle-only preflight

Leave configuration permissive and validate immediately before each lifecycle
launch. This protects execution but allows invalid commands to persist and
recreates late failure in every consumer.

### Approach 3: Typed gate-command schema

Replace command strings with a typed command model and generate argv at
runtime. This could eliminate shell ambiguity, but it is a compatibility and
migration project well beyond the two backlog items.

### Chosen Direction

**Approach:** Approach 1.

**Rationale:** It closes the configuration/runtime gap with narrow shared
contracts and deterministic tests while preserving current gate envelopes and
provider-neutral launch behavior.

**User validated:** Yes for the combined three-boundary project and lightweight
design; exact configuration failure policy remains the focused design decision.

## Key Decisions

1. **Ownership:** One combined quick project owns both backlog items.
2. **Retirement:** Delete both superseded discovery-only project directories
   after this discovery preserves their useful evidence.
3. **Command scope:** Validate recognized OAT `gate review` commands only; do
   not inspect or rewrite exec-target `baseCommand` values.
4. **Canonical form:** The lifecycle contract's global option placement,
   `oat --json gate review`, is the reference form to validate.
5. **Runtime diagnosis:** A clean child exit with no artifact is distinct from
   an artifact/run/project/invocation correlation mismatch.
6. **Safety:** Both no-artifact and mismatch terminals remain non-receive-
   eligible and never authorize replacement after accepted execution.
7. **Execution shape:** Configuration and runtime work should use disjoint
   implementation ownership when practical, then converge in one integration
   phase.
8. **PR #190 boundary:** Revalidate overlap but do not wait on or absorb its
   ReviewPlan/receipt work when the current residuals are independently owned.

## Constraints

- Execute configured commands unchanged; validation must not rewrite user argv.
- Keep provider/model targets out of reusable lifecycle gate declarations.
- Preserve exact provider and child failure provenance.
- Keep unknown or wrapper-heavy command shapes conservative; never execute a
  command merely to validate its syntax.
- Do not make a partial, late, or mismatched artifact receive-eligible.
- Do not add automatic replacement after an accepted child fails.
- Skill changes require the PR-scoped skill version bump.
- Shipped CLI, bundled skill, and docs changes require lockstep public package
  version updates and the repository release gates.

## Success Criteria

- Configuring a recognized structured gate command validates canonical global
  `--json` placement and returns an actionable result without mutating argv.
- Provider exec-target commands remain outside the OAT JSON validator.
- Headless gate guidance and the actual launch path require inline or
  synchronously awaited completion before artifact handoff.
- A clean child exit without an artifact produces a precise terminal diagnosis
  distinct from a wrong-run/correlation mismatch.
- Neither failure is receive-eligible or replacement-eligible.
- A configuration-driven integration test proves correlated success and the
  two distinct failure diagnoses through a real headless subprocess.
- The old project directories and their stale roadmap/project references are
  removed after absorption.
- Both backlog items remain active until the implementation ships, then close
  through the repository's atomic backlog archive workflow.

## Out of Scope

- Receipt or event schema redesign.
- ReviewPlan or selective reviewer intake.
- Bookkeeping-only re-review policy.
- General review/gate integrity, idle-budget policy, or full-surface timeout
  redesign.
- Provider-specific role materialization or generic-child fallback.
- A typed shell-command AST or automatic config migration.

## Deferred Ideas

- A general `oat gate doctor` command for auditing hand-edited layered configs.
- Typed gate declarations that generate argv rather than storing shell strings.
- Early partial artifact templates or a broader durable gate-run state machine.

## Open Questions

- **Configuration policy:** Reject a recognized invalid command or persist it
  with a warning?
- **Wrapper boundary:** Which simple prefixes can be recognized without a full
  shell parser, and which remain unknown/unvalidated?
- **Terminal vocabulary:** Choose the stable status/outcome names for a clean
  child exit without an artifact while preserving compatibility for existing
  correlation failures.

## Assumptions

- The new combined brief supersedes provisional choices in the old discovery
  artifacts when they conflict.
- Current lifecycle command guidance is the source of truth for canonical
  global option placement.
- Existing structured envelope fields can carry the new diagnosis without a
  receipt/event redesign.
- The fake runtime integration harness can be extended without external
  provider dependencies.

## Risks

- **Compatibility break:** Hard rejection could invalidate deliberately
  human-output gate commands.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Scope only to recognized structured lifecycle gate
    commands and make the error name the required canonical form.
- **False classification:** A shell wrapper obscures the actual OAT invocation.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Conservative recognition with explicit unknown
    handling; do not guess by substring.
- **Status consumer drift:** A new terminal status surprises downstream code.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Audit exhaustive unions/tests and preserve all
    fail-closed eligibility fields.
- **Concurrent implementation collision:** Configuration and runtime phases
  both need the central gate module.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Isolate the validator in a new module and assign the
    central integration edits to the final phase.

## References

- `packages/cli/src/commands/gate/index.ts`
- `packages/cli/src/commands/gate/child-process.ts`
- `packages/cli/src/commands/gate/gate-hardening.integration.test.ts`
- `packages/cli/src/commands/gate/__fixtures__/fake-runtime.mjs`
- `.agents/skills/oat-project-review-provide/SKILL.md`
- `.agents/skills/oat-dispatch-subagents/SKILL.md`
- `.agents/skills/oat-project-implement/references/completion-and-closeout.md`

## Next Steps

1. Confirm the configuration-time failure policy in lightweight design.
2. Complete the focused design and generate the three-phase quick plan.
3. Delete the superseded project directories after this discovery is durable.
4. Continue through implementation and integration verification.
