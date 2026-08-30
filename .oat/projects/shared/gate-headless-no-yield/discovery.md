---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-29
oat_generated: false
---

# Discovery: Headless Gate Targets Must Not Yield

> Discovery status: initial, non-exhaustive starting point. This artifact is a
> bounded starting point, not a complete specification. Revalidate it in a
> fresh thread/worktree after PR #190 is dogfooded before generating a plan.

## Phase Guardrails (Discovery)

This quick discovery captures a bounded defect and its acceptance boundary.
It does not authorize implementation or redesign the broader gate lifecycle.

## Initial Request

Create the standalone quick-start follow-up for a headless gate child that
backgrounds required work behind a waiter/monitor and ends its turn before
writing the correlated review artifact. The original incident involved three
Claude headless gate attempts that produced `targeting_correlation_failed`
without explaining whether the child exited without an artifact or wrote an
artifact that failed correlation.

The linked backlog item is
[`BL-260826-gate-targets-must-not-yield` — Gate targets must not yield on
background work in headless mode](../../../repo/pjm/backlog/items/BL-260826-gate-targets-must-not-yield.md).
This project is related to
[`review-gate-integrity` — Review and Gate Integrity](../review-gate-integrity/)
and the existing
[`review-plan-workflow` — ReviewPlan-first reviewer workflow](../review-plan-workflow/).

## Problem Statement

Headless gate execution requires a terminal result and a correlated artifact,
but provider instructions can still allow the child to hide required commands
behind background work or a waiter. The child then exits from the provider’s
perspective while OAT has no artifact to receive. The current failure label is
too coarse: “child exited without an artifact” differs from “an artifact exists
but belongs to another run/target.”

This is a bounded reliability defect, not a request to redesign all gate
timeouts or review decomposition. The broader activity-aware timeout and
full-surface budget concerns remain in the linked integrity backlog.

## Evidence and Current Baseline

- The backlog incident identifies three consecutive Claude headless children
  that backgrounded DoD gates and ended before artifact write.
- `.agents/skills/oat-dispatch-subagents/SKILL.md` already states that
  fire-and-forget background dispatch is forbidden in headless gate contexts
  and requires inline or synchronously awaited execution.
- `.agents/agents/oat-reviewer.md` and the project review-provide contract
  require gate invocation metadata and a correlated review artifact; the
  headless task contract must be checked for consistent placement of the rule.
- `packages/cli/src/commands/gate/child-process.ts` and
  `packages/cli/src/commands/gate/route.ts` are the likely runtime boundaries
  for child exit and outcome routing. Fresh discovery must confirm whether
  they distinguish no-artifact exit from correlation mismatch.
- `packages/cli/src/commands/gate/index.ts` coordinates invocation and
  structured output; it must not make an incomplete child receive-eligible.
- The current route implementation has explicit inline, delegated-sync, and
  refuse branches at `packages/cli/src/commands/gate/route.ts:61-117`; the
  gate command's no-artifact/correlation handling is concentrated at
  `packages/cli/src/commands/gate/index.ts:3380-3415`. These are evidence
  anchors, not a substitute for revalidation after the assumed PR #227
  baseline and any ReviewPlan changes land.
- Existing coverage includes gate hardening integration cases in
  `packages/cli/src/commands/gate/gate-hardening.integration.test.ts:183-334`,
  child-process cases in `child-process.test.ts:12-63` and `:306-335`, and
  route cases in `route.test.ts:8-44`. Fresh discovery should add or identify
  a fixture that proves the actual background/waiter failure rather than only
  the resulting generic diagnostic.
- PR #190 changes overlapping gate/correlation surfaces and is an unmerged
  compatibility input. This project must be re-scoped after that PR lands.

## Clarifying Questions

### Question 1: What is the smallest acceptable fix?

**Q:** Is the first slice a contract/test correction, a runner diagnostic
correction, or both?

**A:** Both are provisionally required: the child receives an explicit no-yield
contract, and the runner distinguishes observable failure causes. No replacement
authority is added as a side effect.

**Decision:** Keep the project bounded to contract enforcement and diagnostic
classification.

### Question 2: What qualifies as a successful headless turn?

**Q:** Must a child write the correlated artifact before it exits, even if a
background process may write it later?

**A:** Yes. A terminal child turn without a complete, run-matching artifact is
not receive-eligible.

**Decision:** Artifact correlation is a terminal precondition; exit code alone
is insufficient.

### Question 3: Does this authorize fallback?

**Q:** May OAT launch a generic child after a no-yield or no-artifact failure?

**A:** No. Native-role rejection before child start is a separate scope/provider
concern. A child that accepted work and then failed remains a gate failure.

**Decision:** Preserve exact failure provenance and fail closed.

## Solution Space

### Approach 1: Contract plus narrow runner classification _(Recommended)_

Strengthen the headless gate task contract and distinguish
child-exited-without-artifact, artifact-correlation-mismatch, and valid
correlated completion. Add deterministic fixtures for foreground,
synchronous-await, background/waiter, and wrong-run-artifact cases.

This directly addresses the incident and remains small enough for quick mode.
It requires coordinated skill and CLI changes, but produces actionable
diagnosis without redesigning the lifecycle.

### Approach 2: Prompt-only correction

Add explicit no-background/no-waiter language and contract tests, leaving the
runner’s generic correlation failure unchanged. This is appropriate only if
runtime changes must wait for PR #190, but it leaves future failures opaque.

### Approach 3: Gate-run state machine

Add durable state for child start, artifact template, child exit, correlation,
and receive eligibility. This is stronger if current correlation cannot be
made reliable narrowly, but belongs in the review/gate integrity design if
fresh discovery proves it necessary.

