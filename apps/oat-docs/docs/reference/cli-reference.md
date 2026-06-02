---
title: CLI Reference
description: Scannable reference for the current OAT CLI surface, with links to the deeper owning sections for each command family.
---

# CLI Reference

Use this page when you need a quick map of the OAT CLI rather than the full command-by-command docs. It is intentionally shallow: each section points to the owning page that documents the detailed behavior.

The CLI is also a standalone value path. You can use `oat init`, `oat sync`, `oat tools`, docs commands, repo archive sync, and repo-analysis commands without adopting the full project workflow.

## Contents

- [CLI Bootstrap](../cli-utilities/bootstrap.md) - Bootstrap a repo with `oat init`, guided setup, and initial provider adoption.
- [Tool Packs](../cli-utilities/tool-packs.md) - Install, update, inspect, and remove bundled OAT skills and agents.
- [Config and Local State](../cli-utilities/config-and-local-state.md) - Config, backlog, local paths, diagnostics, and related utility commands.
- [Docs Tooling Commands](../docs-tooling/commands.md) - Docs app scaffolding, migration, index generation, and nav sync.
- [Provider Sync](../provider-sync/index.md) - Sync behavior, provider capabilities, config, and drift management.
- [Agentic Workflows](../workflows/index.md) - Tracked project execution, skills, ideas, and workflow routing.
- [Workflow & Projects](../workflows/projects/index.md) - Project lifecycle, artifacts, reviews, PR flow, and state-machine docs.
- [Repository PR Comment Analysis](../workflows/projects/repo-analysis.md) - Detailed `oat repo pr-comments ...` behavior.

## Command Groups

