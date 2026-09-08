---
id: BL-260907-make-the-completion-seal
title: Make the completion seal append idempotent so pre-archive interruptions
  can resume
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - lifecycle
  - project-log
  - wave-5-followup
assignee: null
created: 2026-09-07T11:53:58.493Z
updated: 2026-09-08T16:55:27.000Z
associated_issues: []
external_plans: []
---

## Description

Wave-5 p09 (2026-09-02-defer-activeproject-clearing-on-archive-completions.md) parked on its own STOP condition: the plan's resume design states that Step 3.7's status probe sees the existing seal and skips the append, but oat project log check has no seal awareness (status union ok|absent|synthesis_pending; check.ts:35), the seal append passes no idempotency key and embeds a fresh timestamp (SKILL.md:680), and replaying the skill's exact seal invocation appended a second seal both times. Widening the Step 6 guard as the plan requires would keep the pointer alive through the whole network-bearing closeout and turn every interruption into a second seal, breaking the skill's own 'No project-log append may follow the seal' contract (pinned at review-skill-contracts.test.ts:1458). Options: (a) expose seal presence on oat project log check or give append seal-aware dedupe (CLI change under packages/cli/src/commands/project/log/\*\*); (b) extend the Step 3.65 retry router to shared archive completions so project-log lands in SKIPPED_MUTATIONS. The plan needs a refresh or supersession before p09 can run; its parked steps 1/2/3/5 patch is preserved by the wave orchestrator.

## Triage narrowing (2026-09-08)

The CLI already has the idempotency primitive (`packages/cli/src/commands/project/log/append.ts:1021` `idempotencyToken`, `:1107` `idempotencyKey`, `:1118` `already-appended`), so the scope is wiring plus a check-side probe: `oat project log check` reports an existing completion seal; the seal append passes a key; old unkeyed seals are recognized; the shipped prose workaround (`oat-project-complete/SKILL.md:734-741`, grep-for-seal) is replaced; sweep and roll-up appends are blocked after sealing. The parked W5 p09 plan must be refreshed onto this before its patch is replayed (plan refresh first, then the lane). Supersedes `BL-260902-defer-activeproject-clearing` (closed at this triage).

## Acceptance Criteria

- [ ] `oat project log check` (or `append`) can detect an existing completion seal so a repeated seal append is a no-op reported as already-appended
- [ ] The `2026-09-02-defer-activeproject-clearing-on-archive-completions.md` plan is refreshed or superseded so its pre-archive resume path rests on the new seal idempotence (or on the Step 3.65 router covering shared archive completions)
- [ ] Wave-5 p09's parked patch (steps 1, 2, 3, 5) is re-applied and the plan's seven test cases pass, including exactly one seal entry after a pre-archive interruption
