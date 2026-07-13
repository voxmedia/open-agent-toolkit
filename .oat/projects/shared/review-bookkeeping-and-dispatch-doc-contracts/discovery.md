---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: false
oat_template: false
oat_template_name: discovery
---

# Discovery: review-bookkeeping-and-dispatch-doc-contracts

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

From a downstream operator's feedback packet (Stoa repo, full orchestrated OAT lifecycle run on oat CLI 0.1.55→0.1.59, 2026-07-13), items 2–4. Three contract-consistency reports around gate/review machinery and dispatch docs:

1. **(Item 3)** After the root orchestrator marked a plan.md Reviews row `| final | code | passed | ... |`, a subsequent `oat gate review` run overwrote that row to `received` pointing at the gate's own new artifact — silently regressing a `passed` state.
2. **(Item 4)** `oat-project-implement`'s Claude dispatch rules appear to instruct calling the resolver with both `--candidate-model` and `--preferred`; the resolver rejects the combination ("Exact candidate flags cannot be combined with --preferred; use one selection path"), so by-the-book dispatches fail on first attempt.
3. **(Item 2)** On 0.1.59, `oat gate review --exit-nonzero-on important` exited 1 (correct) but the JSON envelope said `"status": "ok"` — disagreeing with the documented routing contract (`blocked` ↔ nonzero).

## Recon Findings (verified 2026-07-13 against current main)

**Item 3 — reproduces; it is a skill-prose gap, not a code bug.** No CLI code writes the Reviews table (`packages/control-plane/src/state/reviews.ts` is read-only by package charter). The write happens via `oat-project-review-provide` Step 9 ("Update or add a row matching `{scope}`... Status: `received`") — an unconditional replace-by-scope-match with no monotonicity guard. `oat-project-plan-writing`'s Review Table Preservation Rules forbid deleting rows and document the status ladder (`pending → received → fixes_added → fixes_completed → passed`) but nothing forbids moving a row backward. Gate re-runs of an already-`passed` scope stomp the row.

**Item 4 — partially reproduces, as a documentation ambiguity.** The per-provider example commands in `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md` never literally combine the flags. But the Claude implementer bullet says "pass it to the resolver as `--preferred <preferred-model>`" and then, a few lines later, gives the managed-capped call using `--candidate-model` — with no statement that the second replaces the first. The general preflight guidance ("pass `--preferred <preferred-effort>`") is likewise not scoped away from the exact-candidate path. An agent following both instructions hits the resolver rejection (`packages/cli/src/commands/project/dispatch-ceiling/index.ts`, `normalizeRequestedCandidate`; rejection is intentional and unit-tested). Decision record `DR-260706-resolver-owns-preferred.md` documents only the `--preferred` path — the exact-candidate ladder was layered in later without reconciling the prose.

**Item 2 — does NOT reproduce on current source (0.1.60), dispositioned as misread-most-likely.** In `packages/cli/src/commands/gate/index.ts`, envelope `status` and `process.exitCode` derive from the same `blocking` boolean in the same block; a unit test (`gate/index.test.ts`) pins the exact reported scenario as `status: 'blocked'` + exit 1 on 1 Important. Evidence trail (2026-07-13): the operator did not preserve the raw JSON envelope and acknowledges a misread is plausible (sibling `outcome` field or artifact-validation output in the same terminal window); a search of the archived Stoa project (`.oat/projects/archived/wave-0-execution/`) found only the contemporaneous prose note, no verbatim JSON; and the status/exit coupling code (`blocking ? 'blocked' : 'ok'`) landed in commit `303e91e8` (2026-06-29, released in v0.1.36) — well before the 0.1.59 run — so "fixed since 0.1.59" is unlikely and misread is the probable explanation. One latent hazard found: `ReviewGateVerdict.blocking` (`gate/review-verdict.ts`, `hasBlockingFindings`) is hardcoded to `critical>0 || important>0`, ignoring the caller's threshold — unused for routing today, but a refactor that swapped it in would silently misbehave for other thresholds.

