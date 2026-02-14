# File Locations

## Canonical agent assets

- Skills: `.agents/skills/`
- Agents/subagents: `.agents/agents/`

## OAT runtime/state

- Active project pointer: `.oat/active-project`
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

## CLI code

- `packages/cli/src/commands/`
- `packages/cli/src/engine/`
- `packages/cli/src/providers/`
- `packages/cli/src/manifest/`
- `packages/cli/src/drift/`
