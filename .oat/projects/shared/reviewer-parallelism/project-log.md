---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-07-18
---

# Project Log: reviewer-parallelism

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

### 2026-07-18 · structural · oat-project-implement · p01

Accepted Phase p01 implementer dispatch; run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-1.

### 2026-07-18 · structural · oat-project-implement · p01-review

Accepted root-owned Phase p01 reviewer dispatch; run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-1.

### 2026-07-18 · structural · oat-project-implement · p01-outcome

Phase p01 passed root-owned review with zero fix iterations; run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-1.

### 2026-07-18 · structural · oat-project-implement · p02-outcome

Phase p02 passed root-owned review with zero findings and zero fix iterations; run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-2.

### 2026-07-18 · structural · oat-project-implement · p03-review-fix-1

Phase p03 review found one Critical release-version reuse issue. Added bounded correction task p03-t03 to select the next shared unpublished version from current upstream/npm evidence, regenerate release surfaces, and rerun full validation before focused re-review.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
