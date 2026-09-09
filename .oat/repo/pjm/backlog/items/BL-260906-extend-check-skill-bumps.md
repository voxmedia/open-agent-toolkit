---
id: BL-260906-extend-check-skill-bumps
title: Extend check:skill-bumps to canonical agent files
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - tooling
  - skills
assignee: null
created: 2026-09-06T13:43:57.770Z
updated: 2026-09-08T23:45:00.000Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-tighten-the-skill-version-validators.md
---

## Description

p01 review m3 (wave 3). pnpm run check:skill-bumps diffs only .agents/skills/_/SKILL.md (listChangedSkillFiles in packages/cli/src/validation/skills.ts), so an edit to .agents/agents/_.md such as oat-phase-implementer.md without a version bump passes the CI gate and is caught only by the explicit pins in skills.test.ts. Extend the gate to canonical agent files with the same one-bump-per-PR rule.

## Notes

- 2026-09-08: shipped together with a fourth gap found while planning a sibling
  lane. The gate's diff pathspec is now `.agents/skills` plus
  `.agents/agents/*.md`, and every path under a skill directory except `tests/`
  maps to that skill's `SKILL.md`, so a change to `scripts/` or `references/`
  requires the owning skill to bump. `tests/` is excluded because
  `packages/cli/scripts/bundle-assets.sh` strips it, so it never reaches an
  `oat tools install` consumer.
- 2026-09-08: two residual gaps of that widening are recorded rather than
  closed, for a maintainer to file if they matter. (1) A change to a symlink
  _target_ under `.agents/docs/` ships to consumers through `cp -RL` but never
  appears under `.agents/skills` in `git diff`, so it does not trigger a bump.
  (2) A pure deletion of a sibling file is excluded by `--diff-filter=ACMR`,
  kept deliberately for parity with the pre-existing gate.

## Acceptance Criteria

- [x] `pnpm run check:skill-bumps` reports a changed `.agents/agents/*.md` file whose frontmatter `version:` did not move, with the same one-bump-per-PR semantics as skills
- [x] A negative control edits an agent file without a bump and observes the gate exit 1
- [x] AGENTS.md's skill-bump rule names canonical agent files
