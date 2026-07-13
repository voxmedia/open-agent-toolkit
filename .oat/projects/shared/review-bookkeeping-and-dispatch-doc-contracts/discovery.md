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

**Item 2 — does NOT reproduce on current source (0.1.60).** In `packages/cli/src/commands/gate/index.ts`, envelope `status` and `process.exitCode` derive from the same `blocking` boolean in the same block; a unit test (`gate/index.test.ts`) pins the exact reported scenario as `status: 'blocked'` + exit 1 on 1 Important. Either fixed since 0.1.59 or misreported (envelope requested from the operator; awaiting reply). One latent hazard found: `ReviewGateVerdict.blocking` (`gate/review-verdict.ts`, `hasBlockingFindings`) is hardcoded to `critical>0 || important>0`, ignoring the caller's threshold — unused for routing today, but a refactor that swapped it in would silently misbehave for other thresholds.

## Requirements

- **Reviews-table monotonicity:** gate/review bookkeeping must never move a row backward in the status ladder. Add an explicit guard to `oat-project-review-provide` Step 9 (and any other prose that writes the table): if the existing row for the scope is at a later ladder position, do not regress it — advance-only, recording the additional artifact path alongside, or append a distinct row (final semantics pending operator preference; see Open Questions).
- **Dispatch doc reconciliation:** restructure `dispatch-and-dry-run.md` so the `--preferred` path and the exact-candidate (`--candidate-model`/`--candidate-effort`) path are presented as explicitly mutually exclusive from first mention; strike or scope the Claude bullet's `--preferred` clause where the exact-candidate command supersedes it.
- **Item 2 closeout:** no behavior change needed. Close the report as not-reproduced-on-current (pending the operator's envelope). Optionally harden: align `ReviewGateVerdict.blocking` with the threshold-aware computation or document why it differs, so the latent landmine is defused.

## Key Decisions

1. **Fix in prose, not code, for item 3:** the Reviews table is written by agents following skill text; a CLI helper is out of scope for this pass (deferred idea).
2. **Ladder semantics documented in one place:** whatever monotonicity rule is chosen must land in both `oat-project-review-provide` and `oat-project-plan-writing`'s preservation rules, with identical wording.

## Constraints

- Canonical skills live in `.agents/skills/`; each changed skill requires a frontmatter `version:` bump in the same PR (repo policy). Provider views are sync-managed.
- Bundled skill changes trigger the lockstep five-package public version bump and `pnpm release:validate`.
- Doc-vs-CLI drift for the resolver: consider the operator's suggestion of a contract test that executes each documented resolver invocation against the CLI (may be deferred if disproportionate).

## Success Criteria

- A gate re-run against an already-`passed` scope no longer regresses the row (verifiable by following the updated skill text against a fixture plan.md).
- Every resolver invocation documented in `dispatch-and-dry-run.md`, followed literally, passes current CLI validation; the mutual exclusivity of selection paths is stated where each path is introduced.
- Item 2 is dispositioned with evidence (closed as fixed/misreported, or reopened if the operator's envelope shows a real path).

## Out of Scope

- CLI-enforced Reviews-table writes (control-plane stays read-only).
- Changes to resolver flag validation itself (the rejection is correct and tested).
- The formatting contract for written artifacts (separate project: `agent-artifact-hygiene-contract`).

## Deferred Ideas

- CLI helper that owns Reviews-table mutations so prose in three skill mirrors can't drift — revisit if prose fixes prove fragile.
- Doc-vs-CLI contract test harness for all documented CLI invocations in skill text.

## Open Questions

- **Row semantics (asked of the originating operator):** advance-only on one-row-per-scope (recording extra artifact paths alongside) vs. appending a distinct row per gate run? Default to advance-only if unanswered — it preserves the existing one-row-per-scope table shape.
- **Was the stomping gate run deliberate or a duplicate?** (Asked of operator; informs whether re-gate of a passed scope also deserves a warning in the skill text.)
- **Item 2 envelope:** operator to supply the actual 0.1.59 JSON envelope; determines closeout wording.
- **`verdict.blocking` hardening:** align with threshold-aware logic, or document the divergence? Small; decide at planning.

## Assumptions

- The resolver's current validation behavior is the intended contract (per its unit tests and `DR-260706-resolver-owns-preferred`); only the skill prose needs to move.

## Risks

- **Prose guard is soft enforcement:** an agent can still misfollow it.
  - **Likelihood:** Low / **Impact:** Medium
  - **Mitigation Ideas:** unambiguous imperative wording + the deferred CLI-helper idea if regressions recur.

## Next Steps

Quick mode → straight to plan once the two operator answers land (or defaults are accepted). Run `oat-project-quick-start` to continue.
