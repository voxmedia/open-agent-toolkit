---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-08-31
---

# Project Log: tool-pack-scope-provider-truthfulness

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
### 2026-08-31 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-08-31 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-08-31 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important exit=1 status=review_failed

### 2026-08-31 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:2 exit=0 status=ok artifact=.oat/projects/shared/tool-pack-scope-provider-truthfulness/reviews/artifact-plan-review-2026-08-31T003934Z.md

### 2026-08-31 · structural · oat-project-implement · p01-invalid-run

p01 launch dispatch-p01-20260831T052104Z-99d6de317 stopped as INVALID_RUN_ABORT before work: configured base 99d6de317a22aa70e8f68027936060d03907ffcf did not match clean HEAD 99d6de317cb1c670b8a1bc92efc4a57300de74fd; zero edits, commits, tests, or recovery attempts.

### 2026-08-31 · structural · oat-project-implement · p01-relaunch-authorized

Thomas explicitly authorized a new p01 launch after the prior invalid-run abort; the aborted launch made zero edits or commits, and the corrected run will start from the clean post-abort bookkeeping head.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
