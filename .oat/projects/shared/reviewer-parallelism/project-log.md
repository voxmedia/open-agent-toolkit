---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-07-18
---

# Project Log: reviewer-parallelism

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
### 2026-07-18 · <project|general> · <bug|friction|worked-well|feedback> · <area>
```

Structural entries:

```text
### 2026-07-18 · structural · <producer> · <ref>
```

## Entries

Entries are chronological and append-only.

### 2026-07-18 · structural · oat-project-implement · p01

Accepted Phase p01 implementer dispatch; run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-1.

### 2026-07-18 · structural · oat-project-implement · p01-review

Accepted root-owned Phase p01 reviewer dispatch; run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-1.

### 2026-07-18 · structural · oat-project-implement · p01-outcome

Phase p01 passed root-owned review with zero fix iterations; run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-1.

### 2026-07-18 · structural · oat-project-implement · p02-outcome

Phase p02 passed root-owned review with zero findings and zero fix iterations; run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-2.

### 2026-07-18 · structural · oat-project-implement · p03-review-fix-1

Phase p03 review found one Critical release-version reuse issue. Added bounded correction task p03-t03 to select the next shared unpublished version from current upstream/npm evidence, regenerate release surfaces, and rerun full validation before focused re-review.

### 2026-07-18 · structural · oat-project-implement · p03-review-fix-1-complete

Completed p03-t03 in cde08669: selected upstream-derived unpublished lockstep version 0.2.1, regenerated release surfaces, and passed full validation plus immediate npm uniqueness checks. Proceeding to focused Phase p03 re-review.

### 2026-07-18 · structural · oat-project-implement · p03-outcome

Phase p03 passed focused re-review after one bounded fix iteration; release version 0.2.1 remained unpublished across all five packages, provider sync was clean, and release/PJM validation passed. Run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-3.

### 2026-07-18 · structural · oat-project-implement · final-review

Final cross-phase review passed with zero Critical/Important findings. Two Medium findings were dispositioned: the implementation status mismatch is corrected in completion bookkeeping; p01-M1 remains an explicit non-blocking follow-up for targeted semantic assertions.

### 2026-07-18 · structural · oat-project-implement · project-complete

Implementation complete after five tasks across three phases, one Phase p03 fix iteration, and a passing final review. Release surfaces target unpublished lockstep version 0.2.1.

### 2026-07-19 · structural · oat-project-implement · revision-design

Reopened the completed reviewer-parallelism project for a reviewed revision after dogfooding showed heterogeneous review lanes were flattened to one economical model. Drafting a lightweight design that separates advisory role from per-lane task-class floor while preserving root-reviewer judgment.

### 2026-07-19 · structural · oat-project-implement · revision-design-fix-1

Applied the two Important design-review corrections: reviewer task-class fields are generic-optional/reviewer-required with exact request-record/floor-safe fallback semantics and an instruction-only Cursor nested-native boundary; release baselines now use upstream skill 1.1.4 -> 1.1.5 and next-unused public patch selection (currently 0.2.2).

### 2026-07-19 · structural · oat-project-implement · revision-design-pass

Supplemental model-class-aware design passed focused artifact re-review with zero findings after one correction iteration. Proceeding to plan amendment for one sequential revision phase.

### 2026-07-19 · structural · oat-project-implement · revision-plan

Drafted Phase p04 from the approved supplemental design: one contract/test task, one docs task, one provider/release task, and a mixed-class dogfood phase-review acceptance gate. Testing stays semantic and reuses existing focused/release validation.

### 2026-07-19 · structural · oat-project-implement · revision-plan-pass

Phase p04 amendment passed artifact review with one Minor checklist wording correction applied during receipt. Reopening implementation at p04-t01.

### 2026-07-19 · structural · oat-project-implement · p04

Accepted Phase p04 implementer dispatch; task commits 7b90e802, b741820b, and 56eeecc4; run record will be finalized in implementation.md#run-4.

### 2026-07-19 · structural · oat-project-implement · p04-review-orchestration

Phase p04 review orchestration: mechanical-recon launched on composer-2.5-fast and completed; intelligent-recon floor was unsatisfied in the nested catalog and correctly stayed inline with no downgrade; primary reconciliation and evidence: reviews/archived/p04-review-2026-07-19T005827Z.md.

### 2026-07-19 · structural · oat-project-implement · p04-review-fix-1

Phase p04 review found one Important authority/model-floor contradiction and one Medium commit-scope deviation. Added bounded fixes for the recon baseline, plain-language advertised-model wording, root-owned orchestration log handoff, regenerated views, and a root-native mixed-class re-review.

### 2026-07-19 · structural · oat-project-implement · upstream-merge

Merged origin/main at 8fc8285c before Phase p04 review fixes. Preserved upstream Cursor native skill/subagent materialization and this branch's task-class-aware dispatch contract; focused dispatch/Cursor tests pass 146/146.

### 2026-07-19 · project · feedback · Cursor parent-inline fallback

Accepted Cursor reviewer behavior: delegate suitable mechanical lanes to Composer 2.5 Fast; when no nested model choice satisfies an intelligent-or-stronger floor, the primary reviewer completes that lane inline. Full pinned oat-reviewer variants are not recursively reused as recon workers; dedicated pinned recon roles remain a future option only if evidence justifies their maintenance cost.

### 2026-07-19 · structural · oat-project-implement · p04-fix-1

Accepted review-fix commits ede972ce, e9f49294, and 67db4f8c after merged-upstream reconciliation. Focused contracts pass 162/162, workspace plus smoke tests pass 3409/3409, full release validation passes at unpublished 0.2.2, and provider dry-run is clean.

### 2026-07-19 · structural · oat-project-implement · p04-review-orchestration

Phase p04 re-review used one Composer 2.5 Fast mechanical lane and parent-inline intelligent coverage after the stronger nested floor was unsatisfied; dogfood passed. Evidence: reviews/archived/p04-review-2026-07-19T025353Z.md.

### 2026-07-19 · structural · oat-project-implement · p04-review-fix-2

Phase p04 re-review resolved prior findings and found one Important merge-reconciliation defect: remove two obsolete tracked Cursor wave-skill mirrors, then rerun project status, sync dry-run, and focused provider tests.

### 2026-07-19 · structural · oat-project-implement · p04-fix-2

Accepted p04-t07 commit 839de7d5: removed only the two obsolete Cursor wave-skill mirrors; provider status is 82 in sync with zero strays, sync dry-run is clean, and focused tests pass 138/138.

### 2026-07-19 · structural · oat-project-implement · p04-pass

Phase p04 passed narrow final re-review with zero findings. The prior Cursor-mirror Important is resolved, provider status is 82/82 in sync, and the class-aware dogfood pass carries forward. Evidence: reviews/archived/p04-review-2026-07-19T030013Z.md.

### 2026-07-19 · structural · oat-project-implement · final-review-orchestration

Superseding final review used one Composer 2.5 Fast mechanical lane and parent-inline intelligent coverage after the stronger nested floor was unsatisfied. Evidence: reviews/archived/final-review-2026-07-19T030944Z.md.

### 2026-07-19 · structural · oat-project-implement · final-review-fix-1

Final review found two Medium bookkeeping-only defects: restore implementation status to complete and correct three Phase 4 full task SHAs. Functional, provider, release, documentation, and security checks passed.

### 2026-07-19 · structural · oat-project-implement · final-pass

Superseding final review passed with zero findings after narrow bookkeeping re-review. Both prior Medium findings are resolved; functional, provider, release, documentation, security, and orchestration dispositions remain passing. Evidence: reviews/archived/final-review-2026-07-19T031330Z.md.

### 2026-07-19 · general · feedback · Cursor parent-inline fallback

Promoted from "### 2026-07-19 · project · feedback · Cursor parent-inline fallback" because the behavior applies to any Cursor review using nested reconnaissance: delegate mechanical lanes only when advertised capability satisfies the floor, and keep stronger unsatisfied lanes with the primary reviewer instead of downgrading.

### 2026-07-19 · structural · oat-project-implement · p04-t08-dispatch

Accepted Phase p04 implementer dispatch for p04-t08; run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-5.

### 2026-07-19 · structural · oat-project-implement · p04-t08-review-dispatch

Accepted root-owned Phase p04 review dispatch for p04-t08; run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-5.

### 2026-07-19 · structural · oat-project-implement · p04-t08-rereview-dispatch

Accepted focused root-owned Phase p04 re-review after one bounded p04-t08 fix iteration; run record: .oat/projects/shared/reviewer-parallelism/implementation.md#run-5.

### 2026-07-19 · structural · oat-project-implement · p04-t08-outcome

Phase p04 remote-review task p04-t08 passed focused root-owned re-review after one bounded fix iteration; evidence: reviews/archived/p04-review-2026-07-19T135807Z.md.

### 2026-07-19 · structural · oat-project-implement · p04-t09-dispatch

Accepted p04-t09 implementation dispatch on the configured High target; implementation commit 08c0e1cd6cbd9890742ffaefa1a973d7e424ab14 passed focused and full verification.

### 2026-07-19 · structural · oat-project-implement · upstream-merge-2

Merged current origin/main at 3ec32f0c70af343ea94ce273b402098d52693dba after final review identified the published 0.2.2 baseline; merge completed without conflicts.

### 2026-07-19 · structural · oat-project-implement · final-review-2026-07-19T141639Z

Superseding final review completed without nested reconnaissance and requested changes: 1 Critical release-version collision and 2 Important workflow/tracking findings. Evidence: reviews/archived/final-review-2026-07-19T141639Z.md.

### 2026-07-19 · structural · oat-project-implement · p04-t10-t11-dispatch

Accepted one sequential High phase-implementer dispatch for p04-t10 and p04-t11. A test-discovered autonomy-inventory mapping was handled as one bounded p04-t10 correction; final commits 5386db92679c916807314065c5ec41dda35f7bfc and 160a7e244d0f4b5da916505c8dc9a1aede33f8e0 passed the full verification gate.

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
