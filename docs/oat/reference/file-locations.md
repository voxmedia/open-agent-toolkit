# File Locations

For detailed `.oat/` tree semantics, see:
- `docs/oat/reference/oat-directory-structure.md`

## Canonical agent assets

- Skills: `.agents/skills/`
- Agents/subagents: `.agents/agents/`

## OAT runtime/state

- Repo runtime config (non-sync settings): `.oat/config.json`
- Active project pointer: `.oat/active-project`
- Active idea pointer: `.oat/active-idea`
- Optional root override: `.oat/projects-root`
- Project manifests/config: `.oat/sync/`

Phase-A ownership note:
- `.oat/config.json` is the canonical home for new non-sync settings (for example, `worktrees.root`).
- `.oat/sync/config.json` remains the sync/provider config contract.
- Existing pointer files (`.oat/active-project`, `.oat/active-idea`, `.oat/projects-root`) remain valid during phased migration.

## OAT workflow

- Templates: `.oat/templates/`
- Runtime sync state: `.oat/sync/`
- Remaining utility scripts: `.oat/scripts/`
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
- `packages/cli/src/commands/project/`
- `packages/cli/src/commands/internal/`
- `packages/cli/src/engine/`
- `packages/cli/src/providers/`
- `packages/cli/src/manifest/`
- `packages/cli/src/drift/`
