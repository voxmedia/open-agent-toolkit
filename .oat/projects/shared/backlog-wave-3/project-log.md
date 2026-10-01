---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-10-01
---

# Project Log: backlog-wave-3

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
### 2026-10-01 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-10-01 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-10-01 · structural · oat gate review · plan

target=codex-6-sol-xhigh threshold=high findings=critical:0,high:1,medium:2,low:0 exit=1 status=blocked artifact=.oat/projects/shared/backlog-wave-3/reviews/artifact-plan-review-2026-10-01T061917Z.md run=e44bde62-cfaa-45c8-9449-42b58de6090b

### 2026-10-01 · structural · oat-project-review-provide · plan

53c0bf7f-34ad-4728-b165-0dc580ac0db9 artifact=.oat/projects/shared/backlog-wave-3/reviews/artifact-plan-review-2026-10-01T063044Z.md recon=template-nav class=intelligent-recon target=gpt-6.1-sol/medium outcome=completed floor=satisfied fallback=unused reconciliation=primary-source-reopened

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
