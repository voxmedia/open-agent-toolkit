---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-30
oat_current_task_id: p01-t04
oat_generated: false
---

# Implementation: delivery-evidence-and-knowledge-preflight

**Started:** 2026-10-30
**Last Updated:** 2026-10-30

This journal resumes interrupted implementation sessions. Every plan task has one block in its phase; `oat project journal check` validates it.

## Progress Overview

| Phase         | Status      | Tasks | Completed |
| ------------- | ----------- | ----- | --------- |
| Phase 1 (p01) | in_progress | 6     | 3/6       |
| Phase 2 (p02) | pending     | 2     | 0/2       |
| Phase 3 (p03) | pending     | 2     | 0/2       |
| Phase 4 (p04) | pending     | 1     | 0/1       |
| Phase 5 (p05) | pending     | 2     | 0/2       |

**Total:** 3/13 tasks completed

---

## Phase 1: Stack-aware delivery exit carriers (#383)

**Status:** in_progress
**Started:** 2026-10-30

### Task p01-t01: Add a stack-aware exit-carrier wrapper

**Status:** completed
**Commit:** ddead69d44a61addba9efd7bba6e403b5a4b862a

**Outcome (required when completed):**

- Stacked (`kind: stack`) deliveries now judge their exit carrier at the tip member's observed head, after verifying every lower member is the tip or its ancestor (`stack-order` stale otherwise); a stack with no members is stale `member-missing`.
- Every other delivery kind keeps every-member evaluation unchanged.

**Files changed:**

- `packages/cli/src/commands/project/delivery/evidence.ts` - `evaluateDeliveryExitCarrier` wrapper
- `packages/cli/src/commands/project/delivery/evidence.test.ts` - stack, unobserved, empty-stack and `kind: pr` cases
- `packages/cli/src/commands/project/delivery/__tests__/goal-repo.ts` - multi-member and `kind` fixture options

**Verification:** delivery evidence suite 45 passed; scoped oxlint clean; CLI type-check passed.

### Task p01-t02: Use the wrapper in check, refresh and closeout; align the milestone subject scope

**Status:** completed
**Commit:** 60c9e8bd26ebb4b5f97af13305bc9a4a43e12feb

**Outcome (required when completed):**

- `delivery check`, `delivery refresh` and the closeout check all evaluate exit carriers through the wrapper; `publishedHeads` still reports every member head.
- The milestone subject builds its evidence scope from the latest observable (`open`/`at_endpoint`) delivery, so milestone and delivery subjects agree; refresh selects from its freshly observed copies.

**Files changed:**

- `packages/cli/src/commands/project/delivery/check.ts`, `refresh.ts`, `evidence.ts` - wrapper adoption and `latestDeliveryForMilestone`
- `packages/cli/src/commands/project/closeout-check/index.ts` - wrapper adoption
- `check.test.ts`, `refresh.test.ts`, `closeout-check/goal-boundary.test.ts` - command-level positive and negative controls

**Verification:** delivery and closeout-check suites 158 passed (root rerun matched); type-check passed.

### Task p01-t03: Document stacked deliveries and their registration

**Status:** completed
**Commit:** f52f9f5c3a77b711a890bcd35fea0eb0ae77b9d6

**Outcome (required when completed):**

- Brief contract §12.7 documents `kind: pr | stack`, tip evaluation, ancestor order, tip-branch bookkeeping and supersession for mis-ordered stacks.
- pr-progress registers stacks attach-only, recording every member URL base to tip in the `registering` write and re-checking each on resume; the CLI reference notes tip judgment.

**Files changed:**

- `.agents/skills/oat-project-brief/references/brief-contract.md`
- `.agents/skills/oat-project-pr-progress/SKILL.md`
- `apps/oat-docs/docs/reference/cli-reference.md`

**Verification:** shared and validation contract suites 1,088 passed; docs markdownlint, `pnpm lint` and `pnpm format` passed.

