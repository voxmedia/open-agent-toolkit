---
id: BL-260908-report-a-changed-skill-with-no
title: Report a changed skill with no frontmatter block in the bump validator
status: closed
priority: medium
scope: task
scope_estimate: XS
labels:
  - cli
  - validation
  - wave-6-followup
assignee: null
created: 2026-09-08T05:08:00.374Z
updated: '2026-09-09T10:17:01Z'
associated_issues: []
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-tighten-the-skill-version-validators.md
---

## Description

After wave-6 p04, unusable and malformed version declarations block in both validators on both sides, but a changed canonical skill whose SKILL.md has no frontmatter block at all is still skipped silently by `validateChangedSkillVersionBumps` (pre-existing; p04 round-2 review minor). A skill without frontmatter cannot carry a version and should fail the bump gate with a named finding rather than pass by omission.

## Acceptance Criteria

- [x] A changed skill with no frontmatter block yields a blocking `skill-frontmatter-unreadable` (or equivalent) finding from the bump validator and the structural validator — shipped as `skill-frontmatter-missing`
- [x] A skill whose frontmatter block is present but declares no resolvable version (for example a `metadata:` map with no `version` child, now that bundled skills are metadata-only) yields a blocking finding from both validators — shipped as `skill-version-missing`
- [x] A control proves the case was previously skipped and now fails `pnpm run check:skill-bumps`

## Notes

- 2026-09-08: the base side stays deliberately asymmetric. A _base_ with no
  frontmatter block, or with none that declares a version, is reported through
  the existing uncomparable-base shape, so the message says the base cannot be
  compared rather than accusing the file the author just changed.
- 2026-09-08: a brand-new file is still not reported. `baseContent === null`
  means there is nothing to compare, which is pre-existing and deliberate; the
  live control therefore removes the version from an already-tracked skill
  rather than adding a versionless one.
