---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-10-02
---

# Project Log: backlog-wave-4

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
### 2026-10-02 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-10-02 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-10-02 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:2,medium:0,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-4/reviews/artifact-plan-review-2026-10-02T144731Z.md run=cf4607a4-0bbe-47fd-8299-da416f48f4c0

### 2026-10-02 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:0,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-4/reviews/artifact-plan-review-2026-10-02T145801Z.md run=fe6bbe0a-bc0a-498f-b29d-6255948827bf

### 2026-10-02 · structural · oat gate review · p01

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:0,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-4/reviews/p01-review-2026-10-02T174337Z.md run=79f6824b-3a1a-496b-adcb-b7591c75abc1

### 2026-10-02 · structural · oat gate review · p01

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:0,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-4/reviews/p01-review-2026-10-02T180245Z.md run=2546dc45-ffcf-4b2f-952c-9b70848a7771

### 2026-10-02 · structural · oat-project-implement · p01

Phase p01 complete (8/8 tasks): bundle-assets fail-closed and asset-root errno. Root review rounds 4, Codex gate attempts 2 (blocked on the destructive-publish family), complexity review at the cap; operator chose simplify plus the symlinked-checkout root-cause fix and closed the p01 gate by override.

### 2026-10-02 · structural · oat gate review · p02

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-4/reviews/p02-review-2026-10-02T192954Z.md run=75d9dbb7-8438-4c6b-8893-a7e95ea44cdf

### 2026-10-02 · structural · oat-project-implement · p02

Phase p02 complete (3/3 tasks): 30-minute artifact gate default and atomic duplicate-gate claim. One root review round (1 Medium, 3 Low fixed), Codex gate passed with 1 Medium (stale-recovery race) deferred to final.

### 2026-10-02 · structural · oat gate review · p03

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/backlog-wave-4/reviews/p03-review-2026-10-02T200622Z.md run=b2f32273-4392-4f7b-a573-b7be724d9ad6

### 2026-10-02 · structural · oat-project-implement · p03

Phase p03 complete (5/5 tasks): sync restamps stale copy hashes, legacy retirement bridge, missing SKILL.md for every skill dir, marker-less directories report an error. One root review round (1 Medium, 2 Low fixed), Codex gate passed with 1 Medium addressed now.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
