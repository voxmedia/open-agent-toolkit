---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-08-31
---

# Project Log: tool-pack-scope-provider-truthfulness

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

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
