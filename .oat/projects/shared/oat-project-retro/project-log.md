---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-08-06
---

# Project Log: oat-project-retro

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
### 2026-08-06 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-08-06 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/oat-project-retro/reviews/artifact-plan-review-2026-08-06T002316Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/oat-project-retro/reviews/artifact-plan-review-2026-08-06T004058Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/oat-project-retro/reviews/artifact-plan-review-2026-08-06T005234Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/oat-project-retro/reviews/artifact-plan-review-2026-08-06T005256Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:0 exit=0 status=ok artifact=.oat/projects/shared/oat-project-retro/reviews/artifact-plan-review-2026-08-06T012151Z.md

### 2026-08-06 · project · bug · configured post-implementation sequence was skipped

Observation: workflow.postImplementSequence configured preApproval=[summary, document, pr], but implementation finished without persisting oat_post_implement_sequence or dispatching those children; document and pr-final were run manually after final approval, and pr-final generated the missing summary as fallback. Impact: required pre-approval ordering and sequence provenance were lost even though the final artifacts now exist. Recommendation: fail closed before implementation completion when a configured sequence has no durable snapshot or incomplete pre-approval steps, and add regression coverage for this boundary. (observed on oat-project-implement 2.0 closeout contract, CLI 0.2.29)

### 2026-08-06 · structural · oat-project-retro · references/project-retro.md

artifact=.oat/projects/shared/oat-project-retro/references/project-retro.md evidence=project-log,lifecycle-artifacts,archived-reviews,session-transcript,github-pr-192 unavailable=oat-execution-learnings promotions=0 upstream=1 apply=deferred filing=deferred

### 2026-08-06 · structural · oat-project-implement · p06

Phase passed after one bounded review-fix round; see reviews/p06-review-2026-08-06T234340Z.md.

### 2026-08-07 · structural · oat-project-implement · p-rev1

Phase passed after one bounded review-fix round; see reviews/p-rev1-review-2026-08-07T003046Z.md.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