### Chosen Direction

**Approach:** Approach 1, provisional pending PR #190 revalidation.

**Rationale:** It addresses the observed failure and improves diagnosis while
preserving the no-replacement contract.

**User validated:** Directionally yes through the decision to keep this
standalone; formal discovery approval is not recorded.

## Options Considered

### Option A: One generic correlation error versus cause-specific statuses

**Choice:** Cause-specific statuses with a shared non-eligible terminal class.

Consumers need to know whether to correct the child prompt, inspect artifact
routing, or rerun correlation. None is receive-eligible unless the envelope and
artifact match.

### Option B: Early template artifact versus exit-time artifact only

**Choice:** Keep early-template creation open; do not assume it until PR #190’s
artifact contract is known.

An early template may improve liveness, but it introduces partial-artifact
consumer risks and may already be covered by ReviewPlan work.

## Key Decisions

1. **Workflow:** Quick-start because the residual behavior is bounded and
   independently testable.
2. **Failure semantics:** No artifact at child exit differs from correlation
   mismatch; both are non-receive-eligible.
3. **Headless behavior:** No background tasks, monitors, or waiters may hide
   required work from a headless gate turn.
4. **Fallback:** Accepted-child failure never authorizes automatic replacement.
5. **PR #190:** Reconcile first; narrow or retire this project if its landed
   implementation covers the defect.
6. **Discovery status:** This is non-exhaustive and must be revalidated before
   plan generation.

## Constraints

- Preserve provider-neutral gate behavior and exact provider error details.
- Do not add generic-child fallback to compensate for an accepted child that
  failed to produce a correlated artifact.
- Do not solve broader idle timeout, full-surface budget, or recursive dispatch
  problems here.
- Do not make a partial artifact parseable or receive-eligible accidentally.
- Shipped skill/CLI changes require skill version bumps and lockstep release
  validation.

## Success Criteria

- Headless gate instructions explicitly prohibit background tasks, monitors, and
  waiters for required work.
- Focused tests cover compliant foreground/synchronous execution and the
  observed background/waiter failure.
- Gate output distinguishes child-exited-without-artifact from
  artifact-correlation-mismatch and valid correlated completion.
- Neither failure status authorizes receive or automatic replacement.
- The result remains compatible with PR #190’s landed correlation and
  structured-output contract.

## Out of Scope

- Provider-specific native-role materialization and user-scope agent visibility.
- General activity-aware idle-kill/hard-cap policy.
- ReviewPlan selective intake or delegation economics.
- Structured gate configuration validation except a directly necessary
  compatibility correction after PR #190.
- Automatic retries/replacement after a child has been accepted.

## Deferred Ideas

- Early correlated review-artifact templates and partial progress artifacts.
- Provider-specific foreground execution adapters.
- A broader gate-run state machine if narrow statuses are insufficient.

## Open Questions

- **PR #190 overlap:** Which no-yield/correlation behavior is present after
  merge, and what residual remains independently actionable?
- **Status vocabulary:** What stable status names and exit codes distinguish no
  artifact, wrong artifact, malformed envelope, and wrong run identity?
- **Artifact completeness:** What minimum artifact state is complete, and what
  remains partial/unreceivable?
- **Exit ordering:** Can a child exit while a provider-owned background process
  later writes the artifact, and must the runner reject that race?
- **Prompt placement:** Which headless skill/agent contract is authoritative so
  the rule is not duplicated inconsistently?
- **Provider differences:** How do asynchronous provider tools express a
  synchronous await without provider-specific shared prose?
- **Diagnostics:** Should last output, process state, and artifact path appear
  in structured diagnostics, subject to redaction?
- **Fallback boundary:** How is true pre-start native-role rejection kept
  distinct from accepted-child no-artifact failure in dispatch records?
- **Testing:** What deterministic fixture best reproduces the incident without
  external provider transcripts?

## Assumptions

- The Claude incident is representative of a provider-contract gap, but source
  and PR #190 must confirm the exact path.
- Existing correlation and receive checks can be extended without a new durable
  database/state model.
- The operator prefers actionable cause diagnostics over broad retry behavior.

## Risks

- **False success:** A partial or late artifact is treated as complete.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Require run-matching completion state before receive.
- **Prompt drift:** A provider-specific role omits the rule.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Add corpus contract tests across headless gate
    instruction producers.
- **PR conflict:** A narrow patch duplicates PR #190 correlation logic.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep discovery open and revalidate after merge.

## Dependencies and Related Work

- [`review-gate-integrity` — Review and Gate Integrity](../review-gate-integrity/)
- [`review-plan-workflow` — ReviewPlan-first reviewer workflow](../review-plan-workflow/)
- [PR #190 — ReviewPlan Stage A compatibility release](https://github.com/voxmedia/open-agent-toolkit/pull/190)
- [`BL-260826-gate-targets-must-not-yield` — Gate targets must not yield on
  background work in headless mode](../../../repo/pjm/backlog/items/BL-260826-gate-targets-must-not-yield.md)

## References

- `packages/cli/src/commands/gate/child-process.ts`
- `packages/cli/src/commands/gate/route.ts`
- `packages/cli/src/commands/gate/index.ts`
- `.agents/skills/oat-dispatch-subagents/SKILL.md`
- `.agents/agents/oat-reviewer.md`

## Next Steps

1. Revalidate the incident against merged PR #190 and current gate tests.
2. Decide whether the residual remains quick-start or belongs in review/gate
   integrity.
3. Complete discovery and generate a bounded plan only after that decision.
