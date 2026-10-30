---
oat_triage_record: true
schema_version: 1
status: pr_open
scope: Seven untriaged open GitHub issues (#353, #354, #355, #360, #383, #384, #385)
baseline_sha: 3f425e7f35702e78b8460543599c9c18b7a82e78
triage_pr: https://github.com/voxmedia/open-agent-toolkit/pull/388
created: 2026-10-30
updated: 2026-10-30
---

# Untriaged open issues (2026-10-30)

## Scope and exclusions

- Invocation: bare `/triage-oat-issues`, resolved to the default population of open issues without a disposition label. Exact snapshot on 2026-10-30: #353, #354, #355, #360, #383, #384, #385.
- All seven are OPEN. #383, #384 and #385 carry `bug`; the others have no labels. Only #355 has a comment (an external agent offering a fix; no PR followed).
- Excluded: the 40 open issues that already carry `tracked-in-backlog`. No resolution sweep, implementation, plan or wave work is authorized.
- The reports for #383–#385 come from a downstream goal project on CLI 0.3.35; its private artifacts are not reproduced here.

## Evidence baseline

- Fetched `origin/main`: `3f425e7f35702e78b8460543599c9c18b7a82e78`; branch `chore/triage-oat-issues` HEAD verified equal and clean before this record was written.
- GitHub CLI authenticated as tkstang; origin is voxmedia/open-agent-toolkit.
- Open PRs checked: #357 explicitly leaves #355 out of scope; #358 and #179 match "360" only incidentally. No open or merged PR addresses any of the seven issues. No commit has touched `packages/cli/src/commands/project/delivery/` since the p12 series (#362).
- Three read-only skeptical-evaluator lanes sought disconfirming evidence first for all seven claims; root re-verified the load-bearing citations below at the baseline.
- Disposable probes ran in a scratch directory against the real source (with a scratch vitest config pointing control-plane at source, because `packages/control-plane/dist` is absent and building would have written into the worktree): a 3-layer linear stack carrier check, a milestone-versus-delivery evidence-scope comparison, and an in-place journal-line edit. Outcomes are recorded per row. The existing 98 delivery and journal-check tests pass at the baseline. The manifest two-sync probe was not run because `packages/cli/dist` is absent; that conclusion is source-inferred.
- The current backlog CLI accepts only `idea | task | feature | initiative` scopes (`packages/cli/src/commands/backlog/new.ts:24`). Issue type (`bug`/`enhancement`) is carried separately as a GitHub label.

## Disposition ledger

Approved by the user on 2026-10-30 as one set: repository changes, the triage PR, and the post-merge GitHub actions below. The user chose to make stacked deliveries a documented, supported shape (#383). The #385 label swap (`bug` → `enhancement`) is the only action still awaiting the user's choice; its other actions are approved. All seven issues remain open, and no issue mutation occurs before merge.

| Issue | Issue type  | Verification                                                    | Backlog action and exact title                                                                                  | Priority / scope / size     | GitHub action after merge                                      |
| ----- | ----------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------- |
| #383  | bug         | Confirmed but narrower than reported (high)                     | create: Evaluate stacked goal-delivery exit carriers against the stack tip                                      | medium / task / M           | Add tracked-in-backlog; comment; keep open                     |
| #384  | bug         | Confirmed current defect (medium-high)                          | create: Admit goal exit-gate review artifacts as milestone bookkeeping evidence                                 | medium / task / M           | Add tracked-in-backlog; comment; keep open                     |
| #385  | enhancement | Enhancement or UX improvement; facts confirmed (high)           | create: Flag rewritten committed journal lines in journal check                                                 | medium / task / S           | Add enhancement, tracked-in-backlog; remove bug; comment; open |
| #353  | enhancement | Enhancement or UX improvement (high)                            | create: Report gate project-log finalization in the terminal JSON envelope                                      | medium / feature / M        | Add enhancement, tracked-in-backlog; comment; keep open        |
| #355  | bug         | Confirmed current defect (high for the static ordering)         | create: Preflight knowledge-index mapper dispatch before replacing generated knowledge                          | medium / task / S           | Add bug, tracked-in-backlog; comment; keep open                |
| #360  | enhancement | Intended behavior; churn is CLI-version skew only (medium-high) | create: Decide whether a no-op sync should restamp the manifest oatVersion                                      | low / task / S              | Add enhancement, tracked-in-backlog; comment; keep open        |
| #354  | enhancement | Enhancement; overlaps an open owner (high)                      | refine: BL-260706-front-load-recurring-gate — Front-load recurring gate-finding classes into implementer briefs | retain medium / feature / L | Add enhancement, tracked-in-backlog; comment; keep open        |

### GH-383 — Evaluate stacked goal-delivery exit carriers against the stack tip

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/383; OPEN, label `bug`, no comments.
- Claim: `delivery check` can never pass a multi-member (gh-stack) delivery because the exit carrier is checked against every member head; `delivery refresh` copies that reason into the milestone carrier; milestone and delivery subjects disagree because the milestone scope omits the delivery's own evidence artifacts.
- Verification: **Confirmed but narrower than reported.** All three call sites pass every member's `observed_head` to `evaluateGateCarrier`, which fails `not-ancestor` on the first lower layer. The closeout check has the same pattern, so a stacked delivery also blocks goal closeout. `delivery refresh` writes the reason into `oat_milestone_gates.<m>.exit.freshness_reason`, which the router reads. The milestone-subject scope uses only `mNN` rows and no `ownEvidenceArtifacts`, so a member's moved `reviewed_head` is substantive there and bookkeeping under the delivery subject. Narrowing: the documented registration flow writes `kind: pr` with a single member, so a stack is a shape the parser accepts but no contract documents; the refresh write is a consequence of the all-heads check, not an independent defect.
- Confidence: high (source plus scratch probes); the downstream 9-member run was not inspected.
- Evidence: `packages/cli/src/commands/project/delivery/check.ts:172-186,231-239`; `delivery/refresh.ts:394-430`; `closeout-check/index.ts:295-309`; `delivery/evidence.ts:161-171,567-637,1000,1272-1306`; `packages/control-plane/src/recommender/router.ts:675-678`; `.agents/skills/oat-project-brief/references/brief-contract.md:533,580-587`; `.agents/skills/oat-project-pr-progress/SKILL.md:402,418`. Probes: a 3-layer linear stack reviewed at the tip is `stale`/`not-ancestor` against all heads and `fresh` against the tip; a commit moving member 0's `reviewed_head` with a new artifact is `substantive-change` under the milestone scope and `bookkeeping-successor` under the delivery scope.
- Existing coverage: none. `BL-261011-validate-skill-bumps-against` mentions gh-stack for skill bumps only.
- Proposed GitHub action: after merge, add `tracked-in-backlog`, remove none, post the comment below, keep OPEN.
- Backlog action: **create** "Evaluate stacked goal-delivery exit carriers against the stack tip" — medium, task, M.
- Acceptance proposal: Document `kind: stack` as a supported delivery shape in the brief contract and pr-progress registration. For a stack, evaluate the exit carrier against the tip member's head at all three call sites and require each lower member to be an ancestor of the tip. Build the milestone-subject scope with the delivery's own evidence artifacts when the milestone has a registered, non-superseded delivery, so both subjects agree. Add multi-member fixtures for check, refresh and closeout; single-member `kind: pr` behavior is unchanged.
- Priority and size rationale: Blocks the deliverability verdict and goal closeout for every stacked delivery; the workaround is a recorded deviation, and the documented flow is single-member. M for three call sites, a scope builder, contract and registration docs, and multi-member fixtures.
- Approval: approved by the user on 2026-10-30.
- Applied backlog reference: [BL-261030-evaluate-stacked-goal-delivery — Evaluate stacked goal-delivery exit carriers against the stack tip](../backlog/items/BL-261030-evaluate-stacked-goal-delivery.md).
- Post-merge result: not started.

Proposed post-merge comment:

> Confirmed on current main: the delivery check, delivery refresh and closeout check all test the exit carrier against every member head, so a stack reviewed at its tip is always `not-ancestor` against lower layers, and the milestone-subject scope omits the delivery's own evidence artifacts. The documented registration flow writes single-member `kind: pr` deliveries, so stacks are accepted but undocumented. Tracked in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261030-evaluate-stacked-goal-delivery.md: evaluate stacks against the tip, align the two subjects, and document `kind: stack`. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/388.

### GH-384 — Admit goal exit-gate review artifacts as milestone bookkeeping evidence

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/384; OPEN, label `bug`, no comments.
- Claim: the configured exit gate writes a `final` Reviews row and commits its artifact; `delivery check` allows review-artifact commits only from rows labelled with the milestone or delivery id, so the gate's own commit is a disallowed successor and stales the carrier; relabelling is substantive; the placeholder-row workaround is undocumented.
- Verification: **Confirmed current defect.** Implement must run the configured gate command verbatim with `--review-scope final`, while the goal closeout prose says the gate is scoped to the milestone's phase set; the gate CLI has no milestone awareness. `reviewRowsFor` matches only `id`/`id:` prefixes, unlisted paths are `disallowed-path` (pinned by test), and row identity includes scope. The placeholder workaround appears in no skill or doc. The strict allowlist itself is intended fail-closed behavior (DR-261011-bookkeeping-successors-keep); the defect is the integration between the documented gate command and the evidence scope.
- Confidence: medium-high; source and tests verified, no end-to-end gate run.
- Evidence: `apps/oat-docs/docs/workflows/advanced/workflow-gates.md:40,71`; `.agents/skills/oat-project-implement/references/completion-and-closeout.md:59-63,848-851`; `.agents/skills/oat-project-review-provide/SKILL.md:1550,1597-1627`; `delivery/evidence.ts:263-273,865-885,1245-1257`; `delivery/evidence.test.ts:564-587`.
- Existing coverage: `BL-260820-bind-each-gate-review` — Bind each gate review disposition to its exact received ledger event is adjacent (gate rows), not milestone labelling. No exact owner.
- Proposed GitHub action: after merge, add `tracked-in-backlog`, remove none, post the comment below, keep OPEN.
- Backlog action: **create** "Admit goal exit-gate review artifacts as milestone bookkeeping evidence" — medium, task, M.
- Acceptance proposal: Admit the artifact commit of a gate-originated row whose artifact's `oat_review_phase_ids` equals the milestone scope into the bookkeeping allowlist only. Keep such rows out of integrated-review row selection (`rows.at(-1)` for `mNN`) and out of `ownEvidenceArtifacts`, so a gate row can neither stand in for the integrated review nor unlock set-once delivery fields. Reconcile the goal closeout wording with the verbatim gate command. Remove the need for a placeholder row; keep unlisted review files rejected.
- Priority and size rationale: Every goal-mode exit-gate generation stales its own carrier, and a miss costs a whole new generation; an undocumented workaround exists. M rather than S because the safe admission must not widen integrated-review or set-once evidence, which needs negative controls.
- Approval: approved by the user on 2026-10-30.
- Applied backlog reference: [BL-261030-admit-goal-exit-gate-review — Admit goal exit-gate review artifacts as milestone bookkeeping evidence](../backlog/items/BL-261030-admit-goal-exit-gate-review.md).
- Post-merge result: not started.

Proposed post-merge comment:

> Confirmed on current main: the configured exit gate's `final` row is not in the milestone evidence allowlist, so its own artifact commit reads as `disallowed-path`, and relabelling changes row identity. Tracked in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261030-admit-goal-exit-gate-review.md: admit gate-originated artifacts whose phase ids equal the milestone scope as bookkeeping only, without letting them stand in for the integrated review or unlock set-once fields, and remove the placeholder step. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/388.

### GH-385 — Flag rewritten committed journal lines in journal check

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/385; OPEN, label `bug`, no comments.
- Claim: `journal check --at review` passes in-place rewrites of earlier journal lines that `judgeJournalChange` later rejects, so the violation surfaces only at delivery check.
- Verification: **Enhancement or UX improvement; facts confirmed.** `journal check` reads only the current files with no Git access and has no removed/rewritten reason code; `judgeJournalChange` rejects such edits and a test pins it. The append-only rule is intended (`brief-contract.md:608-610`), and `journal check` never claimed to enforce it, so this is a missing early warning rather than wrong behavior. No `oat project journal append` exists; `oat project log append` writes `project-log.md` only; `oat internal commit-paths` performs no journal check.
- Confidence: high; scratch probe reproduced it.
- Evidence: `packages/cli/src/commands/project/journal-check/index.ts:1,49-82`; `journal-check/types.ts:23-65`; `delivery/evidence.ts:900-941`; `delivery/evidence.test.ts:643-676`; `packages/cli/src/commands/internal/commit-paths.ts`. Probe: editing `Research recorded.` in place left `journal check --at review` `ok` and turned the delivery verdict from `bookkeeping-successor` to `substantive-change: recorded journal line "Research recorded." was removed or rewritten`.
- Existing coverage: `BL-261012-read-only-journal-lint` — Read-only journal lint for in-flight projects (open, low, task, M) is adjacent but does not compare against the committed version. Create a linked item so that owner's priority and size stay unchanged.
- Proposed GitHub action: after merge, add `tracked-in-backlog`, post the comment below, keep OPEN. Label swap (add `enhancement`, remove `bug`) awaits the user's choice; if declined, keep `bug` and drop the comment's final "Relabelled as an enhancement." sentence. Resume must not apply the swap unless this line records the user's approval.
- Backlog action: **create** "Flag rewritten committed journal lines in journal check" — medium, task, S. Link BL-261012-read-only-journal-lint.
- Acceptance proposal: `journal check` compares the working `implementation.md` with its `HEAD` version using the same rule as `judgeJournalChange` (shared, not copied) and reports a distinct reason for each removed or rewritten line, at least for goal and brief projects. A pre-commit guard in `commit-paths` and a `journal append` helper are optional follow-ons, not required by this item.
- Priority and size rationale: Twice cost a gate generation or forced an append-only correction after merge, with no warning; the rule already exists, so the fix reuses it. S for one reason code, shared judge, and fixtures.
- Approval: approved by the user on 2026-10-30.
- Applied backlog reference: [BL-261030-flag-rewritten-committed — Flag rewritten committed journal lines in journal check](../backlog/items/BL-261030-flag-rewritten-committed.md).
- Post-merge result: not started.

Proposed post-merge comment:

> Confirmed: `journal check` reads only current files, while delivery evidence rejects any rewrite of a committed journal line, so the two disagree until delivery check. The append-only rule is intended; the gap is an early warning. Tracked in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261030-flag-rewritten-committed.md: compare against the committed journal with the same rule delivery check applies. Relabelled as an enhancement. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/388.

### GH-353 — Report gate project-log finalization in the terminal JSON envelope

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/353; OPEN, no labels or comments.
- Claim: the terminal JSON envelope carries no receipt-finalization status, so a JSON-only caller cannot tell whether durable bookkeeping completed.
- Verification: **Enhancement or UX improvement.** The envelope is written before finalization runs in the outer `finally`; every finalization signal goes to stderr, and a successful commit emits no positive signal anywhere. The durable receipt already distinguishes append from commit. This was a deliberate scope exclusion: the #213 plan lists envelope ordering as out of scope and makes a receipt-in-envelope requirement a stop condition, and DR-260907-gate-log-receipts-live-under states the receipt cannot live in the envelope. #353 is new scope, not a #213 regression.
- Confidence: high.
- Evidence: `packages/cli/src/commands/gate/index.ts:471,2860-2878,3367-3381,3429-3484,3514-3531,4926-4935,4980-4987`; `index.test.ts:6236-6244`; `apps/oat-docs/docs/workflows/advanced/workflow-gates.md:515-517,653-658`; `.oat/repo/reference/external-plans/2026-09-02-retry-gate-project-log-finalization-across-index-locks.md:69-71,167-168,322-323`; `.oat/repo/reference/decisions/DR-260907-gate-log-receipts-live-under.md`.
- Existing coverage: `BL-260927-give-gate-receipts-portable` — Give gate receipts portable ownership, path-neutral identities, and a shipped ignore rule overlaps the path-neutral recovery reference only. Archived `BL-260902-retry-gate-project-log` shipped #213. No owner for the envelope field.
- Proposed GitHub action: after merge, add `enhancement` and `tracked-in-backlog`, post the comment below, keep OPEN.
- Backlog action: **create** "Report gate project-log finalization in the terminal JSON envelope" — medium, feature, M. Link BL-260927-give-gate-receipts-portable.
- Acceptance proposal: the issue's acceptance criteria, plus: planning must first amend DR-260907-gate-log-receipts-live-under, because finalization currently runs after the envelope flush. Preferred route is buffering the envelope until finalization completes; a second terminal record is acceptable only if the decision amendment accepts breaking the single-envelope contract. Review severity, threshold, receive eligibility and exit code stay unchanged.
- Priority and size rationale: Autonomous and JSON-only callers can mistake a review pass for completed bookkeeping; the receipt directory and stderr are workarounds. M for a decision amendment, envelope reordering including the post-selection-recovery path, held-lock fixtures and docs.
- Approval: approved by the user on 2026-10-30.
- Applied backlog reference: [BL-261030-report-gate-project-log — Report gate project-log finalization in the terminal JSON envelope](../backlog/items/BL-261030-report-gate-project-log.md).
- Post-merge result: not started.

Proposed post-merge comment:

> Confirmed: the terminal JSON is flushed before project-log finalization runs, so finalization status reaches only stderr and the durable receipt. The #213 work and DR-260907 deliberately excluded the envelope, so this is new contract scope. Tracked in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261030-report-gate-project-log.md with your acceptance criteria; planning starts by amending that decision record. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/388.

### GH-355 — Preflight knowledge-index mapper dispatch before replacing generated knowledge

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/355; OPEN, no labels, one external-agent comment, no fixing PR (#357 excludes it).
- Claim: the skill deletes owned generated outputs and writes the thin index before its first, Claude-specific launch attempt; the read-only fallback assumes `Explore`.
- Verification: **Confirmed current defect.** The skill is unchanged since the cited snapshot (version 1.3.3). Step 2 runs `refresh-owned.mjs --prepare`, Step 4 runs `oat index init`, and Step 4b is the first launch, hard-coded to `oat-codebase-mapper`/`haiku`/background. A worker that never launched is read as `WRITE_MODE="readonly"`. Step 6b also hard-codes a maintainer-specific `/private/tmp/claude-502/...` path. The skill never loads `oat-dispatch-subagents`. Mitigations: the user confirms the refresh first, hand-written notes survive, and in this repository the generated files are tracked, so damage is recoverable here but not in a downstream repository that keeps knowledge local.
- Confidence: high for the static ordering; no live Amp reproduction.
- Evidence: `.agents/skills/oat-repo-knowledge-index/SKILL.md:9,43-66,90-148,166-183,333-350,571`; `.agents/skills/oat-dispatch-subagents/SKILL.md:41,72-83`; `.agents/skills/oat-repo-improve/SKILL.md:123-151` (precedent capability classification).
- Existing coverage: archived `BL-261002-keep-hand-written-knowledge` shipped ownership protection (#356); `BL-260830-make-documentation-aware` owns #205. No owner for the dispatch boundary.
- Proposed GitHub action: after merge, add `bug` and `tracked-in-backlog`, post the comment below, keep OPEN.
- Backlog action: **create** "Preflight knowledge-index mapper dispatch before replacing generated knowledge" — medium, task, S.
- Acceptance proposal: the issue's acceptance criteria, plus removal of the hard-coded `/private/tmp/claude-502/...` path. Classify the route before Step 2 using the `oat-repo-improve` capability classes; a worker that did not launch is `unresolved-or-unsupported`, not read-only. Whether to route through `oat-dispatch-subagents` or gate explicitly to Claude stays a planning decision. Bump the skill version and the lockstep packages.
- Priority and size rationale: Can destroy downstream generated knowledge on an unsupported host; mitigated by user confirmation, manual-note protection and recoverable tracked files here. S for reordering, a preflight and route labelling in one skill (M if routed through the generic dispatcher).
- Approval: approved by the user on 2026-10-30.
- Applied backlog reference: [BL-261030-preflight-knowledge-index — Preflight knowledge-index mapper dispatch before replacing generated knowledge](../backlog/items/BL-261030-preflight-knowledge-index.md).
- Post-merge result: not started.

Proposed post-merge comment:

> Confirmed on current main (static): ownership cleanup and the thin-index write run before the first, Claude-specific mapper launch, and a failed launch is read as read-only mode. Step 6b also hard-codes a maintainer-specific temp path. Tracked in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261030-preflight-knowledge-index.md with your acceptance criteria; the generic-dispatcher versus Claude-only choice remains a planning decision. Live Amp behavior was not reproduced. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/388.

### GH-360 — Decide whether a no-op sync should restamp the manifest oatVersion

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/360; OPEN, no labels or comments. Framed as an investigation; no storage migration is approved.
- Claim: worktree init runs `oat sync`, which rewrites the tracked manifest on no-op because `saveManifest` restamps `oatVersion` and `executeSyncPlan` saves after zero-operation syncs.
- Verification: **Intended behavior, not a bug.** The mechanics are accurate, but restamping on no-op is documented ("Manifest version refreshed; no content changes required") and pinned by two tests. `oatVersion` is the producing-version evidence for the stale-tool skew advisory, read only by `detectManifestVersionRestamp`. From source, a same-version no-op writes identical bytes; timestamps and link identity change only on create, adopt or inheritance change. The churn is therefore CLI-version skew, matching the issue's `0.3.13 -> 0.3.16` evidence. This repository is exposed today: its manifest records `0.3.22` while the CLI is `0.3.36`, and `scripts/worktree/init.sh:468` runs sync.
- Confidence: medium-high; the two-sync probe was not run.
- Evidence: `packages/cli/src/manifest/manager.ts:37-45,69-81,166-180`; `packages/cli/src/engine/execute-plan.ts:409-423,973-978,1013-1023`; `apps/oat-docs/docs/provider-sync/commands.md:89-100`; `packages/cli/src/commands/sync/index.test.ts:1602`; `packages/cli/src/engine/execute-plan.test.ts:1465`; `.oat/sync/manifest.json:3`; PR #217 body.
- Existing coverage: archived `BL-260718-warn-when-oat-sync-uses`, `BL-260826-warn-on-silent-oatversion`, `BL-260909-make-oat-sync-scope-all-report` and `wont_do` `BL-260906-scope-the-restamp-only-sync` cover messaging, not churn avoidance.
- Proposed GitHub action: after merge, add `enhancement` and `tracked-in-backlog`, post the comment below, keep OPEN.
- Backlog action: **create** "Decide whether a no-op sync should restamp the manifest oatVersion" — low, task, S.
- Acceptance proposal: Record a decision on what `oatVersion` means. If it becomes "last version that changed managed content", skip the save when only the version differs, keep the skew advisory and `versionSkew` JSON, and update the restamp message, docs and pinned tests at every save site. Otherwise document the expected restamp in worktree setup. Either way, preserve tracked sync records and ownership/removal safety, and demonstrate fresh-worktree, repeated no-op and CLI-version-change behavior. No storage migration.
- Priority and size rationale: Bookkeeping noise with a documented cause; the cleanup problem is already handled outside OAT. S once the semantics decision is made.
- Approval: approved by the user on 2026-10-30.
- Applied backlog reference: [BL-261030-decide-whether-a-no-op-sync — Decide whether a no-op sync should restamp the manifest oatVersion](../backlog/items/BL-261030-decide-whether-a-no-op-sync.md).
- Post-merge result: not started.

Proposed post-merge comment:

> Investigation result: the no-op restamp is documented and pinned by tests, and `oatVersion` is the producing-version evidence for the skew advisory. A same-version no-op writes identical bytes, so the churn is CLI-version skew, consistent with your `0.3.13 -> 0.3.16` observation. Tracked in https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-261030-decide-whether-a-no-op-sync.md as a semantics decision first, with no storage migration. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/388.

### GH-354 — Refine BL-260706-front-load-recurring-gate with recurring families in repair briefs

- Source: https://github.com/voxmedia/open-agent-toolkit/issues/354; OPEN, no labels or comments. Workflow evidence from one downstream integration.
- Claim: bounded repair briefs carry only the latest finding; nothing requires a recurring-family summary when a later finding shares an owner and invariant.
- Verification: **Enhancement; overlaps an open owner.** The implement fix loop and the phase implementer receive only the current review, bounded findings and prior report, and fix mode limits work to supplied findings. Review-receive fix tasks cite only the current review. Recurring families are named only in the complexity-review fallback, which runs at budget exhaustion with no automatic early trigger; the opt-in early trigger proposed in archived `BL-261001-run-a-complexity-review-when` did not ship.
- Confidence: high.
- Evidence: `.agents/skills/oat-project-implement/references/phase-execution.md:943-945,970-977`; `.agents/agents/oat-phase-implementer.md:43-49,835-836`; `.agents/skills/oat-project-review-receive/SKILL.md:580-588,797-810,833-836`; `.agents/docs/complexity-review-fallback.md:45-46,213-217`.
- Existing coverage: `BL-260706-front-load-recurring-gate` — Front-load recurring gate-finding classes into implementer briefs (open, medium, feature, L) owns recurring-class injection into later briefs; this issue is its within-loop variant. `BL-261013-classify-review-findings` — Classify review findings against the contract at every receive is the natural place to tag owner and invariant.
- Proposed GitHub action: after merge, add `enhancement` and `tracked-in-backlog`, post the comment below, keep OPEN.
- Backlog action: **refine** BL-260706-front-load-recurring-gate; retain medium/feature/L. Add #354 to its associated issues and these acceptance criteria: when a received Critical/High finding shares an owner and invariant with an earlier finding in the same scope, the next repair brief carries a short failure-family summary and affected-role matrix; earlier closed findings are cited as history and not reopened; fix mode may address roles named in that block within the accepted contract; attempt budgets, operator choices at exhaustion and complexity-review authority are unchanged; a fixture shows the first-case-to-recurring-family transition.
- Priority and size rationale: One anecdote, so per Feature Planning Triage this joins the existing owner rather than adding a track. Existing priority and size retained.
- Approval: approved by the user on 2026-10-30.
- Applied backlog reference: [BL-260706-front-load-recurring-gate — Front-load recurring gate-finding classes into implementer briefs](../backlog/items/BL-260706-front-load-recurring-gate.md).
- Post-merge result: not started.

Proposed post-merge comment:

> Confirmed that repair briefs carry only the current round; recurring families surface only at budget exhaustion through the complexity review. Folded into the existing owner https://github.com/voxmedia/open-agent-toolkit/blob/main/.oat/repo/pjm/backlog/items/BL-260706-front-load-recurring-gate.md as within-loop acceptance criteria, leaving budgets and complexity-review authority unchanged. Triage PR: https://github.com/voxmedia/open-agent-toolkit/pull/388.

## Open concerns

- #383: the user chose to make stacked deliveries a documented, supported shape rather than reject multi-member registration.
- `BL-260927-share-one-hook-safe-exact-path` is archived as closed while GitHub #306 remains OPEN. Outside this run's scope; noted for a later resolution sweep.
- Records 2026-09-26 and 2026-10-02 still read `pr_open` although their post-merge labels are applied; by design their resume results live in PR receipt comments.

## Applied repository changes and validation

- Created six items with `oat backlog new` (assigned IDs, approved titles, priorities, scopes and estimates), then added each item's GitHub issue association and approved acceptance criteria. Refined BL-260706-front-load-recurring-gate with #354's association, a within-loop description paragraph and three acceptance criteria; its priority, scope and estimate are unchanged.
- `oat backlog regenerate-index` exit 0. The managed table grows from 140 to 146 rows, with no other row changed; a curated-overview note links the delivery-evidence cluster.
- `oxfmt --check` over every changed file: exit 0.
- `oat pjm doctor --json`: adoption `declared`; exit 1 with findings identical to the pre-run baseline (pre-existing completed-ledger warnings).
- `pnpm run check:skill-bumps`: exit 0 (no canonical skills or agent roles changed). `pnpm release:check-versions`: exit 0 (no public package changes). Running them required building the CLI's workspace dependencies into gitignored `dist` directories.
- The remaining CI gates were not run: this diff touches only `.oat/repo/pjm` Markdown, which no package build, test or docs build consumes.

## Resume instructions

The approved repository changes are in [PR #388](https://github.com/voxmedia/open-agent-toolkit/pull/388); this PR-binding commit records that reference. Keep all issue mutations deferred until merge.

After PR #388 merges, invoke:

```text
/triage-oat-issues resume post-merge PR #388
```

On resume: verify the merged record and backlog links, re-read each live issue, apply unchanged actions idempotently, and post a completion receipt on PR #388. Apply the #385 label swap only if the #385 row records the user's approval; any other changed action needs row-specific approval.
