---
id: BL-260906-extend-check-skill-bumps
title: Extend check:skill-bumps to canonical agent files
status: open
priority: low
scope: task
scope_estimate: XS
labels:
  - tooling
  - skills
assignee: null
created: 2026-09-06T13:43:57.770Z
updated: 2026-09-06T13:43:57.770Z
associated_issues: []
external_plans: []
---

## Description

p01 review m3 (wave 3). pnpm run check:skill-bumps diffs only .agents/skills/_/SKILL.md (listChangedSkillFiles in packages/cli/src/validation/skills.ts), so an edit to .agents/agents/_.md such as oat-phase-implementer.md without a version bump passes the CI gate and is caught only by the explicit pins in skills.test.ts. Extend the gate to canonical agent files with the same one-bump-per-PR rule.

## Acceptance Criteria

- [ ] `pnpm run check:skill-bumps` reports a changed `.agents/agents/*.md` file whose frontmatter `version:` did not move, with the same one-bump-per-PR semantics as skills
- [ ] A negative control edits an agent file without a bump and observes the gate exit 1
- [ ] AGENTS.md's skill-bump rule names canonical agent files
