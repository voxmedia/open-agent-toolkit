# Providers

## Claude

- Project: `.agents/skills` -> `.claude/skills`, `.agents/agents` -> `.claude/agents`
- User: `~/.agents/skills` -> `~/.claude/skills`

## Cursor

- Project: `.agents/skills` -> `.cursor/skills`, `.agents/agents` -> `.cursor/agents`
- User: `~/.agents/skills` -> `~/.cursor/skills`
- Subagent invocation in Cursor is prompt-driven (`/name` or natural mention), not `subagent_type`

## Codex

- Skills are native-read from `.agents/skills` (no mirrored sync action for skill mappings)
- Codex runtime roles are config/TOML based (`.codex/config.toml` + `.codex/agents/*.toml`)
- OAT does not sync canonical markdown agents into `.codex/agents` until a markdown→TOML adapter is available
- User-scope agents remain deferred
- Codex multi-agent dispatch uses config-defined roles (`[agents.<name>]`) and `agent_type`
- Codex subagent workflows require `[features] multi_agent = true` in active Codex config layers

## Scope rules

- Project scope: skills + agents
- User scope: skills only

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md` (FR5)
- `packages/cli/src/providers/**`
- `packages/cli/src/providers/shared/adapter.utils.ts`