**Wave-1 follow-up item (gate timeout discards a completed review artifact) — added 2026-07-13, verified plausible on current source.** Operator report (wave-1 run, 10 phases, 0.1.59): `oat gate review` hit its 900000ms ceiling and returned `exitCode: 124, timedOut: true, "Review did not complete"` while a complete, well-formed review artifact stamped with the gate's own `oat_gate_run_id` was already on disk in `reviews/`; recovery was manual by matching the runId. Current-source check: the timeout path (`packages/cli/src/commands/gate/index.ts`, `exitCode: timedOut ? 124 : ...` and the "Review did not complete" payload builder) performs no re-scan of the reviews directory before declaring timeout. Artifacts carry `oat_gate_run_id` frontmatter and the success path already parses it for corroboration, so late-completion recovery is feasible with existing machinery. Nuance: the timeout is already env-configurable via `OAT_GATE_EXEC_TIMEOUT_MS` (default `15 * 60 * 1000`; mentioned in `apps/oat-docs/docs/cli-utilities/workflow-gates.md`) — the operator's "make it configurable" half is a discoverability/documentation gap, not a missing feature.

**Wave-1 follow-up item (complete-before-merge routing) — added 2026-07-13, partially reproduces.** Operator report: their standing workflow is review → `oat-project-complete` → merge (archive the bulky artifact tree off the branch before merge; S3 retrieval; only summary export + decision records stay tracked). The machinery supports this — the archive-while-PR-open path worked in both wave runs — but agents stall or defer because the prose reads merge-first. Current-source check: `oat-project-complete` itself is already correct (line ~138: `pr_open` → "Proceed normally. This is the expected entry point after `oat-project-pr-final`", plus the `WAS_PR_OPEN_AT_START` + open-PR body-sync machinery). The merge-first implication lives in (a) `oat-project-pr-final` Step 6 wording ("PR open, awaiting human review", "When approved: run `oat-project-complete`") and (b) `oat-project-progress`'s routing table, which has **no `pr_open` row at all** — its mode tables end at implement/complete, leaving agents without a route in exactly that state. No `workflow.completeBeforeMerge` config key exists anywhere.

**Wave-1 reconfirmations (2026-07-13):** five gate invocations in the wave-1 run all mapped thresholds → exit codes correctly on 0.1.59, further supporting the item-2 misread disposition; preferred-only resolver invocation again worked across ~24 dispatches (the doc ambiguity fix remains worthwhile).

## Requirements

- **Reviews-table semantics (operator answer, 2026-07-13):** the collision is structural — two legitimate review events (root-owned final review marked `passed`, then the configured cross-runtime final gate over the same scope) sharing one scope key. Preferred fix: **distinct rows per review event** (keyed by scope + reviewer/runtime or run), because both facts should stay visible — the root review's `passed` and the gate's `received → dispositioned` lifecycle are different records with different artifacts. Fallback **only if** one-row-per-scope proves to be a hard invariant of the table parsers/validators: advance-only status with artifact paths appended alongside (accepted by operator but flattens two review lifecycles into one). Either way, bookkeeping must never move a row backward in the ladder.
- **Parser/validator compatibility check (gates the semantics choice):** before committing to distinct rows, verify that `packages/control-plane/src/state/reviews.ts` (table parser) and `oat project validate-plan`'s Reviews-table integrity checks tolerate multiple rows per scope — and update them plus `oat-project-plan-writing`'s preservation rules if the preferred semantics require it. This may pull a small amount of code change into an otherwise prose-only project.
- **Dispatch doc reconciliation:** restructure `dispatch-and-dry-run.md` so the `--preferred` path and the exact-candidate (`--candidate-model`/`--candidate-effort`) path are presented as explicitly mutually exclusive from first mention; strike or scope the Claude bullet's `--preferred` clause where the exact-candidate command supersedes it.
- **Item 2 closeout:** no behavior change needed. Close the report as misread-most-likely (see Recon Findings for the evidence trail; the pinning test already covers the divergence risk going forward, per operator agreement). Optionally harden: align `ReviewGateVerdict.blocking` with the threshold-aware computation or document why it differs, so the latent landmine is defused.
- **Complete-before-merge as a named first-class ordering (wave-1 item):** state explicitly in `oat-project-complete`, `oat-project-pr-final`, and `oat-project-progress` prose that an open PR is NOT a blocker for completion — the completion flow syncs the open PR body after archival. Concretely: soften pr-final's "When approved: run `oat-project-complete`" routing hints to name both orderings; add `pr_open` routing row(s) to progress's next-step tables; add a supported-orderings statement to complete. Decide at planning whether a `workflow.completeBeforeMerge` preference key earns its place or doc language alone suffices (operator explicitly allowed either).
- **Gate timeout late-completion recovery (wave-1 item):** before declaring timeout, re-scan the project reviews directory for an artifact carrying the invocation's `oat_gate_run_id`; if found and it validates, return it with a late-completion status instead of a bare timeout, so orchestrators don't re-run completed reviews. Secondarily, surface `OAT_GATE_EXEC_TIMEOUT_MS` where gate users will find it (skill/docs references), since review scope grows with project size and a fixed 900s ceiling under-provisions large reviews at max reasoning effort.

