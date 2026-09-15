---
id: BL-260915-present-design-section-drafts
title: Present design section drafts in chat, not inside the approval prompt
status: closed
priority: low
scope: task
scope_estimate: XS
labels:
  - oat-project-quick-start
  - oat-project-design
  - ux
assignee: null
created: 2026-09-15T13:00:20.941Z
updated: '2026-09-15T13:11:38Z'
associated_issues: []
external_plans: []
---

## Description

During collaborative lightweight design in oat-doctor-router (2026-09-14), full section drafts were packed into structured AskUserQuestion prompts. The operator asked why the content was presented that way, whether the skill prose needed updating, and said the prompt was jumbled and unreadable. The workaround that worked was rendering each section as normal chat text and keeping the structured question to a one-line approve or revise choice. Neither oat-project-quick-start's lightweight design nor oat-project-design's collaborative mode says where section content goes. Source: oat-doctor-router retro UP-02.

## Acceptance Criteria

- `oat-project-quick-start` lightweight design and `oat-project-design` collaborative and selective modes say to render each section draft as chat text and to use the structured prompt only for the approve or revise choice.
- The plain-chat fallback path keeps the same rule.
- Both skills take a `metadata.version` bump.
