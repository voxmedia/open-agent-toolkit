---
oat_artifact: skill-handoff
oat_date: 2026-07-20
oat_skills: [oat-wave-execute, oat-wave-program, explainer-kit]
oat_program: 2026-07-19-execution-program
---

# Wave Skills First-Run Handoff: Orc Consumer Evidence

Upstream payload for the `oat-wave-execute` / `oat-wave-program` promotion
decision. This is the first packaged-skill run OUTSIDE the source (stoa)
program: 4 waves, 14 external plans, 14 lanes, executed autonomously
end-to-end in the Orc monorepo on 2026-07-20 (PRs #24–#27, program artifact
`../external-plans/2026-07-19-execution-program.md`). Intended to be bundled
with stoa's W6 acceptance package: two independent consumers, one skill text.

## Headline Convergence

**The gate-catches-what-lanes-miss result reproduced 4-for-4.** Every wave's
cross-runtime final gate found real cross-lane defects after every individual
lane had passed its own root-owned review:

| Wave | Final-gate catch (per-lane reviews all green)                                                                                                                                                            |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1   | Sense-budget threading in the p04 refactor: fail-fast + shared-deadline + non-positive-timeout guard (fixed `f4f1b19`)                                                                                   |
| W2   | Dishonest `readSnapshot` return type + modes never reconciled on existing installs (both fixed, root-verified)                                                                                           |
| W3   | Semantic-offset validation × skip-read interaction across two serially-reviewed lanes                                                                                                                    |
| W4   | String-match on a serialized error envelope violating the repo's machine-readable-codes rule (introduced by an orchestrator fix instruction) + stale fixture evidence provenance after the factory dedup |

This independently replicates stoa's result (its W6 config-corrupting defect
was likewise caught only at fan-in). Standing rule 10 is load-bearing in both
consumers.

## First-Run Audit Results (operator 8-question review)

Full record: wave-4 `orchestration-log.md` (Program Retrospective Addendum),
archived with the wrapper project — local `.oat/projects/archived/wave-4-execution/`,
S3 `s3://tkstang-open-agent-toolkit/repositories/orc/projects/20260720-wave-4-execution`.
Condensed:

- **Ledger/coverage:** 14/14 rows done, 0 deferred/dropped, invariant held at
  every commit; all 4 ledger rows carry PR + squash SHA + completion record.
- **Reviews:** 14/14 phases root-reviewed; 2 Criticals (both W2 plan gate,
  fixed pre-execution), ~16 Importants, all with stored disposition +
  verification records (W4 review-chain audit passed mechanically).
- **STOPs:** zero tripped, zero waived. Both source-plan changes were dated
  author amendments; the W2 plan gate caught the one wrapper-override attempt
  and rerouted it through the amendment channel — the non-narrowing contract
  enforced itself.
- **Fan-in gates:** ran after every fan-in (325/335 → 339/349 → 348/358 +
  356/366 → 407/417), never skipped on clean-lane grounds.
- **Drift refresh:** ran at every wave boundary against newly-merged main;
  2 MINOR-DRIFT reconciliations (W4 p12/p13), both non-narrowing.
