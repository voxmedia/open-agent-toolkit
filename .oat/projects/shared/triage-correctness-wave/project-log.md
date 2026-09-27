---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-09-27
---

# Project Log: triage-correctness-wave

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
### 2026-09-27 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-09-27 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-09-27 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:2,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/artifact-plan-review-2026-09-27T043735Z.md run=cfbed9d4-31b9-4c43-b9b6-ab39c958f7d9

### 2026-09-27 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/artifact-plan-review-2026-09-27T044626Z.md run=6f15dc62-3341-4492-a28b-20f304d4c79d

### 2026-09-27 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/artifact-plan-review-2026-09-27T045257Z.md run=7eea2a8f-4bd2-4aba-a786-621c59a9bf71

### 2026-09-27 · structural · oat gate review · p01

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/p01-review-2026-09-27T053801Z.md run=2d553f20-46af-49e9-bb41-e979d2e1425e

### 2026-09-27 · structural · oat gate review · p02

target=codex-6-sol-xhigh threshold=high exit=1 status=review_failed run=ee0f0803-ba85-415f-9e55-719351c330a7

### 2026-09-27 · structural · oat gate review · p02

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/p02-review-2026-09-27T054914Z.md run=4bd88e02-140b-4a6a-bfaa-7363d2102e87

### 2026-09-27 · structural · oat gate review · p03

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:1,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/p03-review-2026-09-27T064005Z.md run=010e23d8-6317-4ca5-b397-73346cf8caf1

### 2026-09-27 · structural · oat gate review · p04

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:0,medium:0,low:0 exit=0 status=ok artifact=.oat/projects/shared/triage-correctness-wave/reviews/p04-review-2026-09-27T070131Z.md run=5b4674f7-7d07-47cb-a565-016f403199ef

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
