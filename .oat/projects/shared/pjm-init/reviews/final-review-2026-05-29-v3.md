---
oat_generated: true
oat_generated_at: 2026-05-29
oat_review_invocation: auto
oat_review_scope: final
oat_review_type: code
oat_project: .oat/projects/shared/pjm-init
---

# Code Review: final

**Reviewed:** 2026-05-29
**Scope:** Final code re-review for `.oat/projects/shared/pjm-init` against `origin/main..HEAD`
**Files reviewed:** 35 changed files
**Commits:** `origin/main..HEAD` (35 commits; HEAD `3f05b5b2`, merge-base `f47ed778f0e381fdfdbfb4e486f9a2410d18a2b7`)
**Recommendation:** PASS. Final review passed; no unresolved Critical, Important, or Medium findings remain.
**Severity counts:** 0 Critical, 0 Important, 0 Medium, 0 Minor

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

None

## Summary

The final branch now aligns with the quick-mode PJM requirements: starter templates, PM-pack manifest/bundle integration, `initializeRepoReference()`, the `oat pjm init` command, docs, command help, and public package lockstep are all present and verified. The two prior final-review cycles are closed: dispatch-ceiling runtime/skill regressions are clean against `origin/main`, public packages are now forward at `0.1.14`, and the dispatch-ceiling docs describe the provider-neutral `preset` / `providers.*` schema.

No new Critical, Important, Medium, or Minor findings were identified in the reviewed final diff.

## Review Scope

**Evidence sources used:** `.oat/projects/shared/pjm-init/discovery.md`, `.oat/projects/shared/pjm-init/design.md`, `.oat/projects/shared/pjm-init/plan.md`, `.oat/projects/shared/pjm-init/implementation.md`, `.oat/projects/shared/pjm-init/state.md`, `.oat/projects/shared/pjm-init/reviews/archived/final-review-2026-05-29.md`, `.oat/projects/shared/pjm-init/reviews/archived/final-review-2026-05-29-v2.md`, `.oat/projects/shared/pjm-init/reviews/p05-review-2026-05-29-v2.md`, `.oat/projects/shared/pjm-init/reviews/p06-review-2026-05-29.md`, root `AGENTS.md`, and git range `origin/main..HEAD`.

**Workflow mode:** quick. `spec.md` is absent as expected for this mode; `discovery.md`, `design.md`, and `plan.md` were used as the requirement/design sources.

**Changed files reviewed:** the 35 files in `git diff --name-only origin/main..HEAD`, covering OAT project artifacts/reviews, two PM templates, PJM docs, package manifests, bundle/manifest plumbing, command registration/help, PJM command/scaffolder code, and focused tests.

## Requirements/Design Alignment

### Requirements Coverage

