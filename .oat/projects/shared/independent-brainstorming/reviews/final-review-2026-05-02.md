---
oat_generated: true
oat_generated_at: 2026-05-02
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/independent-brainstorming
---

# Code Review: final

**Reviewed:** 2026-05-02
**Scope:** Full branch diff from `c63a13b6f3efbce8cbcfdeed21352bb2cb631023..HEAD`, including implementation, skill assets, OAT docs, bundled docs/assets, release metadata, and project/reference documentation.
**Files reviewed:** 61 changed files
**Commits:** `c63a13b6f3efbce8cbcfdeed21352bb2cb631023..HEAD`

## Summary

The final review does not pass. The branch ships most of the visible brainstorm pack surface, but there are unresolved Important issues in config persistence/access, pack-specific install behavior, visual-companion path handling, local-artifact tracking, stale OAT state routing, and dogfood evidence. Documentation was included in scope; several findings are documentation or state-artifact mismatches that would mislead users or future OAT routing.

## Findings

### Critical

None.

### Important

1. `tools.brainstorm` is not a real config key end-to-end.

   `OatToolsConfig` includes `brainstorm`, but config normalization drops it because the `validPacks` list omits it in `packages/cli/src/config/oat-config.ts:330`. The effective defaults omit it in `packages/cli/src/config/resolve.ts:60`, and the config command key allowlist omits it in `packages/cli/src/commands/config/index.ts:46`. Live verification confirms `pnpm -s run cli -- config get tools.brainstorm` returns `Unknown config key`. This contradicts the documented lifecycle claim that standard config-write semantics set `tools.brainstorm: true` in `apps/oat-docs/docs/cli-utilities/tool-packs.md:222`.

   Fix: add `brainstorm` to config normalization, effective defaults, config key order/catalog, and config get/set tests. Include a round-trip test proving `{ tools: { brainstorm: true } }` survives `readOatConfig`, plus CLI tests for `oat config get/set tools.brainstorm`.

2. Pack-specific brainstorm install bypasses the lifecycle semantics documented for `oat tools install brainstorm`.

   The main `oat init tools` path scans existing install state, preserves existing project/user placement, writes `.oat/config.json`, and tracks affected sync scopes. The pack-specific `brainstorm` subcommand instead resolves scope directly from `PACK_METADATA` in `packages/cli/src/commands/init/tools/brainstorm/index.ts:52`, installs directly in `packages/cli/src/commands/init/tools/brainstorm/index.ts:100`, and never performs the existing-install scan or config write. This diverges from the docs' "existing-install precedence" claim in `apps/oat-docs/docs/cli-utilities/tool-packs.md:196` and the config-write claim in `apps/oat-docs/docs/cli-utilities/tool-packs.md:222`.

   Fix: route `oat init tools brainstorm` / `oat tools install brainstorm` through the same installed-state, scope-resolution, affected-scope, and config-write path as the main installer, or add equivalent behavior and regression tests to the subcommand.

3. The visual-companion start instruction is hard-coded to project scope even though brainstorm defaults to user scope.

   `oat-brainstorm` tells agents to start the companion via `.agents/skills/oat-brainstorm/scripts/start-server.sh` in `.agents/skills/oat-brainstorm/SKILL.md:112`. The pack defaults to user scope, so a fresh install normally places the script under the user's skill directory, not the current repo. The visual-companion guide correctly says scripts should be invoked relative to the installed skill location in `.agents/skills/oat-brainstorm/references/visual-companion.md:45`, but the top-level skill instruction is the operational path an agent will follow.

   Fix: instruct agents to resolve the loaded skill directory first, then invoke `scripts/start-server.sh` and read `references/visual-companion.md` relative to that directory. Add an explicit user-scope/project-scope fallback if provider skill loading cannot expose the skill root directly.

4. Repo-scoped visual-companion sessions are written to an unignored path while docs claim they are local-only.

   `start-server.sh` writes repo-scoped sessions under `.oat/brainstorm/<session-id>` in `.agents/skills/oat-brainstorm/scripts/start-server.sh:107`. The guide says OAT's repo-root `.gitignore` already covers those sessions in `.agents/skills/oat-brainstorm/references/visual-companion.md:41`, but the managed `.gitignore` section only contains `.oat/**/analysis/`, `.oat/**/pr/`, `.oat/**/reviews/archived/`, and `.oat/ideas/` in `.gitignore:69`. Live verification with `git check-ignore .oat/brainstorm/session/content/page.html` returned exit 1.

   Fix: add `.oat/brainstorm/` to the repo's localPaths/gitignore handling, or move repo-scoped visual sessions under an already-local path. Update the guide to match the actual policy.

5. OAT state artifacts are stale and route the project backward.

   `.oat/state.md` still reports `independent-brainstorming` at phase `plan`, docs "not yet run", and recommended next step `oat-project-implement` in `.oat/state.md:19`, `.oat/state.md:23`, and `.oat/state.md:38`. The project state frontmatter says implementation and docs are complete in `.oat/projects/shared/independent-brainstorming/state.md:11` and `.oat/projects/shared/independent-brainstorming/state.md:16`, while the state body still says "Discovery" and "Gathering requirements" in `.oat/projects/shared/independent-brainstorming/state.md:27`.

   Fix: regenerate `.oat/state.md` after the final docs/bookkeeping commits and refresh the project `state.md` body so the human-readable state agrees with the frontmatter.

