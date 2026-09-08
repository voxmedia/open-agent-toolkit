---
id: BL-260908-remove-the-top-level-skill
title: Remove the top-level skill version read after the alias error has been quiet
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - versioning
  - release-gated
assignee: null
created: 2026-09-08T16:54:25.875Z
updated: 2026-09-08T17:36:27.000Z
associated_issues: []
external_plans: []
---

## Description

Step 2 of the alias retirement recorded in `DR-260908-bundled-skills-declare` (split out of `BL-260908-retire-the-top-level-skill` at the 2026-09-08 triage so step 1 — the `skill-version-alias` warning becoming an error in the first validator-changing release after 0.2.65 — can land alone). Release-gated: one release after that error has produced no findings on the bundled tree, remove the resolver's top-level read (`packages/cli/src/commands/shared/frontmatter.ts:440-442`), decide the `.agents/agents` role migration, collapse the five test-helper copies of the frontmatter walk (three pinned byte-identical by `tools/smoke/skill-version/reader-sameness.test.mjs`; `readSkillVersionSites` in `packaged-layout.test.mjs` and `withDeclaredVersion` in `skill-version.ts` unpinned), and normalize YAML infinity key spellings in `check-core.mjs` `keyIdentity` (the migrate-skill-versions exit-gate Medium).

## Acceptance Criteria

- [ ] Precondition recorded: the `skill-version-alias` error (step 1) has produced no findings on the bundled tree for one full release
- [ ] `resolveSkillVersion` no longer reads the top-level `version:`; a third-party skill carrying only the alias resolves `null` with a `skill-version-unusable`-class finding naming the migration, and the docs say so
- [ ] The `.agents/agents` role migration is decided and, if migrated, covered by the bump gate's pathspec
- [ ] The five test-helper copies of the frontmatter walk are collapsed or all pinned byte-identical; `check-core.mjs` `keyIdentity` normalizes signed and case-varied `.inf` spellings with parity fixtures
