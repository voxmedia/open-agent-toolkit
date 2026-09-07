---
id: BL-260904-migrate-bundled-skills-from
title: Migrate bundled skills from top-level version to metadata.version
status: open
priority: low
scope: task
scope_estimate: M
labels:
  - skills
  - versioning
  - spec-conformance
  - migration
assignee: null
created: 2026-09-04T04:07:45.630Z
updated: 2026-09-04T04:09:33Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/258
external_plans: []
---

## Description

Follow-up to the metadata.version resolver work from GitHub issue #258. Once OAT reads metadata.version first and warns on the alias, move every bundled canonical skill under .agents/skills (80 files carry a top-level version today) to the standard form in one dedicated change, bumping each skill per the PR-scoped bump gate and updating the pinned version tuples in packages/cli/src/validation/skills.test.ts. Schedule it after the execution program's skill-editing waves so it does not collide with every lane's skill bump, and decide then whether any host still reads the top-level field before removing the alias.

## Acceptance Criteria

- Every bundled canonical skill under `.agents/skills` carries `metadata.version` and no top-level `version`, each bumped per the PR-scoped bump gate, with the pinned tuples in `packages/cli/src/validation/skills.test.ts` updated in the same change.
- The migration lands after the execution program's skill-editing waves so it does not collide with lane bumps.
- A recorded decision states whether any host outside OAT reads the top-level field; if none does, the alias warning becomes an error one release later and the top-level read is removed after it has been quiet.
