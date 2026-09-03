---
oat_generated: true
oat_generated_at: 2026-09-03
oat_project: tool-pack-scope-provider-truthfulness
---

# Project Summary: tool-pack-scope-provider-truthfulness

## Overview

OAT reported several distinct facts under overloaded labels — declared pack
intent, realized canonical assets, provider-view materialization, running-session
catalog visibility, and native dispatch outcome — and those facts could
disagree. A user could select user scope while the picker implied project
placement; canonical agents could be complete while the active provider could
not discover them; and a generic-child fallback could be mistaken for native-role
success.

This project established one evidence model shared by the picker, installation,
inventory, synchronization, diagnostics, and dispatch reporting, and integrated
four bounded child workstreams without erasing their ownership.

## What Was Implemented

Seven phases, 30 tasks, over eight days.

- **Truthful scope (P1-P2).** Requested tool-pack scope and realized placement
  are separately observable. The picker labels packs from realized placement
  rather than declared intent, and a `User scope` selection no longer widens to
  `project + user`.
- **Provider reachability (P3).** Supported user-scope agents materialize to
  every active configured provider — Claude agents now reach
  `~/.claude/agents/` — or fail closed with a named reason.
- **Collection aliases (P4).** Exact provider collection aliases are adopted and
  detached safely, with manifest tracking and fail-closed handling of unsafe
  links. Alias _creation_ is not shipped; see Known Gaps.
- **Project guidance (P5).** A repository-root `AGENTS.md` is created when
  absent. An existing file is never modified: OAT emits a deterministic manual
  patch instead, after review reproduced a filesystem race in which replacing an
  existing file could destroy user content.
- **Dispatch provenance (P6).** One neutral generic dispatch record plus
  namespaced `oat` evidence, with closed pre-start rejection codes, 31 immutable
  configured controls, exactly one fallback per trigger, and an append-only
  `link`-only project journal that never replaces or removes a published
  revision.
- **Runtime observation (P7).** Optional metadata-only corroboration for Codex
  and Claude, projected to a neutral six-key fact set, correlated against the
  immutable configured invocation and never authoritative over it.

## Verification

All eight Definition-of-Done gates pass at `0.2.52`, forced under an isolated
`HOME` with zero cache replays: `check`, `type-check`, `test` (5,423 passing),
`build`, `check:skill-bumps`, `release:check-versions`, `release:validate`,
`build:docs`.

Thirty-five phase code-review artifacts were produced across the seven phases
(p01:1, p02:6, p03:6, p04:9, p05:5, p06:4, p07:4), plus three artifact reviews,
an Opus final review, and a cross-model gate review on Cursor
`gpt-5.6-sol-xhigh` that ran three fix rounds and a confirmation.

Provider parsing was verified against real artifacts rather than fixtures alone:
a live nested Codex dispatch (root, depth-1, depth-2) and full-corpus sweeps
through the production input path — 1,596 Codex rollouts and 2,740 Claude
transcripts, zero refusals.

## Known Gaps

Four are recorded rather than hidden:

- **FR1/FR3 provider reachability** is defined as a type but never populated;
  every lifecycle path hard-codes `providers: []`.
  `BL-260903-populate-provider-reachability`.
- **NFR1 prose redaction** is best-effort, not a guarantee. Absolute paths are
  rejected in identity and control fields; in prose, colon-prefixed forms, URL
  routes, and trailing-slash candidates survive. Amended in `spec.md`.
- **Collection alias creation** (`BL-260724`) is not shipped; behavior is
  adopt-only. Left open deliberately.
- **Claude lineage depth** is not derivable and `__proto__`-named config keys are
  dropped by the shared JSON parser.
  `BL-260903-close-claude-runtime-lineage`, `BL-260903-preserve-proto-named-config`.

## Lessons

The most reusable finding is about verification rather than the feature. Three
defects shipped green behind tests that could not fail: invented Codex fixtures
that encoded a rollout shape which does not exist, an FR10 test that mocked the
very reader that dropped the field, and NFR1 verified only on the surface that
had already been fixed. Every preceding review round was the same model class as
the implementer, and they converged on the same reading of each requirement and
reinforced it; a different model reading the requirement text fresh found all
three on its first pass.

## Workflow Observations

### 2026-08-31 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important exit=1 status=review_failed

### 2026-08-31 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:0,minor:2 exit=0 status=ok artifact=.oat/projects/shared/tool-pack-scope-provider-truthfulness/reviews/artifact-plan-review-2026-08-31T003934Z.md

### 2026-08-31 · structural · oat-project-implement · p01-invalid-run

p01 launch dispatch-p01-20260831T052104Z-99d6de317 stopped as INVALID_RUN_ABORT before work: configured base 99d6de317a22aa70e8f68027936060d03907ffcf did not match clean HEAD 99d6de317cb1c670b8a1bc92efc4a57300de74fd; zero edits, commits, tests, or recovery attempts.

### 2026-08-31 · structural · oat-project-implement · p01-relaunch-authorized