- **Merge waits:** full local DoD + green CI for every PR after CI existed;
  disclosed: W1's PR predated CI (CI was a W2 lane), and the W4 fan-in
  proceeded past a thrice-seen flaky wall-clock assertion after isolation +
  3 clean re-runs (graduated: BL-260720-deflake-wall-clock-timing).
  Proposed bootstrap rule: a wave merging into a repo with no CI records
  that absence as an explicit one-line waiver in the wave plan ("merge gate
  = local DoD only"); the CI-introducing wave's first green run certifies
  the cumulative merged tree and is recorded as closure of the waiver. No
  retroactive gate re-runs — CI runs on the full tree, so the first green
  run IS the retroactive gate.
- **Bookkeeping:** one serialized archival commit per wave with real outcome
  summaries; all 4 wrapper projects lifecycle-complete before merge.
- **Defect found by the audit itself:** signal 8 below.

## Skill Signals (8 + 2)

Signals 1–5 are NEW relative to stoa's six waves; 6–7 strengthen/sharpen
existing rules; 8 is a skill-TEXT defect; 9 is an explainer-kit core defect
found while producing the program recap.

1. **Gate reviewers cannot commit from linked worktrees** (gap, new). Codex
   gate children run with git metadata outside their sandbox when the
   checkout is a linked worktree (`.git` is a file pointing outside the
   sandbox root); rule 3's "gate reviewers COMMIT their own artifacts" fails
   silently there. Adopted fallback: orchestrator commits gate artifacts on
   the reviewer's behalf. Proposed: condition rule 3 on primary-checkout
   execution and name the orchestrator-commit fallback.
2. **10-minute foreground gate ceiling → background dispatch** (gap, new).
   The ceiling is the ORCHESTRATOR HOST's foreground tool timeout (Claude
   Code Bash tool, 600 000 ms max), not a Codex limit — wave-scoped gate
   reviews legitimately exceed it. W2's plan gate hit it with a COMPLETE
   artifact on disk (rule-8 recovery worked, used exactly once). All later
   gates dispatched in background with a completion watcher; zero further
   timeouts W2–W4. Proposed: make background dispatch the default gate
   posture (a dispatch-posture rule alongside rules 6/8, which scope budget
   and recovery, not foregrounding); rule 8 stays as the recovery path.
3. **Pipefail on gate/verification chains** (gap, new). `pnpm test | grep
"Tests "` returned grep's exit 0 over a 1-failed-test run at the W4
   fan-in; only pipefail surfaces the real exit code. Proposed: standing
   rule — any piped DoD/gate command must run under `set -o pipefail`, or
   capture the raw exit code before filtering.
4. **Gate-artifact append timing under concurrency** (gap, new). Mechanism:
   the orchestrator APPENDED a fix-disposition to the root review artifact
   while an agent with a live handle on that artifact was still running; a
   whole-file rewrite by that agent (not a competing append) dropped the
   uncommitted appended section — the sibling p04 record, committed in
   parallel, survived. Detected only by the W4 final gate's review-chain
   audit; restored with a provenance note. Proposed: single-writer-until-
   committed — an uncommitted review artifact is exclusively owned by
   whichever agent is live on it; orchestrator dispositions land as
   immediate commits, or wait for all touching agents to terminate. (A
   lock/timestamp-suffix convention was considered and rejected: suffixed
   files fragment the review chain the audit depends on.)
5. **Append-only fix rounds — never amend reviewed SHAs** (gap, new). The
   trigger was an explicit orchestrator fix-round instruction to amend the
   reviewed commit; the p10 implementer REFUSED per its role contract
   (amending invalidates stored review verdicts that cite the reviewed SHA)
   and delivered an append-only fix commit instead. The orchestrator
   accepted the refusal and adopted append-only as standing policy — the
   worker's role contract correctly overrode the orchestrator instruction.
   Proposed: promote "never amend a reviewed SHA" to an explicit standing
   rule in the skill (so orchestrator instructions cannot contradict it) and
   require fix-round briefs to state append-only.
6. **Rule-9 grep-asserted bookkeeping mutations** (strengthens). Caught its
   own silent no-ops again in this consumer (regex vs oxfmt padding at
   wave-close; line-based transform required). Keep verbatim.
7. **Pre-merge guard must be a same-shell hard assertion** (sharpen).
   Mechanism: the host shell's cwd persists across tool invocations (and
   once spontaneously reset mid-sequence) — a check in one invocation says
   nothing about the next. The W2 incident is the proof: the advisory
   `pwd`/branch print SHOWED the wrong location but the chain continued,
   the merge no-op'd into its own branch inside a worktree, and the
   subsequent worktree removal broke the shell cwd. After adoption the hard
   guard aborted two repeat attempts (both worktree-cwd drift, including a
   p10 merge attempt). Prescribed exact shape, one invocation, guard
   compounded directly onto the merge:
   `cd /abs/repo/root && [ "$(git branch --show-current)" = "wave-N-execution" ] || exit 1 && git merge --no-ff …`
   — explicit `cd` remediates the healable dimension (cwd); the branch
   test hard-aborts the non-healable one. Separately: step 3.1's
   `--no-commit` is VERSION SKEW, not dead text — at W1 scaffold time the
   installed oat's `project new --help` did not list the flag and the
   scaffold auto-committed (`51487ac`, harmless); the currently installed
   CLI lists it again. Proposed: a preflight `oat project new --help` probe
   with both branches documented, in the style of the existing ≥0.1.65
   version check in rule 8.
