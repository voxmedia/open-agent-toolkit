---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-08-27
---

# Project Log: portable-skill-references

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

target=cursor-gpt-5-6-sol-xhigh threshold=important exit=1 status=targeting_correlation_failed artifact=.oat/projects/shared/scope-adoption-diagnostics/reviews/artifact-plan-review-2026-08-27T215450Z.md

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:1 exit=0 status=ok artifact=.oat/projects/shared/portable-skill-references/reviews/artifact-plan-review-2026-08-27T220007Z.md

### 2026-08-27 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:0 exit=0 status=ok artifact=.oat/projects/shared/portable-skill-references/reviews/artifact-plan-review-2026-08-27T220505Z.md

### 2026-08-28 · structural · oat-project-implement · p01

Phase p01 passed root-owned review at dba46295a0d02c1bd1bca179a954bf902a2ae1c6; 0 Critical, 0 Important, 1 non-blocking Medium. Artifact: reviews/p01-review-2026-08-28T015302Z.md

### 2026-08-28 · structural · oat-project-implement · p02

Phase p02 passed root-owned review at 9d5be6432d30bb31b6bf3fed01ed152c936640c0 with no findings. Artifact: reviews/p02-review-2026-08-28T021707Z.md

### 2026-08-28 · structural · oat-project-review-provide · final

Final auto review used two reconnaissance waves and found 1 Important plus 1 Medium. Artifact: reviews/final-review-2026-08-28T022049Z.md

### 2026-08-28 · structural · oat-project-implement · p03

Phase p03 passed narrowed re-review at 63b1c7e4076e14369390e7bea9192ecc674f9719 with no findings. Artifact: reviews/p03-review-2026-08-28T025628Z.md

### 2026-08-28 · structural · oat gate review · final

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:1 exit=0 status=ok artifact=.oat/projects/shared/portable-skill-references/reviews/final-review-2026-08-28T032516Z.md

### 2026-08-28 · structural · oat-project-implement · project-recap-gate

Interactive project-recap preference resolved to ask; user selected skip. No recap was attempted or reused, and the terminal-outcome guard accepted the durable skip intent.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
