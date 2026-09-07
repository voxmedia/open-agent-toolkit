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
updated: 2026-09-07T11:53:58.493Z
associated_issues: []
external_plans: []
---

## Description

Wave-5 p09 (2026-09-02-defer-activeproject-clearing-on-archive-completions.md) parked on its own STOP condition: the plan's resume design states that Step 3.7's status probe sees the existing seal and skips the append, but oat project log check has no seal awareness (status union ok|absent|synthesis_pending; check.ts:35), the seal append passes no idempotency key and embeds a fresh timestamp (SKILL.md:680), and replaying the skill's exact seal invocation appended a second seal both times. Widening the Step 6 guard as the plan requires would keep the pointer alive through the whole network-bearing closeout and turn every interruption into a second seal, breaking the skill's own 'No project-log append may follow the seal' contract (pinned at review-skill-contracts.test.ts:1458). Options: (a) expose seal presence on oat project log check or give append seal-aware dedupe (CLI change under packages/cli/src/commands/project/log/\*\*); (b) extend the Step 3.65 retry router to shared archive completions so project-log lands in SKIPPED_MUTATIONS. The plan needs a refresh or supersession before p09 can run; its parked steps 1/2/3/5 patch is preserved by the wave orchestrator.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
