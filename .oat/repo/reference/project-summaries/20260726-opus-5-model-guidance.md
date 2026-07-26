---
oat_generated: true
oat_generated_at: 2026-07-26
oat_project: opus-5-model-guidance
oat_workflow_mode: quick
oat_summary_last_task: p07-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Project Summary: Opus 5 Model Guidance

## Overview

Qualify Claude Opus 5 and adopt it as the incumbent in the repository's
canonical model-selection guidance, then ship the Cursor routes that make it
reachable from managed dispatch.

The project ran in quick mode. It began from an Anthropic release-notes handoff
and was reconciled mid-flight against a human-approved cross-model research
synthesis, which superseded the original pre-release plan. The retired
artifacts are preserved at `references/pre-synthesis-discovery.md` and
`references/pre-synthesis-plan.md`; task IDs restart at `p04` because the
earlier IDs were not reused.

## What Was Implemented

**Canonical guidance.** Opus 5 became the hard-reasoning and consequential
incumbent across `.agents/skills/subagent-orchestration/`. Opus 4.8 was
repositioned for cyber-sensitive work on its predictable refusal behavior. The
task-class ladder and Opus-first policy did not change — only the incumbent and
its metadata. Skill version 1.0.0 → 1.0.1.

**Cursor pins.** Six mappings: five `claude-opus-5` effort rungs (low through
max) plus `claude-opus-4-8[effort=xhigh]`, the last catalogued but withheld
from the bundled recommendation. Twelve generated role files followed.

**Recommendation rebalance.** Version `2026-07-11.1` → `2026-07-25.1`. Opus 5
spans the Cursor `balanced`, `high`, and `frontier` tiers.
`claude-sonnet-5-high` was dropped from `economy`, where CursorBench 3.2 showed
Opus 5 low strictly dominating it on score, cost, tokens, and steps. The
supported catalogue is now 18 flat IDs against 16 recommended candidates.

**Evidence contract.** Approved mappings may carry a probe record whose
`submittedSelector` must equal the mapping's `frontmatterModel` and whose
`resolvedModel` must equal its `ladderModelId`, so a mapping edited without
re-probing fails its own test rather than inheriting an approval that never
covered it.

**Documentation.** A durable runbook at
`apps/oat-docs/docs/contributing/verifying-cursor-pins.md` captures the
verification method, which previously existed only inside project evidence
files. Two stale catalog counts were corrected, and two uncovered operator
behaviors documented.

Five public packages bumped in lockstep to 0.2.18.

## Key Decisions

| Decision                                                        | Rationale                                                                                                  |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Five Opus 5 rungs, mirroring the `gpt-5.6-sol` pattern          | Consistency with an established family shape rather than a bespoke ladder                                  |
| Drop `claude-sonnet-5-high` from Cursor economy                 | Strictly dominated by Opus 5 low on every measured axis; mapping retained, only the recommendation changed |
| Catalogue Opus 4.8 xhigh but exclude it from the recommendation | Makes the cyber-sensitive route dispatchable without implying it is a general default                      |
| Keep Fable candidates, demote in prose                          | Removal deferred to backlog rather than bundled into this change                                           |
| Defer all pin work until a live probe existed                   | `DR-260718` forbids shipping a mapping on structural validation or self-report                             |

## Verification

The G01 probe read resolution from Cursor's own `subagentStart` lifecycle
hooks. Ten subagents ran: six subjects and four controls. All six subjects
resolved to their intended thinking variants.

The controls carried the interpretive weight. A bogus family
(`claude-opus-9`) resolved to `cursor-grok-4.5-high-fast`, which proves the
channel reports actual resolution rather than echoing the request — without
that control the entire run would be uninterpretable.

An earlier attempt failed because it ran through the headless `cursor-agent`
runtime, which emits no agent hooks.

Full workspace suite (129 tests), CLI suite (3351 tests), lint, format,
type-check, `release:validate`, and `oat sync --scope project` all pass.

## Findings Carried Forward

**Silent selector fallback.** Cursor does not reject a malformed pin; it
substitutes a default for any component it cannot resolve. An unknown family
falls back to the account default model, an unknown effort to the family
default rung — and that rung is family-specific, not always `high` (Opus 4.7
defaults to `xhigh`). A typo therefore ships a working-but-wrong model that
tracks a vendor-controlled default. Tracked as
`BL-260726-validate-cursor-pin-effort`.