Thomas explicitly authorized a new p01 launch after the prior invalid-run abort; the aborted launch made zero edits or commits, and the corrected run will start from the clean post-abort bookkeeping head.

### 2026-08-31 · structural · oat-project-implement · p01-passed

p01 completed at 940e87e5663bb6c36d8f7d7bfbb6db67d482b3e8 and independent High review passed with critical:0, important:0, medium:0, minor:1; the non-blocking lifecycle wording finding was applied in root bookkeeping; review artifact: reviews/p01-review-2026-08-31T115349Z.md.

### 2026-08-31 · structural · oat-project-implement · p02-blocked

p02 completed 7 planned tasks plus two validated recoveries and two review-fix commits, but its third governed High review remained blocked with important:2 at 9d557564faa2430001483ed823a07d2cc920a3c1. Do not start p03 without explicit human disposition. Artifacts: reviews/p02-review-2026-08-31T132646Z.md, reviews/p02-review-2026-08-31T142211Z.md, reviews/p02-review-2026-08-31T144935Z.md.

### 2026-08-31 · structural · oat-project-implement · p02-extension-authorized

Thomas authorized exactly one additional bounded p02 correction and one additional independent High review cycle for the two Important findings in reviews/p02-review-2026-08-31T144935Z.md; another blocking review is terminal.

### 2026-08-31 · structural · oat-project-implement · p02-blocked-round4

Operator-authorized fix e85ba38ae575e193a7084f1046798ca0827f6bef resolved both round-3 findings, but terminal High review round 4 remained blocked with critical:0, important:1 after direct multi-pack/multi-scope recovery reproduction. Reconnaissance was attempted and reconciled in reviews/p02-review-2026-08-31T155718Z.md; no automatic fifth cycle or p03 launch is authorized.

### 2026-08-31 · structural · oat-project-implement · p02-round5-authorized

Thomas authorized exactly one bounded correction for the Important multi-pack/multi-scope recovery finding in reviews/p02-review-2026-08-31T155718Z.md and one fresh independent High review round; a blocking round 5 is terminal and p03 remains gated.

### 2026-08-31 · structural · oat-project-implement · p02-blocked-round5

Operator-authorized fix 4e1cbac86f3f0bb5acefe446d8df8c81df3f025f covered every selected pack and invalidated scope, but terminal High review round 5 remained blocked with critical:0, important:1 because recovery prose contradicted canonical.status unchanged. Reconnaissance was attempted and reconciled in reviews/p02-review-2026-08-31T164057Z.md; p03 was not launched.

### 2026-08-31 · structural · oat-project-implement · p02-final-correction-authorized

Thomas authorized the fifth and final review-fix retry for the recovery-prose contradiction in reviews/p02-review-2026-08-31T164057Z.md plus one fresh independent High review; a blocking review is terminal and a passing review advances directly to p03.

### 2026-08-31 · structural · oat-project-implement · p02-passed

Final fix eb218a7a2463e580e1ddb8c0bed5b9998d25e0ab made recovery prose derive from canonical status; independent High review passed with critical:0, important:0, medium:0, minor:0 at reviews/p02-review-2026-08-31T170932Z.md. p02 completed 7/7 tasks and p03 may begin.

### 2026-08-31 · structural · oat-project-implement · p03-blocked-round3

p03 completed five planned tasks, one validated recovery, and two review-fix commits, but its third governed High review remained blocked with critical:0, important:2 at d7762061f9db31db06160a1b87eeca08981dd39a. Invalid provider scope writes and core human apply-result truth remain. Reconnaissance was attempted and reconciled in reviews/p03-review-2026-08-31T202630Z.md; no fourth cycle or p04 launch is authorized without explicit operator disposition.

### 2026-08-31 · structural · oat-project-implement · p03-round4-authorized

Thomas explicitly authorized exactly one bounded correction for the two Important findings in reviews/p03-review-2026-08-31T202630Z.md and one fresh independent High review round; a blocking round 4 is terminal and p04 remains gated until a passing review.

### 2026-08-31 · structural · oat-project-implement · p03-round4-fix-complete

Operator-authorized fix cb8156ab27a864e86fafcd857f7d98ecbb8266c1 rejects invalid provider scopes before resolution or writes and renders core human apply outcomes truthfully. Focused 131, expanded p03 504, and full repository tests pass; fresh independent High review round 4 is next and p04 remains gated.

### 2026-08-31 · structural · oat-project-implement · p03-blocked-round4

Operator-authorized fix cb8156ab27a864e86fafcd857f7d98ecbb8266c1 resolved both round-3 defects, but terminal High review round 4 remained blocked with critical:0, important:1 because every production refresh policy is unknown and no HiLL acceptance of the FR7 first-release limitation is recorded. Reconnaissance was attempted and reconciled in reviews/p03-review-2026-08-31T223136Z.md; no fifth cycle or p04 launch is authorized.

