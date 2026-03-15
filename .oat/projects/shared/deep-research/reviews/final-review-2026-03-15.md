---
oat_generated: true
oat_generated_at: 2026-03-15
oat_review_scope: final
oat_review_type: code
oat_project: .oat/projects/shared/deep-research
---

# Code Review: final

**Reviewed:** 2026-03-15
**Scope:** Final code review for the `deep-research` quick-mode project, covering unreviewed post-pass work from `aa7217d1..HEAD`
**Files reviewed:** 30
**Commits:** aa7217d1..HEAD

## Summary

Phase 8 is mostly implemented as planned, and the changed CLI surface type-checks and its test suite passes. The remaining blocker is that the new `research` pack is user-eligible while its bundled agent is still treated as project-only by the tool-management scan path, so user-scope installs cannot be fully listed, updated, or removed.

Artifacts used for this review: `discovery.md`, `design.md`, `plan.md`, `implementation.md`, and `reviews/archived/final-review-2026-03-14-v3.md`.

## Findings

### Critical

None.

### Important

- **User-scoped research installs orphan the bundled agent from tool management** (`packages/cli/src/commands/tools/shared/scan-tools.ts:122`)
  - Issue: `installResearch()` always copies `skeptical-evaluator.md` into the selected target root, including `--scope user`, but `scanTools()` only scans agents for `project` scope. That means a user-scoped `research` install can create `~/.agents/agents/skeptical-evaluator.md` that `oat tools list --scope user`, `oat tools update --scope user --pack research`, and `oat tools remove --scope user --pack research` never see.
  - Fix: Either make the `research` pack project-only, or extend scan/update/remove/list flows to manage user-scope agents and add tests that cover install/list/update/remove for `research` in user scope.
  - Requirement: `p08-t02`, `p08-t03`, `p08-t04`

### Medium

None.

### Minor

- **Top-level help text still omits `research` for pack-based remove/update** (`packages/cli/src/commands/tools/remove/index.ts:65`)
  - Issue: `VALID_PACKS` accepts `research`, but the option help strings in `tools remove` and `tools update` still advertise only `ideas|workflows|utility`, so the CLI help is now misleading.
  - Fix: Update the `--pack` option descriptions in both commands and refresh the associated help snapshots.
  - Requirement: `p08-t03`

## Deferred Findings Disposition

- Deferred Medium count: 0
- Deferred Minor count: 0

## Spec/Design Alignment

### Requirements Coverage

| Requirement | Status      | Notes                                                                                                               |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| p08-t01     | implemented | Research pack manifest/types are wired into CLI pack typing.                                                        |
| p08-t02     | partial     | Research installer works, but user-scope installs copy an agent that later lifecycle commands do not manage.        |
| p08-t03     | partial     | Pack resolution is wired for research, but user-scope agent scanning remains project-only.                          |
| p08-t04     | partial     | Coverage exists for research install and pack resolution, but no test exercises the user-scope agent lifecycle gap. |
| p08-t05     | implemented | Docs were updated for the research pack.                                                                            |
| p08-t06     | implemented | Artifact-producing skills now document OAT-aware destination resolution.                                            |
| p08-t07     | implemented | Interactive install flow now supports per-pack scope selection.                                                     |

### Extra Work (not in requirements)

- `.agents/skills/oat-project-review-provide/SKILL.md` was updated in the reviewed range even though Phase 8 did not plan review-skill changes.
- `.gitignore` and the `.superpowers/` design-spec move also landed in the reviewed range outside the Phase 8 plan.

## Verification Commands

- `git log --oneline aa7217d1..HEAD`
- `git diff --name-only aa7217d1..HEAD`
- `git diff --stat aa7217d1..HEAD`
- `pnpm --filter @oat/cli type-check`
- `pnpm --filter @oat/cli test`
- `sed -n '1,260p' packages/cli/src/commands/init/tools/research/install-research.ts`
- `sed -n '1,260p' packages/cli/src/commands/tools/shared/scan-tools.ts`
- `sed -n '1,220p' packages/cli/src/commands/tools/remove/index.ts`
- `sed -n '1,220p' packages/cli/src/commands/tools/update/index.ts`

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
