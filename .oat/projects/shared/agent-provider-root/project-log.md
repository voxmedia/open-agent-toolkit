---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-08-29
---

# Project Log: agent-provider-root

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
### 2026-08-29 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-08-29 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-08-30 · structural · oat gate review · plan

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:2 exit=0 status=ok artifact=.oat/projects/shared/agent-provider-root/reviews/artifact-plan-review-2026-08-30T160834Z.md

### 2026-08-30 · structural · oat-project-implement · p01

Phase p01 passed after two verified task commits and independent review; review artifact: reviews/archived/p01-review-2026-08-30T164420Z.md; fix loops: 0.

### 2026-08-30 · structural · oat-project-implement · p02

Phase p02 passed after four verified task commits and independent review; review artifact: reviews/archived/p02-review-2026-08-30T170942Z.md; findings: 0 Critical, 0 Important, 1 Medium, 0 Minor; fix loops: 0.

### 2026-08-30 · structural · oat-project-implement · p03

Phase p03 passed after one source commit plus one planned evidence-only task and independent review; review artifact: reviews/archived/p03-review-2026-08-30T173812Z.md; all Definition-of-Done gates passed; fix loops: 0.

### 2026-08-30 · structural · oat gate review · final

target=cursor-fable-5-high threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/agent-provider-root/reviews/final-review-2026-08-30T182542Z.md

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
