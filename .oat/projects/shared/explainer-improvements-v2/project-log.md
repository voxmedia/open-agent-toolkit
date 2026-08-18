---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-08-14
---

# Project Log: explainer-improvements-v2

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

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:4,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T002327Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T004027Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:4,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T005429Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T012159Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T012720Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T013953Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T015212Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:3,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T021300Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:4,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T023457Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:4,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T024804Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important exit=124 status=review_failed

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T031926Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T033345Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T034831Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T040012Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:3,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T042235Z.md

### 2026-08-06 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:2,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-improvements-v2/reviews/artifact-plan-review-2026-08-06T043754Z.md

### 2026-08-06 · structural · oat-project-implement · p03

Phase p03 passed after 11 tasks, two bounded recoveries, and three review cycles; final review: reviews/archived/p03-review-2026-08-06T235124Z.md.

### 2026-08-14 · structural · oat-project-implement · p01

Phase p01 completed 6/6 tasks on 2026-08-06; its focused correction passed at `c1d5a1b0994e19abb2b349b776ba3235f8955b52` in `reviews/archived/p01-t06-review-2026-08-06T174423Z.md`.

### 2026-08-14 · structural · oat-project-implement · p02

Phase p02 completed 2/2 tasks on 2026-08-06; the corrected canonical-link and internal-reference range passed at `3f0dfe5e3131ee2ef12bd06cf4eb842566b50ca9` in `reviews/archived/p02-review-2026-08-06T202708Z.md`.

### 2026-08-14 · structural · oat-project-implement · p04

Phase p04 completed 6/6 tasks on 2026-08-07 after two automatic fixes, two operator-authorized scope decisions, and the terminal p04-t05/p04-t06 re-review at `098e1780b86116492073513614f64835aa470030`; immutable artifact: `reviews/archived/p04-t04-review-2026-08-07T200546Z.md`.

### 2026-08-14 · structural · oat-project-implement · p05

Phase p05 completed 4/4 tasks on 2026-08-07 and passed its narrowed guidance re-review at `836d850147f067a59d6d4fd06edfd4d8f568e780` in `reviews/archived/p05-review-2026-08-07T211756Z.md`.

### 2026-08-14 · structural · oat-project-review-receive · final-reconciliation

The reconciled final review at `3da933d4e2d5ebd9764616fb0110b4794598fdd7` superseded the preliminary pass and recorded 1 Critical, 1 Important, 3 Medium, and 3 Minor findings in `reviews/archived/final-review-2026-08-07T215000Z.md`; all eight were authorized as p06 fix work.

### 2026-08-14 · structural · oat-project-implement · p06

Phase p06 completed 5/5 bounded final-review tasks in commits `634463e0c207b45fbb9fe9985840e0b6fdab1b40` through this bookkeeping commit. Task-level security, release, ledger, integration, and repository gates passed; serial completion gates and the fresh full final review remain pending.

### 2026-08-16 · structural · oat-project-review-provide · final

Fresh full final review over 5f76ade9..07e2c96d7 recorded 1 Critical, 2 Important, 8 Medium, and 7 Minor findings in reviews/final-review-2026-08-16T232006Z.md; the Critical publish-request/v1 root-validation bypass blocks project close.

### 2026-08-17 · structural · oat-project-implement · p07

Phase p07 stopped direction-required after 4/16 tasks at 143e15a86: p07-t03's strict root-correspondence rule regressed tools/smoke/explainer-kit/wrapper-compatibility.test.mjs (2/5 fail), refuted by the repo's own CloudFront origin-path fixture; phase_recovery_limit=0 forbids automatic recovery. p07-t01/t02/t04 verified clean.

### 2026-08-17 · structural · oat-project-implement · p07-t03

Operator authorized changed scope for p07-t03 after cross-model advisory: remove the unsound root-correspondence rule rather than narrow it, surface protected-mode uncertainty as catalog verification state, and file authenticated public-URL verification as backlog BL-260817-verify-protected-mode-public.

### 2026-08-17 · structural · oat-project-implement · p07

Phase p07 passed at bcf479807 after 16 tasks and one bounded fix round: review round 1 (reviews/p07-review-2026-08-17T053431Z.md) found 1 Critical + 2 Important from one propagation-gap pattern concealed by self-consistent fixtures; fix round p07-fix-001 made the catalog access policy a required argument and swept 30 call sites; review round 2 (reviews/p07-review-2026-08-17T061620Z.md) mutation-tested the fixtures and passed with 0 Critical / 0 Important.

### 2026-08-17 · structural · oat-project-review-provide · final

Narrowed final review over 07e2c96d7..68196ba71 recorded 0 Critical, 2 Important, 9 Medium, 7 Minor in reviews/final-review-2026-08-17T064111Z.md; 16 of 18 source findings fully resolved, 2 partial. Both Important findings are project-scope release-hygiene issues outside p07's task scope: initiative-catalog/v1 wire shape changed without a version bump against published 0.2.30, and all five public packages sit below main at 0.2.29 with no gate detecting it.

### 2026-08-17 · structural · oat-project-review-provide · final

Final review round 3 over 68196ba71..8eb45413e (reviews/final-review-2026-08-17T092205Z.md) recorded 0 Critical, 1 Important, 10 Medium, 8 Minor: catalog-versioning Important closed and v1-replay determination verified sound; version-drift Important half-open via an oat-project-complete 1.6.1 merge version collision failing CI's validate-skill-version-bumps gate, which no root package.json script runs. Fixed root-inline as final-fix-002 (5e6fcc83b, recorded deviation); all nine gates including the CI skill-bump gate verified with explicit exit codes after a vacuous-marker harness defect was found and corrected in the root's own gate runner.

### 2026-08-17 · structural · oat-project-implement · final

Final review passed at 97e5853d2 after six rounds and five bounded fix batches (reviews/final-review-2026-08-17T142743Z.md: 0 Critical, 0 Important, 0 Medium, 1 Minor converted and fixed as final-fix-005 at 0c8382fa1). All ten gates green with explicit exit codes; every deferred finding lives in one of six named backlog items. Implementation complete: 50 tasks, 7 phases; ready for oat-project-pr-final.

### 2026-08-18 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/explainer-improvements-v2/references/project-retro.md evidence_used=archived-review-markdown,backlog-items,current-session-transcript,decision-records,git-history,lifecycle-artifacts,project-log evidence_unavailable=oat-execution-learnings,prior-session-transcripts promotions=5 upstream=0 apply=performed filing=performed

## End-of-run synthesis (implementation complete; final review pending)

Implementation completed all 34 tasks and adopted two load-bearing adjustments:
closed local terminal evidence replaced open-ended provider-text scrubbing, and
publication acceptance now binds canonical roots to exact manifest plus
auxiliary-catalog evidence. No observation has been graduated to a separate
repository ledger or backlog item. The lifecycle verdict, project completion,
and archival remain pending until the serial completion gates and fresh final
review pass.
