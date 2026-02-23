# File Locations

For detailed `.oat/` tree semantics, see:
- `docs/oat/reference/oat-directory-structure.md`

## Canonical agent assets

- Skills: `.agents/skills/`
- Agents/subagents: `.agents/agents/`

## OAT runtime/state

- Repo runtime config (non-sync settings): `.oat/config.json`
- Local runtime config (per-developer state): `.oat/config.local.json`
- Active idea pointer: `.oat/active-idea`
- Projects root config: `projects.root` in `.oat/config.json` (read via `oat config get projects.root`)
- Project manifests/config: `.oat/sync/`

Config ownership note:
- `.oat/config.json` is the canonical home for shared non-sync settings (for example, `worktrees.root`, `projects.root`).
- `.oat/config.local.json` is the canonical home for per-developer lifecycle state (for example, `activeProject`, `lastPausedProject`).
- `.oat/sync/config.json` remains the sync/provider config contract.
- Active-idea pointers remain pointer-file based (`.oat/active-idea`, `~/.oat/active-idea`) and are not part of the current config migration.
- Legacy `.oat/active-project` / `.oat/projects-root` files may still exist as inert compatibility artifacts in some repos/worktrees.

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

## Ideas — project level (gitignored)

- Ideas root: `.oat/ideas/`
- Backlog: `.oat/ideas/backlog.md`
- Scratchpad: `.oat/ideas/scratchpad.md`
- Per-idea: `.oat/ideas/<idea-name>/`
- Active idea pointer: `.oat/active-idea`
- Idea templates: `.oat/templates/ideas/`

## Ideas — user level (global)

- Ideas root: `~/.oat/ideas/`
- Backlog: `~/.oat/ideas/backlog.md`
- Scratchpad: `~/.oat/ideas/scratchpad.md`
- Per-idea: `~/.oat/ideas/<idea-name>/`
- Active idea pointer: `~/.oat/active-idea`

## CLI code

- `packages/cli/src/commands/`
- `packages/cli/src/commands/cleanup/`
- `packages/cli/src/commands/cleanup/project/`
- `packages/cli/src/commands/cleanup/artifacts/`
- `packages/cli/src/commands/project/`
- `packages/cli/src/commands/internal/`
- `packages/cli/src/engine/`
- `packages/cli/src/providers/`
- `packages/cli/src/manifest/`
- `packages/cli/src/drift/`