6. The plan claims end-to-end dogfood execution, but the recorded artifact is a walkthrough and explicitly leaves fold-back unexercised.

   The plan task says to "Run all 10 dogfood scenarios end-to-end" and verify produced artifacts, including the fold-back commit hash, in `.oat/projects/shared/independent-brainstorming/plan.md:1028` and `.oat/projects/shared/independent-brainstorming/plan.md:1046`. The dogfood artifact says dogfood means a documented flow, not a live interactive run, in `.agents/skills/oat-brainstorm/references/dogfood-results.md:8`, and it says the fold-back commit safety contract has not been exercised against real `git status` / `git commit` in `.agents/skills/oat-brainstorm/references/dogfood-results.md:652`.

   Fix: either run and record the live scenarios required by the plan, or revise the plan/status/review history so this is represented as a walkthrough rather than completed end-to-end dogfood.

### Medium

1. The active-project reference destination writes an unignored project file while saying no commit is required.

   The skill says the active-project reference destination writes `<ACTIVE_PROJECT>/brainstorming/YYYY-MM-DD-<topic>.md` and that no commit is required in `.agents/skills/oat-brainstorm/SKILL.md:481` and `.agents/skills/oat-brainstorm/SKILL.md:486`. That path is not covered by the current managed `.gitignore` section in `.gitignore:69`, and live `git check-ignore` returned exit 1 for a representative `.oat/projects/shared/.../brainstorming/topic.md` path.

   Fix: decide whether active-project brainstorming references are durable tracked artifacts or local scratch. If durable, require/report a commit. If local, add a matching localPaths/gitignore rule and document that behavior.

2. Repo reference docs point canonical workflow references at non-existent docs paths.

   `.oat/repo/reference/current-state.md:9` through `.oat/repo/reference/current-state.md:11` point workflow references at `apps/oat-docs/docs/guide/workflow/{lifecycle,reviews,pr-flow}.md`. Those files do not exist; the live files are under `apps/oat-docs/docs/workflows/projects/`. This weakens the reference docs updated as part of final documentation sync.

   Fix: update those canonical references to `apps/oat-docs/docs/workflows/projects/lifecycle.md`, `reviews.md`, and `pr-flow.md`.

### Minor

1. Repo reference current-state omits the new `brainstorm` pack from the implemented CLI surface.

   `.oat/repo/reference/current-state.md:177` lists `oat tools install` packs as `core, ideas, workflows, utility, project-management, research`, but the branch adds `brainstorm` to the pack set in `packages/cli/src/commands/init/tools/index.ts:201` and documents the new pack in `apps/oat-docs/docs/cli-utilities/tool-packs.md:190`.

   Fix: update the reference list to include `brainstorm` and align it with the current `ALL_TOOL_PACKS` / docs wording.

## Spec/Design Alignment

### Requirements Coverage

| Requirement                                         | Status      | Notes                                                                                                                                    |
| --------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| New `brainstorm` pack with `oat-brainstorm` skill   | partial     | Skill and pack assets exist, but config and subcommand lifecycle semantics are incomplete.                                               |
| Default user scope for brainstorm                   | partial     | Main installer uses metadata defaulting, but the visual-companion instruction still assumes project-scope paths.                         |
| Pack lifecycle install/update/remove/list support   | partial     | Update/remove/list wiring is present; pack-specific install diverges from config-write and existing-install precedence.                  |
| Visual companion with OAT-managed persistence paths | partial     | Scripts and smoke coverage exist, but repo-scoped paths are not actually gitignored.                                                     |
| Destination handoffs and active-project routing     | partial     | Documented branches exist, but active-project reference files have unclear tracked/local semantics and fold-back was not live-dogfooded. |
| Documentation and bundled docs updated              | partial     | Docs build and bundled-doc parity pass, but repo reference/state docs remain stale in important places.                                  |
| Lockstep public package release bump                | implemented | Public packages are at `0.0.57`; `pnpm release:validate` passed.                                                                         |

### Extra Work (not in requirements)

None identified.

## Verification Commands

- `pnpm release:validate` — passed for all five public packages.
- `pnpm build:docs` — passed; existing Next module-type warning only.
- `git diff --check c63a13b6f3efbce8cbcfdeed21352bb2cb631023..HEAD` — passed.
- `diff -q apps/oat-docs/docs/workflows/ideas/index.md packages/cli/assets/docs/workflows/ideas/index.md` — passed with no diff.
- `diff -q apps/oat-docs/docs/workflows/ideas/lifecycle.md packages/cli/assets/docs/workflows/ideas/lifecycle.md` — passed with no diff.
- `diff -q apps/oat-docs/docs/workflows/projects/lifecycle.md packages/cli/assets/docs/workflows/projects/lifecycle.md` — passed with no diff.
- `diff -q apps/oat-docs/docs/workflows/skills/index.md packages/cli/assets/docs/workflows/skills/index.md` — passed with no diff.
- `pnpm -s run cli -- config get tools.brainstorm` — failed as expected with `Unknown config key`.
- `git check-ignore .oat/brainstorm/session/content/page.html` — failed as expected, confirming the path is not ignored.
- `git check-ignore .oat/projects/shared/independent-brainstorming/brainstorming/topic.md` — failed as expected, confirming the active-project reference path is not ignored.

## Recommended Next Step

Run `oat-project-review-receive` to convert the Critical/Important/Medium findings into plan tasks before another final review. This review should not be marked passed until the Important findings are fixed or explicitly accepted with updated project artifacts.
