---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-08-31
---

# Project Log: remote-project-management

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

### 2026-08-31 · structural · oat gate review · design

target=claude-fable-skip-permissions threshold=important exit=1 status=review_failed

### 2026-08-31 · structural · oat gate review · design

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:3,important:4,medium:4,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/remote-project-management/reviews/artifact-design-review-2026-08-31T010815Z.md

### 2026-08-31 · structural · oat gate review · design

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/remote-project-management/reviews/artifact-design-review-2026-08-31T012755Z.md

### 2026-08-31 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important exit=1 status=review_failed

### 2026-08-31 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important exit=1 status=review_failed

### 2026-08-31 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:2,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/remote-project-management/reviews/artifact-plan-review-2026-08-31T021338Z.md

### 2026-08-31 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/remote-project-management/reviews/artifact-plan-review-2026-08-31T022727Z.md

### 2026-08-31 · structural · oat gate review · plan

target=cursor-fable-5-xhigh threshold=important findings=critical:0,important:0,medium:1,minor:1 exit=0 status=ok artifact=.oat/projects/shared/remote-project-management/reviews/artifact-plan-review-2026-08-31T025155Z.md

### 2026-08-31 · structural · oat-project-implement · p01

verdict=BLOCKED fix_loops=0 review=not-launched tasks=10/10 focused=417/417 full_cli=failed-twice stop=direction-required event=p01-phase-test-20260831T0457Z

### 2026-08-31 · structural · oat-project-implement · p01

verdict=verification-recovered merge=4fa5390d1 upstream=2c6005d64 pr=249 full_cli=4688/4688 cached=0 repair=not-needed recovery_attempts=0/10 next=independent-review

### 2026-08-31 · structural · oat-project-implement · p01

stop=review-governance-exhausted cycles=3/3 fix_loops=2 terminal_artifact=reviews/artifact-p01-code-final-review-2026-08-31T063219Z.md critical=2 important=0 direction=required

### 2026-08-31 · structural · oat-project-implement · p01

verdict=BLOCKED tasks=10/10 verification=passed focused=426/426 full_cli=4697/4697 review=blocked cycles=3 fix_loops=2 commits=7b927ed8a,306bdd9dc next=operator-direction

### 2026-08-31 · structural · oat-project-implement · p01

operator-extension=authorized review_fix_limit=3 prior_used=2 extra_fix_rounds=1 extra_review_rounds=1 scope=two-terminal-critical-findings target_implementer=oat-phase-implementer-gpt-5-6-sol-high target_reviewer=oat-reviewer-gpt-5-6-sol-high phase2=not-authorized-before-pass

### 2026-08-31 · structural · oat-project-implement · p01

operator-extension-fix=DONE round=3/3 commit=a13b3b4a8 files=5 focused=190/190 combined=444/444 full_cli=4715/4715 cached=0 next=fresh-independent-review

### 2026-08-31 · structural · oat-project-implement · p01

verdict=PASS tasks=10/10 fix_loops=3 review_cycles=4 operator_extension=used review_artifact=reviews/artifact-p01-code-operator-review-2026-08-31T122741Z.md findings=critical:0,important:0,medium:4,minor:0 focused=444/444 full_cli=4715/4715 next=p02

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
