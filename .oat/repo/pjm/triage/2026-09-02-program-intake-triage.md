---
oat_triage_record: true
schema_version: 1
status: pr_open
scope: nine new untriaged issues (#232-#234, #237-#239, #250-#252) plus the eleven rows left pending by the 2026-08-29 record
baseline_sha: 49aeb5075971180b48c131bbd2b21b82d455bfc9
triage_pr: 253
created: 2026-09-02
updated: 2026-09-02
---

# Program-intake triage: new issues and pending 2026-08-29 rows

## Scope and exclusions

- In scope: every open GitHub issue without a completed disposition label as of
  2026-09-02: #199, #204, #205, #206, #207, #209, #210, #213, #214, #228, #230,
  #232, #233, #234, #237, #238, #239, #250, #251, #252.
- Excluded: issues already carrying `tracked-in-backlog` or `needs-reproduction`
  (#194, #197, #200-#203, #211).
- This record supersedes the disposition ledger in
  [2026-08-29-untriaged-oat-issues.md](./2026-08-29-untriaged-oat-issues.md),
  which merged in PR #244 with every approval pending and no post-merge action
  applied. Its verified evidence was re-checked against the current baseline
  and reused where unchanged.
- Branch note: this run was performed on the planning branch behind PR #253
  rather than a fresh branch from `origin/main`. That branch contained only
  docs-only PJM commits on top of the baseline, so the merge base and
  reviewability requirements hold; the record binds to PR #253.
- Purpose: decide which items enter the backlog-review execution program.
  Program placement is recorded in the plan index and execution program, not
  here.

## Evidence baseline

- `origin/main` at `49aeb5075971180b48c131bbd2b21b82d455bfc9` (PR #254),
  fetched 2026-09-02.
- GitHub read through `gh` (authenticated). Backlog searched across
  `items/` and `archived/`; project state read for
  `review-gate-integrity`, `review-plan-workflow`, and the in-flight
  `tool-pack-scope-provider-truthfulness` branch (`27b978528`, read-only).
- Skeptic pass performed inline (disprove-then-support) for each material
  claim; the evaluator subagent was not dispatched for this bounded set.

## Disposition ledger

### GH-232 — `oat gate review` returns `review_failed` for a committed valid artifact

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/232
- Claim: `oat gate review` returns `review_failed` for a committed valid artifact.
- Verification: Confirmed current defect.
- Confidence: 95%.
- Evidence: `packages/cli/src/commands/gate/index.ts:2595-2612` (`writeReviewGateUnexpectedFailure`) emits `status: review_failed`, `outcome: unexpected_post_selection_failure` with only a message; the caller passes `artifactPath: null` at `:2696`; no sub-step name and no committed-artifact recovery exist. PR #246 added corroborated structured outcomes but not this recovery.
- Existing coverage: None. `BL-260820-emit-source-qualified` and `BL-260711-add-activity-aware-gate` mention corroboration without owning this path.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`; comment linking the item and PR #253.
- Backlog action: Created `BL-260902-recover-committed-review` (high / task / M) as a `review-gate-integrity` child.
- Priority and size rationale: High because autonomous runs loop or stop on a false blocker; M because the fix spans envelope schema, recovery logic, contract prose, and focused tests.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-233 — Classify review findings as content vs bookkeeping

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/233
- Claim: Classify review findings as content vs bookkeeping.
- Verification: Duplicate or already covered.
- Confidence: 98%.
- Evidence: `BL-260711-skip-re-review-for-bookkeeping` (urgent / feature / L) defines the bookkeeping-only disposition and is owned by the `review-gate-integrity` project.
- Existing coverage: Full coverage by `BL-260711`.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`; comment linking `BL-260711` and the project.
- Backlog action: Linked #233 on `BL-260711-skip-re-review-for-bookkeeping`; no new item.
- Priority and size rationale: Not applicable.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-234 — Patch-and-restore recovery when a child handle is lost with staged work

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/234
- Claim: Patch-and-restore recovery when a child handle is lost with staged work.
- Verification: Confirmed guidance gap.
- Confidence: 92%.
- Evidence: `.agents/skills/oat-project-implement/references/phase-execution.md:206` covers only an unchanged same-target continuation when the handle is unavailable; no clause addresses staged uncommitted work, and dirty-tree language elsewhere (`:259-267`, `:310`, `:440`) treats dirt as a terminal stop rather than a recoverable state.
- Existing coverage: None.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Created `BL-260902-document-patch-and-restore` (medium / task / S).
- Priority and size rationale: Medium because a workaround exists by hand; S because it is skill prose, a brief-template field, and one contract assertion.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-237 — Test-only descendants force a full implement exit-gate generation

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/237
- Claim: Test-only descendants force a full implement exit-gate generation.
- Verification: Enhancement requiring a policy decision.
- Confidence: 90%.
- Evidence: The issue records the observed behavior from the `synced-project-scope` closeout; `BL-260826-decide-whether-test-only-paths` covers version policy only and the issue itself lists it as not a duplicate.
- Existing coverage: None for gate freshness.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Created `BL-260902-decide-test-only-freshness` (medium / idea / S) labeled `needs-discussion`; excluded from planning until decided.
- Priority and size rationale: Idea scope because the mechanism choice is open; S for the decision record itself.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-238 — `oat pjm init` writes provider-view pointers into documentation content trees

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/238
- Claim: `oat pjm init` writes provider-view pointers into documentation content trees.
- Verification: Confirmed but narrower than reported.
- Confidence: 93%.
- Evidence: The doctor half is fixed: `packages/cli/src/commands/pjm/doctor.ts:28,36` now accept `CLAUDE.md` as a valid generated pointer (PR #244). Pointer placement is unchanged: no `documentation` docs-directory exclusion exists in `pjm/init.ts` or `shared/agents-md.ts`.
- Existing coverage: None for placement.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`; comment crediting PR #244 for the doctor half and noting that the writer is `oat instructions sync` (`pjm init` only prints the hint).
- Backlog action: Created `BL-260902-keep-pjm-init-provider` (medium / task / M), retitled during plan reconnaissance to "Keep instruction-sync pointer files out of documentation content trees" because `oat instructions sync`, not `oat pjm init`, writes the pointers.
- Priority and size rationale: Medium because affected repositories can delete the pointers; M because placement policy, opt-out config, fixture tests, and docs are all involved.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-239 — `oat docs generate-index` has no exclusion mechanism

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/239
- Claim: `oat docs generate-index` has no exclusion mechanism.
- Verification: Confirmed enhancement.
- Confidence: 97%.
- Evidence: The command exposes only `--docs-dir` and `--output`; the W1 external plan `2026-08-30-use-configured-docs-index-paths.md:124` explicitly scopes exclusions out.
- Existing coverage: None.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Created `BL-260902-add-an-exclusion-mechanism` (medium / feature / S).
- Priority and size rationale: S because it is one command option plus a config key and focused tests on an existing seam.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-250 — Make consolidated-project retirement checks semantic

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/250
- Claim: Make consolidated-project retirement checks semantic.
- Verification: Confirmed guidance gap.
- Confidence: 90%.
- Evidence: No consolidation, superseded, or retirement-sweep guidance exists in `oat-project-quick-start`, `oat-project-new`, or `oat-project-complete`; the only `retire` language is the synced-record retirement from PR #254.
- Existing coverage: None.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Created `BL-260902-make-consolidated-project` (medium / task / M).
- Priority and size rationale: M because it touches consolidation records, a sweep procedure, and tests across two skills.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-251 — Define a retro receipt path after project-log sealing

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/251
- Claim: Define a retro receipt path after project-log sealing.
- Verification: Enhancement requiring a design decision.
- Confidence: 88%.
- Evidence: PR #254 made the completion seal the final `project-log.md` entry; `oat-project-retro` still expects to append a receipt when the log exists. Where the receipt lives is undecided.
- Existing coverage: Adjacent to #209/#210.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Folded into `BL-260902-append-only-lifecycle-history` as its third acceptance criterion; excluded from planning until the receipt location is designed.
- Priority and size rationale: Covered by the combined item rationale below.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-252 — Clear activeProject only after completion durability receipts exist

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/252
- Claim: Clear activeProject only after completion durability receipts exist.
- Verification: Confirmed but narrower than reported.
- Confidence: 94%.
- Evidence: `.agents/skills/oat-project-complete/SKILL.md:705-716` retains the pointer only for `synced && SHOULD_ARCHIVE` (PR #254) and clears it immediately for every other scope, before Step 8 runs `oat project archive` (`:954`). Synced resume and seal idempotency are delivered; shared/local archive completions remain exposed.
- Existing coverage: `BL-260831-retire-archived-synced-project` (archived) delivered the synced path.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`; comment crediting PR #254 for the synced path.
- Backlog action: Created `BL-260902-defer-activeproject-clearing` (medium / task / S).
- Priority and size rationale: S because the ordering change reuses the synced mechanism; medium because only interrupted non-synced archives are affected.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-199 — Make tracking helper references pack-integrity checked

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/199
- Claim: Make tracking helper references pack-integrity checked.
- Verification: Partially fixed; residual enhancement.
- Confidence: 99%.
- Evidence: Commit 4eed6fa7 fixed the reported reference; `skills-bundled-docs-contract.test.ts` still checks only `resolve-tracking.sh` and `bundle-consistency.test.ts` does not enumerate every skill-declared script path.
- Existing coverage: None for the general check.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Created `BL-260902-validate-every-shipped-skill` (high / task / M).
- Priority and size rationale: High because a miss silently ships a broken bundled workflow; M for syntax-aware extraction, owning-pack diagnostics, fixtures, and a mutation proof.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-204 — Make project-recap fact projection artifact-driven

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/204
- Claim: Make project-recap fact projection artifact-driven.
- Verification: Downstream or private integration defect.
- Confidence: 90%.
- Evidence: The public fact-base (`.agents/skills/explainer-kit/scripts/lib/fact-base.mjs`) uses semantic claim IDs; the reported failure came from stale downstream tooling and no public reproduction exists (2026-08-29 record, re-confirmed unchanged).
- Existing coverage: None by design.
- Proposed GitHub action: Add `invalid` with a public-safe comment explaining the stale-tooling finding; close.
- Backlog action: None.
- Priority and size rationale: Not applicable.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-205 — Make discovery knowledge-index policy configurable and documentation-aware

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/205
- Claim: Make discovery knowledge-index policy configurable and documentation-aware.
- Verification: Confirmed enhancement, already covered.
- Confidence: 97%.
- Evidence: `BL-260830-make-documentation-aware` (medium / feature / M) was promoted in PR #244 and cites #205.
- Existing coverage: Full coverage.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`; comment linking the item.
- Backlog action: Linked #205 on `BL-260830-make-documentation-aware`.
- Priority and size rationale: Not applicable.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-206 — Make review continuation ranges self-validating

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/206
- Claim: Make review continuation ranges self-validating.
- Verification: Confirmed residual gap, ReviewPlan-owned.
- Confidence: 92%.
- Evidence: Remote narrowing already rejects abbreviated heads (`packages/cli/src/review-remote/narrowing.ts:198-257`); generic continuation-range normalization and persistence remain open under draft PR #190.
- Existing coverage: `BL-260729-implement-reviewplan-first`.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Appended a continuation-range acceptance criterion and the #206 link to `BL-260729-implement-reviewplan-first`.
- Priority and size rationale: Inherits the parent item (high / feature / L).
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-207 — Add a consolidated scope decision at the review cap

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/207
- Claim: Add a consolidated scope decision at the review cap.
- Verification: Confirmed enhancement.
- Confidence: 89%.
- Evidence: The review loop retries bounded rounds without a cumulative classification (`oat-project-implement/references/phase-execution.md`, review-cap section).
- Existing coverage: `BL-260818-distinguish-operator-directed` is the adjacent owner.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Appended a consolidated cap-decision criterion and the #207 link to `BL-260818-distinguish-operator-directed`.
- Priority and size rationale: Inherits the parent item.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-209 — Retro should preserve or add to a finished retro

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/209
- Claim: Retro should preserve or add to a finished retro.
- Verification: Confirmed lifecycle-history defect.
- Confidence: 91%.
- Evidence: `oat-project-retro/SKILL.md` regenerates `references/project-retro.md`; no preservation or addendum contract exists.
- Existing coverage: None before this run.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Created `BL-260902-append-only-lifecycle-history` (medium / feature / M) covering #209, #210, and #251.
- Priority and size rationale: M because retro, project-log append, and receipt persistence rules span two skills and the CLI log command; medium because each has a manual workaround.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-210 — Lifecycle complete should not freeze the project log

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/210
- Claim: Lifecycle complete should not freeze the project log.
- Verification: Confirmed defect, narrower than reported.
- Confidence: 94%.
- Evidence: `packages/cli/src/commands/project/log/append.ts` has no valid post-completion target; PR #254 additionally requires the completion seal to remain the final entry.
- Existing coverage: None before this run.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Covered by `BL-260902-append-only-lifecycle-history` with its own acceptance criterion.
- Priority and size rationale: See #209.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-213 — Gate project-log finalization vs transient Git index locks

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/213
- Claim: Gate project-log finalization vs transient Git index locks.
- Verification: Confirmed reliability defect.
- Confidence: 95%.
- Evidence: Gate finalization commits its own append (`packages/cli/src/commands/gate/index.test.ts:4890-4978` ownership tests) with no `index.lock` retry, classification, idempotency, or partial receipt.
- Existing coverage: `BL-260820-bind-each-gate-review` binds events, not Git finalization.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Created `BL-260902-retry-gate-project-log` (high / task / M) as a `review-gate-integrity` child.
- Priority and size rationale: High because a transient lock converts a passing review into a failed gate; M for retry, classification, idempotency, receipt, and simulated-lock tests.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-214 — Allow passing-gate receive to file deferred follow-ups

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/214
- Claim: Allow passing-gate receive to file deferred follow-ups.
- Verification: Confirmed enhancement.
- Confidence: 91%.
- Evidence: `oat-project-review-receive/SKILL.md` updates review rows without a follow-up filing disposition; retro filing config is separate.
- Existing coverage: None before this run.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Created `BL-260902-file-deferred-repository` (medium / feature / M) as a `review-gate-integrity` child; excluded from planning until the receipt schema settles after ReviewPlan.
- Priority and size rationale: M because filing must preserve receipt identity and be idempotent.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-228 — User-scope packs misreport placement and do not project agents

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/228
- Claim: User-scope packs misreport placement and do not project agents.
- Verification: Confirmed, already covered.
- Confidence: 96%.
- Evidence: `BL-260829-make-tool-pack-scope-selection` (urgent / feature / L) owns it and the `tool-pack-scope-provider-truthfulness` project is at its release task.
- Existing coverage: Full coverage.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`; comment linking the item and project. Close only when the truthfulness PR merges and the item is archived.
- Backlog action: Linked #228 on `BL-260829-make-tool-pack-scope-selection`.
- Priority and size rationale: Not applicable.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

### GH-230 — Implementation-tail project recap cannot run unattended on a fresh machine

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/230
- Claim: Implementation-tail project recap cannot run unattended on a fresh machine.
- Verification: Confirmed narrower policy defect.
- Confidence: 94%.
- Evidence: `workflow.explainers.projectRecap` exists (`oat-config.ts:168-173`, default `ask` in `resolve.ts:132-135`) so the no-config premise is stale; autonomous mode still forces generation (`oat-explainer-kit/references/lifecycle-contract.md:21`) and requires browser and visual-critic seams (`:121`).
- Existing coverage: `BL-260727-make-explainer-run-durability` and `BL-260817-run-the-rc-explainer-end` cover different boundaries.
- Proposed GitHub action: Keep open; add `tracked-in-backlog`.
- Backlog action: Created `BL-260902-make-autonomous-project-recap` (high / task / M).
- Priority and size rationale: High because it blocks autonomous closeout; M because it needs a capability probe, a recorded skip policy, receipt shape, and tests.
- Approval: Approved by the operator in session on 2026-09-02 as one consolidated set.
- Post-merge result: Pending.

## Open concerns

- #204 closes as `invalid`; if the reporter later supplies a public
  reproduction against current tooling, reopen rather than argue in the thread.
- #228 stays open until the `tool-pack-scope-provider-truthfulness` PR merges;
  its comment should say so explicitly.
- #237 and #251 are decision-gated; their backlog records carry
  `needs-discussion` semantics and must not be planned until decided.

## Resume instructions

After PR #253 merges, invoke:

```text
/triage-oat-issues resume post-merge PR #253
```

Apply the labels and comments above idempotently, close #204 with the
stale-tooling rationale, and post a completion receipt on PR #253.
