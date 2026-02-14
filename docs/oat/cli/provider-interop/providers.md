# Providers

## Claude

- Sync-managed skills and agents
- Uses provider directories under `.claude/...`

## Cursor

- Sync-managed skills and agents
- Uses provider directories under `.cursor/...`

## Codex

- Skills are native-read from `.agents/skills` (no mirrored sync for skill mappings)
- Project agents can sync to `.codex/agents` where configured/supported

## Scope rules

- Project scope: skills + agents
- User scope: skills only (agents deferred)
