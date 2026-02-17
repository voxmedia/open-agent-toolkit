# Provider Configuration + Worktree-Safe Sync Plan

## Summary
Implement explicit project provider configuration and config-aware sync behavior so fresh worktrees can sync provider content even when provider root directories do not exist yet.

This includes:
1. `oat providers set` command for explicit provider enable/disable.
2. `oat init` interactive provider selection and explicit config persistence.
3. `oat sync` mismatch detection + interactive enable prompts (for unset and disabled detected providers).
4. Worktree bootstrap guidance and script (`worktree:init`) documentation.
5. AGENTS workflow instruction update to run worktree init after switching worktrees.

## Locked Decisions
1. Scope is `project` only for this backlog item.
2. `oat providers set` is the command shape.
3. `oat init` prompts with all known providers and writes explicit `enabled: true|false` for all known providers.
4. `oat sync` prompts in interactive mode when provider directory is detected and provider is `unset` or `enabled:false`.
5. `oat sync` in non-interactive mode warns and continues (no config mutation).
6. Add AGENTS instruction: when switching worktrees, run worktree init script.

## In Scope
1. CLI command: `oat providers set`.
2. Config write/update path for `.oat/sync/config.json`.
3. Init prompt flow for providers (`project` scope only).
4. Sync provider-activation logic using config + detection fallback.
5. Sync mismatch prompt/warn behavior and output messaging.
6. Docs updates and AGENTS update.
7. Add `worktree:init` script in root `package.json`.

## Out of Scope
1. User-scope provider management.
2. Provider strategy management UX changes (`strategy` remains supported but unchanged).
3. Provider auto-registration beyond current known adapters.
4. Agent file-sync changes (handled separately).

## Public API / Interface Changes
1. New command:
   - `oat providers set --enabled <csv> --disabled <csv>`
2. `oat init` behavior (`--scope project` or `--scope all` including project):
   - Interactive prompt to select supported providers.
   - Persists explicit booleans for all known providers in project config.
3. `oat sync` behavior:
   - Uses explicit enablement when present.
   - Uses detection fallback when provider is unset.
   - Interactive prompt to enable detected `unset` or `false` providers.
   - Non-interactive warning when mismatch exists.
4. Root script:
   - `"worktree:init": "pnpm install && pnpm run build && pnpm run cli sync --scope project --apply"`

## Implementation Plan

### 1) Config Persistence Foundation
1. Extend config module to support writing config (`saveSyncConfig`) and targeted provider enablement updates.
2. Preserve existing fields (`version`, `defaultStrategy`, per-provider `strategy`) when updating `enabled`.
3. Keep schema version at `1`; keep backward compatibility with missing config file.
4. Ensure `.oat/sync/` directory is created on save.

### 2) Provider Selection Utility (Shared Logic)
1. Introduce config-aware adapter resolution utility returning:
   - active adapters,
   - detected providers that are unset,
   - detected providers explicitly disabled.
2. Activation rules:
   - `enabled:true` => active.
   - `enabled:false` => inactive.
   - `enabled` unset => active only if detected.
3. Keep provider list source as registered adapters (`claude`, `cursor`, `codex`).

### 3) New `oat providers set` Command
1. Add `packages/cli/src/commands/providers/set/index.ts` and tests.
2. Validate input:
   - At least one of `--enabled` or `--disabled`.
   - Known provider names only.
   - No overlap between enabled and disabled.
3. Apply updates to `.oat/sync/config.json` under `providers.<name>.enabled`.
4. Enforce `--scope project` only for now:
   - If scope is `user` or `all`, return clear error with remediation.
5. Output:
   - Human-readable summary and JSON mode payload.

### 4) `oat init` Provider Prompt + Config Write
1. In interactive project init, show multiselect of all known providers.
2. Default selection:
   - detected providers,
   - plus already-enabled providers if config exists.
3. Persist explicit booleans for all known providers after prompt.
4. Behavior when non-interactive:
   - no mutation,
   - show guidance to run `oat providers set`.
5. Behavior when `--scope all`:
   - provider prompt/write only for project scope portion.

### 5) `oat sync` Mismatch Guard + Prompting
1. During sync scope evaluation, resolve providers using config-aware utility.
2. Interactive project sync:
   - if detected providers are unset or disabled, prompt user to enable selected providers now.
   - persist accepted changes to config before planning.
   - if user declines unset provider, persist `enabled:false` to avoid repeated prompts.
   - if user declines disabled provider, leave `enabled:false`.
3. Non-interactive sync:
   - do not mutate config,
   - warn with exact remediation command (`oat providers set ...`),
   - continue sync using active providers from current rules.
4. Sync output:
   - clearly indicate providers active from explicit config vs detection fallback.
   - indicate detected-but-disabled mismatch as warning context.

### 6) Docs + AGENTS + Worktree Script
1. Update `/Users/thomas.stang/Code/open-agent-toolkit/AGENTS.md`:
   - add explicit worktree workflow instruction to run worktree init script after switching/creating worktrees.
2. Update `/Users/thomas.stang/Code/open-agent-toolkit/package.json` script block with `worktree:init`.
3. Update CLI docs and troubleshooting docs for:
   - `oat providers set`,
   - init provider prompt behavior,
   - sync mismatch prompt/warn behavior,
   - recommended worktree bootstrap command.

## Test Cases and Scenarios

### 1) Unit Tests
1. Config save/update preserves unrelated fields.
2. Provider activation utility covers:
   - explicit enabled,
   - explicit disabled + detected,
   - unset + detected,
   - unset + not detected.

### 2) Command Tests: `providers set`
1. Valid enable/disable writes config.
2. Unknown provider rejected.
3. Overlap enable+disable rejected.
4. Scope `user`/`all` rejected with actionable message.
5. JSON output shape verified.

### 3) Command Tests: `init`
1. Interactive project init prompts and writes explicit true/false for all known providers.
2. Non-interactive init does not mutate config and emits guidance.
3. Existing config + prompt update path preserves provider strategies.
4. `--scope all` only writes project config once.

### 4) Command Tests: `sync`
1. Unset+detected provider in interactive mode prompts and persists if accepted.
2. Disabled+detected provider in interactive mode prompts and persists if accepted.
3. Declining unset provider persists `enabled:false`.
4. Non-interactive mismatch warns and does not mutate config.
5. Active adapter set used for planning/execution matches final config state.

### 5) Regression Tests
1. Existing sync behavior for already-configured providers remains stable.
2. Existing init hook and stray-adoption flows remain unaffected.
3. Help snapshot updates include new `providers set` subcommand.

## Acceptance Criteria
1. Fresh worktree with no `.claude/.cursor/.codex` directories syncs successfully when providers are explicitly enabled in project config.
2. `oat init` can establish explicit provider intent in config without manual JSON edits.
3. `oat providers set` allows deterministic post-init provider management.
4. `oat sync` surfaces directory/config mismatches and offers safe remediation.
5. AGENTS explicitly instructs running worktree init after switching worktrees.
6. `pnpm --filter @oat/cli test` and `pnpm --filter @oat/cli build` pass.

## Assumptions and Defaults
1. Known providers are the currently registered adapters only (`claude`, `cursor`, `codex`).
2. Provider config is stored only in project `.oat/sync/config.json`.
3. If a detected provider is unset and user declines enable in interactive sync, we persist `enabled:false` to prevent repeat prompts.
4. Non-interactive sync never mutates config.
5. Manual config editing remains supported and is not blocked by CLI.
