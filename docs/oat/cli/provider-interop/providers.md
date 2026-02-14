# Providers

## Claude

- Project: `.agents/skills` -> `.claude/skills`, `.agents/agents` -> `.claude/agents`
- User: `~/.agents/skills` -> `~/.claude/skills`

## Cursor

- Project: `.agents/skills` -> `.cursor/skills`, `.agents/agents` -> `.cursor/agents`
- User: `~/.agents/skills` -> `~/.cursor/skills`

## Codex

- Skills are native-read from `.agents/skills` (no mirrored sync action for skill mappings)
- Project agents can sync to `.codex/agents`
- User-scope agents remain deferred

## Scope rules

- Project scope: skills + agents
- User scope: skills only

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md` (FR5)
- `packages/cli/src/providers/**`
- `packages/cli/src/providers/shared/adapter.utils.ts`
