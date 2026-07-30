---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-07-30
---

# Project Log: review-plan-workflow

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
### 2026-07-30 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-07-30 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-07-30 · structural · oat gate review · plan

target=cursor-fable-5-xhigh threshold=important exit=124 status=review_failed

### 2026-07-30 · structural · oat-project-implement · p01

Phase p01 passed after one bounded fix iteration; terminal review: reviews/archived/p01-review-2026-07-30T215327Z.md.

### 2026-07-30 · structural · oat-project-implement · p02

Phase p02 stopped at p02-t03 after committed task tests passed but lint failed; append-only recovery requires explicit operator authorization.

### 2026-07-30 · structural · oat-project-implement · p02-recovery

Operator authorized one append-only p02-t03 lint-repair commit ad398b47 and continuation through the original Phase 2 handle.

### 2026-07-30 · structural · oat-project-implement · p02-recovery1

Phase p02 continuation stopped before p02-t29: p02-t27/t28 factories consume stdin while trusted commands emit correlation and receipt as CLI flags.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
