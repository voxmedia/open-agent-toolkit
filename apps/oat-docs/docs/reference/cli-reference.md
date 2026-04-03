---
title: CLI Reference
description: Scannable reference for the current OAT CLI surface, with links to the deeper owning sections for each command family.
---

# CLI Reference

Use this page when you need a quick map of the OAT CLI rather than the full command-by-command docs. It is intentionally shallow: each section points to the owning page that documents the detailed behavior.

The CLI is also a standalone value path. You can use `oat init`, `oat sync`, `oat tools`, docs commands, and repo-analysis commands without adopting the full project workflow.

## Contents

- [CLI Bootstrap](../cli-utilities/bootstrap.md) - Bootstrap a repo with `oat init`, guided setup, and initial provider adoption.
- [Tool Packs](../cli-utilities/tool-packs.md) - Install, update, inspect, and remove bundled OAT skills and agents.
- [Config and Local State](../cli-utilities/config-and-local-state.md) - Config, backlog, local paths, diagnostics, and related utility commands.
- [Docs Tooling Commands](../docs-tooling/commands.md) - Docs app scaffolding, migration, index generation, and nav sync.
- [Provider Sync](../provider-sync/index.md) - Sync behavior, provider capabilities, config, and drift management.
- [Agentic Workflows](../workflows/index.md) - Tracked project execution, skills, ideas, and workflow routing.
- [Workflow & Projects](../workflows/projects/index.md) - Project lifecycle, artifacts, reviews, PR flow, and state-machine docs.
- [Repository Analysis](../workflows/projects/repo-analysis.md) - Detailed `oat repo pr-comments ...` behavior.

## Command Groups

| Command group                                   | What it covers                                                                            | Go deeper                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `oat init`                                      | Bootstrap canonical OAT directories, sync config, optional hooks, and guided setup.       | [CLI Bootstrap](../cli-utilities/bootstrap.md)                       |
| `oat tools ...`                                 | Install, inspect, update, and remove bundled OAT tool packs and assets.                   | [Tool Packs](../cli-utilities/tool-packs.md)                         |
| `oat backlog ...` / `oat local ...`             | File-backed backlog helpers, local path sync, and local-only operational support.         | [Config and Local State](../cli-utilities/config-and-local-state.md) |
| `oat config ...` / `oat instructions ...`       | Config discovery, supported mutations, and instruction-integrity helpers.                 | [Config and Local State](../cli-utilities/config-and-local-state.md) |
| `oat state ...` / `oat index ...` / `internal`  | Repo dashboard refresh, repo indexing, validation helpers, and diagnostics.               | [Config and Local State](../cli-utilities/config-and-local-state.md) |
| `oat docs ...`                                  | Docs app bootstrap, migration, index generation, nav sync, and docs workflow entrypoints. | [Docs Tooling Commands](../docs-tooling/commands.md)                 |
| `oat status` / `oat sync` / `oat providers ...` | Provider sync, drift inspection, provider configuration, and adoption behavior.           | [Provider Sync](../provider-sync/index.md)                           |
| `oat project ...` / `oat cleanup ...`           | Project scaffolding, execution mode, and project/artifact cleanup commands.               | [Workflow & Projects](../workflows/projects/index.md)                |
| `oat repo ...`                                  | Repository-level analysis workflows, currently centered on PR comments.                   | [Repository Analysis](../workflows/projects/repo-analysis.md)        |