### 2026-08-31 · structural · oat-project-implement · p03-session-policy-hill-authorized

Thomas resolved the p03 refresh-policy HiLL boundary: after a successful provider-visible file change, OAT will conservatively advise starting a new provider session. This is repository-decision safety guidance, not a provider hot-reload guarantee or runtime visibility proof; one bounded correction and one fresh High review are authorized, with p04 gated on pass.

### 2026-08-31 · structural · oat-project-implement · p03-session-policy-fix-complete

Operator-authorized HiLL policy fix a65ba0ce2f30d072666938c16de79e6a561e40d2 makes successful provider-visible changes conservatively advise starting a new provider session through dated repository-decision provenance. Unsupported/no-op/failed cases remain advice-free or unknown, focused 317 and expanded p03 509 plus full tests pass; fresh High review is next and p04 remains gated.

### 2026-08-31 · structural · oat-project-implement · p03-blocked-round5-session-policy

Approved policy fix a65ba0ce2f30d072666938c16de79e6a561e40d2 resolved the unknown-policy blocker, but terminal High review round 5 remained blocked with critical:0, important:1, medium:2 because exact successful provider configuration changes are filtered out of new-session advice. Reconnaissance was not attempted in reviews/p03-review-2026-08-31T234602Z.md; no additional correction or p04 launch is authorized without operator direction.

### 2026-08-31 · structural · oat-project-implement · p03-round6-authorized

Thomas authorized one bounded correction for the exact config-only new-session advice gap and adjacent provider-policy precedence guardrail in reviews/p03-review-2026-08-31T234602Z.md, followed by one fresh independent High review. A blocking review is terminal for this authorization; p04 remains gated until pass.

### 2026-09-01 · structural · oat-project-implement · p03-round6-fix-complete

Operator-authorized fix 5f3bc57a0e785224ff25fad007cf0a7ee1c0d118 covers exact config-only new-session advice and registry policy precedence/provenance. Focused 326, expanded p03 518, and full repository tests pass; fresh independent High review is next and p04 remains gated.

### 2026-09-01 · structural · oat-project-implement · p03-passed

Final p03 fix 5f3bc57a0e785224ff25fad007cf0a7ee1c0d118 resolved config-only refresh advice and policy-provenance guardrails; fresh independent High review passed with critical:0, important:0, medium:0, minor:0 at reviews/p03-review-2026-09-01T002159Z.md. Phase 3 is complete and p04 may begin.

### 2026-09-01 · structural · oat-project-implement · p04-implementation-complete

p04 completed five planned commits plus recovered composition attempt 1/10 at 7be0d56dfe69791982fae373882c3d96dac981eb. Collection aliases are restricted to registry-supported skills; phase 368, live CLI 4823, full repository tests, static checks, and whitespace pass. Independent High review is next; p05 remains gated.

### 2026-09-01 · structural · oat-project-implement · p04

Phase 4 stopped at the terminal five-round review boundary with one Critical deferred-directory-copy collision; operator governance is required. Review orchestration and attempted reconnaissance evidence are recorded in reviews/p04-review-2026-09-01T013028Z.md, reviews/p04-review-2026-09-01T020351Z.md, reviews/p04-review-2026-09-01T023939Z.md, reviews/p04-review-2026-09-01T031017Z.md, and reviews/p04-review-2026-09-01T033543Z.md.

### 2026-09-01 · structural · oat-project-implement · p04-blocked-round7-repeated-sync

Operator-authorized fail-closed fix 567f9ae0a3d39d9986e517924551e6381058d27e blocks directory copy within one apply, but terminal High review found that persisted collection detachment lets the next unchanged sync reach ordinary copy; critical:1, important:0 in reviews/p04-review-2026-09-01T210000Z.md. Reconnaissance was not attempted; no further correction or Phase 5 launch is authorized.

### 2026-09-01 · structural · oat-project-implement · p04-review-r8-terminal

Phase 4 terminal review verdict=blocked with 1 Critical after 7 review-fix continuations; see reviews/p04-review-2026-09-01T220158Z.md. The one-use authorization is exhausted and p05 remains gated.

### 2026-09-02 · structural · oat-project-implement · p05

Authorized Phase 5 review at 191984571 is blocked with 2 Critical and 3 Important findings; reconnaissance attempted and reconciled in reviews/p05-review-2026-09-02T124148Z.md; the one-use override is exhausted and Phase 6 remains gated.

### 2026-09-03 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/tool-pack-scope-provider-truthfulness/references/project-retro.md evidence_used=archived-review-markdown,git-history,lifecycle-artifacts,project-log,session-transcript evidence_unavailable=oat-execution-learnings promotions=3 upstream=2 apply=declined filing=deferred

### 2026-09-03 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/tool-pack-scope-provider-truthfulness/references/project-retro.md evidence_used=archived-review-markdown,git-history,lifecycle-artifacts,project-log,session-transcript evidence_unavailable=oat-execution-learnings promotions=3 upstream=2 apply=performed filing=performed
