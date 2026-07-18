---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-07-18
---

# Project Log: orchestration-run-log

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
### 2026-07-18 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-07-18 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-07-18 · structural · oat-project-implement · p03

Phase outcome DONE for request run-log-p03-review-fixes-2026-07-18 with 0 fix-loop iterations; run record: .oat/projects/shared/orchestration-run-log/implementation.md#run-4-2026-07-18.

### 2026-07-18 · structural · oat-project-implement · p03

Dispatch accepted for request run-log-p03-review-fixes-2026-07-18 at target gpt-5.6-sol-high; run record: .oat/projects/shared/orchestration-run-log/implementation.md#run-4-2026-07-18.

### 2026-07-18 · project · friction · same-worktree dispatch logging

Observation: The root append performed after phase-worker launch disappeared while the same-worktree worker restored a clean checkout. Impact: The accepted-dispatch structural stamp had to be reconstructed after phase completion. Recommendation: Preserve root-owned project-log writes across same-worktree child cleanup or sequence the append before the child captures its clean baseline. (observed on open-agent-toolkit 0.1.73)

### 2026-07-18 · structural · oat-project-implement · final

Focused final re-review passed with 0 findings after p03-t10 and p03-t11; artifact: .oat/projects/shared/orchestration-run-log/reviews/archived/final-review-2026-07-18T150415Z.md.

### 2026-07-18 · general · friction · same-worktree dispatch logging

Promoted from . Reusable lesson: root-owned writes created after a same-worktree child captures its clean baseline can be erased by child cleanup, so lifecycle orchestration must coordinate write ownership, preserve files the child did not create, or isolate the child in a separate worktree. (observed on open-agent-toolkit 0.1.73)

### 2026-07-18 · general · friction · same-worktree dispatch ownership

Correction to `### 2026-07-18 · general · friction · same-worktree dispatch logging`, whose source heading was dropped by shell quoting. Promoted from `### 2026-07-18 · project · friction · same-worktree dispatch logging`: root-owned writes created after a same-worktree child captures its clean baseline can be erased by child cleanup, so lifecycle orchestration must coordinate write ownership, preserve files the child did not create, or isolate the child in a separate worktree. (observed on open-agent-toolkit 0.1.73)

## End-of-run synthesis

The project-log lifecycle shipped and passed focused final re-review after hardening structural marker validation, canonical synthesis lookup, and byte-preservation behavior. This run exposed a reusable same-worktree ownership hazard where child cleanup erased a root-owned dispatch append; the observation was promoted to the repository ledger with a recommendation to coordinate writes or isolate child worktrees. No project-log follow-up was converted into a backlog item during this synthesis.
