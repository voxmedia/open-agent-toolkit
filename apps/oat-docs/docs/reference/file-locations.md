---
title: File Locations
description: 'Canonical locations for agent assets, OAT config, projects, ideas, and templates.'
---

# File Locations

For detailed `.oat/` tree semantics, see:

- [`oat-directory-structure.md`](oat-directory-structure.md)

## Canonical agent assets

- Skills: `.agents/skills/` (project) and `~/.agents/skills/` (user)
- Agents/subagents: `.agents/agents/` (project) and `~/.agents/agents/` (user)
- Rules: `.agents/rules/` (project only)
- Cursor reads project skills directly from `.agents/skills/` and user skills
  directly from `~/.agents/skills/`. `.cursor/skills/` remains a Cursor-only
  extension and adoption surface, not generated output.
- Copilot reads project skills directly from `.agents/skills/` and user skills
  directly from `~/.agents/skills/`. OAT treats legacy `.github/skills/` and
  `~/.copilot/skills/` as adoption sources, not generated output. Copilot agents
  still sync to `.github/agents/` and `~/.copilot/agents/`, and project rules
  still sync to `.github/instructions/`.

## Managed tool-pack assets by scope

Every reusable tool pack defaults to user scope on a fresh install, so both
columns are ordinary states.

| Asset kind        | Project scope              | User scope                   |
| ----------------- | -------------------------- | ---------------------------- |
| Pack skills       | `.agents/skills/<name>/`   | `~/.agents/skills/<name>/`   |
| Pack agents       | `.agents/agents/<name>.md` | `~/.agents/agents/<name>.md` |
| Pack templates    | `.oat/templates/<name>`    | `~/.oat/templates/<name>`    |
| Pack scripts      | `.oat/scripts/<name>`      | `~/.oat/scripts/<name>`      |
| Bundled docs tree | not applicable             | `~/.oat/docs/`               |

Project-scope templates under `.oat/templates/` are owner overrides that OAT
seeds once and never rewrites; the managed default lives at user scope and in
the bundle. PJM templates resolve repository → user → bundle.

Pack intent is stored per scope:

- Project intent: `tools.<pack>: true` in `.oat/config.json`
- User intent: `tools.<pack>: true` in `~/.oat/config.json`
- Repository PJM adoption: `pjm.initialized` and `pjm.schemaVersion` in `.oat/config.json`

## OAT runtime/state

- Repo runtime config (non-sync settings): `.oat/config.json`
- Local runtime config (per-developer state): `.oat/config.local.json`
- Active idea: `activeIdea` in `.oat/config.local.json` (repo) or `~/.oat/config.json` (user)
- Projects root config: `projects.root` in `.oat/config.json` (read via `oat config get projects.root`)
- Default project scope: `projects.defaultScope` in `.oat/config.json`
  (`synced` by default; override with `OAT_PROJECTS_DEFAULT_SCOPE`)
- Archive config: `archive.s3Uri`, `archive.s3SyncOnComplete`, `archive.summaryExportPath`, `archive.wrapUpExportPath`, `archive.awsProfile`, and `archive.awsRegion` in `.oat/config.json`
- Workflow gate config: `workflow.gates.skills` and `workflow.gates.execTargets` in `.oat/config.json`, `.oat/config.local.json`, or `~/.oat/config.json` (manage via `oat gate`)
- Project sync manifest/config: `.oat/sync/`
- User sync manifest/config: `~/.oat/sync/`

Config discovery via CLI:

- `oat config describe` lists the supported config surfaces and keys across `.oat/config.json`, `.oat/config.local.json`, `~/.oat/config.json`, `.oat/sync/config.json`, and `~/.oat/sync/config.json`.
- `oat config describe <key>` shows file location, scope, default, mutability, and the owning command for one key.
- `oat config list` shows the currently resolved values for the repo-local/shared command surface.

Config ownership note:

- `.oat/config.json` is the canonical home for shared non-sync settings (for example, `worktrees.root`, `projects.root`).
- `.oat/config.local.json` is the canonical home for per-developer lifecycle state (for example, `activeProject`, `lastPausedProject`, `activeIdea`).
- `~/.oat/config.json` is the canonical home for user-level state (for example, `activeIdea` at global scope).
- `.oat/sync/config.json` owns project sync/provider settings and known strays.
- `~/.oat/sync/config.json` owns user sync/provider settings and personal known
  strays. OAT migrates the legacy `~/.oat/config.json#knownStrays` key here.
- Legacy `.oat/active-project` / `.oat/projects-root` / `.oat/active-idea` files may still exist as inert compatibility artifacts in some repos/worktrees.

## OAT workflow

- Templates: `.oat/templates/` (repo overrides) and `~/.oat/templates/` (managed defaults)
- Shared scripts: `.oat/scripts/` and `~/.oat/scripts/`
- Runtime sync state: `.oat/sync/`
- Repo knowledge: `.oat/repo/knowledge/`
- Active PJM operational layer: `.oat/repo/pjm/` (`current-state.md`, `roadmap.md`, `backlog/`)
- Durable repo references: `.oat/repo/reference/` (file-per-record decisions under `decisions/`)
- Repo reviews: `.oat/repo/reviews/`
- Repo archive: `.oat/repo/archive/`

## Project artifact trees

- Shared: `.oat/projects/shared/<project>/`
- Synced checkout: `.oat/projects/synced/<project>/` (gitignored nested
  worktree)
- Synced record: `.oat/projects/synced/<project>.json` (tracked on the parent
  branch)
- Synced ref: `refs/oat/projects/<project>` on `origin`
- Local: `.oat/projects/local/<project>/`
- Archived: `.oat/projects/archived/<project>/`

Archive sync surfaces:

- Local archive root: `.oat/projects/archived/`
- Remote archive base: `archive.s3Uri` in `.oat/config.json`
- Archive sync command: `oat repo archive sync` or `oat repo archive sync <project-name>`
- Remote archive snapshot shape: `<archive.s3Uri>/<repo-slug>/projects/YYYYMMDD-<project-name>/`
- Summary export target: `<repo>/<archive.summaryExportPath>/YYYYMMDD-<project-name>.md` when configured
- Wrap-up export target: `<repo>/<archive.wrapUpExportPath>/YYYY-MM-DD-wrap-up-<label>.md` when configured; otherwise `oat-wrap-up` falls back to `<repo>/.oat/repo/reference/wrap-ups/`

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

- `packages/control-plane/` - read-only control-plane library for project-state parsing and recommendation
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
