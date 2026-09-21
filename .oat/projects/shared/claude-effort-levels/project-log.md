---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-09-20
---

# Project Log: claude-effort-levels

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
### 2026-09-20 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-09-20 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-09-20 · structural · oat gate review · plan

target=cursor-fable-5-1-high threshold=high findings=critical:0,high:0,medium:1,low:2 exit=0 status=ok artifact=.oat/projects/shared/claude-effort-levels/reviews/artifact-plan-review-2026-09-20T235147Z.md run=6be6a7aa-cd6e-46ae-9efc-9dfb26efc3cc

### 2026-09-21 · structural · oat gate review · plan

target=cursor-fable-5-1-high threshold=high findings=critical:0,high:0,medium:0,low:2 exit=0 status=ok artifact=.oat/projects/shared/claude-effort-levels/reviews/artifact-plan-review-2026-09-21T000015Z.md run=4b0b73b8-93d9-4bd5-bfb3-0f43e55b9dfe

### 2026-09-21 · structural · oat-project-implement · p01

p01 passed after one bounded fix iteration; first review orchestration is recorded in reviews/p01-review-2026-09-21T005952Z.md; clean re-review: reviews/p01-review-2026-09-21T012030Z.md; idempotency p01-outcome-run1-20260921T012030Z

### 2026-09-21 · structural · oat-project-implement · p02

p02 passed after one bounded fix iteration; first review orchestration is recorded in reviews/p02-review-2026-09-21T020650Z.md; passing re-review with one Low: reviews/p02-review-2026-09-21T022325Z.md; idempotency p02-outcome-run1-20260921T022325Z

### 2026-09-21 · structural · oat-project-implement · p03

p03-outcome-run1-20260921T040439Z Phase p03 passed after two bounded fix rounds; reviews/p03-review-2026-09-21T040439Z.md is clean, and the attempted reconnaissance recorded in reviews/p03-review-2026-09-21T035607Z.md was rejected before start and reconciled inline.

### 2026-09-21 · structural · oat-project-implement · final

final-review-run2-20260921T144805Z Final lifecycle review passed with zero findings; attempted reconnaissance and inline reconciliation are recorded in reviews/final-review-2026-09-21T144805Z.md.

### 2026-09-21 · structural · oat gate review · final

target=cursor-fable-5-1-high threshold=high findings=critical:0,high:0,medium:1,low:4 exit=0 status=ok artifact=.oat/projects/shared/claude-effort-levels/reviews/final-review-2026-09-21T151012Z.md run=6e5693ec-5f6c-46a2-b26b-7585321b1903

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
