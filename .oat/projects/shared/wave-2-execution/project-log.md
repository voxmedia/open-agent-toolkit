---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-09-06
---

# Project Log: wave-2-execution

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
### 2026-09-06 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-09-06 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-09-06 · structural · oat gate review · plan

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:0,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/wave-2-execution/reviews/artifact-plan-review-2026-09-06T023526Z.md

### 2026-09-06 · structural · oat-wave-execute · final

End-of-run synthesis for this wave wrapper lives in orchestration-log.md (convention verdicts, skill-signal rulings, adopted rules, graduated-entries ledger); this project log carries structural events only.

### 2026-09-06 · structural · oat gate review · final

target=codex-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/wave-2-execution/reviews/final-review-2026-09-06T093256Z.md

## End-of-run synthesis

Owned by `orchestration-log.md` for wave wrappers (convention verdicts, skill-signal rulings, adopted rules, graduated-entries ledger); see its `## End-of-run synthesis (2026-09-06)` section.