**Default-rung confound.** A probe whose requested rung equals the family
default cannot distinguish an honored effort parameter from an ignored one. The
`high` row here is sound only by inference across its non-default neighbors.
Future probes must verify at least one non-default rung per family.

**Disproved assumption.** Fable resolved normally despite its NO ZDR catalog
tag, contradicting the pre-probe belief that it was entitlement-blocked. An
earlier Fable fallback on another branch remains unexplained and was not
reproduced.

**Gate `--json` contract.** Gate commands do not validate that `--json` is
present, and the flag is only valid on the `oat` invocation — not on a child
`cursor-agent` target, which rejects it. Tracked as
`BL-260726-validate-structured-output`.

## Review History

Six final reviews. The four dated 2026-07-25 predate the pins; three ran on
`gpt-5.6-sol-max` and the fourth fell back to `gpt-5.6-sol-xhigh` after the max
exec target was removed from user config mid-cycle.

The two dated 2026-07-26 cover Phase 7 and ran on `gpt-5.6-sol-xhigh`. Four
rounds were needed: 3 important plus 3 medium, then 1 important plus 2 medium,
then 1 important, then zero findings at every severity.

Every blocking finding was in the guidance and provenance layer. The mappings,
probe evidence, generated roles, and recommendation assets reviewed clean from
the first round. The recurring defect was the stale cross-reference: changing
one file and leaving a now-false claim in another. Two rounds were caused by
the immediately preceding round's own fix.

## Deviations

Phase 7 did not exist in the plan. Phases 4 through 6 deferred all Cursor pin
work pending live probe evidence, and the phase was added only after that
evidence existed. The plan, reverification record, and discovery success
criteria were reconciled afterward to reflect that the deferral was resolved
rather than still standing.

## Workflow Observations

### 2026-07-25 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-max threshold=important findings=critical:0,important:2,medium:2,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/opus-5-model-guidance/reviews/archived/artifact-plan-review-2026-07-25T004651Z.md

### 2026-07-25 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-max threshold=important findings=critical:1,important:1,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/opus-5-model-guidance/reviews/archived/artifact-plan-review-2026-07-25T005730Z.md

### 2026-07-25 · structural · oat gate review · final

target=cursor-gpt-5-6-sol-max threshold=important findings=critical:0,important:2,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/opus-5-model-guidance/reviews/archived/final-review-2026-07-25T211041Z.md

### 2026-07-25 · structural · oat gate review · final

target=cursor-gpt-5-6-sol-max threshold=important findings=critical:0,important:2,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/opus-5-model-guidance/reviews/archived/final-review-2026-07-25T212332Z.md

### 2026-07-25 · structural · oat gate review · final

target=cursor-gpt-5-6-sol-max threshold=important findings=critical:0,important:2,medium:1,minor:1 exit=1 status=blocked artifact=.oat/projects/shared/opus-5-model-guidance/reviews/archived/final-review-2026-07-25T212319Z.md

### 2026-07-26 · structural · oat-project-review-provide · final

Delegated reconnaissance completed and was reconciled by the primary reviewer; artifact=.oat/projects/shared/opus-5-model-guidance/reviews/archived/final-review-2026-07-26T040908Z.md

### 2026-07-26 · structural · oat-project-review-provide · reviews/archived/final-review-2026-07-26T165653Z.md

Completed gate-originated final code review with bounded reconnaissance; see reviews/archived/final-review-2026-07-26T165653Z.md.

### 2026-07-26 · structural · oat gate review · final

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:2,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/opus-5-model-guidance/reviews/archived/final-review-2026-07-26T165653Z.md

### 2026-07-26 · structural · oat gate review · final

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:1,medium:0,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/opus-5-model-guidance/reviews/archived/final-review-2026-07-26T172447Z.md

### 2026-07-26 · structural · oat gate review · final

target=cursor-gpt-5-6-sol-xhigh threshold=important findings=critical:0,important:0,medium:0,minor:0 exit=0 status=ok artifact=.oat/projects/shared/opus-5-model-guidance/reviews/archived/final-review-2026-07-26T173526Z.md
