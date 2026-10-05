---
oat_triage_record: true
schema_version: 1
status: pr_open
scope: Ten untriaged open GitHub issues (#339–#341, #343–#349)
baseline_sha: be168345ef4f586731c13fe849da03eb87b526ec
triage_pr: https://github.com/voxmedia/open-agent-toolkit/pull/352
created: 2026-10-02
updated: 2026-10-03
---

# Untriaged open issues (2026-10-02)

## Scope and exclusions

- User selected untriaged open issues on 2026-10-02. Exact snapshot: #339, #340, #341, #343, #344, #345, #346, #347, #348, #349.
- All ten are OPEN with no labels or comments at retrieval. Excluded: 27 open issues with a disposition label; no resolution sweep or implementation is authorized.
- Private downstream artifacts and timing/count anecdotes are not public evidence and are not reproduced here.
- Related backlog references and linked PR history were verified per row before proposing actions.

## Evidence baseline

- 2026-10-03 pre-rebase refresh: all ten issues remain OPEN with no labels or comments; PR #351 remains OPEN/unmerged; fetched main has no changes in the relevant paths since the evidence baseline.
- Fetched origin/main: `be168345ef4f586731c13fe849da03eb87b526ec`; dedicated worktree HEAD verified equal before this record was created.
- Worktree: `/Users/tstang/Code/open-agent-toolkit/.worktrees/triage-2026-10-02`; branch: `triage/2026-10-02-untriaged-issues`; execution host: `tstang-mini.local`.
- GitHub CLI authenticated as tkstang; origin points to voxmedia/open-agent-toolkit.
- `pnpm run worktree:init` passed (exit 0), including workspace build. Its generated sync-manifest version-only change was removed from triage scope.
- PJM adoption is declared. Doctor reports pre-existing completed-ledger path warnings; unrelated backlog repair is excluded.
- Three read-only skeptical-evaluator lanes seek disconfirming evidence first for all ten claims. Root verifies load-bearing conclusions. Tests/source/history and active/archived backlog coverage are checked at this baseline.

- Direct existing-suite runs (no Turbo replay): 86 CLI verdict/archive tests, 35 control-plane parser tests, and one correlated-gate integration test passed. These cover existing contracts but do not cover all reported shapes.
- Root reran all four disposable CLI probes: overcount rejection/correct-list control, anchor rejection/plain-path control, structured/string blocker status, and archive staged-rename/removed-path staging failure. Exit 0; outcomes agree with source.
- Reproduction script and raw snapshot/logs are local ignored evidence at `.oat/repo/analysis/triage-2026-10-02/`; the script runs `node oat-triage-cli-probes.mjs` and changes disposable fixtures only. Public record retains the exact categorical outcomes and source references without private artifacts.

## Disposition ledger

All rows were approved by the user on 2026-10-03, including repository changes and exact post-merge GitHub actions. All ten issues remain open. Issue type is separate from the OAT `scope` field (idea/task/bug/feature/initiative). Add `bug` to #339, #341, #345, #347, #348 and #349; add `enhancement` to #340, #343, #344 and #346. #349 is a current contradictory-instructions defect; resumable phase/group batching is the selected policy. After merge, also add `tracked-in-backlog` to each; remove no labels, change no titles, and close none. Comment text below is exact: all backlog URLs and the triage PR URL are resolved. No issue mutations occur before merge.

| Issue | Issue type  | Verification                                                                      | Backlog action and exact title                                                                 | Priority / scope / size | GitHub action after merge                               |
| ----- | ----------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------- |
| #339  | bug         | Confirmed but narrower than reported (high)                                       | create: Diagnose review finding overcounts and revalidate format-only repairs without relaunch | medium / bug / M        | Add bug, tracked-in-backlog; comment; keep open         |
| #340  | enhancement | Enhancement or UX improvement (high)                                              | create: Reassess Lite execution scope and preserve completed work on promotion                 | medium / feature / L    | Add enhancement, tracked-in-backlog; comment; keep open |
| #341  | bug         | Confirmed but narrower than reported (high)                                       | create: Enforce reconnaissance evidence and reconcile original-run review receipts             | medium / bug / M        | Add bug, tracked-in-backlog; comment; keep open         |
| #343  | enhancement | Enhancement or UX improvement; reported stop is intended behavior (high)          | create: Show autonomous hard-stop conditions and effective recovery limits at kickoff          | medium / task / S       | Add enhancement, tracked-in-backlog; comment; keep open |
| #344  | enhancement | Enhancement or UX improvement; partial existing coverage (high)                   | refine: Skip re-review for bookkeeping-only review findings                                    | urgent / feature / L    | Add enhancement, tracked-in-backlog; comment; keep open |
| #345  | bug         | Confirmed but narrower than reported (high)                                       | create: Persist separate review artifacts and validate plain-file ledger references            | medium / bug / M        | Add bug, tracked-in-backlog; comment; keep open         |
| #346  | enhancement | Enhancement or UX improvement; partial policy coverage (high)                     | create: Require proportional adversarial probes at changed review boundaries                   | medium / task / M       | Add enhancement, tracked-in-backlog; comment; keep open |
| #347  | bug         | Confirmed current defect (high)                                                   | create: Preserve documented structured blockers in project status output                       | medium / bug / S        | Add bug, tracked-in-backlog; comment; keep open         |
| #348  | bug         | Confirmed but narrower than reported (high)                                       | create: Leave backlog archive staging to callers and report complete result paths              | medium / bug / S        | Add bug, tracked-in-backlog; comment; keep open         |
| #349  | bug         | Confirmed but narrower than reported; cadence instructions conflict (medium-high) | create: Reconcile OAT tracking commit cadence with resumable phase/group batching              | medium / bug / M        | Add bug, tracked-in-backlog; comment; keep open         |

### GH-339 — Diagnose review finding overcounts and revalidate format-only repairs without relaunch

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/339; snapshot OPEN, no labels/comments. Issue timelines checked: no linked fixing PR; #339 links #344, #340/#341 have an external downstream reference not reproduced here.
- Issue type: `bug`; this classifies the problem independently of delivery scope.
- Claim: original issue title/body retained in GitHub; private retrospective observations are treated as reported evidence.
- Verification: **Confirmed but narrower than reported.** Baseline verdict parser counts column-zero detail bullets as findings; declared medium/low 2/3 becomes 6/6. Nested-list repair yields 2/3 and a nonblocking verdict. Existing reviewer template already shows correct nested detail examples. Public gate reruns allocate a fresh run and execute the reviewer; existing same-run recovery uses an immutable snapshot and cannot accept a post-exit rewrite.
- Confidence: high for current public mechanism/policy; private runtime anecdote unverified.
- Evidence: packages/cli/src/commands/gate/review-verdict.ts:282,831; packages/cli/src/commands/gate/index.ts:4073,4226,4519,4774; .agents/agents/oat-reviewer.md:438. Merged PR #309 established list-item requirements but did not add post-exit revalidation.
- Existing coverage: BL-260711-skip-re-review-for-bookkeeping — Skip re-review for bookkeeping-only review findings covers shared policy, not this parser or artifact-only CLI entry point. No exact active/archived implementation owner.
- Proposed GitHub action: after merge, add `bug` and `tracked-in-backlog`, remove none, post the exact comment below, retain OPEN. Do not auto-close via PR keywords.
- Backlog action: **create** “Diagnose review finding overcounts and revalidate format-only repairs without relaunch” — medium, bug, M. New ID is assigned by the supported backlog workflow after approval.
- Selected behavior / acceptance proposal: Diagnose overcounts and permit formatting-only original-run revalidation without relaunch. Preserve original artifact, semantic finding identities/counts, verdict, scope and run provenance. A repaired parser tally may correct the erroneous tally only with unchanged independently identifiable findings and agreement across all count sources; no source wins by precedence. Verify equivalence, rerun the exact validator, record recovery, and stop on ambiguity or substantive change.
- Priority and size rationale: Autonomous gate validation can stop a clean review; rerunning a provider review is an available but costly workaround, so medium priority. M because diagnostics, stable run identity, immutable evidence, revalidation and fixtures cross parser/orchestrator contracts.
- Implementation readiness: Policy settled; planning must define the finite repair grammar and equivalence verifier.
- Approval: approved by the user on 2026-10-03; repository changes and the exact deferred post-merge GitHub actions are authorized.
- Applied backlog reference: [BL-261003-diagnose-review-finding — Diagnose review finding overcounts and revalidate format-only repairs without relaunch](../backlog/items/BL-261003-diagnose-review-finding.md).
- Post-merge result: not started; issue mutations remain deferred until merge.

Proposed post-merge comment:

> Confirmed on current main: bold titles with unindented detail bullets produce a 6/6 section tally against declared 2/3. Correct nesting preserves 2/3. The current hint describes the undercount case; a public rerun starts a new reviewer run, while same-run recovery checks an immutable snapshot. The reviewer template already contains nested-list examples. Track focused diagnostics and artifact-only revalidation in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261003-diagnose-review-finding.md, with recovery authority coordinated with #344/#233. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/352.

### GH-340 — Reassess Lite execution scope and preserve completed work on promotion

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/340; snapshot OPEN, no labels/comments. Issue timelines checked: no linked fixing PR; #339 links #344, #340/#341 have an external downstream reference not reproduced here.
- Issue type: `enhancement`; this classifies the problem independently of delivery scope.
- Claim: original issue title/body retained in GitHub; private retrospective observations are treated as reported evidence.
- Verification: **Enhancement or UX improvement.** Lite startup promotion is mandatory already. Missing: a persisted execution envelope and reassessment during implementation growth. Current planning-oriented promotion archives the Lite plan and scaffolds a Quick plan; it does not prove conservation of partially completed task identities.
- Confidence: high for current public mechanism/policy; private runtime anecdote unverified.
- Evidence: .agents/skills/oat-project-lite/SKILL.md:291; .agents/docs/autonomy-contract.md:123; .oat/templates/plan-lite.md:21; packages/cli/src/commands/project/promote/promote.ts:286,439; promote.test.ts:406. Merged PR #264 delivered planning promotion. PR #351, now merged, covers budget exhaustion rather than general proactive growth.
- Existing coverage: No matching active/archived backlog item. Complexity-review-at-exhaustion work is related, not execution-envelope reassessment.
- Proposed GitHub action: after merge, add `enhancement` and `tracked-in-backlog`, remove none, post the exact comment below, retain OPEN. Do not auto-close via PR keywords.
- Backlog action: **create** “Reassess Lite execution scope and preserve completed work on promotion” — medium, feature, L. New ID is assigned by the supported backlog workflow after approval.
- Selected behavior / acceptance proposal: Persist an execution estimate and reassess on material requirement/dependency growth, repeated recovery, or remaining work that threatens the agreed single-sitting scope. Offer Quick promotion interactively; autonomous promotion requires explicit kickoff authority and verified preservation of completed task identities, commits, review history, remaining work and mandatory gates. No elapsed-time-only promotion, restart, or automatic spec generation. Preserve completed Lite review obligations without replaying Quick phase reviews retroactively; apply Quick reviews to new work and require final review over the full range. An explicit recorded promotion grant remains valid on resume within its authorized scope; it does not automatically activate autonomous execution.
- Priority and size rationale: Growing execution can defeat the single-sitting promise; initial promotion already limits impact. L because mid-execution promotion must preserve tasks, completed history, identities, review protections and resume routing across modes.
- Implementation readiness: Policy settled; focused technical design remains for conservation-safe mid-execution promotion and resume routing.
- Approval: approved by the user on 2026-10-03; repository changes and the exact deferred post-merge GitHub actions are authorized.
- Applied backlog reference: [BL-261003-reassess-lite-execution-scope — Reassess Lite execution scope and preserve completed work on promotion](../backlog/items/BL-261003-reassess-lite-execution-scope.md).
- Post-merge result: not started; issue mutations remain deferred until merge.

Proposed post-merge comment:

> Lite already requires startup promotion when its authored plan cannot fit one sitting. Track scope-growth reassessment and conservation-safe mid-execution promotion in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261003-reassess-lite-execution-scope.md. Interactive promotion requires confirmation; autonomous promotion requires explicit kickoff authority and verified preservation of completed tasks, commits, reviews and remaining work. Preserve completed Lite reviews; apply Quick reviews to new work and require a final full-range review. A recorded promotion grant survives resume within its explicit scope without enabling autonomy. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/352.

### GH-341 — Enforce reconnaissance evidence and reconcile original-run review receipts

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/341; snapshot OPEN, no labels/comments. Issue timelines checked: no linked fixing PR; #339 links #344, #340/#341 have an external downstream reference not reproduced here.
- Issue type: `bug`; this classifies the problem independently of delivery scope.
- Claim: original issue title/body retained in GitHub; private retrospective observations are treated as reported evidence.
- Verification: **Confirmed but narrower than reported.** Review-provide requires exactly one attempted/not-attempted recon signal, but gate result payload and machine validation omit it. Existing correlated-gate integration accepts a fake-runtime artifact and receiveEligible=true without a recon signal. Actual private callback incident was not reproduced.
- Confidence: high for current public mechanism/policy; private runtime anecdote unverified.
- Evidence: .agents/skills/oat-project-review-provide/SKILL.md:1092; packages/cli/src/commands/gate/index.ts:2611; packages/cli/src/commands/gate/**fixtures**/fake-runtime.mjs:57; configured-gate.integration.test.ts:225. Focused existing integration: 1 passed, 2 skipped.
- Existing coverage: BL-260820-emit-source-qualified — Emit source-qualified provenance envelopes for review and gate receipts owns the broader versioned producer schema. Create a linked defect slice for recon validation and original-run reconciliation; preserve that owner's feature scope, priority and size. #295 owns pre-launch envelopes; BL-260927-give-gate-receipts-portable owns portability.
- Proposed GitHub action: after merge, add `bug` and `tracked-in-backlog`, remove none, post the exact comment below, retain OPEN. Do not auto-close via PR keywords.
- Backlog action: **create** “Enforce reconnaissance evidence and reconcile original-run review receipts” — medium, bug, M. Link the broader envelope owner without changing its scope or acceptance criteria.
- Selected behavior / acceptance proposal: Enforce the existing optional-delegation contract: exactly one attempted/not-attempted signal and complete orchestration evidence when attempted; no new mandatory skip reason or mandatory delegation. Reject absent or contradictory evidence. Permit idempotent reconciliation under the original run ID only from evidence already recorded by that run, preserving timing and attempt history and run/project/target correlation. Missing original evidence remains blocked; do not invent retrospective evidence or a reviewer pass.
- Priority and size rationale: Medium: required orchestration evidence can be omitted from an eligible handoff, but delegation remains optional and missing evidence has a fail-closed workaround. M for durable producer signals, real-consumer validation and idempotent reconciliation. Broader schema adoption remains separate.
- Implementation readiness: Policy settled; planning must define terminal receipt schema, recorded-evidence sources and idempotent reconciliation.
- Approval: approved by the user on 2026-10-03; repository changes and the exact deferred post-merge GitHub actions are authorized.
- Applied backlog reference: [BL-261003-enforce-reconnaissance — Enforce reconnaissance evidence and reconcile original-run review receipts](../backlog/items/BL-261003-enforce-reconnaissance.md).
- Post-merge result: not started; issue mutations remain deferred until merge.

Proposed post-merge comment:

> Confirmed a machine-validation gap: optional delegated reconnaissance requires an attempted/not-attempted signal and supporting orchestration evidence when attempted, but the gate handoff can omit it. Track https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261003-enforce-reconnaissance.md with that existing contract and idempotent same-run reconciliation using only original recorded evidence, preserving timing and attempt history. Missing evidence remains blocked. #295 and #307 retain pre-launch and portability ownership. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/352.

### GH-343 — Show autonomous hard-stop conditions and effective recovery limits at kickoff

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/343; snapshot OPEN, no labels/comments. Issue timelines checked: no linked fixing PR; #339 links #344, #340/#341 have an external downstream reference not reproduced here.
- Issue type: `enhancement`; this classifies the problem independently of delivery scope.
- Claim: original issue title/body retained in GitHub; private retrospective observations are treated as reported evidence.
- Verification: **Enhancement or UX improvement; reported stop is intended behavior.** Failed recovery terminality is explicitly required and tested; remaining allowance covers separate eligible events and does not promise continuation after a failed correction. Kickoff does not require disclosure of every applicable hard stop.
- Confidence: high for current public mechanism/policy; private runtime anecdote unverified.
- Evidence: .agents/skills/oat-project-implement/references/phase-execution.md:613; .agents/agents/oat-phase-implementer.md:215; packages/cli/src/validation/skills.test.ts:4330; .agents/skills/oat-project-autonomous/SKILL.md:110,448. Merged PR #189 introduced terminality.
- Existing coverage: No matching active/archived disclosure item. Merged PR #351 does not change failed-attempt disposition.
- Proposed GitHub action: after merge, add `enhancement` and `tracked-in-backlog`, remove none, post the exact comment below, retain OPEN. Do not auto-close via PR keywords.
- Backlog action: **create** “Show autonomous hard-stop conditions and effective recovery limits at kickoff” — medium, task, S. New ID is assigned by the supported backlog workflow after approval.
- Selected behavior / acceptance proposal: Show effective limits and all applicable hard-stop conditions at kickoff from owning contracts; distinguish capacity from permission. Preserve terminal failed-attempt policy. A continue-after-failure policy remains a separate future choice.
- Priority and size rationale: Improves unattended-run expectations without broadening recovery authority. S: kickoff disclosure and contract tests; continuation policy is explicitly excluded.
- Implementation readiness: Bounded implementation for kickoff disclosure. Changed failed-recovery continuation policy is excluded and requires separate discussion.
- Approval: approved by the user on 2026-10-03; repository changes and the exact deferred post-merge GitHub actions are authorized.
- Applied backlog reference: [BL-261003-show-autonomous-hard-stop — Show autonomous hard-stop conditions and effective recovery limits at kickoff](../backlog/archived/BL-261003-show-autonomous-hard-stop.md).
- Post-merge result: not started; issue mutations remain deferred until merge.

Proposed post-merge comment:

> Confirmed as current documented behavior: a validated failed-attempt stops even when recovery allowance remains. This rule shipped in PR #189 and is pinned by contract tests. Tracking kickoff disclosure of effective limits and hard stops in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261003-show-autonomous-hard-stop.md, preserving existing terminal recovery behavior. A continue-after-failure policy remains a separate authorization decision; private overnight timing was not reproduced. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/352.

### GH-344 — Skip re-review for bookkeeping-only review findings

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/344; snapshot OPEN, no labels/comments. Issue timelines checked: no linked fixing PR; #339 links #344, #340/#341 have an external downstream reference not reproduced here.
- Issue type: `enhancement`; this classifies the problem independently of delivery scope.
- Claim: original issue title/body retained in GitHub; private retrospective observations are treated as reported evidence.
- Verification: **Enhancement or UX improvement; partial existing coverage.** Some bounded phase recovery and Lite canonicalization already exist. Invalid gate artifacts and PRFINAL-05 ledger failures remain explicit autonomous boundaries. Existing bookkeeping-only item lacks explicit standing authority and invalid-artifact normalization.
- Confidence: high for current public mechanism/policy; private runtime anecdote unverified.
- Evidence: .agents/docs/autonomy-contract.md:64,127,197; .agents/agents/oat-phase-implementer.md:167; .agents/skills/oat-project-pr-final/SKILL.md:423,682; .agents/skills/oat-project-review-provide/SKILL.md:455; BL-260711-skip-re-review-for-bookkeeping.md:54.
- Existing coverage: Refine BL-260711-skip-re-review-for-bookkeeping — Skip re-review for bookkeeping-only review findings; associated issue #233. Add authority/proof clauses; #339 and #345 retain concrete parser/ledger implementation ownership.
- Proposed GitHub action: after merge, add `enhancement` and `tracked-in-backlog`, remove none, post the exact comment below, retain OPEN. Do not auto-close via PR keywords.
- Backlog action: **refine** “Skip re-review for bookkeeping-only review findings” — urgent, feature, L. Retain existing priority/scope/size.
- Selected behavior / acceptance proposal: Grant bounded standing authority for defined, mechanically verified artifact-formatting repairs and unambiguous ledger/reference corrections to uniquely identifiable existing evidence. Preserve originals and canonical findings/counts, verdict, status, scope and provenance. Each repair category requires an equivalence verifier, exact-validator success, and a distinct recorded recovery. Reversibility alone is insufficient; ambiguity or failed repair stops execution under existing recovery limits. No fabricated reviewer pass or new reviewer evidence. Exclude workflow mode, phase, task identity, plan structure, review status changes and anchor stripping from bookkeeping repair. Bind reference corrections to the same scope/type/run evidence, including archived files; filename uniqueness alone is insufficient.
- Priority and size rationale: Retain existing urgent/feature/L. Shared lifecycle recovery policy prevents unnecessary human stops, while semantic ambiguity still blocks. Cross-skill operational-invalid-artifact recovery needs careful audit identity and guard coverage.
- Implementation readiness: Policy settled; focused technical design remains for category-specific equivalence verifiers and fail-closed recovery.
- Approval: approved by the user on 2026-10-03; repository changes and the exact deferred post-merge GitHub actions are authorized.
- Applied backlog reference: [BL-260711-skip-re-review-for-bookkeeping — Skip re-review for bookkeeping-only review findings](../backlog/items/BL-260711-skip-re-review-for-bookkeeping.md).
- Post-merge result: not started; issue mutations remain deferred until merge.

Proposed post-merge comment:

> Refine the existing bookkeeping-only owner https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-260711-skip-re-review-for-bookkeeping.md (#233) with bounded standing authority for verified artifact formatting and unambiguous ledger/reference corrections. Preserve originals, findings/counts, verdict, status, scope and provenance; require category-specific equivalence proof, exact-validator success and a recorded recovery. Ambiguous or failed repairs stop; no reviewer pass may be fabricated. #339/#345 own concrete mechanisms. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/352.

### GH-345 — Persist separate review artifacts and validate plain-file ledger references

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/345; snapshot OPEN, no labels/comments. Issue timelines checked: no linked fixing PR; #339 links #344, #340/#341 have an external downstream reference not reproduced here.
- Issue type: `bug`; this classifies the problem independently of delivery scope.
- Claim: original issue title/body retained in GitHub; private retrospective observations are treated as reported evidence.
- Verification: **Confirmed but narrower than reported.** Verbatim PRFINAL-05 guard rejects implementation.md#plan-review despite an existing implementation.md; plain path and placeholder pass. Canonical artifact-mode reviewer writes reviews/{filename}.md; plan auto-review updates a row but does not define an inline evidence Artifact representation. A canonical writer emitting anchors was not publicly verified.
- Confidence: high for current public mechanism/policy; private runtime anecdote unverified.
- Evidence: .agents/skills/oat-project-pr-final/SKILL.md:423,583,665; .agents/skills/oat-project-plan-writing/SKILL.md:540,556; .agents/skills/oat-project-review-provide/SKILL.md:1138. Guard extracted verbatim and run only in disposable fixture.
- Existing coverage: BL-260908-tighten-the-pr-final-ledger — Tighten the pr-final ledger guard prose and escaped-pipe boundary does not cover fragments. #305/#194 own status/event authority, not reference syntax. No matching active/archived syntax owner.
- Proposed GitHub action: after merge, add `bug` and `tracked-in-backlog`, remove none, post the exact comment below, retain OPEN. Do not auto-close via PR keywords.
- Backlog action: **create** “Persist separate review artifacts and validate plain-file ledger references” — medium, bug, M.
- Selected behavior / acceptance proposal: Persist standalone durable review files under reviews/ and reference them with plain file paths, including planning reviews that return structured findings in memory. Align planning writers, templates, review ledger and PR-final guard. Validate file existence and allowed-path containment; do not silently strip anchors or invent evidence. Legacy inline references require explicit treatment during planning, with missing evidence remaining blocked. Persist each planning review attempt with its producer, output mode, reviewed target and attempt identity. Faithful parent persistence may support the originating planning-review consumer, but cannot upgrade that evidence to gate/code/final eligibility.
- Priority and size rationale: Medium: closeout can reject existing inline references and planning review evidence has no defined durable owner. M for structured producer/parent persistence, per-attempt identity, ledger writers, templates and safe PR-final consumer validation.
- Implementation readiness: Policy settled; bounded producer/template/validator alignment with explicit legacy-reference treatment.
- Approval: approved by the user on 2026-10-03; repository changes and the exact deferred post-merge GitHub actions are authorized.
- Applied backlog reference: [BL-261003-persist-separate-review — Persist separate review artifacts and validate plain-file ledger references](../backlog/items/BL-261003-persist-separate-review.md).
- Post-merge result: not started; issue mutations remain deferred until merge.

Proposed post-merge comment:

> Confirmed that PRFINAL-05 rejects implementation.md#section as a filename; a canonical anchor-producing writer was not verified. The selected contract requires separate durable review files and plain file references, including planning reviews returned in memory. Track writer/template/guard alignment and safe legacy-reference handling in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261003-persist-separate-review.md, preserving path containment and refusing to invent missing evidence. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/352.

### GH-346 — Require proportional adversarial probes at changed review boundaries

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/346; snapshot OPEN, no labels/comments. Issue timelines checked: no linked fixing PR; #339 links #344, #340/#341 have an external downstream reference not reproduced here.
- Issue type: `enhancement`; this classifies the problem independently of delivery scope.
- Claim: original issue title/body retained in GitHub; private retrospective observations are treated as reported evidence.
- Verification: **Enhancement or UX improvement; partial policy coverage.** Repository instructions already require negative controls for assurance contracts, and reviewers verify claims against code. Generic reviewer/gate guidance does not require enumeration and adversarial probing of each changed trust/size boundary. Private defect counts and method-versus-model hypothesis remain unverified.
- Confidence: high for current public mechanism/policy; private runtime anecdote unverified.
- Evidence: AGENTS.md Definition of Done assurance negative-control paragraph; .agents/agents/oat-reviewer.md:19,568; .agents/skills/oat-project-review-provide/SKILL.md review brief and review dispatch contract.
- Existing coverage: BL-261002-offer-a-strict-gate-reviewer — Offer a strict gate-reviewer independence mode and align gate skill wording and decision records owns family/runtime selection. Keep method improvement here and cross-link independence work; no exact adversarial-method item found.
- Proposed GitHub action: after merge, add `enhancement` and `tracked-in-backlog`, remove none, post the exact comment below, retain OPEN. Do not auto-close via PR keywords.
- Backlog action: **create** “Require proportional adversarial probes at changed review boundaries” — medium, task, M. New ID is assigned by the supported backlog workflow after approval.
- Selected behavior / acceptance proposal: Require focused applicable probes for changed trust and input-limit boundaries with credible failure modes. Record results or concrete execution limitations. Missing evidence for a consequential guarantee blocks acceptance; keep scope proportional and preserve containment and independent review. No broad testing campaign, new harness, or model-efficacy claim. Independently verified implementer probe evidence, including the recorded failure and accepted controls, may satisfy the obligation when the reviewer cannot execute the probe. Unsupported assertions remain insufficient; use the existing blocking-finding model for an unresolved consequential guarantee.
- Priority and size rationale: Missed boundary defects can be consequential, but reported relative effectiveness is not experimentally established. Medium adoption improvement; M to align reviewer role/prompts, scope limits, evidence records and meaningful guard tests.
- Implementation readiness: Policy settled; bounded review-guidance alignment and failure-oriented validation.
- Approval: approved by the user on 2026-10-03; repository changes and the exact deferred post-merge GitHub actions are authorized.
- Applied backlog reference: [BL-261003-require-proportional — Require proportional adversarial probes at changed review boundaries](../backlog/archived/BL-261003-require-proportional.md).
- Post-merge result: not started; issue mutations remain deferred until merge.

Proposed post-merge comment:

> Current policy requires negative controls for assurance contracts, but review prompts do not consistently enumerate and probe changed trust/input-limit boundaries. Track focused applicable probes and explicit limitations in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261003-require-proportional.md; missing evidence for a consequential guarantee blocks acceptance. Keep scope proportional. Reviewer family selection remains with the strict-independence owner; private method-efficacy anecdotes are unverified. Independently verified implementer failure/control evidence may satisfy the obligation when a reviewer cannot run the probe personally. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/352.

### GH-347 — Preserve documented structured blockers in project status output

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/347; snapshot OPEN, no labels/comments. Issue timelines checked: no linked fixing PR; #339 links #344, #340/#341 have an external downstream reference not reproduced here.
- Issue type: `bug`; this classifies the problem independently of delivery scope.
- Claim: original issue title/body retained in GitHub; private retrospective observations are treated as reported evidence.
- Verification: **Confirmed current defect.** Documented task_id/reason/since object enters shared parser through string normalization. Built CLI project status returns [object Object] for structured blocker; string control retains reason. Direct parser independently produces same mismatch.
- Confidence: high for current public mechanism/policy; private runtime anecdote unverified.
- Evidence: .agents/skills/oat-project-implement/references/completion-and-closeout.md:12; packages/control-plane/src/state/parser.ts:125,252; project status built CLI disposable fixture. Existing parser tests pass without documented structured fixture.
- Existing coverage: No matching active/archived item. BL-260927-derive-current-lifecycle-state — Derive current lifecycle state from one authority for review, phase, and completion owns freshness/authority rather than blocker serialization.
- Proposed GitHub action: after merge, add `bug` and `tracked-in-backlog`, remove none, post the exact comment below, retain OPEN. Do not auto-close via PR keywords.
- Backlog action: **create** “Preserve documented structured blockers in project status output” — medium, bug, S. New ID is assigned by the supported backlog workflow after approval.
- Selected behavior / acceptance proposal: Preserve task_id/reason/since in structured output; define compatibility for existing string blockers and human/status consumers; exercise documented real producer shape end to end.
- Priority and size rationale: Operator status loses actionable blocker reason, while state source remains a workaround. S because shared state types/parser/status and existing string consumers require compatible serialization and fixture coverage.
- Implementation readiness: Bounded implementation with compatible shared parser/output handling.
- Approval: approved by the user on 2026-10-03; repository changes and the exact deferred post-merge GitHub actions are authorized.
- Applied backlog reference: [BL-261003-preserve-documented-structured — Preserve documented structured blockers in project status output](../backlog/archived/BL-261003-preserve-documented-structured.md).
- Post-merge result: not started; issue mutations remain deferred until merge.

Proposed post-merge comment:

> Reproduced on the baseline build: a documented task_id/reason/since blocker becomes [object Object] in project status JSON; a string blocker retains its reason. The source state still contains the data. Track compatible shared-parser and status serialization in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261003-preserve-documented-structured.md, including the documented producer shape and string control. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/352.

### GH-348 — Leave backlog archive staging to callers and report complete result paths

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/348; snapshot OPEN, no labels/comments. Issue timelines checked: no linked fixing PR; #339 links #344, #340/#341 have an external downstream reference not reproduced here.
- Issue type: `bug`; this classifies the problem independently of delivery scope.
- Claim: original issue title/body retained in GitHub; private retrospective observations are treated as reported evidence.
- Verification: **Confirmed but narrower than reported.** Archive deliberately uses git mv with unstaged filesystem fallback, and config-and-local-state docs already name git mv. Successful JSON omits staging contract. Disposable git probe shows RM rename: staged rename retains pre-update content, with status/completed edits unstaged; git add old path exits 128. No real partial user commit reproduced.
- Confidence: high for current public mechanism/policy; private runtime anecdote unverified.
- Evidence: packages/cli/src/commands/backlog/archive.ts:180,328,343; archive.test.ts stages tracked item; .oat/repo/pjm/AGENTS.md Backlog Lifecycle. Merged PR #127 established archive behavior.
- Existing coverage: BL-260927-share-one-hook-safe-exact-path — Share one hook-safe exact-path commit primitive across CLI and skill lifecycle commits owns the L-sized commit primitive (#306/#312). Create a linked S-sized archive defect slice; retain the existing owner's feature scope, priority and size.
- Proposed GitHub action: after merge, add `bug` and `tracked-in-backlog`, remove none, post the exact comment below, retain OPEN. Do not auto-close via PR keywords.
- Backlog action: **create** “Leave backlog archive staging to callers and report complete result paths” — medium, bug, S. Link the broader exact-path primitive owner without absorbing or relabelling it.
- Selected behavior / acceptance proposal: Make archive staging caller-owned: the archive command changes files without staging and reports every affected source/destination, item, completed ledger, index and rewritten reference path. The lifecycle commit step stages the complete operation through the shared exact-path primitive, preserving unrelated staged changes and preventing partial commits after old-path failures.
- Priority and size rationale: Medium: unreported index side effects can lead to incomplete commits. S for removing command-owned staging, explicit complete-result paths and tracked/untracked item compatibility. The broader hook-safe commit primitive remains its existing L-sized owner.
- Implementation readiness: Archive slice is plan-ready; lifecycle commit integration retains the existing exact-path owner and must preserve unrelated staged work.
- Approval: approved by the user on 2026-10-03; repository changes and the exact deferred post-merge GitHub actions are authorized.
- Applied backlog reference: [BL-261003-leave-backlog-archive-staging — Leave backlog archive staging to callers and report complete result paths](../backlog/archived/BL-261003-leave-backlog-archive-staging.md).
- Post-merge result: not started; issue mutations remain deferred until merge.

Proposed post-merge comment:

> Archive intentionally uses git mv today, but a disposable probe shows a staged rename with follow-up content unstaged and failure when staging the removed path. The selected contract makes staging caller-owned: archive reports every affected path without staging, and the lifecycle commit step stages the complete operation while preserving unrelated staged work. Track this bounded archive defect in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261003-leave-backlog-archive-staging.md, linked to the broader exact-path owner (#306/#312); no downstream partial commit was inspected. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/352.

### GH-349 — Reconcile OAT tracking commit cadence with resumable phase/group batching

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/349; snapshot OPEN, no labels/comments. Issue timelines checked: no linked fixing PR; #339 links #344, #340/#341 have an external downstream reference not reproduced here.
- Issue type: `bug`; this classifies the problem independently of delivery scope.
- Claim: original issue title/body retained in GitHub; private retrospective observations are treated as reported evidence.
- Verification: **Confirmed but narrower than reported; cadence instructions conflict.** Top-level implementation skill mandates separate tracking after every code commit and prohibits batching. Detailed phase/group execution already batches phase task ledger and creates one group bookkeeping commit. The reported 127/266 private commit counts cannot be verified.
- Confidence: medium-high for current public mechanism/policy; private runtime anecdote unverified.
- Evidence: .agents/skills/oat-project-implement/SKILL.md:101; .agents/skills/oat-project-implement/references/phase-execution.md:886,903,910. Archived BL-260829-order-phase-bookkeeping-before covers pre-review baseline ordering, not general commit cadence.
- Existing coverage: No exact active/archived cadence owner. Related safe exact-path commit work owns commit correctness, not frequency; preserve its separate scope.
- Proposed GitHub action: after merge, add `bug` and `tracked-in-backlog`, remove none, post the exact comment below, retain OPEN. Do not auto-close via PR keywords.
- Backlog action: **create** “Reconcile OAT tracking commit cadence with resumable phase/group batching” — medium, bug, M. New ID is assigned by the supported backlog workflow after approval.
- Selected behavior / acceptance proposal: Keep source task commits separate, save task outcomes durably as work proceeds, and batch tracking commits at phase/group boundaries. Flush pending tracking before review/receive, PR publication, handoff, planned pause and closeout. Define resume reconciliation from saved outcomes and commit identities; preserve audit history and exact-path commit protections. No history rewrite or squash execution is authorized by triage. Guarantee process/session-crash recovery in a retained worktree using source commits and saved outcomes. Worktree-loss resilience is outside this item. Transfer worker outcomes before cleanup; reconcile after unplanned interruption without duplicate or lost task rows.
- Priority and size rationale: History/round-trip efficiency improvement with already available partial batching and unverified quantitative scale. Medium priority for contradictory standing instructions; M for consistent sequential/group policy, crash resume proof and review-boundary constraints.
- Implementation readiness: Cadence policy settled; planning must define durable task-outcome storage and crash/resume reconciliation.
- Approval: approved by the user on 2026-10-03; repository changes and the exact deferred post-merge GitHub actions are authorized.
- Applied backlog reference: [BL-261003-reconcile-oat-tracking-commit — Reconcile OAT tracking commit cadence with resumable phase/group batching](../backlog/items/BL-261003-reconcile-oat-tracking-commit.md).
- Post-merge result: not started; issue mutations remain deferred until merge.

Proposed post-merge comment:

> Current instructions conflict between per-code tracking commits and phase/group batching. Track resumable phase/group batching in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261003-reconcile-oat-tracking-commit.md: keep source task commits separate, save task outcomes as work proceeds, and flush tracking before reviews, PR publication, handoffs, pauses and closeout. Preserve audit history and crash/resume reconciliation. Private commit counts are unverified; exact-path correctness remains a separate owner. Recovery covers process/session crashes in the retained worktree; transfer worker outcomes before cleanup. Worktree-loss resilience is excluded. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/352.

## Interview decisions (2026-10-03)

The user selected the policies recorded in each row's acceptance proposal. These selections settle behavior. The user subsequently approved the complete disposition ledger, repository changes, triage PR and exact deferred post-merge GitHub actions on 2026-10-03.

- #339: Formatting-only repair and original-run revalidation with preserved original evidence and verified equivalence.
- #340: Scope/remaining-work reassessment; interactive promotion confirmation or explicit kickoff authority; verified conservation of completed work and reviews. Quick reviews apply to new work; final review covers the full range. Recorded grants survive resume within their explicit scope without enabling autonomy.
- #341: Enforce existing optional-delegation evidence and permit original-recorded-evidence-only same-run reconciliation.
- #343: Kickoff disclosure only; existing failed-recovery hard stop remains unchanged.
- #344: Standing authority for verified formatting and unambiguous bookkeeping/reference corrections; failed or ambiguous repair stops.
- #345: Separate durable review files with plain ledger paths, including planning reviews returned in memory.
- #346: Proportional risk-based probes, concrete limitations, and blocked acceptance for unverified consequential guarantees. Independently verified implementer failure/control evidence can satisfy the obligation when the reviewer cannot run the probe.
- #347: Preserve structured blockers and compatibility with strings; no additional policy choice was needed.
- #348: Caller owns staging the full archive result; the command reports every affected path.
- #349: Saved task outcomes, separate source commits, phase/group tracking commits and mandatory boundary flushes. Recovery covers a process/session crash in the retained worktree; worker outcomes transfer before cleanup. Worktree-loss recovery is excluded.

Independent second opinion completed: Claude Opus 5.5 at medium effort; result: aligned with qualifications. This is a policy/readiness review, not implementation approval or a code-review pass.

## Second opinion and root reconciliation

- Requested route: T3-owned Claude `claude-opus-5-5`, `effort: medium`, fast mode disabled. Completed read-only with no nested work. Review task: `oat-triage-20261003-opus55-medium-r1`.
- Opus agrees with all ten selected policies, with qualifications about packaging, boundary proofs and remaining choices. Root reopened the cited parser, gate, structured review, promotion and owner records; the substantive source concerns were confirmed. Full opinion is local ignored evidence at `.oat/repo/analysis/triage-2026-10-02/opus55-medium-second-opinion.md`.
- #339: No count source wins by precedence. Equivalence must establish unchanged independently identifiable findings and agreement across every count source. Matching a declared tally alone is insufficient. Evaluate pre-verdict normalization as prevention; retain the selected post-exit same-run recovery requirement. Existing normalization runs after count resolution, so extending it is engineering work, not proof that this defect is already handled.
- #341: Persist the explicit recon disposition in producer-owned durable evidence and validate real producer output with its consumer. No section is never evidence of not-attempted. Retain original-recorded-evidence reconciliation in scope; Opus's suggested deferral is not adopted. No measured omission-frequency claim supports prioritizing it away.
- #340: Do not equate a recorded, scoped user authorization with persisting autonomy environment flags. Opus recommends re-granting on every kickoff; the user selected retaining a still-valid scoped grant on resume while resolving autonomous activation separately.
- #344: Explicitly exclude workflow mode, phase, task identity, plan structure, review status changes and fragment stripping from bookkeeping repairs. A corrected reference must bind existing evidence of the same review scope/type/run, including archived files; filename uniqueness alone is insufficient. Preserve the existing owner and separate its finding-disposition and invalid-artifact-recovery slices in planning.
- #345: Persist each structured planning review attempt faithfully with producer, output mode, target and attempt identity. Parent persistence does not create an independent review and cannot upgrade planning evidence to gate/code/final eligibility. Root does not adopt a blanket exclusion from planning review consumption: that would conflict with the selected durable planning-evidence requirement. Legacy references need explicit identity-preserving treatment.
- #348/#349: Transfer worker task outcomes before any worktree cleanup. Exact-path source/archive commits must preserve pending root tracking files. Unplanned interruption requires resume reconciliation rather than an impossible last-moment flush.
- Proposal packaging: #341 and #348 become separate linked bug items so broad feature owners are not relabelled or silently expanded. #345 increases from S to M. The result is nine new items and one refinement; all actions were subsequently approved by the user on 2026-10-03.

### Follow-up choices resolved by the user

- #340: Preserve completed Lite reviews, apply Quick reviews to new work, require final full-range review, and retain a recorded promotion grant on resume within its explicit scope without enabling autonomy.
- #346: Independently verified implementer failure/control evidence may satisfy the review obligation when the reviewer cannot run the probe personally.
- #349: Guarantee crash/session recovery in a retained worktree; do not add a worktree-loss storage contract.

All ten issues are ready to enter planning with their selected behavior. #339, #340, #341, #344, #345 and #349 need focused technical design within planning; no further product interview is currently required. This does not authorize implementation or replace required plan approvals.

## Open concerns

- Bug-scoped items were created with the separately built `fix/bug-backlog-scope` CLI, using an explicit triage cwd. That supporting code is not included in this triage PR; all generated item scopes and estimates were verified.
- Nine proposed new backlog items and one refinement; no fixes, plans, unrelated reprioritization or delivery waves.
- #343 proposal is kickoff visibility only. A changed continuation policy requires a separate explicit decision; this ledger does not authorize it.
- #344 byte reversibility is necessary but insufficient; semantic/provenance equivalence and exact validator success are required. Concrete format work belongs to #339/#345.
- #340 is L because existing planning promotion does not prove preservation of partially implemented work.
- PR #351 was open at the evidence baseline and is now merged. This branch was rebased onto `4a85d2eda772ada5136376ca5d22f018a88df981`; the sole conflict was the backlog index. Both curated overview entries were preserved and its managed table regenerated. Original source citations and gate results remain qualified by the original evidence baseline.
- PJM doctor exit 1 reports existing completed-ledger path warnings while adoption remains declared. Those warnings are outside this run.

## Applied repository changes and validation

- Created the nine approved items and refined the existing bookkeeping-only recovery owner; each has its approved title, priority, scope, estimate, issue association and acceptance criteria. Broader feature owners retain their existing scopes.
- Before rebase, the regenerated index preserved all 129 baseline entries and added nine. After rebase onto merged PR #351, it preserves all 122 current-main entries and adds the same nine, for 131 total; current main’s archived-item removals and follow-ups are retained. All ten item identities, metadata, associations, acceptance content and links were verified.
- Staged scope: 12 files, all within the approved triage record and backlog. The existing completed-ledger warnings remain unchanged.
- Before rebase, gates ran in repository order; every exit code below was captured directly. No Turbo cache replay was observed. Logs remain in ignored local analysis. These checks validate the triage artifacts and baseline repository; they are not evidence that the proposed fixes have been implemented.

| Gate                          | Exit code |
| ----------------------------- | --------- |
| `pnpm check`                  | 0         |
| `pnpm type-check`             | 0         |
| `pnpm test`                   | 0         |
| `pnpm build`                  | 0         |
| `pnpm run check:skill-bumps`  | 0         |
| `pnpm release:check-versions` | 0         |
| `pnpm release:validate`       | 0         |
| `pnpm build:docs`             | 0         |

- Rebase validation: canonical index regeneration returned 131 entries and no warnings; current-main index rows and curated prose were conserved, all nine new entries remain, and formatting and conflict-marker checks passed. Per the user’s instruction, CI is not awaited before squash merge.

## Resume instructions

The approved repository changes are applied in [PR #352](https://github.com/voxmedia/open-agent-toolkit/pull/352). The PR-binding commit records this exact PR reference. Keep all issue mutations deferred until merge.

After PR #352 merges, invoke:

```text
/triage-oat-issues resume post-merge PR #352
```

On resume verify merged record and backlog links, re-read live issues, apply unchanged actions idempotently, and post completion receipt on the merged triage PR. Any changed action needs row-specific approval.