## Key Decisions

1. **Mostly prose, minimally code, for item 3:** the Reviews table is written by agents following skill text; a full CLI helper stays out of scope (deferred idea), but the read-side parser/validators may need small updates if distinct-rows-per-review-event is adopted (see Requirements).
2. **Distinct rows preferred (operator answer, 2026-07-13):** one row per review event, keyed by scope + reviewer/runtime; advance-only is the fallback, not the default.
3. **Ladder semantics documented in one place:** whatever rule is chosen must land in both `oat-project-review-provide` and `oat-project-plan-writing`'s preservation rules, with identical wording.

## Constraints

- Canonical skills live in `.agents/skills/`; each changed skill requires a frontmatter `version:` bump in the same PR (repo policy). Provider views are sync-managed.
- Bundled skill changes trigger the lockstep five-package public version bump and `pnpm release:validate`.
- Doc-vs-CLI drift for the resolver: consider the operator's suggestion of a contract test that executes each documented resolver invocation against the CLI (may be deferred if disproportionate).

## Success Criteria

- A re-gate of an already-`passed` scope produces a distinct row (or, under the fallback, never regresses the existing row) — verifiable by following the updated skill text against a fixture plan.md, and the table parser/validators accept the resulting table.
- Every resolver invocation documented in `dispatch-and-dry-run.md`, followed literally, passes current CLI validation; the mutual exclusivity of selection paths is stated where each path is introduced.
- Item 2 is dispositioned with evidence (closed as misread-most-likely; evidence trail recorded in Recon Findings).
- A gate run whose reviewer finishes after the ceiling returns the validated artifact with a late-completion status rather than a bare timeout (unit-testable by stubbing the exec to time out while a valid runId-stamped artifact exists).
- The gate timeout's configurability is documented where gate invocations are documented.
- An agent following pr-final/progress/complete prose with an open PR routes confidently to completion without stalling or warning; `oat-project-progress` has an explicit `pr_open` route.

## Out of Scope

- CLI-enforced Reviews-table writes (control-plane stays read-only).
- Changes to resolver flag validation itself (the rejection is correct and tested).
- The formatting contract for written artifacts (separate project: `agent-artifact-hygiene-contract`).

## Deferred Ideas

- CLI helper that owns Reviews-table mutations so prose in three skill mirrors can't drift — revisit if prose fixes prove fragile.
- Doc-vs-CLI contract test harness for all documented CLI invocations in skill text.

## Open Questions

- **Do the Reviews-table parser and validate-plan tolerate multiple rows per scope?** Determines whether the operator's preferred distinct-rows semantics is prose-only or needs read-side code changes. Check first at planning.
- **Row key shape for distinct rows:** scope + reviewer/runtime vs. scope + run timestamp — pick whichever the existing table columns can express without a schema change.
- **`verdict.blocking` hardening:** align with threshold-aware logic, or document the divergence? Small; decide at planning.
- **`workflow.completeBeforeMerge` config key:** worth adding, or is doc language sufficient? Decide at planning (leans doc-only unless routing tables need a preference to branch on).

_Resolved 2026-07-13 (operator answers): the stomping gate run was a deliberate re-gate (structural collision, not a duplicate); distinct rows per review event preferred, advance-only fallback; item 2 closed as misread-most-likely (no envelope preserved; coupling code predates 0.1.59)._

## Assumptions

- The resolver's current validation behavior is the intended contract (per its unit tests and `DR-260706-resolver-owns-preferred`); only the skill prose needs to move.

## Risks

- **Prose guard is soft enforcement:** an agent can still misfollow it.
  - **Likelihood:** Low / **Impact:** Medium
  - **Mitigation Ideas:** unambiguous imperative wording + the deferred CLI-helper idea if regressions recur.

## Next Steps

Quick mode → straight to plan; operator answers are in. First planning step: the parser/validator compatibility check that gates the distinct-rows vs. advance-only choice. Run `oat-project-quick-start` to continue.
