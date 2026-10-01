---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-10-01
---

# Project Log: markdown-docs-bootstrap

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

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:1,low:1 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/artifact-plan-review-2026-10-01T060016Z.md run=db5ebb2c-f554-4275-aa5c-165f92ff8c4b

### 2026-10-01 · structural · oat gate review · plan

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:2 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/artifact-plan-review-2026-10-01T112231Z.md run=645bbca3-db69-4867-812e-22f31388aa11

### 2026-10-01 · structural · oat-project-implement · p01

p01 verdict pass; fix iterations 0; review reviews/p01-review-2026-10-01T120229Z.md; L1 tracking wording corrected; 2/9 tasks complete.

### 2026-10-01 · structural · oat-project-implement · p02

p02 verdict pass; one review-fix iteration (M1 p02-t03); clean full-phase review reviews/p02-review-2026-10-01T132908Z.md; recovery 0/10; continue p03.

### 2026-10-01 · structural · oat-project-implement · p03

p03 verdict pass; 0C/0H/0M/2L; both Low tracking/evidence findings fixed in root Step7b; review reviews/p03-review-2026-10-01T140627Z.md; source fix iterations0/recovery0; continuep04.

### 2026-10-01 · structural · oat-project-implement · p04

p04 passed: two task commits, zero independent review findings, all dispositions settled, no phase gate selected; fix iterations 0, recovery 0/10. Continue final review and retained exit gate before final HiLL.

### 2026-10-01 · structural · oat-project-implement · p04

Final metadata fix accepted by independent narrowed final review: zero findings, prior full coverage inherited, all eleven tasks/dispositions settled; final fix iteration1, recovery0/10. Retained exit gate and configured closeout before HiLL.

### 2026-10-01 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:1,low:1 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/final-review-2026-10-01T160046Z.md run=a8646353-1fff-430a-aee3-e8b32dd2966e

### 2026-10-01 · structural · oat-project-implement · final

Literal-rendering passing-gate sweep complete; refreshed final lifecycle review passed 0C/0H/0M/0L with independent 197-test and causal CLI proof. Eleven tasks complete, recovery 0; fresh exit gate and configured closeout pending.

### 2026-10-01 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:1 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/final-review-2026-10-01T163602Z.md run=e49bf748-36dc-44ff-9fa6-1e7105fc21b3

### 2026-10-01 · structural · oat-project-implement · final

Refreshed independent implementation exit gate passed; 0C/0H/0M/1L, sole stale plan-prose Low addressed. All findings settled; proceeding to configured summary/document/pr sequence, final HiLL pending.

### 2026-10-01 · structural · oat-project-implement · final-hill

markdown-bootstrap-awaiting-hill-20261001: park for configured final p04 HiLL approval; all 11 tasks, final review, retained gate and summary/document/pr steps passed; PR #335 open; recap skipped interactive; approval pending.

### 2026-10-01 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:2 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/final-review-2026-10-01T185353Z.md run=74cf045f-60fb-4931-a434-8cc9eaa5df19

### 2026-10-01 · structural · oat gate review · final

target=claude-opus-5-5-high threshold=high findings=critical:0,high:0,medium:0,low:3 exit=0 status=ok artifact=.oat/projects/shared/markdown-docs-bootstrap/reviews/final-review-2026-10-01T193637Z.md run=39b33a8d-8a63-41e5-af34-145a5d525935

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