| Requirement                                                                 | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Add `current-state.md` and `decision-record.md` starter templates           | implemented | Both templates exist with `oat_template` frontmatter and starter skeletons at `.oat/templates/current-state.md:1` and `.oat/templates/decision-record.md:1`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Register templates in PM-pack manifest and bundle script                    | implemented | `PROJECT_MANAGEMENT_TEMPLATES` includes `current-state.md` and `decision-record.md` at `packages/cli/src/commands/init/tools/shared/skill-manifest.ts:139`; the bundle script copies both at `packages/cli/scripts/bundle-assets.sh:78`.                                                                                                                                                                                                                                                                                                                                                                                       |
| Include new templates in project-management pack install behavior           | implemented | Installer tests seed and assert all four PM templates at `packages/cli/src/commands/init/tools/project-management/install-project-management.test.ts:17`, `packages/cli/src/commands/init/tools/project-management/install-project-management.test.ts:75`, and `packages/cli/src/commands/init/tools/project-management/install-project-management.test.ts:120`.                                                                                                                                                                                                                                                               |
| Implement `initializeRepoReference()`                                       | implemented | The scaffolder defines the three reference templates and backlog paths at `packages/cli/src/commands/pjm/init.ts:18` and `packages/cli/src/commands/pjm/init.ts:24`, resolves local templates before bundled assets at `packages/cli/src/commands/pjm/init.ts:66`, strips template frontmatter at `packages/cli/src/commands/pjm/init.ts:89`, skips existing files at `packages/cli/src/commands/pjm/init.ts:111`, delegates backlog scaffolding at `packages/cli/src/commands/pjm/init.ts:156`, and returns created/skipped paths at `packages/cli/src/commands/pjm/init.ts:166`.                                             |
| Add and register `oat pjm init`                                             | implemented | The command is defined at `packages/cli/src/commands/pjm/index.ts:41`, registers `init` and `--reference-root` at `packages/cli/src/commands/pjm/index.ts:53`, emits JSON success at `packages/cli/src/commands/pjm/index.ts:78`, preserves JSON error output at `packages/cli/src/commands/pjm/index.ts:94`, and is added to root registration at `packages/cli/src/commands/index.ts:38`.                                                                                                                                                                                                                                    |
| Preserve JSON success/error contracts and command help                      | implemented | Command tests cover registered-program reachability, JSON success, reference-root override, and JSON errors at `packages/cli/src/commands/pjm/index.test.ts:90`, `packages/cli/src/commands/pjm/index.test.ts:117`, and `packages/cli/src/commands/pjm/index.test.ts:138`; the root help snapshot includes `pjm` at `packages/cli/src/commands/help-snapshots.test.ts:57`.                                                                                                                                                                                                                                                     |
| Document install-vs-initialize lifecycle and repo-reference layout          | implemented | The lifecycle is documented at `apps/oat-docs/docs/cli-utilities/tool-packs.md:31`, CLI reference includes `oat pjm ...` at `apps/oat-docs/docs/reference/cli-reference.md:29`, backlog delegation is cross-linked at `apps/oat-docs/docs/cli-utilities/config-and-local-state.md:23`, and the canonical repo-reference surface is documented at `apps/oat-docs/docs/reference/oat-directory-structure.md:216`.                                                                                                                                                                                                                |
| Public package lockstep bump moves forward from target branch               | implemented | All five public packages are `0.1.14` at `packages/cli/package.json:3`, `packages/control-plane/package.json:3`, `packages/docs-config/package.json:3`, `packages/docs-theme/package.json:3`, and `packages/docs-transforms/package.json:3`; local `origin/main` is `0.1.13`, so the branch is forward, not a downgrade.                                                                                                                                                                                                                                                                                                       |
| Restore dispatch-ceiling runtime/mainline contract after first final review | implemented | Target-main dispatch-ceiling runtime/config/provider paths are clean against `origin/main`, focused dispatch-ceiling/config/provider tests pass, `workflow.dispatchCeiling.preset` and `workflow.dispatchCeiling.providers.codex` resolve successfully, and unsupported `cursor` resolves as `providers.cursor.mode: "unsupported"` rather than an invalid provider error.                                                                                                                                                                                                                                                     |
| Restore canonical OAT skill versions after first final review               | implemented | Canonical skill and provider-view paths are clean against `origin/main`, and focused skill validation tests pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Restore dispatch-ceiling config docs schema after second final review       | implemented | Docs now list `workflow.dispatchCeiling.preset` and `workflow.dispatchCeiling.providers.{codex,claude}` at `apps/oat-docs/docs/cli-utilities/configuration.md:177`, `apps/oat-docs/docs/cli-utilities/configuration.md:178`, `apps/oat-docs/docs/cli-utilities/configuration.md:179`, `apps/oat-docs/docs/reference/oat-directory-structure.md:108`, `apps/oat-docs/docs/reference/oat-directory-structure.md:109`, and `apps/oat-docs/docs/reference/oat-directory-structure.md:110`; stale flat-key mentions remain only in explicit clean-break/removal context at `apps/oat-docs/docs/cli-utilities/configuration.md:214`. |

### Extra Work (not in declared requirements)

None requiring action. The final diff includes expected OAT project/review artifacts and Phase 5/6 review-fix bookkeeping; implementation-surface changes map to the declared PJM work or to final-review closure tasks.

## Prior Final Review Closure

| Prior finding                                                                            | Status | Evidence                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First final review C1: branch rolled back dispatch-ceiling CLI/config contract from main | closed | `git diff --exit-code origin/main..HEAD --` the dispatch-ceiling runtime/config/provider/docs/reference paths produced no diff; focused tests passed; direct `cursor` and `workflow.dispatchCeiling.preset` probes returned the restored provider-neutral behavior. |
| First final review I1: canonical skill files changed with downgraded versions            | closed | `git diff --exit-code origin/main..HEAD -- .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .claude .cursor` produced no diff, and `src/validation/skills.test.ts` passed.    |
| Second final re-review I1: public packages at `0.1.12` while `origin/main` was `0.1.13`  | closed | All five public packages are now `0.1.14`; `pnpm release:validate` and `pnpm release:check-versions` passed.                                                                                                                                                        |
| Second final re-review I2: docs advertised stale flat dispatch-ceiling keys              | closed | Docs now document `workflow.dispatchCeiling.preset` and `workflow.dispatchCeiling.providers.{codex,claude}`; focused stale-docs grep found no stale command examples or flat schema rows; runtime rejects `workflow.dispatchCeiling.codex` as unknown.              |

