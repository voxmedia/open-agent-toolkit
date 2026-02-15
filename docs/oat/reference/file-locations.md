# File Locations

## Canonical agent assets

- Skills: `.agents/skills/`
- Agents/subagents: `.agents/agents/`

## OAT runtime/state

- Active project pointer: `.oat/active-project`
- Active idea pointer: `.oat/active-idea`
- Optional root override: `.oat/projects-root`
- Project manifests/config: `.oat/sync/`

## OAT workflow

- Templates: `.oat/templates/`
- Utility scripts: `.oat/scripts/`
- Internal reference docs: `.oat/internal-project-reference/`

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
- `packages/cli/src/engine/`
- `packages/cli/src/providers/`
- `packages/cli/src/manifest/`
- `packages/cli/src/drift/`
