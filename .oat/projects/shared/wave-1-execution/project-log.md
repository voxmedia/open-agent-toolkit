---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-08-26
---

# Project Log: wave-1-execution

This append-only log serves two audiences: the project team learning from this project's execution, and maintainers improving the general OAT workflow and tooling.

## Logging contract

Append when something breaks, surprises you, requires a workaround, or works notably well enough to preserve as do-not-regress evidence. Record evidence, not a running narrative. Prior entries are never edited or struck through; append corrections as a new judgment entry that references the original entry and explains the correction. Add a version note to tool-related observations. Create entries only with `oat project log append`; run `oat project log append --help` for the complete entry contract. Reference supporting artifacts by path instead of inlining them. Never record secret values such as tokens, keys, signed URLs, or credentials because this log rolls up into tracked surfaces; reference secrets by name or source, never by value.

Judgment entries default to 1–3 sentences covering what happened, the impact or workaround, and any follow-up. High-value entries may instead use this structured body:

```text
Observation: What happened and the supporting evidence.
Impact: Why it mattered or what workaround was required.
Recommendation: What should change or be preserved.
```

Shared tracked surfaces must be written only from the root checkout, never from parallel worktrees.

## Entry format

Judgment entries:

```text
### 2026-08-26 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-08-26 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important exit=1 status=review_failed

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important exit=1 status=review_failed

### 2026-08-26 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-1-execution/reviews/artifact-plan-review-2026-08-26T125608Z.md

### 2026-08-26 · structural · oat gate review · final

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:2 exit=0 status=ok artifact=.oat/projects/shared/wave-1-execution/reviews/final-review-2026-08-26T160106Z.md

### 2026-08-26 · general · friction · gate exec-target selection

Observation: the configured plan gate selected cursor-gpt-5-6-sol-xhigh twice while cursor-agent rejected launches with a team usage-limit error; the availability probe (cursor-agent --version) kept passing and the gate has no post-selection fallback. Impact: the whole wave blocked at a quota boundary until the operator raised the limit. Recommendation: probe entitlement or fall through to the next target on a pre-child provider rejection; classify pre-child rejections as launch defects (see orchestration-log.md). (observed on oat 0.2.32)

### 2026-08-26 · general · friction · release gate vs test-only changes

Observation: files under packages/cli/src/**/\*.test.ts count as publishable changes (versionPolicyIgnorePatterns is only assets/**), so a test-only lane forced a five-package lockstep bump (Recovery Event p02-rec-001). Impact: root-owned wave-level bump 0.2.32 to 0.2.33 after fan-in. Recommendation: drift refresh should intersect lane write surfaces with the release change-detection roots and plan the bump up front; decide separately whether test paths should be version-policy-ignored. (observed on oat 0.2.32)

### 2026-08-26 · general · worked-well · reviewer-designed adversarial probes

Observation: the p01 Important (post-detach unsettleable reap) and a round-2 Medium (reorder mutation) were found only by reviewer probes and mutation runs; every implementer gate, pinned test, and codex pass was green. Impact: two cheap fix rounds, no defect shipped. Recommendation: keep the mandatory reviewer-designed probe for logic-bearing lanes and require delete- and reorder-class mutations for ordering/containment claims.

### 2026-08-26 · general · bug · orchestrator cwd drift

Observation: a compound cd into a phase worktree persisted across orchestrator shell calls, so one root bookkeeping commit landed on the phase branch. Impact: repaired by cherry-pick plus reset of the unreviewed misplaced commit; reviewed SHAs untouched. Recommendation: every root command uses absolute paths or git -C; generalize the wave skill's absolute-path merge guard to all root commands.

### 2026-08-26 · general · friction · deterministic smoke tier in linked worktrees

Observation: the exit-gate reviewer's pnpm test failed once in tools/smoke/deterministic (git worktree add collided in the shared git dir), passed on isolated rerun, and leaked run-scoped smoke-automated worktrees and branches. Impact: root cleanup of the leaked refs; no wave code involved. Recommendation: the deterministic tier should namespace or clean its worktrees on failure and tolerate concurrent runs in linked worktrees.

### 2026-08-26 · structural · oat-project-complete · seal

Completion sealed at 2026-08-26T16:37:51Z; project-log roll-up status: ok (rollup ledgerOutcome appended at summary step). Archive tail (oat project archive + S3 + active-pointer clear) deferred to program close per autonomous wave policy.

## End-of-run synthesis

Wave 1 verdict: both lanes shipped with every source-plan Done criterion verified; the wrapper conventions held except two root-owned incidents (cwd drift; a release-root blind spot in drift refresh). Adopted for W2-W4: absolute paths for every root command; drift refresh intersects lane surfaces with release change-detection roots and pre-plans lockstep bumps; briefs invoke gates literally with per-gate exit logs; ordering/containment reviews require delete- and reorder-class mutations; pre-child gate provider rejections are boundaries after one identical retry. Graduated: five general judgments rolled into the repository ledger; four backlog candidates carried to wave close; three deferred minors carried in implementation.md.
