# Add GitHub Copilot and Gemini CLI Providers

## Context

OAT currently supports 3 providers (Claude, Cursor, Codex). Both GitHub Copilot and Gemini CLI now support the Agent Skills spec. Gemini reads `.agents/skills/` and `.agents/agents/` natively (like Codex). Copilot needs sync to `.github/skills/`, `.github/agents/`, `~/.copilot/skills/`, `~/.copilot/agents/` (like Claude/Cursor).

## Changes

### 1. Create Gemini provider (`nativeRead: true` — follows Codex pattern)

**New files:**
- `packages/cli/src/providers/gemini/paths.ts` — Both skills and agents as `nativeRead: true` pointing at `.agents/skills` and `.agents/agents`
- `packages/cli/src/providers/gemini/adapter.ts` — `detectGemini()` checks for `.gemini/` directory; `defaultStrategy: 'auto'`
- `packages/cli/src/providers/gemini/index.ts` — Re-exports

**Reference:** `packages/cli/src/providers/codex/` (same `nativeRead: true` pattern)

### 2. Create Copilot provider (`nativeRead: false` — follows Claude pattern)

**New files:**
- `packages/cli/src/providers/copilot/paths.ts`
  - Project: skills `.agents/skills` → `.github/skills`, agents `.agents/agents` → `.github/agents`
  - User: skills `.agents/skills` → `.copilot/skills`, agents `.agents/agents` → `.copilot/agents`
- `packages/cli/src/providers/copilot/adapter.ts` — `detectCopilot()` checks for `.github/copilot-instructions.md` or `.github/agents/` or `.github/skills/` (`.github/` alone is too broad); `defaultStrategy: 'symlink'`
- `packages/cli/src/providers/copilot/index.ts` — Re-exports

**Reference:** `packages/cli/src/providers/claude/` (same `nativeRead: false` pattern)

**Reference:** `packages/cli/src/providers/claude/` (same `nativeRead: false` pattern)

### 3. Enable user-scope agents for all providers

The contract test currently enforces that user mappings contain only `skill` content type. Relax this to also allow `agent`, then add user-scope agent mappings to all providers:

- `packages/cli/src/providers/shared/adapter-contract.test.ts` — Remove or relax the "no agents in user mappings" assertion
- `packages/cli/src/providers/claude/paths.ts` — Add `{ contentType: 'agent', canonicalDir: '.agents/agents', providerDir: '.claude/agents', nativeRead: false }` to `CLAUDE_USER_MAPPINGS`
- `packages/cli/src/providers/cursor/paths.ts` — Add agent mapping to `CURSOR_USER_MAPPINGS`
- `packages/cli/src/providers/codex/paths.ts` — Already nativeRead; add agent mapping if Codex supports `~/.agents/agents/` at user scope (verify)
- New providers get user-scope agents from the start (Copilot: `~/.copilot/agents/`, Gemini: `~/.agents/agents/`)

### 4. Register both in command files (7 files)

Add imports and append to adapter arrays in:
- `packages/cli/src/commands/init/index.ts`
- `packages/cli/src/commands/sync/index.ts`
- `packages/cli/src/commands/providers/list/list.ts`
- `packages/cli/src/commands/providers/inspect/inspect.ts`
- `packages/cli/src/commands/providers/set/index.ts`
- `packages/cli/src/commands/status/index.ts`
- `packages/cli/src/commands/doctor/index.ts`

### 5. Update contract tests

- `packages/cli/src/providers/shared/adapter-contract.test.ts` — Add `geminiAdapter` and `copilotAdapter` to the `ADAPTERS` array

### 6. Add provider-specific tests

- `packages/cli/src/providers/gemini/adapter.test.ts` — Follow Codex test pattern
- `packages/cli/src/providers/copilot/adapter.test.ts` — Follow Claude test pattern

## Detection heuristic for Copilot

`.github/` exists in nearly every repo, so we need a more specific check. Check for any of:
- `.github/copilot-instructions.md`
- `.github/agents/` directory
- `.github/skills/` directory

## Verification

1. `pnpm type-check` — No type errors
2. `pnpm test` — All tests pass, including contract tests for new providers
3. `pnpm lint` — Clean
4. Manual: `pnpm run cli -- providers list` — Shows Gemini and Copilot in output
