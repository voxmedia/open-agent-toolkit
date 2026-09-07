---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-09-05
---

# Project Log: wave-1-execution

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
### 2026-09-05 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-09-05 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-09-05 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/wave-1-execution/reviews/artifact-plan-review-2026-09-05T224504Z.md

### 2026-09-06 · structural · oat-project-review-provide · reviews/final-review-2026-09-06T015333Z.md

Final gate code review recorded at reviews/final-review-2026-09-06T015333Z.md (0C/0I/1M/1m).

### 2026-09-06 · structural · oat gate review · final

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:1 exit=0 status=ok artifact=.oat/projects/shared/wave-1-execution/reviews/final-review-2026-09-06T015333Z.md

### 2026-09-06 · general · friction · wave wrapper slug and branch collision

The oat-wave-execute fixed wave-N-execution slug and branch collided with the archived 2026-08 program wrapper and its stale remote branch; the wave kept the local name and pushed to origin/wave-1-execution-2026-09, deferring the archive-name collision to program close. The skill should qualify the slug or branch by program, or check archived wrappers and remote branches in preflight. (observed on oat 0.2.55)

### 2026-09-06 · general · friction · duplicate orchestrator after session restart

A session restart left the prior orchestrator instance alive on the same worktree, which scaffolded a second wrapper directory before standing down. Check ListAgents for a busy peer on the same path before scaffolding; the skill has no claim-the-tree step. (observed on oat 0.2.55)

### 2026-09-06 · general · friction · reviewer reconnaissance signal placement

A reviewer put the mandatory Reconnaissance signal in its chat reply rather than the artifact; the root validates the file, so the round was recovered through the accepted handle. Reviewer briefs should state that the line is validated in the artifact. (observed on oat 0.2.55)

### 2026-09-06 · general · friction · dispatch journal cannot close out child outcome

oat project dispatch record rejects a revision that changes child_outcome (generic fields are immutable), so a record written at acceptance never carries the terminal outcome; outcomes were recorded in implementation.md instead. Consider a terminal event kind or an outcome revision. (observed on oat 0.2.55)

### 2026-09-06 · project · worked-well · readiness flip and address-now sweep rules

Flipping successor plans to READY in the fan-in bookkeeping commit with cited evidence, and landing Medium/Minor review findings as address-now sweeps through the original implementer handle, kept both groups inside one fan-in each with zero merge conflicts. (observed on oat 0.2.55)

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
