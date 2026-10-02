---
id: BL-261002-let-skills-declare-their-side
title: Let skills declare their side effects in metadata
status: open
priority: low
scope: feature
scope_estimate: M
labels:
  - skills
  - docs
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T20:01:30.114Z
updated: 2026-10-02T20:01:30.114Z
associated_issues: []
external_plans: []
---

## Description

Across 71 skill guides, the most common verifier finding was an understated side effect: commits, pushes and pull requests made without asking. The docs now carry a hand-written What it does without asking line per skill, which can drift from the skills. Related but distinct: issue #277 (skill authoring guidance). Source: docs-improvement-overhaul retro UP-06.

## Acceptance Criteria

- `SKILL.md` frontmatter can declare side effects such as commit, push, open
  pull request, delete, and write outside the repository.
- The docs skill catalog shows declared side effects, and a validator flags a
  skill guide whose side-effect note disagrees with the metadata.
- Bundled skills that push or open pull requests declare it.
