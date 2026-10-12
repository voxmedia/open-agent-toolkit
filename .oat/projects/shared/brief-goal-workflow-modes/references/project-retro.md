---
oat_retro_project: brief-goal-workflow-modes
oat_retro_generated: 2026-10-11T19:58:53Z
oat_retro_evidence_sources:
  - source: project-log
    status: used
  - source: oat-execution-learnings
    status: unavailable
  - source: lifecycle-artifacts
    status: used
  - source: archived-review-markdown
    status: used
  - source: astra-alignment-reports
    status: used
  - source: session-transcript
    status: used
oat_retro_promotions: complete
oat_retro_filing: complete
oat_generated: true
oat_template: false
---

# Project Retrospective: brief-goal-workflow-modes

## Executive Summary

Two workflow modes shipped in one autonomous run of about twenty hours: `brief` (PR #361) and `goal` (PR #362), 64 tasks over twelve phases, nineteen phase-review rounds and a four-round final review, with every Definition-of-Done gate green at lockstep 0.3.20. The design held up: three Astra alignment rounds and the plan gate caught the structural problems before implementation, and the existing modes were untouched. The cost sat in two places. The delivery-evidence evaluator took six successive review-driven fixes because each trust input was derived from the state being judged, and the run lost most of a working day to disk exhaustion and a server restart that killed two agents mid-task. The most important change for next time: derive evaluator trust sets from immutable records up front, and treat free disk and process survival as run preconditions rather than recovery cases.

## Evidence and Review Method

Reviewed: `project-log.md` (33 entries: 25 structural dispatch and review receipts, 8 `general`-scope friction judgments), `plan.md` (revision 5 plus amendment 5.1, 63 Reviews rows), `implementation.md` (per-phase ledgers, Orchestration Runs, Deviations, Deferred Findings), `summary.md`, the eleven `DR-261011-*` decision records, the 32 archived review artifacts under `reviews/archived/` (local-only, not in the S3 archive by design), the Astra reports under `references/astra-v15-round-{1,2}.md`, the p12 probe driver, and this session's own transcript (the orchestrator ran the whole lifecycle in one T3 thread, so chronology and operator corrections are first-hand). Unavailable: `oat-execution-learnings.md` (no autonomous-run learnings file was produced; the run used the project log for judgments instead). Transcript tool-result bodies are complete for this session; committed ledgers were cross-checked where a subagent report was the only source. Labels below: **Confirmed** unless marked **Hypothesis**.

## Outcome Snapshot

| Item         | Result                                                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope        | `brief` and `goal` modes end to end: control plane, CLI, templates, entry and lifecycle skills, roles, docs, decision records                                                 |
| Delivery     | PR #361 (v1, merged 3352af96e) and PR #362 (goal, merged 573d5b820) as GitHub stack #363                                                                                      |
| Verification | 19 phase-review rounds, final review 4 rounds; full gate run with forced uncached tests (CLI 8624, control-plane 275); two real-artifact probes (brief p08-t03; goal 22 rows) |
| Lockstep     | 0.3.19 (v1) then 0.3.20 (goal); 28 skills/roles bumped once against both bases                                                                                                |
| Boundaries   | goal excluded from autonomous runs; milestone extraction manual; six backlog follow-ups; reviews not archived (owner decision)                                                |
| Side product | `artifact-cleanup` project planned and approved (not active) from an audit of all 102 archived projects                                                                       |

## Current State

- **Promotions:** complete — RP-03 applied at `f32d91413` (brief contract §12.8); RP-01 and RP-02 rejected by the owner (stale gh-stack extension; no harness- or machine-specific preconditions in skills).
- **Filing:** complete — RP-04 and RP-05 filed to the repository backlog (`BL-261011-validate-skill-bumps-against`, `BL-261011-clean-up-the-isolated-home`, receipt `de57fb4b8`, pushed); UP-01 filing rejected because the fix was made directly in this repository (`f32d91413`).
- **Unsettled items:** none.

## What Went Well

- **Alignment before code.** Astra's three design rounds (v1.5) and two plan rounds, plus the Opus artifact review and the configured gate, removed every contradiction that later phases would otherwise have hit at implementation time; the `references/astra-v15-round-{1,2}.md` reports read as a change log the plan revisions can be checked against. The same pattern produced an implementation-ready plan for `artifact-cleanup` in one afternoon.
- **Independent reviews that re-prove.** Every phase reviewer re-ran the implementer's prove-it-can-fail evidence and the real-artifact probes itself; the final reviewer reproduced the evaluator bypass against the rebuilt pre-fix dist before accepting the fix (`final-review-2026-10-11T191933Z.md`). Three Highs that unit suites passed were found only this way.
- **Parked work survived.** The p10 disk pause parked the half-written p10-t02 tree as a tracked patch under `references/`, and the resume applied it cleanly (`chore(oat): park p10-t02 patch`, then `feat(p10-t02)`). After the server restart, the p12 resume verified the orphaned p12-t01 commit with a fresh can-fail check instead of trusting the lost report.
- **The brief contract as the winning artifact.** Making `brief-contract.md` authoritative on conflict gave reviewers one place to check skill prose against, and the final review's cross-artifact table found drift in exactly two sentences across 297 files.

## Challenges and Struggles

- **Evaluator trust inputs derived from the judged state (Confirmed; p10 review M2, final review rounds 1–3).** The delivery-evidence evaluator decides whether commits after a reviewed revision are bookkeeping. Each fix opened an adjacent hole: a `decided_at` rerun escape let a bookkeeping commit swap a delivery's exit gate (p10-t05); then review identity fields were exempt whenever the commit named the delivery's own artifact, so a same-artifact rebind moved the inspected range (p12-t09); then `members[].reviewed_head` became set-once with no skill writing it, so legitimate recovery was permanently mismatched (p12-t10); then the "own artifact" set was built from the current `integrated_review.artifact`, which the judged commit controls (p12-t11). Impact: four extra review rounds and three evaluator commits after the phase had "passed". Resolution: own-artifact sets now come only from the delivery's Reviews rows, the one input the judged commit cannot repoint without also writing a row, and every negative control runs through the production scope builder and the rebuilt CLI. Logged as `review-cap final`.
- **Disk exhaustion (Confirmed; log entries `disk full during parallel-group fan-in`, `parallel group degraded to sequential`, `isolated-HOME temp growth`, `disk space pause`).** Each isolated-HOME vitest run left about 48 MB under `$TMPDIR`; 87 such directories plus T3 app state and Codex sessions drove the volume under 600 MB three times. Impact: parallel group 2 ran sequentially, p10 paused mid-task for hours, and briefs had to carry a free-space stop rule. Response: temp sweeps, one fake HOME per phase, and an owner cleanup to 32 GB. The growers outside the authorized cleanup set (`~/.t3/userdata`, `~/.codex/sessions`) were never within the agent's remit.
- **Server restart killed two agents silently (Confirmed).** The T3 restart ended the p12 implementer after one of five tasks and the plan reviewer before it wrote anything; neither reported. Impact: lost evidence for p12-t01 and a relaunch of both. Response: re-verify what landed by commit, then resume by continuation request id.
- **Review caps versus assurance (Confirmed).** p12 and the final review both hit the three-round cap with a real finding outstanding. The run rules allowed a logged complexity disposition; for p12 the residual was a one-clause prose fix (root-verified), for the final review it was a bypass that could not ship, so a narrow fourth round was taken and logged (`review-cap p12`, `review-cap final`).
- **Stack mechanics (Confirmed).** GitHub-native stacks refuse `gh pr merge` and need the asynchronous merge endpoint; gh-stack v0.0.8 has no `merge` subcommand despite the skill text; and landing #361 rebased the goal branch, rewriting 104 commit SHAs that the project artifacts cite (recorded in Deviations; old history kept locally).

## Decision Register

Eleven records exist (`DR-261011-brief-mode-family`, `-phase-unit-progress-contract`, `-tasks-are-execution-records`, `-anchor-based-review-scope`, `-brief-to-quick-promotion`, `-goal-mode-delivers-one-project`, `-goal-deliveries-are-registered`, `-bookkeeping-successors-keep`, `-goal-completion-requires`, `-terminal-goal-deliveries-from`, `-goal-milestone-extraction-is`). Owner decisions taken during the run and recorded only in project artifacts or memory: reviews are not archived (noise); the v1 ship branch was cut at the p08 closeout rather than retitling the progress PR; the two PRs land as a stack with merge commits; autonomous goal runs are excluded. The `summary.md`-is-bookkeeping and goal-summary-deferral rules were folded into `DR-261011-bookkeeping-successors-keep` rather than given their own record; that is adequate because they are consequences of the same evidence rule.

## Rejected or Superseded Alternatives

- Retitling the progress PR at pr-final (superseded by cutting `feat/brief-workflow-mode-v1`): GitHub cannot hold two open PRs from one head branch.
- Widening the evidence allowlist to repo-level paths for the goal summary (rejected in p12 round 2): the allowlist is project-scoped by design; the summary defers repo-level writes instead.
- Reverting the authority flip on member revisions (rejected in final round 2): the guard is what blocks a sibling-artifact swap; the fix let revisions move with the delivery's own new artifact instead.
- Archiving review artifacts so journal citations resolve (rejected by the owner): journals must stand alone.

## Where We Changed Course

- **Trigger:** two open PRs cannot share a head. **Change:** v1 cut to its own branch at ebccf5ba3; goal continued on the original. **Outcome:** PR #361 then a stacked #362.
- **Trigger:** disk under 600 MB during fan-in. **Change:** group 2 degraded to sequential; p10 paused with a parked patch. **Outcome:** no lost work; several hours lost.
- **Trigger:** the goal declaration counted as a substantive brief edit in the p12 probe. **Change:** the declaration moved to the journal Final Summary (p12-t02 fix 3). **Outcome:** terminal closeout probes pass; contract 12.9 already permitted it.
- **Trigger:** a pre-`pr` summary commit made the terminal milestone undeliverable. **Change:** `summary.md` became a bookkeeping path and goal summaries defer repo-level writes while `phase-uncovered` holds. **Outcome:** recorded in the DR, contract 12.5 and the summary skill.
- **Trigger:** the archived-artifact audit (102 projects). **Change:** the lifecycle-noise fixes became a separate planned project instead of scope creep here. **Outcome:** `artifact-cleanup` approved, not active.

## New Architecture Patterns and Approaches

- **Bookkeeping-successor freshness.** Reviewed revisions never advance; later commits are inspected against a confined allowlist with content rules, and trust-bearing identity (review artifact, scope, bound revisions, member revisions, exit gate) is set-once and replaced only by a commit that records the delivery's own new review artifact, as evidenced by that delivery's Reviews rows. Boundary: the Reviews row is the only commit-controlled unlock, and it is the legitimate receive shape.
- **Phase-unit progress with execution records.** Taskless phases complete on a phase-level status line; tasks are opened at work start and closed at commit, so the journal stays compact and review scope comes from recorded anchors.
- **Run-rule briefs for autonomy.** Every dispatch carried the same rules (one fake HOME, scoped tests, a free-space stop rule, never edit project artifacts, exact commit messages via `commit-paths`), which made resumption after interruption mechanical.

## Gotchas for Humans

- Land the bottom of a GitHub stack with a merge commit, not a squash, or the upper PR's diff against `main` shows the whole stack; expect the stack to rebase the upper branch and rewrite its SHAs.
- Reviews are excluded from archives on purpose; cite them as local-only and keep findings in the journal.
- T3 app state and Codex sessions grow by gigabytes per day on long runs; clear them before a multi-hour autonomous run.
- `check:skill-bumps` against `origin/main` passes vacuously when the previous layer of a stack already bumped a skill; validate against the stack's base branch too.

## Gotchas for Autonomous Agents

- Never build a trust set from the state a commit is allowed to rewrite; read the unlock (the delivery's own review-artifact set) from its append-only Reviews rows, never from `integrated_review.artifact`, and test through the production scope builder, not a hand-built map.
- After a server restart, check `git log` and `git status` for what landed before relaunching; re-prove any orphaned task's can-fail evidence.
- Use one fake HOME per phase and sweep `$TMPDIR/tmp.*` directories whose only entry is `Library`; check `df` before every build.
- Slice Markdown by line-anchored heading regexes, never by substring; the hook re-pads tables, so replace rows by normalized prefix after any commit.
- A whole-file swap to a pre-fix module can fail at import when helpers were added; neutralize guards by targeted edits instead, and restore with `git -c core.hooksPath=/dev/null checkout --` under an isolated HOME.
- Dispatch-record validation rejects a variant the resolver did not select; reviewers run at the policy's cap regardless of the candidate requested.

## Repo Improvements (Promotion Register)

### RP-01: Record the stack-landing procedure in the gh-stack skill

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** rejected
- **Target:** .agents/skills/gh-stack/SKILL.md
- **Applied-ref:** —
- **Disposition-note:** Rejected by the owner: the premise was a stale extension, not the skill. The installed gh-stack was v0.0.8; v0.2.1 (2026-10-09) ships `gh stack merge`, which the skill already documents. The extension was upgraded on this machine and the vendored copy in voxmedia/internal-skills was refreshed to v0.2.1 in PR #26. The async-merge REST path stays in the project journal as a workaround for a stale extension only.

The skill's table says to use `gh stack merge <target> --yes`, but gh-stack v0.0.8 exposes no `merge` subcommand, and GitHub refuses `gh pr merge` for a stacked PR ("must be merged using the asynchronous merge REST API"). Document the working path: `PUT repos/{owner}/{repo}/pulls/{n}/merge-async` with `sha`, `merge_method` and `merge_action=direct_merge`, polled at `GET …/merge-async/{uuid}` until `merged`; land the bottom layer with a merge commit; expect the upper branch to be rebased with new SHAs.

### RP-02: Add disk and process-survival preconditions to the autonomous-run guidance

- **Type:** agents-instruction
- **Disposition:** apply
- **Status:** rejected
- **Target:** .agents/skills/oat-project-implement/references/dispatch-and-dry-run.md
- **Applied-ref:** —
- **Disposition-note:** Rejected by the owner: skills carry no harness-specific (T3 restart) or machine-specific (free disk) preconditions. The restart-safe resume rule remains in the project journal and session memory.

Three disk stalls and one restart cost most of a working day. Add to the dispatch guidance: check free space before every phase launch and stop under a stated floor; brief implementers to use one fake HOME per phase and delete it; after any orchestrator or server interruption, re-derive what landed from `git log` and re-prove orphaned evidence before resuming by continuation id.

### RP-03: State the trust-set rule for evidence evaluators in the brief contract

- **Type:** docs
- **Disposition:** apply
- **Status:** applied
- **Target:** .agents/skills/oat-project-brief/references/brief-contract.md
- **Applied-ref:** `f32d9141326f73ed07ee7a438fabea9d8127d6d3` :: .agents/skills/oat-project-brief/references/brief-contract.md §12.8 (oat-project-brief 1.0.2, lockstep 0.3.21); wording narrowed in the PR #364 review so the unlock is the delivery's own Reviews-row artifact set only
- **Disposition-note:** —

Four evaluator fixes shared one cause. Add one sentence to §12.8: any input that decides whether a commit may replace trust-bearing evidence is read from append-only records (Reviews rows, journal anchors), never from a field the judged commit can rewrite; negative controls run through the production scope builder. This generalizes the rule the final review settled on and would have prevented p12-t09 through p12-t11.

### RP-04: Validate skill bumps against the stack base, not only origin/main

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-261011-validate-skill-bumps-against.md
- **Destination-receipt:** de57fb4b81fb0dd506898afb6bcbe76476922ac5
- **Remote-visibility:** pushed
- **Sanitized:** no
- **Disposition-note:** Filed to the repository backlog by the owner's instruction; no duplicate found in items, archived, or completed.

`check:skill-bumps --base-ref origin/main` passed vacuously for the goal PR because the v1 layer had already bumped every skill; the implementer validated against the v1 branch by hand. Teach the gate (or the pr-final skill) to accept a base ref argument and, for a PR whose base is not `main`, run against that base.

### RP-05: Make the isolated-HOME test runs clean up after themselves

- **Type:** code-follow-up
- **Disposition:** file
- **Status:** filed
- **Destination:** .oat/repo/pjm/backlog/items/BL-261011-clean-up-the-isolated-home.md
- **Destination-receipt:** de57fb4b81fb0dd506898afb6bcbe76476922ac5
- **Remote-visibility:** pushed
- **Sanitized:** no
- **Disposition-note:** Filed to the repository backlog by the owner's instruction; no duplicate found in items, archived, or completed.

Each `HOME=$(mktemp -d)` vitest run leaves ~48 MB of `Library/` under `$TMPDIR` (87 directories, 3.3 GB, swept once by hand). Add a test setup/teardown or a `pnpm test:clean-home` helper that removes the temp HOME, or have the repo's test harness create and remove it.

## OAT Upstream Feedback (Upstream Register)

### UP-01: Dispatch-record example should include a reviewer resolved at a capped policy

- **Status:** rejected
- **Destination:** —
- **Destination-receipt:** —
- **Remote-visibility:** —
- **Sanitized:** no
- **Disposition-note:** Filing rejected: the host repository is the upstream, so the owner directed the doc fix to be made directly instead of filed. record-schema.md now states that under a capped managed policy the reviewer targets the policy's cap cell and that `payload.variant` must come from the live resolution (`f32d9141326f73ed07ee7a438fabea9d8127d6d3`, oat-dispatch-subagents 1.2.13). The resolver already prints the selected variant in `dispatchArgs.variant`, so no CLI change was needed.

`managed-claude-example.json` shows an Opus 5.5 reviewer, but under a capped managed policy the resolver always selects the cap variant (Fable 5.1 high here) and `dispatch record` rejects any other `payload.variant`. Every reviewer dispatch in this run was first rejected and reassembled. Add a second reviewer example resolved at a capped policy, and have `dispatch-ceiling resolve` print the selected variant name so the caller can assemble the record directly.

## Remaining Boundaries and Follow-Ups

- `oat-project-complete` has not run: archive, S3 sync and the summary export are pending (Thomas asked for the retro first).
- `artifact-cleanup` is approved and inactive; it starts in this thread after completion.
- Eight `BL-261011-*` backlog items remain open: the six in `summary.md` Follow-up Items plus RP-04 and RP-05 below.
- Project artifacts cite pre-rebase commit SHAs from p09 onward; the mapping is by commit message and the old history is at local branch `pre-stack-rebase-local`.

## Reflections

The result is trustworthy for a specific reason: nothing load-bearing was accepted on an implementer's word. Reviewers re-ran can-fail checks, rebuilt pre-fix code to reproduce bypasses, and probed the built CLI, and the three Highs the test suites missed were found only that way. The same discipline is why the evaluator took three rounds to harden, which is the right trade for a boundary that decides whether a delivery's evidence is still valid. What should change is the order: the trust-set rule in RP-03 was knowable from the design's A2 clause before p10 was written, and the run would have been a day shorter with free disk and a restart-safe resume protocol in the brief from the start.
