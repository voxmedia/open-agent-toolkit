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

### Question 4: Regression versus exposure

**Q:** Did a recent dispatch or base-anchoring change introduce the repeated
prompts?

**A:** No. Blame and pull-request correlation place the two governing rules in
PRs #138 and #141. A July 18 project hit the same path before the suspected
window, while PRs #186 and #187 did not alter recovery authorization. Exact
per-phase base capture also absorbs prior recovery commits, and no project
artifact contains a phase-base mismatch.

**Decision:** Frame this as a latent policy exposed at volume by
integration-heavy work, not a recent delivery regression. Preserve the original
history and fallback safeguards; do not target base anchoring.

### Question 5: Recovery observability

**Q:** Can existing project records measure whether the policy improves?

**A:** Not reliably. One project uses `**Recovery:**` headings while an earlier
occurrence appears only as free-form run-log prose. A heading-count sweep
therefore undercounts the event class.

**Decision:** Standardize one append-only recovery-event record for every
post-commit defect disposition, including the defect class, discovering check,
repair commit when present, authorization source, retry position, verification,
and original request/target provenance.

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
8. **Causal framing:** This is exposure of an existing policy under
   integration-heavy verification, not a regression from PR #176, #186, or
   #187.
9. **Observability:** Every post-commit defect disposition uses one canonical
   recovery-event record so prompt reduction cannot conceal unchanged defect
   volume.

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
- Regression coverage pins verification-before-commit ordering, and the
  canonical recovery-event count makes post-commit defect reduction measurable
  separately from authorization-prompt reduction.
- Cursor, Claude, and Codex generated/materialized agents express equivalent
  semantics and sync parity passes.
- Focused contracts, full repository gates, build, formatting, release
  validation, and diff checks pass.
- Documentation and a migration note explain why append-only repair does not
  require repeated approval and how users refresh released global assets.

## Out of Scope

- Changing the three-cycle review cap or review severity acceptance rules.
- Altering provider selection ladders or permitting accepted-launch fallback.
- Applying an interim mitigation inside the separate active project/worktree;
  the user chose to preserve project isolation.
- Changing phase-base anchoring from PR #176.
- Fixing the unrelated session-observer transcript prefix mismatch.
- Pushing a branch or opening a pull request.

## Deferred Ideas

- A separately requested write-up for the session-observer prefix mismatch.
- Project-specific standing authorization for already-running projects; the
  active project is intentionally isolated from this systemic change.

## Open Questions

Resolved during discovery:

- Reuse `oat_orchestration_retry_limit` as the project-level bound, with a
  distinct per-phase post-commit recovery counter so review and gate counters
  remain independent.
- Extend normal implementation bookkeeping with a canonical recovery-event
  record and reuse existing dispatch `continuation_events` for fresh same-target
  linkage.
- Keep lifecycle eligibility and validation in the project implementation
  contract, execution in the phase-agent contract, and the generic
  continuation-versus-fallback distinction in the shared dispatch contract.

## Assumptions

- Existing implementation authorization is phase-scoped and can safely include
  same-intent recovery when the contract makes the boundary explicit.
- Build-only composition failures cannot always be prevented economically at
  task granularity.
- Corpus counts based only on `**Recovery:**` headings are incomplete because
  earlier projects used free-form logging.
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
