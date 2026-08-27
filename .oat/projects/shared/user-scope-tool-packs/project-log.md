---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-08-27
---

# Project Log: user-scope-tool-packs

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

### 2026-08-27 · structural · oat gate review · design

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:4,medium:7,minor:4 exit=1 status=blocked artifact=.oat/projects/shared/user-scope-tool-packs/reviews/artifact-design-review-2026-08-27T012258Z.md

### 2026-08-27 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:1,medium:2,minor:4 exit=1 status=blocked artifact=.oat/projects/shared/user-scope-tool-packs/reviews/artifact-plan-review-2026-08-27T015201Z.md

### 2026-08-27 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:1,minor:3 exit=0 status=ok artifact=.oat/projects/shared/user-scope-tool-packs/reviews/artifact-plan-review-2026-08-27T020356Z.md

### 2026-08-27 · structural · oat-project-implement · p01

Phase p01 blocked after 2/2 review-fix iterations; final review reviews/p01-review-2026-08-27T041427Z.md reports one Critical managed-root containment finding.

### 2026-08-27 · structural · oat-project-implement · p01

Phase p01 passed after authorized fix iteration 3/4; review reviews/p01-review-2026-08-27T050410Z.md reports 0 Critical, 0 Important, and 2 deferred Medium findings.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
