---
id: BL-260904-migrate-bundled-skills-from
title: Migrate bundled skills from top-level version to metadata.version
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - skills
  - versioning
  - spec-conformance
  - migration
assignee: null
created: 2026-09-04T04:07:45.630Z
updated: 2026-09-08T03:50:40.000Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/258
external_plans: []
---

## Description

Follow-up to the metadata.version resolver work from GitHub issue #258. Once OAT reads metadata.version first and warns on the alias, move every bundled canonical skill under .agents/skills (80 files carry a top-level version today) to the standard form in one dedicated change, bumping each skill per the PR-scoped bump gate and updating the pinned version tuples in packages/cli/src/validation/skills.test.ts. Schedule it after the execution program's skill-editing waves so it does not collide with every lane's skill bump, and decide then whether any host still reads the top-level field before removing the alias.

Raised to high on 2026-09-08 (operator): run as a standalone project immediately after the wave-6 close, once the `metadata.version` resolver (W6 p04) has merged — migrate all 82 bundled skills to `metadata.version`, drop the top-level `version:` key, bump each skill once, repoint every pin (`packages/cli/src/validation/skills.test.ts` and the other contract tests, located by version literal), and decide whether the alias warning becomes an error or alias support is removed after checking downstream readers of the top-level key (provider views, third-party skill loaders).

Hand-off from wave-6 p04 (2026-09-08): `tools/release/build-explainer-rc.mjs:684` still reads the bundled `explainer-kit` / `oat-explainer-kit` skill version with a `^version:` regex; it is correct while every bundled skill carries the top-level key and breaks the moment those two skills migrate. The migration must either give the `.mjs` release tool a YAML-aware reader that applies the same `metadata.version` precedence as `commands/shared/frontmatter.ts` or keep the two skills' top-level alias until the tool is updated — a second implementation of the precedence rule is the divergence the resolver design forbids. Also expect `pnpm oat:validate-skills` to print one alias warning per unmigrated skill (82 today) until this lands.

## Acceptance Criteria

- Every bundled canonical skill under `.agents/skills` carries `metadata.version` and no top-level `version`, each bumped per the PR-scoped bump gate, with the pinned tuples in `packages/cli/src/validation/skills.test.ts` updated in the same change.
- The migration lands after the execution program's skill-editing waves so it does not collide with lane bumps.
- **Blocking (wave-6 final review M3):** `tools/release/build-explainer-rc.mjs` (`parseSkillVersion`, `:684-692`) and the bundled `oat-explainer-kit/scripts/check-core.mjs` (`readFrontmatterVersion`, `:107-109`) parse the frontmatter block and prefer `metadata.version` with the top-level alias as fallback (quotes stripped) before any bundled skill drops its top-level `version:`; today the `create-oat-skill` / `create-agnostic-skill` templates already emit metadata-only frontmatter that `build-explainer-rc.mjs` throws `E_SKILL_VERSION` on and `check-core.mjs` reads as `incompatible`. A red-then-green control for each reader.
- A recorded decision states whether any host outside OAT reads the top-level field; if none does, the alias warning becomes an error one release later and the top-level read is removed after it has been quiet.
