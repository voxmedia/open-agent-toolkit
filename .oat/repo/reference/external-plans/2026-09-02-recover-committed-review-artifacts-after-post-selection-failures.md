---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-02-program-intake-triage.md
  - .oat/repo/pjm/backlog/items/BL-260902-recover-committed-review.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260902-recover-committed-review
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/232
created: '2026-09-02T23:59:00Z'
---

# Recover committed review artifacts after post-selection gate failures

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. Draft PR #190
> (ReviewPlan) rewrites the same gate module and both docs pages; see the
> landing-event table before starting.

## Outcome

`oat gate review` no longer reports a passing review as a failed gate. When
post-selection work throws after the dispatched reviewer has already written a
run-correlated artifact that passes validation, the gate returns that artifact
with its real `ok` or `blocked` disposition and an additive
`postSelectionRecovery: true` marker. When no recoverable artifact exists, the
`review_failed` envelope names the failing post-selection sub-step and error
code so callers can route deterministically instead of re-dispatching. The
gate contract documents that recovery means re-validation, never re-review.

## Source and live evidence

- Source backlog item:
  [BL-260902-recover-committed-review — Recover committed review artifacts from post-selection gate failures](../../pjm/backlog/items/BL-260902-recover-committed-review.md)
- Source issue: [#232](https://github.com/voxmedia/open-agent-toolkit/issues/232)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `packages/cli/src/commands/gate/index.ts:3684-3700` — the whole
    `runReviewGate` body is one `try`; its catch calls
    `writeReviewGateUnexpectedFailure` with no artifact lookup and no sub-step
    name.
  - `packages/cli/src/commands/gate/index.ts:3164-3172` —
    `postSelectionContext` carries only `project`, `projectResolutionSource`,
    `target`, `gateInvocation`, and `dispatchReport`; no artifact or step label
    exists at catch time.
  - `packages/cli/src/commands/gate/index.ts:2594-2625` —
    `writeReviewGateUnexpectedFailure` emits `status: 'review_failed'`,
    `outcome: 'unexpected_post_selection_failure'`, and a message only; no
    `artifactPath`, `receiveEligible`, or `handoff`.
  - `packages/cli/src/commands/gate/index.ts:3352-3367` — the resolved
    artifact is a local `const` mirrored only onto
    `projectLogFinalization.artifactPath`; the catch never sees it.
  - `packages/cli/src/commands/gate/index.ts:3550-3683` — verdict parsing has
    its own `artifact_validation_failed` guard; corroboration, invocation
    check, threshold, handoff, and result writing after it are unguarded and
    fall to the catch-all. That is the #232 incident shape.
  - `packages/cli/src/commands/gate/index.test.ts:5945`, `:5984`, and the
    branch-local route-receipt case at `:6640` — the three assertions on this
    envelope; none pins recovery or a step name (the `:6640` case has no
    resolved artifact, so the recovery branch must stay inert there).
  - `packages/cli/src/commands/gate/index.ts:2680-2712` — PR #246's
    `artifact_missing` envelope shape that must stay byte-stable.
  - `apps/oat-docs/docs/cli-utilities/workflow-gates.md:293-316` — status
    table has no row or recovery sentence for
    `unexpected_post_selection_failure`.
  - `packages/cli/src/validation/skills.test.ts:1970-2020` — pins the six gate
    statuses and the `artifact_missing` recovery wording in both docs pages.
- Constraining decisions:
  - [DR-260714-additive-timeout-recovery](../decisions/DR-260714-additive-timeout-recovery.md)
    — recovery re-scans, reuses existing validation, and adds an additive
    field; it never adds a status. This plan copies that model.
  - [DR-260831-cause-specific-fail-closed](../decisions/DR-260831-cause-specific-fail-closed.md)
    — `artifact_missing` and `targeting_correlation_failed` are reserved
    causes; recovery must not reuse them.
  - [DR-260716-strict-fail-closed-receipt](../decisions/DR-260716-strict-fail-closed-receipt.md)
    and
    [DR-260629-keep-review-gates-stateful](../decisions/DR-260629-keep-review-gates-stateful.md).

## Dependencies

| Type             | Dependency                                                                                                                                                                       | Required state                                                                                                                                                                                                                                                        | Current state                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Satisfied        | [PR #246](https://github.com/voxmedia/open-agent-toolkit/pull/246) gate execution contracts                                                                                      | Preserve `artifact_missing`, `targeting_correlation_failed`, and structured-command envelopes byte-for-byte.                                                                                                                                                          | Merged at `511ffff38`; contracts pinned by `validation/skills.test.ts`. |
| Soft ownership   | [review-gate-integrity](../../../projects/shared/review-gate-integrity/state.md) / [BL-260820-bind-each-gate-review](../../pjm/backlog/items/BL-260820-bind-each-gate-review.md) | Do not change lifecycle-event identity or receive consumption; record the envelope-shape choice as a decision record.                                                                                                                                                 | Project still in discovery; this item is listed as one of its children. |
| Soft integration | Sibling plan [Retry gate project-log finalization](./2026-09-02-retry-gate-project-log-finalization-across-index-locks.md)                                                       | Land this plan first in a shared wave; both edit disjoint regions of `gate/index.ts` and `index.test.ts`, and both append to the status table and incident-to-regression table in `workflow-gates.md`, so the docs hunk must be rebased; never in one parallel group. | Pending.                                                                |
| Soft ordering    | W5 group 2 plan [Add an oat config unset command](./2026-09-02-add-oat-config-unset-command.md)                                                                                  | Runs after this plan; both edit `apps/oat-docs/docs/reference/cli-reference.md`, so never in one parallel group.                                                                                                                                                      | Pending.                                                                |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                                                                                           | Required update                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | No       | Only `validation/skills.test.ts` (new dispatch-lineage case, +62 lines) and `cli-reference.md` (provider sections); neither touches gate prose.           | Re-run the drift check; re-anchor `skills.test.ts` line references if they shifted. No content change. Drift check on 2026-09-03 confirmed exactly these files changed; apply this row before dispatch.                                                                                           |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes      | `gate/index.ts`, `gate/index.test.ts`, `gate-hardening.integration.test.ts`, `workflow-gates.md`, `cli-reference.md`, adds `gate/review-plan-failure.ts`. | If #190 merges first: re-anchor every `index.ts` line, confirm `postSelectionContext` and the catch still have the shapes above, and check whether `review-plan-failure.ts` adds a new post-selection segment that needs a step label. If this plan lands first: PR #190 rebases; no plan change. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts packages/cli/src/commands/gate/review-verdict.ts packages/cli/src/commands/gate/gate-hardening.integration.test.ts packages/cli/src/commands/gate/configured-gate.integration.test.ts packages/cli/src/validation/skills.test.ts apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/reference/cli-reference.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If `gate/index.ts` changed, re-locate `postSelectionContext`, the catch-all, and
`writeReviewGateUnexpectedFailure` before editing. A changed status enum or a
new post-selection segment is a STOP until this plan is refreshed.

## Repository conventions

- Build: `pnpm build` → all non-docs workspace builds pass.
- Typecheck: `pnpm type-check` → passes.
- Focused tests: from `packages/cli`, `pnpm exec vitest run src/commands/gate/index.test.ts`.
- Lint/format/docs check: `pnpm check` → passes (markdownlint covers the docs
  pages; `oat:validate-skills` runs).
- Implementation pattern: `lateCompletion` additive recovery in
  `gate/index.ts` per DR-260714; envelope writers stay in `index.ts`.
- Git/PR convention: docs under `apps/oat-docs/docs` are shipped assets, so
  bump the five lockstep packages together; do not push or open a PR unless
  instructed.

## Scope

### In scope

- `packages/cli/src/commands/gate/index.ts` — widen `postSelectionContext`
  with `step` and the resolved artifact, label each post-selection segment,
  recover in the catch, and extend `writeReviewGateUnexpectedFailure` with
  `postSelection: { step, code }`.
- `packages/cli/src/commands/gate/index.test.ts` — the cases in the test plan.
- `packages/cli/src/commands/gate/configured-gate.integration.test.ts` and
  `gate-hardening.integration.test.ts` — assertion additions only (step 4); no
  production edits.
- `apps/oat-docs/docs/cli-utilities/workflow-gates.md` and
  `apps/oat-docs/docs/reference/cli-reference.md` — recovery contract prose
  and the incident-to-regression row.
- One decision record for the envelope additions via `oat decision new`.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- `review-verdict.ts` — validation semantics unchanged.
- `configured-command.ts`, `child-process.ts`, `branch-local-cli.ts`, `route.ts`
  — pre-dispatch and child-process concerns.
- `.agents/skills/**` — "treat `review_failed` as an operational failure"
  stays true; editing them forces skill bumps for no contract change.
- Any new terminal `status` value, re-dispatching the reviewer, or changes to
  receive consumption and ledger-event identity.

## Current state

`runReviewGate` (`index.ts:3153-3720`) resolves the target, sets
`postSelectionContext` (`:3164`, `:3219`), executes the child, resolves the
run-correlated artifact (`:3355`), handles refusal/exit/timeout (`:3325-3419`),
corroborates the target (`:3420`), validates `generatedAt` (`:3517-3547`),
parses the verdict under its own guard (`:3550-3587`), then corroborates the
invocation, checks the invocation marker, applies the threshold, builds the
handoff, and writes the result (`:3593-3667`). Every throw after `:3587`
reaches the catch at `:3684` with no artifact in hand.

`ReviewGateTerminalStatus` (`:228-235`) has six values that the docs and
`skills.test.ts` pin. `outcome` is a per-writer string literal. Recovery must
therefore reuse `ok`/`blocked` and add fields, never a status.

## Implementation steps

### 1. Label the post-selection sub-steps

In `index.ts:3164-3172` widen `postSelectionContext` with
`step: PostSelectionStep` (new union: `target-dispatch`, `artifact-scan`,
`artifact-correlation`, `artifact-validation`, `verdict-parse`,
`invocation-corroboration`, `verdict-disposition`) and
`artifact?: { path; generatedAt; containingProject }`. Assign `step` before
each segment and set `artifact` immediately after `resolveRunCorrelatedReviewArtifact`
succeeds.

**Verify:** `pnpm exec vitest run src/commands/gate/index.test.ts` → the two
existing unexpected-failure cases still pass.

### 2. Name the failing sub-step in the envelope

Extend `writeReviewGateUnexpectedFailure` (`index.ts:2594`) to include
`postSelection: { step, code }` in JSON (code from the error's `code` or its
constructor name) and append `(post-selection step: <step>)` to the human
error line. Keep `status` and `outcome` unchanged.

**Verify:** same command; the three existing cases assert the new field and
the `:6640` case still yields `review_failed`.

### 3. Recover a validating committed artifact

In the catch (`index.ts:3684-3700`), when `postSelectionContext.artifact` is
set: re-run `dependencies.parseReviewGateVerdict`, `corroborateGateInvocation`,
and `reviewBlocksAtThreshold`; on success call `writeReviewGateResult` with the
real `ok`/`blocked` status, `receiveEligible: true`, a built handoff, and the
additive `postSelectionRecovery: true`; set `projectLogFinalization.status` and
`exitCode` accordingly. On any failure fall through to step 2's envelope with
the sub-step named. Never re-dispatch.

**Verify:** `pnpm exec vitest run src/commands/gate/index.test.ts -t 'post-selection'`
→ recovery cases pass.

### 4. Lock the preserved contracts

Add assertions that recovered envelopes keep the handoff and eligibility
shape, and that `artifact_missing` and `targeting_correlation_failed`
envelopes are byte-identical to today.

**Verify:** `pnpm exec vitest run src/commands/gate/configured-gate.integration.test.ts src/commands/gate/gate-hardening.integration.test.ts` → pass.

### 5. Document, decide, and bump

Add the recovery paragraph and status-table entry to `workflow-gates.md`
(`:293-316`) and an incident-to-regression row (`:800-809`); add one clause to
`cli-reference.md:145` (the `oat gate review` bullet) without disturbing the regex-pinned `artifact_missing`
sentence. Record the additive-field decision: Before writing the record, run `oat pjm doctor --json` and require `adoption.state` of `declared` or `inferred-legacy` (STOP otherwise), read `.oat/repo/reference/decisions/AGENTS.md`, create it with `oat decision new`, and run `oat decision regenerate-index`. Bump the
five lockstep packages above fresh `origin/main`.

**Verify:** `pnpm check` and `pnpm exec vitest run src/validation/skills.test.ts` → pass.

### 6. Run the definition-of-done gates

Run the eight AGENTS.md gates in order with captured exit codes; fetch
`origin/main` immediately before `pnpm release:check-versions`.

**Verify:** every gate exits 0.

## Test plan

Pattern: `it('retains selected gate provenance on post-selection review filesystem errors')`
at `index.test.ts:5984` (poisoned `reviews` path) and the
`parseReviewGateVerdict` override at `:4806-4811`.

- `recovers a committed passing artifact when post-selection corroboration throws`
  → `status: 'ok'`, `receiveEligible: true`, handoff present,
  `postSelectionRecovery: true`, exit 0.
- `recovers a committed blocking artifact` → `status: 'blocked'`, exit 1.
- `names the failing post-selection sub-step when no artifact exists` →
  `postSelection.step: 'artifact-scan'`.
- `keeps review_failed when the committed artifact does not validate` →
  `postSelection.step: 'verdict-parse'` with the validation cause.
- `preserves the artifact_missing envelope` → byte-equal to the `:4698` and
  `:7915` expectations.
- `records the recovered disposition in the project log` → `status=ok` in the
  appended body (`:4816-4838` pattern).
- Full CLI suite, build, release validation, docs build.

## Done criteria

- [ ] A validating committed artifact is returned with its real disposition
      when post-selection work throws; no reviewer re-dispatch occurs.
- [ ] Every `review_failed` envelope names `postSelection.step` and `code`.
- [ ] The six terminal statuses and the PR #246 envelopes are unchanged.
- [ ] Docs describe recovery-by-revalidation; `skills.test.ts` still passes.
- [ ] Decision record added; five-package lockstep bump and all gates pass.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- recovery appears to need a seventh terminal status or a new `outcome` that
  the docs and `skills.test.ts` would have to un-pin;
- a design requires re-dispatching the reviewer instead of re-validating;
- the `artifact_missing` or `targeting_correlation_failed` contracts would
  change in shape or wording;
- the change would touch ledger-event identity or receive consumption owned by
  `BL-260820-bind-each-gate-review`;
- PR #190 merged first and `runReviewGate` no longer has the shapes cited
  above (refresh this plan before editing); or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #232, the
decision records above, and the gate tests when substantial time passes, main
advances materially from `49aeb5075971180b48c131bbd2b21b82d455bfc9`, PR #190
or the `review-gate-integrity` design lands, cited contracts change, another
PR implements part of the outcome, or a load-bearing claim cannot be
reproduced. Apply the landing-event table above for the two named events.

## Review focus

- The recovery path must reuse the existing validation and corroboration
  functions unchanged; no duplicated verdict logic.
- Envelope additions are purely additive; existing consumers keyed on
  `status` and `outcome` are unaffected.
- The project-log finalization records the recovered disposition, not the
  transient failure.
