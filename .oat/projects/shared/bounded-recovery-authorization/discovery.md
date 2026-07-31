---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-31
oat_generated: false
---

# Discovery: bounded-recovery-authorization

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Fix OAT's repeated authorization prompts when phase verification discovers a
mechanically bounded defect after a task has already committed. Preserve
append-only history and accepted-launch terminality while treating safe,
same-target recovery as part of the phase authority the user already granted.

This is an independent systemic change. It must not modify or depend on the
active `review-plan-workflow` project.

## Clarifying Questions

### Question 1: Prevention versus recovery

**Q:** Should the change primarily relax recovery authorization, or should it
also prevent avoidable post-commit defects?

**A:** Prevention is primary. Cheap, discoverable, proportionate checks should
run before each task commit. Expensive repository-wide tests and builds may
remain phase-boundary checks, with bounded in-scope repair already authorized.

**Decision:** Define a tiered verification order. Do not claim that lint,
format, or type-check would catch build-output defects such as a bad TypeScript
emit configuration.

### Question 2: Recovery limit

**Q:** How should automatic recovery remain bounded?

**A:** Attach a concrete project-level retry budget and stop when it is
exhausted; do not replace repeated prompts with an unbounded repair loop.

**Decision:** Prefer the existing project orchestration retry policy if its
current semantics can safely cover append-only recovery. Otherwise add the
smallest coherent project-level policy. The design must state the counting
unit and default explicitly.

### Question 3: Historical intent

**Q:** Should the older policy simply be removed?

**A:** No. Read the originating pull requests and retain the guardrails they
were protecting, especially no accepted-commit rewriting and no silent
worker/model/provider replacement.

**Decision:** Separate route fallback, same-target bounded repair, and
scope-expanding recovery as three explicit policy categories.

## Solution Space

The chosen direction is one durable canonical recovery policy, consumed by the
phase implementer and implementation workflow, paired with tiered
verification-before-commit guidance and targeted behavioral contract tests.
Provider assets remain generated views.

## Options Considered

### Option A: Prompt after every committed defect

This preserves strict operator control but makes routine verification failures
interrupt every phase and incorrectly treats same-target repair as fallback.

**Chosen:** No.

### Option B: Pre-authorize all recovery without a budget

This removes interruptions but permits silent repair churn and weakens the
reason the append-only guardrail exists.

**Chosen:** No.

### Option C: Tiered prevention plus bounded same-target recovery

Run proportionate task checks before commit, retain phase-wide composition
checks, and automatically create separately recorded recovery commits only
while scope, target, safety, evidence, and retry conditions remain satisfied.

**Chosen:** Yes. This prevents avoidable defects while retaining a bounded,
auditable path for composition failures that can only be detected later.

## Key Decisions

1. **History:** Accepted task commits are immutable. Every post-commit repair is
   a separate append-only recovery commit with normal verification and
   bookkeeping.
2. **Authority:** Initial phase authorization includes mechanically bounded,
   unambiguous same-target repair that remains within declared intent.
3. **Fallback distinction:** A same-target root-owned recovery continuation is
   not automatic route/model/provider fallback. Accepted-launch replacement
   remains forbidden.
4. **Prevention:** Before committing, phase implementers run every applicable
   discoverable and proportionate formatting, lint/check, type-check, build,
   test, and task-specific verification. Expensive broad checks remain
   phase-level when per-task execution is disproportionate.
5. **Bound:** Automatic recovery uses an explicit project-level retry budget.
   Exhaustion stops for user direction.
6. **Review:** The three-cycle review cap and unresolved Critical/Important
   safeguards remain unchanged.
7. **Distribution:** Canonical assets own policy. Cursor, Claude, and Codex
   views are regenerated and validated for equivalent semantics.

## Constraints

- No amendment, reset, rewrite, or concealment of an accepted task commit.
- No model, provider, route, or worker replacement after accepted launch.
- Automatic repair must be mechanically bounded, unambiguous, in-scope,
  non-destructive, same-target, retry-bounded, and verifiable.
- Architecture, security, product, public requirements, consequential file
  boundary changes, ambiguity, contradictory evidence, destructive work,
  retry exhaustion, and separate governance caps require operator direction.
- Do not weaken protected-branch, credential, destructive-action, security, or
  review-cycle boundaries.
- Do not require expensive repository-wide verification before every task when
  narrower checks are proportionate and sufficient.
- Update canonical skills once per changed skill version, regenerate provider
  views, bump the five public packages in lockstep, and run release validation.
- Do not modify or depend on `review-plan-workflow`.

## Success Criteria

- An obvious post-commit lint, type, or build correction produces one separate
  recovery commit and continues without an authorization prompt.
- The original commit remains unchanged and recovery bookkeeping preserves the
  original request, continuation linkage, and same-target provenance.
- No fallback worker/model/provider is launched.
- Ambiguous, architectural, destructive, out-of-scope, or retry-exhausted
  recovery stops for user direction.
- Tiered pre-commit verification guidance catches discoverable task-local
  defects without mandating every expensive broad check per task.
- Cursor, Claude, and Codex generated/materialized agents express equivalent
  semantics and sync parity passes.
- Focused contracts, full repository gates, build, formatting, release
  validation, and diff checks pass.
- Documentation and a migration note explain why append-only repair does not
  require repeated approval and how users refresh released global assets.

## Out of Scope

- Changing the three-cycle review cap or review severity acceptance rules.
- Altering provider selection ladders or permitting accepted-launch fallback.
- Applying a local mitigation inside the separate active project/worktree.
- Fixing the unrelated session-observer transcript prefix mismatch.
- Pushing a branch or opening a pull request.

## Deferred Ideas

- A separately requested write-up for the session-observer prefix mismatch.
- Project-specific standing authorization for already-running projects; the
  active project is intentionally isolated from this systemic change.

## Open Questions

- **Retry reuse:** Can the existing orchestration retry limit count bounded
  post-commit recovery without conflating review rewrites or dispatch launch
  attempts?
- **Bookkeeping shape:** Which existing dispatch and implementation records can
  preserve original-request linkage and same-target recovery provenance without
  adding redundant state?
- **Policy ownership:** Which canonical asset should own the durable recovery
  contract so consumers reference one definition?

## Assumptions

- Existing implementation authorization is phase-scoped and can safely include
  same-intent recovery when the contract makes the boundary explicit.
- Build-only composition failures cannot always be prevented economically at
  task granularity.
- Provider copies are generated from canonical assets and can be validated
  without hand-maintenance.

## Risks

- **Silent repair churn:** Automatic continuation could hide systemic problems.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Numeric retry budget, append-only records, and exhaustion
    escalation.
- **Fallback conflation:** Broad wording could accidentally permit replacement
  dispatch after acceptance.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Explicit three-way taxonomy and assertions that no second
    provider/model launches.
- **Unenforced prevention:** Vague "run checks" wording may be skipped or may
  falsely imply broad build coverage.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Tiered, discoverability- and proportionality-based
    verification order with behavior-focused tests.
- **Provider drift:** Generated agents may diverge from canonical policy.
  - **Likelihood:** Low
  - **Impact:** High
  - **Mitigation:** Regenerate all views and run parity/materialization tests.

## Next Steps

Produce a lightweight design that resolves policy ownership, retry semantics,
bookkeeping, verification tiers, and regression boundaries, then generate the
quick implementation plan.