| Command group                                   | What it covers                                                                                                                          | Go deeper                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `oat init`                                      | Bootstrap canonical OAT directories, sync config, optional hooks, and guided setup.                                                     | [CLI Bootstrap](../cli-utilities/bootstrap.md)                                 |
| `oat tools ...`                                 | Install, inspect, update, and remove bundled OAT tool packs and assets.                                                                 | [Tool Packs](../cli-utilities/tool-packs.md)                                   |
| `oat pjm ...`                                   | Initialize the project-management repo-reference surface after installing the project-management pack.                                  | [Install vs. initialize](../cli-utilities/tool-packs.md#install-vs-initialize) |
| `oat backlog ...` / `oat local ...`             | File-backed backlog helpers, local path sync, and local-only operational support.                                                       | [Config and Local State](../cli-utilities/config-and-local-state.md)           |
| `oat config ...` / `oat instructions ...`       | Config discovery, source-aware config dumps, supported mutations, and instruction-integrity helpers.                                    | [Config and Local State](../cli-utilities/config-and-local-state.md)           |
| `oat state ...` / `oat index ...` / `internal`  | Repo dashboard refresh, repo indexing, validation helpers, and diagnostics.                                                             | [Config and Local State](../cli-utilities/config-and-local-state.md)           |
| `oat docs ...`                                  | Docs app bootstrap, migration, index generation, nav sync, and docs workflow entrypoints.                                               | [Docs Tooling Commands](../docs-tooling/commands.md)                           |
| `oat status` / `oat sync` / `oat providers ...` | Provider sync, drift inspection, provider configuration, and adoption behavior.                                                         | [Provider Sync](../provider-sync/index.md)                                     |
| `oat project ...` / `oat cleanup ...`           | Project scaffolding, active-project status inspection, tracked-project listing, plan validation, archive creation, and project/artifact cleanup commands. | [Workflow & Projects](../workflows/projects/index.md)                          |
| `oat repo ...`                                  | Repository-level workflows such as archive sync and PR-comment analysis.                                                                 | [Repository Analysis](../workflows/projects/repo-analysis.md)                  |

Notable commands introduced in the current CLI surface:

- `oat config dump --json` - merged config with source attribution
- `oat project status --json` - full parsed state for the active tracked project. **Stable contract for skills:** the JSON output is a typed read interface for OAT skills; the field set consumed by migrated skills is locked by `MIGRATED_FIELDS` in `packages/cli/src/commands/project/status.test.ts`. Removing or renaming any of `project.{name, path, phase, phaseStatus, workflowMode, docsUpdated, lastCommit, prStatus, prUrl}` is a breaking change and will fail the contract test.
- `oat project status --field <path>` - print one arbitrary dot-path field from the same status payload, e.g. `project.workflowMode` or `project.timestamps.stateUpdated`. Missing/null fields print `null`; object and array fields print compact JSON.
- `oat project status --project-path <path>` - read from a repo-relative or absolute project path instead of `.oat/config.local.json`'s active project pointer. Combine it with `--field` or `--shell` when a skill has already resolved the target project path.
- `oat project status --shell NAME=path ...` - print shell-safe assignments for one or more fields from one status read, e.g. `WORKFLOW_MODE='quick'`. This is the preferred multi-field read API for skills. See [Writing Skills → Reading project state](../contributing/skills.md#reading-project-state) for examples and the `npx`-backed `oat` shim contract.
- `oat project list --json` - summary state for tracked projects under the configured projects root
- `oat project complete-state <project-path>` - apply the canonical completed-state mutation to a project's `state.md`; used by `oat-project-complete` during lifecycle closeout
- `oat project archive [project-path]` - archive a tracked project through the same local move, summary export, and optional S3 upload path used by completion. When omitted, the project path falls back to the active project.
- `oat repo archive sync [project-name]` - hydrate archived project snapshots from the configured repo-scoped S3 archive into `.oat/projects/archived/`. The old `oat project archive sync` path remains as a deprecated shim.
- `oat project validate-plan --project-path <path>` - validates `oat_plan_parallel_groups` metadata in `plan.md`; exits non-zero on invalid. See [Implementation Execution](../workflows/projects/implementation-execution.md#validating-plan-metadata).
- `oat project set-mode` — deprecated no-op. Execution mode is no longer user-selectable; emits a deprecation warning and preserves the `--json` contract.

## `oat config` surface flags

`oat config set` supports mutually exclusive surface flags that control which config file receives the write:

- `--shared` — write to `.oat/config.json` (committed team repo settings)
- `--local` — write to `.oat/config.local.json` (per-developer repo state, gitignored)
- `--user` — write to `~/.oat/config.json` (user-level fallback, applies across all repos)

When no flag is passed, the CLI picks a sensible default per key type: structural keys (`projects.root`, `documentation.*`, etc.) go to shared, state keys (`activeProject`, etc.) go to local, workflow preferences (`workflow.*`) go to local. Pass at most one flag — the command rejects multiple surface flags.

Per-key restrictions apply: structural keys can only be written at shared scope, most state keys can only be written at local scope (`activeIdea` is the exception — it accepts both local and user), and workflow preference keys accept any non-auto surface. Legacy `autoReviewAtCheckpoints` remains shared-only; prefer `workflow.autoReviewAtHillCheckpoints`.

## `workflow.*` preference keys

The `workflow.*` namespace holds user-facing workflow preferences that let you answer repetitive confirmation prompts once and have OAT skills respect the answer automatically. Seven keys:

- `workflow.hillCheckpointDefault` (`every` | `final`) — default HiLL checkpoint behavior in `oat-project-implement`
- `workflow.archiveOnComplete` (`boolean`) — skip the archive prompt in `oat-project-complete`
- `workflow.createPrOnComplete` (`boolean`) — skip the "Open a PR?" prompt in `oat-project-complete`
- `workflow.postImplementSequence` (`wait` | `summary` | `pr` | `docs-pr`) — post-implementation chaining behavior
- `workflow.reviewExecutionModel` (`subagent` | `inline` | `fresh-session`) — default final-review execution model
- `workflow.autoReviewAtHillCheckpoints` (`boolean`) — auto-run the extra lifecycle review at HiLL checkpoints
- `workflow.autoNarrowReReviewScope` (`boolean`) — auto-narrow re-review scope to fix-task commits

All seven keys resolve through the 3-layer precedence chain (`env > local > shared > user > default`). See [Workflow preferences in the Configuration guide](../cli-utilities/configuration.md#workflow-preferences-workflow) for full descriptions, surface guidance, and cross-repo foot-gun examples.
