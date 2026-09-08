---
id: BL-260908-keep-external-plan-writes
title: Keep external-plan writes on the caller's model class in oat-repo-improve
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - repo-improve
  - orchestration
  - wave-7
assignee: null
created: 2026-09-08T21:32:11.754Z
updated: 2026-09-08T21:33:45.000Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-keep-plan-writes-on-the-callers-model.md
---

## Description

The purpose of `oat-repo-improve` is to have the smartest available model write the external plans so that execution lanes inherit correct, verified contracts. Step 2 of the skill already reserves "all plan writes" for the caller and limits delegation to bounded read-only reconnaissance, but it says nothing about model class, so a caller can keep nominal ownership while handing the writing to a cheaper subagent. That happened on 2026-09-08: the wave-7 batch of sixteen plans was delegated to Opus authors from a Fable session executing the skill from memory, and the remedy (a same-model review pass with rewrite authority over every plan) cost more than writing them correctly once. Strengthen the skill's language and back it with an executable pin: plan writes are never delegated below the caller's model class; if authoring is parallelized, the author subagent runs on the same model as the caller and the caller reviews every plan before publication or wave composition; reconnaissance lanes may run on cheaper classes. Mirror the rule where `oat-wave-execute` authors dated plan amendments (wave-boundary refresh entries and post-STOP refreshes) and in the docs page that describes the delegation boundary.

## Acceptance Criteria

- [ ] `oat-repo-improve/SKILL.md` Step 2 and Success Criteria state that plan writes are never delegated below the caller's model class, that a parallelized author subagent runs on the caller's model with the caller reviewing every plan before publication or wave composition, and that reconnaissance lanes may run on cheaper classes; the sentence names its executable backstop
- [ ] `oat-wave-execute/SKILL.md` states the same rule for the dated refresh entries and post-STOP refreshes it authors
- [ ] The `repo-improve` docs page carries the rule
- [ ] A contract test pins the operative sentences (red before, green after, neutralization fails); both skills bumped once with pins moved
