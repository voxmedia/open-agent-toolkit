---
title: File Locations
description: 'Canonical locations for agent assets, OAT config, projects, ideas, and templates.'
---

# File Locations

For detailed `.oat/` tree semantics, see:

- [`oat-directory-structure.md`](oat-directory-structure.md)

## Canonical agent assets

- Skills: `.agents/skills/`
- Agents/subagents: `.agents/agents/`
- Rules: `.agents/rules/`

## OAT runtime/state

- Repo runtime config (non-sync settings): `.oat/config.json`
- Local runtime config (per-developer state): `.oat/config.local.json`
- Active idea: `activeIdea` in `.oat/config.local.json` (repo) or `~/.oat/config.json` (user)
- Projects root config: `projects.root` in `.oat/config.json` (read via `oat config get projects.root`)
- Archive config: `archive.s3Uri`, `archive.s3SyncOnComplete`, and `archive.summaryExportPath` in `.oat/config.json`
- Project manifests/config: `.oat/sync/`

Config discovery via CLI:

- `oat config describe` lists the supported config surfaces and keys across `.oat/config.json`, `.oat/config.local.json`, `~/.oat/config.json`, and `.oat/sync/config.json`.
- `oat config describe <key>` shows file location, scope, default, mutability, and the owning command for one key.
- `oat config list` shows the currently resolved values for the repo-local/shared command surface.

Config ownership note:

- `.oat/config.json` is the canonical home for shared non-sync settings (for example, `worktrees.root`, `projects.root`).
- `.oat/config.local.json` is the canonical home for per-developer lifecycle state (for example, `activeProject`, `lastPausedProject`, `activeIdea`).
- `~/.oat/config.json` is the canonical home for user-level state (for example, `activeIdea` at global scope).
- `.oat/sync/config.json` remains the sync/provider config contract.
- Legacy `.oat/active-project` / `.oat/projects-root` / `.oat/active-idea` files may still exist as inert compatibility artifacts in some repos/worktrees.

## OAT workflow

- Templates: `.oat/templates/`
- Runtime sync state: `.oat/sync/`
- Repo knowledge: `.oat/repo/knowledge/`
- Repo reference docs: `.oat/repo/reference/`
- Repo reviews: `.oat/repo/reviews/`
- Repo archive: `.oat/repo/archive/`

## Project artifact trees

- Shared: `.oat/projects/shared/<project>/`
- Local: `.oat/projects/local/<project>/`
- Archived: `.oat/projects/archived/<project>/`

Archive sync surfaces:

- Local archive root: `.oat/projects/archived/`
- Remote archive base: `archive.s3Uri` in `.oat/config.json`
- Archive sync command: `oat project archive sync` or `oat project archive sync <project-name>`
- Remote archive snapshot shape: `<archive.s3Uri>/<repo-slug>/projects/YYYYMMDD-<project-name>/`
- Summary export target: `<repo>/<archive.summaryExportPath>/YYYYMMDD-<project-name>.md` when configured

## Ideas — project level (gitignored)

- Ideas root: `.oat/ideas/`
- Backlog: `.oat/ideas/backlog.md`
- Scratchpad: `.oat/ideas/scratchpad.md`
- Per-idea: `.oat/ideas/<idea-name>/`
- Active idea: `activeIdea` in `.oat/config.local.json`
- Idea templates: `.oat/templates/ideas/`

## Ideas — user level (global)

- Ideas root: `~/.oat/ideas/`
- Backlog: `~/.oat/ideas/backlog.md`
- Scratchpad: `~/.oat/ideas/scratchpad.md`
- Per-idea: `~/.oat/ideas/<idea-name>/`
- Active idea: `activeIdea` in `~/.oat/config.json`

## CLI code

- `packages/cli/src/commands/`
- `packages/cli/src/commands/cleanup/`
- `packages/cli/src/commands/cleanup/project/`
- `packages/cli/src/commands/cleanup/artifacts/`
- `packages/cli/src/commands/docs/` — `oat docs` command family
- `packages/cli/src/commands/docs/init/` — scaffold a docs app (Fumadocs or MkDocs)
- `packages/cli/src/commands/docs/migrate/` — convert MkDocs admonitions to GFM callouts
- `packages/cli/src/commands/docs/index-generate/` — generate a docs index from markdown files
- `packages/cli/src/commands/docs/nav/` — regenerate mkdocs.yml nav from index.md sections
- `packages/cli/src/commands/instructions/`
- `packages/cli/src/commands/project/`
- `packages/cli/src/commands/internal/`
- `packages/cli/src/engine/`
- `packages/cli/src/providers/`
- `packages/cli/src/manifest/`
- `packages/cli/src/drift/`

## Docs shared packages

- `packages/docs-config/` — config factories for Fumadocs (`createDocsConfig`, `createSourceConfig`, `createSearchConfig`)
- `packages/docs-theme/` — shared React components for Fumadocs apps (`DocsLayout`, `DocsPage`, `Mermaid`)
- `packages/docs-transforms/` — remark plugins for docs processing (`remarkTabs`, `remarkMermaid`)

## Docs scaffold templates

- `.oat/templates/docs-app-fuma/` — Fumadocs (Next.js) scaffold template
- `.oat/templates/docs-app-mkdocs/` — MkDocs Material scaffold template
