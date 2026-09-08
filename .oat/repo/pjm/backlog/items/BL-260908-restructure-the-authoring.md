---
id: BL-260908-restructure-the-authoring
title: Restructure the authoring skills for progressive disclosure and decide
  proactive invocation
status: open
priority: low
scope: feature
scope_estimate: M
labels:
  - skills
  - authoring
  - decisions
assignee: null
created: 2026-09-08T16:54:24.361Z
updated: 2026-09-08T17:36:27.000Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/277
external_plans: []
---

## Description

GitHub issue #277, the redesign half (proposals 2, 6, 8, 9): move the starter template, provider-compatibility details, delegation patterns, and OAT distribution recipes into conditional references with loading conditions; make delegation assurance proportional and recoverable; prefer behavior-oriented verification over checklist completeness; and decide whether the authoring skills flip `disable-model-invocation` (today deliberately `true` per `skills-guide.md:329` because they edit files) — that flip is a policy change needing a decision record. No verified defect behind these; separated from the factual corrections item so the two skills' prose pins are touched once per intent.

## Acceptance Criteria

- [ ] A decision record settles whether the two authoring skills flip `disable-model-invocation` and under what trigger wording; the skills follow it
- [ ] The starter template, provider-compatibility details, delegation patterns, and OAT distribution recipes live in references with explicit loading conditions, and the main body no longer repeats them
- [ ] Delegation assurance is proportional (capability probe before dependent writes; unrelated read-only work may continue; fallback must still satisfy correctness) and verification guidance is behavior-oriented (trigger/non-trigger requests, missing and ambiguous input, authorization boundary) without mandating an eval framework for every skill
- [ ] Every routed sentence pinned by `named-skill-load-contract.test.ts` is moved with its pin; both skills bumped once
