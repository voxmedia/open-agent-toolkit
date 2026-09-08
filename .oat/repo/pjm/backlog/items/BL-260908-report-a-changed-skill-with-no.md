---
id: BL-260908-report-a-changed-skill-with-no
title: Report a changed skill with no frontmatter block in the bump validator
status: open
priority: medium
scope: task
scope_estimate: XS
labels:
  - cli
  - validation
  - wave-6-followup
assignee: null
created: 2026-09-08T05:08:00.374Z
updated: 2026-09-08T21:35:00.000Z
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-tighten-the-skill-version-validators.md
---

## Description

After wave-6 p04, unusable and malformed version declarations block in both validators on both sides, but a changed canonical skill whose SKILL.md has no frontmatter block at all is still skipped silently by `validateChangedSkillVersionBumps` (pre-existing; p04 round-2 review minor). A skill without frontmatter cannot carry a version and should fail the bump gate with a named finding rather than pass by omission.

## Acceptance Criteria

- [ ] A changed skill with no frontmatter block yields a blocking `skill-frontmatter-unreadable` (or equivalent) finding from the bump validator and the structural validator
- [ ] A skill whose frontmatter block is present but declares no resolvable version (for example a `metadata:` map with no `version` child, now that bundled skills are metadata-only) yields a blocking finding from both validators — the migrate-skill-versions Phase 2 review (2026-09-08) showed such an `oat-*` skill passes `oat:validate-skills` and `check:skill-bumps` today and is caught only by the corpus sweeps in `skills.test.ts`
- [ ] A control proves the case was previously skipped and now fails `pnpm run check:skill-bumps`