## Verification Commands

Commands run during this review:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm src/commands/init/tools/project-management/install-project-management.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/help-snapshots.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/validation/skills.test.ts src/commands/project/dispatch-ceiling src/config src/providers/ceiling
pnpm release:validate
pnpm release:check-versions
git diff --check origin/main..HEAD
ROOT=$PWD; pnpm --filter @open-agent-toolkit/cli exec tsx --tsconfig tsconfig.json src/index.ts -- --cwd "$ROOT" --json project dispatch-ceiling resolve --provider cursor --preflight
ROOT=$PWD; pnpm --filter @open-agent-toolkit/cli exec tsx --tsconfig tsconfig.json src/index.ts -- --cwd "$ROOT" --json config get workflow.dispatchCeiling.preset
ROOT=$PWD; pnpm --filter @open-agent-toolkit/cli exec tsx --tsconfig tsconfig.json src/index.ts -- --cwd "$ROOT" --json config get workflow.dispatchCeiling.providers.codex
ROOT=$PWD; pnpm --filter @open-agent-toolkit/cli exec tsx --tsconfig tsconfig.json src/index.ts -- --cwd "$ROOT" --json config get workflow.dispatchCeiling.codex
if rg -n 'config (get|set) workflow\.dispatchCeiling\.(codex|claude)|^\| `workflow\.dispatchCeiling\.(codex|claude)`' apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/reference/oat-directory-structure.md; then exit 1; else exit 0; fi
git diff --exit-code origin/main..HEAD -- packages/cli/src/commands/project/dispatch-ceiling packages/cli/src/config/dispatch-ceiling-preset.ts packages/cli/src/config/dispatch-ceiling-preset.test.ts packages/cli/src/config/json.ts packages/cli/src/providers/ceiling packages/cli/src/config/oat-config.ts packages/cli/src/config/resolve.ts packages/cli/src/config/sync-config.ts packages/cli/src/commands/config/index.ts apps/oat-docs/docs/workflows/projects .oat/repo/reference .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .claude .cursor
root=$(mktemp -d /tmp/oat-pjm-final-smoke.XXXXXX); mkdir -p "$root/.git"; pnpm --silent run cli -- --cwd "$root" --json pjm init
ref=$(mktemp -d /tmp/oat-pjm-final-reference.XXXXXX); pnpm --silent run cli -- pjm init --json --reference-root "$ref"
pnpm -w --silent run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
git diff --exit-code -- .oat/config.json apps/oat-docs/index.md
git status --short --branch
```

Observed results:

- PJM/help/bundle focused tests passed: 5 files, 69 tests.
- Dispatch-ceiling/config/skill focused tests passed: 8 files, 230 tests.
- `pnpm release:validate` passed for all five public packages at `0.1.14`.
- `pnpm release:check-versions` passed.
- `git diff --check origin/main..HEAD` passed.
- Fresh-repo `oat pjm init --json` smoke created the seven expected reference/backlog paths.
- `oat pjm init --json --reference-root <tmp>` smoke accepted `--json` after the subcommand and returned `status: "ok"`.
- `project dispatch-ceiling resolve --provider cursor --preflight --json` returned `status: "unresolved"` with `providers.cursor.mode: "unsupported"`.
- `config get workflow.dispatchCeiling.preset --json` and `config get workflow.dispatchCeiling.providers.codex --json` returned `status: "ok"`.
- `config get workflow.dispatchCeiling.codex --json` returned `Unknown config key`, as expected for the removed flat key.
- Focused stale-docs grep found no stale flat-key command examples or flat schema rows.
- Docs index generation to the canonical output completed with 9 entries, and `git diff --exit-code -- .oat/config.json apps/oat-docs/index.md` passed.
- Final `git status --short --branch` was clean before writing this review artifact.

## Recommended Next Step

Record this final review as passed in the OAT closeout flow. No review-receive fix tasks are needed.
