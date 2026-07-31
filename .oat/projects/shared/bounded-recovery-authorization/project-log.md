---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-07-31
---

# Project Log: bounded-recovery-authorization

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
### 2026-07-31 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-07-31 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-07-31 · structural · oat-project-implement · p-rev1

INVALID_RUN_ABORT before edit: accepted phase packet carried an incorrect full base SHA; preserved clean HEAD 5494dbfe98129193f1db46d86f12b768b7511f39 and stopped without fallback.

### 2026-07-31 · structural · oat-project-implement · p-rev1-corrected-launch

Operator explicitly authorized one new corrected p-rev1 run after the prior accepted invalid-run abort; preserve the same exact target and bounded revision scope.

### 2026-07-31 · structural · oat-project-implement · p-rev1

Phase outcome PASS after one task commit and one fresh review cycle with zero findings; review artifact: reviews/p-rev1-review-2026-07-31T191244Z.md; fix-loop count 0.

### 2026-07-31 · structural · oat-project-implement · p02-p03-bootstrap

Strict normal-mode bootstrap failed readiness because oat status reported unmanaged local Cursor entries; both worktrees preserve correct base 413cfe2f and sync commit c2a48a5b, no phase agent was launched, and the group degraded to sequential target-preserving execution.

### 2026-07-31 · structural · oat-project-implement · p02

Phase outcome PASS after one task commit and one fresh review cycle with zero findings; review artifact: reviews/p02-review-2026-07-31T193213Z.md; fix-loop count 0.

### 2026-07-31 · structural · oat-project-implement · p03-review1-fix1

Original Phase p03 handle returned NEEDS_CONTEXT before edit because the review-fix packet omitted its continuation event; root issued bounded-recovery-authorization-p03-review1-fix1 linked to the original request and preserved the same target and scope.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
