---
id: BL-260904-honor-metadata-version
title: Honor metadata.version as the canonical skill version
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - skills
  - versioning
  - spec-conformance
  - validation
  - cli
assignee: null
created: 2026-09-04T04:07:43.900Z
updated: 2026-09-04T04:09:33Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/258
external_plans:
  - .oat/repo/reference/external-plans/2026-09-04-honor-metadata-version-for-skills.md
---

## Description

The Agent Skills specification places versioning under metadata (metadata.version) and defines no top-level version field, but OAT reads only the top-level field: getSkillVersion (packages/cli/src/commands/shared/frontmatter.ts:146, used by copy-helpers, scan-tools, and doctor), the bump enforcement and semver checks in packages/cli/src/validation/skills.ts (:922-925, :1063), and canonical role resolution in packages/cli/src/agents/canonical/resolve.ts (:176). A spec-conformant skill is therefore unversioned to OAT, and OAT-authored skills carry a field no host documents. Resolve metadata.version first with the top-level field as a tolerated alias, report a finding when both exist and differ, warn when only the alias is present, teach the templates and docs to emit metadata.version, and leave the bulk migration of bundled skills to a follow-up. Source: GitHub issue #258.

## Acceptance Criteria

- One shared resolver reads `metadata.version` first and the top-level `version` second for `getSkillVersion`, `getAgentVersion`, skill validation (bump enforcement and semver), and canonical role resolution.
- When both fields are present and differ, validation reports an error finding; when only the top-level alias is present, validation emits a warning that does not fail `check:skill-bumps` on the current tree.
- `create-agnostic-skill` and `create-oat-skill` emit `metadata.version` for new skills, and `apps/oat-docs/docs/contributing/skills.md` documents the resolution order and alias status.
- Installed-versus-bundled comparison (scan-tools, copy-helpers, doctor) works for skills carrying either form.
- Focused tests cover metadata-only, alias-only, equal dual, and conflicting dual frontmatter.
- The bulk migration of bundled skills and any alias removal stay in `BL-260904-migrate-bundled-skills-from`.