8. **`fixes_completed` terminal-state ambiguity — skill-text defect**
   (defect, found by the operator audit). All 8 gate review rows (final +
   plan, every wave) were left at `fixes_completed`; the wave-0/1 "proceed
   at fixes_completed" plan-gate precedent was wrongly generalized into a
   terminal state. Verification records existed; only the flip was missing.
   Proposed status-flow wording: **plan gates may proceed at
   `fixes_completed`; final gates must flip to `passed` once dispositions
   are verified — `passed` is the only terminal state for gate rows.**
   (Step 6.5's restore-watch presumes exactly this.)
9. **explainer-kit program-recap renders degenerate sections** (defect,
   explainer-kit v1.0.0). `createContentModel` (`scripts/run.mjs`) joins all
   fact-base claims into one summary string and stamps it into EVERY
   `requiredNarrative` section — the six recap sections are identical walls
   of text; no claim→section binding mechanism exists. Recap run recorded
   anyway per contract: runId `run-00707d61-81fe-42f9-8723-5ce4dc687b2c`,
   outcome `built-not-durable` (durable persistence is caller-owned; output
   committed under `.oat/repo/explainers/`). Proposed: add per-claim section
   tags (or claim-id prefix convention) to the fact-base contract and
   distribute claims in `createContentModel`.

10. **"oat-project-complete BEFORE merge" under-specifies the archive tail**
    (gap, found post-program by operator question). Closeout step 7 names the
    skill, but under autonomous execution `oat project complete-state` alone
    read as satisfying it — all four wrapper projects were left
    lifecycle-complete but unarchived (no local archive move, no
    `s3SyncOnComplete` sync, active-project pointer still set) until the
    operator asked. **Root cause is structural, not textual:**
    `oat-project-complete` carries `disable-model-invocation: true`, so it is
    invisible to and uninvokable by the autonomous orchestrator that step 7
    orders to run it (it never appeared in the orchestrator's skill listing;
    every other lifecycle skill did). Under that contradiction, degrading to
    the nearest matching CLI command is the expected outcome, not a fluke —
    the human-gated flag is right for interactive use (archive moves, S3
    uploads, PR mutations) and wrong as a dependency of an autonomous
    closeout. The post-program remediation worked only because the operator's
    explicit request served as the gate: the orchestrator read SKILL.md as a
    document and executed its process inline (config-resolved answers,
    project-log gate, CLI-owned archive, pointer clear). Proposed, in
    preference order: (a) ship an `oat-project-complete-auto` non-interactive
    companion for orchestrators — the repo already establishes this exact
    pattern with `oat-worktree-bootstrap-auto` — resolving every batched
    question from config (`workflow.archiveOnComplete`,
    `workflow.createPrOnComplete` already auto-answer), skipping PR steps
    when the PR is merged, and hard-failing instead of prompting on any gate
    it cannot auto-resolve; step 7 then names the `-auto` companion for
    autonomous runs. (b) Failing that, step 7 inlines the full tail
    explicitly — complete-state, `oat project archive` (CLI-owned local move
    - summary export + S3 sync when configured), pointer clear — accepting
      the duplication cost. Do NOT simply flip the flag on the interactive
      skill; that loses the human gate for the cases that genuinely want it.

## Pointers

- Program artifact: `../external-plans/2026-07-19-execution-program.md`
- Wave summaries: `../project-summaries/20260720-wave-{1..4}-execution.md`
- Program-level log of record: wave-4 `orchestration-log.md` (retro addendum;
  archived — see Full record note above)
- Recap provenance: `../../explainers/execution-program-2026-07-19-recap/`
