---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-08-27
---

# Project Log: scope-adoption-diagnostics

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
### 2026-08-27 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-08-27 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/scope-adoption-diagnostics/reviews/artifact-plan-review-2026-08-27T221042Z.md

### 2026-08-30 · structural · oat-project-implement · p01

Phase p01 passed after two planned commits and one bounded review fix; High re-review passed with zero findings. Artifact: reviews/p01-review-2026-08-30T220913Z.md.

### 2026-08-30 · project · feedback · merge-order

Diagnostics implementation may continue, but merge waits for migrate-the-legacy-pjm to land. Rebase diagnostics, inspect any pjm/doctor.ts overlap, and rerun the PJM suite before merge; tool-pack-scope-provider-truthfulness rebases after diagnostics.

### 2026-08-30 · structural · oat-project-implement · p02

Phase p02 passed after three planned commits and one settled phase-recovery attempt; High review passed with zero findings after attempted reviewer reconnaissance was rejected pre-start and reconciled inline. Artifact: reviews/p02-review-2026-08-30T224248Z.md.

### 2026-08-30 · structural · oat-project-implement · p03

Phase p03 passed after two test-only commits; High review passed with zero findings. Artifact: reviews/p03-review-2026-08-30T225845Z.md.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