**Can-fail proofs (p01):** each guard was neutralized, its focused test failed, and the guard was restored: stack tip selection (linear stack went stale `not-ancestor`); stack-order wrapper (non-ancestor case went falsely fresh); check, refresh and closeout call sites (each expected `stack-order`, received legacy `not-ancestor`); milestone/delivery agreement (milestone went stale on the delivery's own new artifact).

**Built-CLI controls (p01):** linear stack → exit 0, `status: ok`, fresh; mis-ordered stack → exit 1, `status: undeliverable`, `stack-order`.

**Built-CLI controls (p01, reproducible):** build with `pnpm --filter @open-agent-toolkit/cli build`; fixtures come from `registeredStack('linear' | 'misordered' | 'unobserved')` in `packages/cli/src/commands/project/delivery/check.test.ts` (the `goal-repo.ts` builder with `registryYaml({ kind: 'stack', members })`); from inside each scratch repository run `node "$REPO/packages/cli/dist/index.js" --json project delivery check --project .oat/projects/shared/goal --subject d01`. Expected and observed: linear → exit 0, `status: ok`, fresh; mis-ordered → exit 1, `status: undeliverable`, stale `stack-order`; unobserved → exit 1, `status: undeliverable`, stale `member-unobserved`.

**Can-fail neutralizations (p01):** tip selection — evaluate every head instead of `[tip]` (linear cases red at all four sites); order check — skip the lower-member loop (mis-ordered cases red at evidence, check, refresh, closeout); refresh copies — evaluate raw registry entries instead of `observedById` (both stack refresh tests red); milestone alignment — always use the `mNN`-row scope (agreement test red); kind dispatch — route every kind through the stack path (multi-member `pr` test red). Disabling only the `code === 1` branch stayed green, which review finding M1 queues as p01-t04.

### Task p01-t04: (review) Classify stack inspection failures separately from stack-order

**Status:** pending
**Commit:** -

### Task p01-t05: (review) Align contract registration wording for stacked deliveries

**Status:** pending
**Commit:** -

### Task p01-t06: (review) Pin latestDeliveryForMilestone exclusions

**Status:** pending
**Commit:** -

### Review Received: p01

**Date:** 2026-10-31
**Review artifact (local-only):** reviews/archived/p01-review-2026-10-31T002508Z.md

**Findings:** Critical 0 · High 0 · Medium 2 · Low 3

- M1 (Medium): stack ancestry inspection failures are reported as `stack-order` and tests cannot distinguish them → fix task p01-t04; an unfetched commit must not steer an operator to supersession.
- M2 (Medium): the built-CLI controls and can-fail proofs lacked commands and fixture provenance → resolved in this journal (artifact alignment; the reproducible commands and neutralizations above).
- L1 (Low): stack topology checks precede the carrier's own checks, diverging from `kind: pr` for null and unreviewed carriers → fix task p01-t04 (same function as M1).
- L2 (Low): §12.7 Idempotent registration and pr-progress items 5–6 wording lags stack registration → fix task p01-t05.
- L3 (Low): `latestDeliveryForMilestone` exclusions are unpinned → fix task p01-t06.

**Outcome:** fixes queued: p01-t04, p01-t05, p01-t06 (auto-disposition; reviewer request `dedkp-p01-review-1`, `oat-reviewer-claude-opus-5-5-high`, 0 Critical / 0 High — phase gate passed).

---

## Phase 2: Gate-originated artifact admission (#384)

**Status:** pending
**Started:** -

### Task p02-t01: Admit the exit gate's own artifact as bookkeeping

**Status:** pending
**Commit:** -

### Task p02-t02: Reconcile goal exit-gate guidance

**Status:** pending
**Commit:** -

---

## Phase 3: Journal rewrite detection (#385)

**Status:** pending
**Started:** -

### Task p03-t01: Export a journal-rewrite lister from delivery evidence

**Status:** pending
**Commit:** -

### Task p03-t02: Report rewritten committed journal lines in goal projects

**Status:** pending
**Commit:** -

---

## Phase 4: Knowledge-index dispatch preflight (#355)

**Status:** pending
**Started:** -

### Task p04-t01: Resolve a mapper route before mutating knowledge

**Status:** pending
**Commit:** -

---

## Phase 5: Release bookkeeping and gates

**Status:** pending
**Started:** -

### Task p05-t01: Bump changed skills and lockstep package versions

**Status:** pending
**Commit:** -

### Task p05-t02: Close out backlog items and run the full gate list

**Status:** pending
**Commit:** -

---

## Orchestration Runs

<!-- One line per dispatch request id, rendered by `oat project dispatch record --format line` and written as a list item. Update that line in place with the terminal outcome; never paste the record or event JSON. -->

<!-- orchestration-runs-start -->

- run/v1 · request=dedkp-p01-implementation · scope=p01 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-gpt-5-6-sol-high · model=gpt-5.6-sol-high · effort=~ · stamp=Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=claude-opus-5-5-high target=oat-phase-implementer-gpt-5-6-sol-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

<!-- orchestration-runs-end -->

- Gate IMPLEMENT-03 (auto-resolved): first autonomous run with `oat_plan_hill_phases` absent → `hillCheckpointDefault: final`; wrote `oat_plan_hill_phases: ["p05"]` and `oat_auto_review_at_hill_checkpoints: true`.
- Tier 1 — Subagents (Cursor native Task, available without authorization); dispatch policy managed/high from project state.

## Reviews and Gates

<!-- Receipts for final and multi-phase reviews (a phase review receipt may stay in its phase) and one terminal line per gate run. state.md owns gate transitions; this slot keeps the outcome, waivers and operator choices. -->

### Review Received: plan

**Date:** 2026-10-30
**Review artifact (local-only):** reviews/archived/artifact-plan-review-2026-10-30T235710Z.md

**Findings:** Critical 0 · High 0 · Medium 0 · Low 1

- L1 (Low): the p02-t01 built-CLI example ran `node packages/cli/dist/index.js` from the checkout, which resolves the checkout repository → resolve_in_artifact; p02-t01 Step 4 now uses the shared-conventions invocation from inside each scratch repository.

**Outcome:** passed

- Gate `oat-project-quick-start` (QS-12, auto-resolved): run 0820f334-2a3e-4915-aebf-0044c16a37da, target codex-6-sol-xhigh (gpt-6.1-sol xhigh), attempt 1 of 2, status ok, receiveEligible true, reviewed head f0d269c93185aa68080eca06fd85416d1f4630e2 → allowed/passed.

## Deferred Findings

<!-- One line per approved deferral (finding, rationale, approval, follow-up trigger), plus excluded parallel phases and unmerged worktrees. -->

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact        | Planned / Documented                            | Actual / Accepted                                                                                                                                                         | Reason                                                                           | Source of Truth | Follow-up |
| ------------- | ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------- | --------- |
| -             | -                      | -                                               | -                                                                                                                                                                         | -                                                                                | -               | -         |
| p01-t02       | plan.md p01-t02 Step 1 | Unobserved lower member stale at each call site | Covered at the wrapper and `delivery check`; refresh and closeout observe every member through `gh` (or fail) before carrier evaluation, so the case is unreachable there | Mechanically derived: the observation step precedes evaluation in those commands | Implementation  | None      |

## Final Summary (for PR/docs)

**What shipped:**

- {capability 1}
- {capability 2}

**Behavioral changes (user-facing):**

- {bullet}

**Key files / modules:**

- `{path}` - {purpose}

**Verification performed:**

- {tests/lint/typecheck/build/manual steps}

**Design deltas (if any):**

- {what changed vs design.md and why}

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
