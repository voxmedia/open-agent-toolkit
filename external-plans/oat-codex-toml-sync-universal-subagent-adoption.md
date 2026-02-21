# OAT Plan: Codex TOML Sync + Universal Subagent Stray Adoption (Post Gemini/Copilot)

## Summary
Implement the next interop layer after Gemini/Copilot: canonical subagents in `.agents/agents` become the source of truth for all providers, including Codex via TOML generation. Extend existing `oat init` and `oat status` stray-adoption flows to support universal subagent adoption (Claude/Cursor/Copilot/Gemini/Codex), with provider-specific conversion where needed.

This plan explicitly absorbs the final-review Medium finding by documenting Codex user-scope agent behavior as intentionally deferred until this adapter work lands.

## Current Baseline (Ground Truth)
1. Gemini and Copilot provider adapters are a prerequisite from prior work and must be present before this plan starts (not assumed on `main` until merged).
2. Codex mappings remain skills-only for user scope in `packages/cli/src/providers/codex/paths.ts`.
3. Stray adoption currently assumes directory-hash move/symlink behavior in `packages/cli/src/commands/shared/adopt-stray.ts`.
4. No dedicated `adopt` command exists; adoption happens in `oat init` and `oat status`.

## Scope
1. Codex role generation and config merge for project scope.
2. Universal subagent stray detection and adoption conversion across providers.
3. Canonical schema and parser updates for cross-provider subagent metadata.
4. Sync/status/doctor integration and test coverage.
5. Documentation updates for behavior and constraints.

## Out of Scope
1. New standalone `oat adopt` command.
2. User-scope Codex role generation (`~/.codex`) in this release.
3. Auto-fanout to all providers during adoption (fanout remains `oat sync --apply`).

## Locked Dependencies
1. `@iarna/toml@2.2.5`
2. `yaml@2.8.2`

## Phase Dependencies
1. Phase 0 and Phase 0.5 are prerequisites.
2. Phase 1 feeds Phase 2.
3. Phase 2 feeds Phase 3 and Phase 4.
4. Phase 5 depends on Phase 3 and Phase 4.
5. Phase 6 can begin after Phase 1, but final docs complete after Phase 5.

## Implementation Phases

## Phase 0: Contract Closure for Existing Medium Finding
1. Add an explicit note in implementation/docs that Codex user-scope agents were intentionally deferred pending TOML adapter work.
2. Ensure plan/implementation wording no longer implies Codex user-scope agent support already exists.
3. Add a start gate check: Gemini/Copilot adapter work must be merged or present in the implementation branch/worktree.
4. Acceptance: no ambiguous claim remains between imported plan intent and current codex mapping behavior.

## Phase 0.5: Dependency Installation + Wiring
1. Install locked dependencies in CLI package:
   - `pnpm --filter @oat/cli add @iarna/toml@2.2.5 yaml@2.8.2`
2. Update `packages/cli/tsconfig.json` aliases to include canonical-agent module imports (for example `@agents/*`), consistent with repo import conventions.
3. Add minimal smoke tests proving TOML/YAML parse+stringify wiring in the CLI test suite.

## Phase 1: Canonical Subagent Schema + Parser
1. Add `packages/cli/src/agents/canonical/types.ts`.
2. Add `packages/cli/src/agents/canonical/parse.ts`.
3. Add `packages/cli/src/agents/canonical/render.ts`.

Canonical schema rules:
1. Top-level required: `name`, `description`.
2. Top-level optional portable: `tools`, `model`, `readonly`.
3. Top-level compatibility field: `color` (accepted for existing canonical files; treated as provider-specific rendering metadata when exporting).
4. Provider-specific keys live under `x_<provider>` objects such as `x_codex`, `x_claude`, `x_cursor`, `x_copilot`, `x_gemini`.
5. Rule for “shared-by-some providers”: keep top-level only when semantics are equivalent; otherwise keep namespaced and map during export.

Parsing/rendering behavior:
1. Parse YAML frontmatter with `yaml@2.8.2`.
2. Preserve unknown `x_*` keys losslessly.
3. Preserve Markdown body as canonical system instructions.
4. Validate names for safe filename/role mapping.
5. Relationship with scanner is explicit: `packages/cli/src/engine/scanner.ts` remains unchanged and continues to discover canonical entries; parser is invoked downstream by codecs/adoption using discovered `canonicalPath`.

## Phase 2: Provider Codec Layer
1. Add `packages/cli/src/providers/shared/agent-codec.types.ts`.
2. Add markdown codec utilities for Claude/Cursor/Copilot/Gemini.
3. Add codex codecs:
   - `packages/cli/src/providers/codex/codec/import-from-codex.ts`
   - `packages/cli/src/providers/codex/codec/export-to-codex.ts`
   - `packages/cli/src/providers/codex/codec/config-merge.ts`

Architecture decision for this release:
1. Codex integration is intentionally implemented as a sync command-layer extension (post path-mapping engine), not an engine generalization.
2. Generalized generator-adapter engine work is deferred until at least one additional non-path-mapping provider requires the same abstraction.
3. Add a short ADR/note in docs or design artifact to prevent ambiguity.

Codex export decisions:
1. Generate `.codex/agents/<role>.toml`.
2. Merge `.codex/config.toml` to upsert:
   - `[features] multi_agent = true`
   - `[agents.<role>]`
   - `description`
   - `config_file = "agents/<role>.toml"`
3. Preserve unrelated config keys and unmanaged agent roles.
4. Managed role identification:
   - role points to `agents/<role>.toml`
   - role file includes OAT provenance comment header
5. Remove stale managed roles only when both managed markers match.

Codex import decisions:
1. Read role declarations from config and role files.
2. Convert to canonical markdown file `.agents/agents/<role>.md`.
3. Map codex-only settings into `x_codex`.
4. If codex source lacks portable tool intent, default canonical tools to `Read, Grep, Glob, Bash`.
5. In interactive mode, prompt only for high-impact missing intent.
6. In non-interactive mode, apply defaults and emit warning.

## Phase 3: Universal Stray Detection + Adoption Pipeline
1. Replace direct `adoptStrayToCanonical` assumption with provider-aware adoption dispatch.
2. Keep existing adoption entry points in:
   - `packages/cli/src/commands/init/index.ts`
   - `packages/cli/src/commands/status/index.ts`
3. Add provider-specific stray detectors:
   - markdown providers via existing mapping dirs
   - codex via `.codex/config.toml` role table plus `.codex/agents/*.toml`
4. Add provider-specific adoption handlers:
   - markdown providers: normalize to canonical markdown and reconcile provider view
   - codex: import TOML to canonical, then regenerate codex managed outputs from canonical

Behavior and compatibility decisions:
1. Adoption reconciles canonical plus adopted provider only.
2. Cross-provider propagation remains `oat sync --apply`.
3. Conflict handling when canonical already exists and differs:
   - interactive: prompt choose `keep canonical` or `replace from stray`
   - non-interactive: skip with deterministic warning and non-zero issue count
4. This is an intentional behavior change versus current hard-fail mismatch behavior; preserve compatibility by keeping `adoptStrayToCanonical` strict and implementing new conflict policy in a provider-aware orchestration layer that pre-checks conflicts.

## Phase 4: Sync Integration for Codex Agent Generation
1. Keep existing engine (`computeSyncPlan`/`executeSyncPlan`) for path-mapping providers.
2. Add codex post-plan extension pipeline at command layer:
   - compute codex role/config operations in dry-run
   - apply codex role/config updates in apply mode
3. Extend sync output to report codex extension operations.
4. Track generated codex role files in manifest as file entries where applicable.
5. Treat `.codex/config.toml` as aggregate managed artifact outside one-to-one canonical mapping entries.
6. Aggregate tracking contract for `.codex/config.toml` in this release:
   - do not force-fit into one-to-one `ManifestEntry`
   - record codex aggregate drift in sync/status extension result metadata (including contributing canonical role set + computed config hash)
   - keep manifest backward-compatible for existing entry model

## Phase 5: Status and Doctor Enhancements
1. Extend status to include codex role/config drift states:
   - missing role file
   - modified role file
   - config role mismatch
   - stray unmanaged codex role entries
2. Extend doctor with codex multi-agent consistency checks when codex-managed roles exist:
   - parseable TOML
   - `features.multi_agent` present and true
   - `[agents.<role>]` references existing role files

## Phase 6: Docs
Update:
1. `docs/oat/cli/provider-interop/providers.md`
2. `docs/oat/cli/provider-interop/overview.md`
3. `docs/oat/workflow/reviews.md` where relevant for deferred-contract note
4. `README.md` sync/adoption behavior notes

Documentation must state:
1. Canonical `.agents/agents` is source of truth.
2. Codex roles are generated outputs.
3. Adoption is available in `init`/`status`.
4. Fanout model: adoption local reconciliation first, global reconciliation through sync.

## Important API / Interface / Type Changes
1. New canonical-agent types and parser/render interfaces under `packages/cli/src/agents/canonical/`.
2. New provider codec interfaces under `packages/cli/src/providers/shared/agent-codec.types.ts`.
3. Extended sync command payload in `packages/cli/src/commands/sync/sync.types.ts`:
   - add optional codex extension result block for dry-run/apply.
4. Extended status candidate/report typing in:
   - `packages/cli/src/commands/status/index.ts`
   - `packages/cli/src/commands/init/index.ts`
   to include provider-specific stray metadata and adoption outcomes.
5. No new CLI command surface; existing `init`, `status`, `sync`, `doctor` behavior expands.

## Test Plan

## Unit Tests
1. Canonical parser handles top-level portable fields plus `x_*` extension blocks.
2. Canonical renderer preserves body and provider extension maps.
3. Canonical parser handles existing canonical files under `.agents/agents/*.md` (including current `color` frontmatter).
4. Codex TOML export writes valid role files and config fragments.
5. Codex config merge preserves unmanaged settings and non-managed roles.
6. Codex import maps unknown codex fields into `x_codex`.
7. Conflict policy functions for interactive/non-interactive paths.

## Integration Tests
1. Sync dry-run shows codex create/update/remove operations for roles/config.
2. Sync apply writes codex artifacts; second run is idempotent.
3. Status reports codex drift and stray conditions accurately.
4. Init/status adoption from Claude/Cursor strays still works.
5. Init/status adoption from Codex stray role works and creates canonical markdown.
6. Adoption conflict behavior matches mode (interactive prompt vs non-interactive skip).
7. Manifest consistency remains valid after mixed provider operations.

## Regression Tests
1. Existing provider adapter contract tests continue to pass with Claude/Cursor/Copilot/Gemini/Codex.
2. Existing sync/status/doctor JSON shape remains backward-compatible with additive fields.
3. Existing skills sync behavior unchanged.

## Rollout and Rollback
1. Land phases incrementally with green tests at each phase boundary.
2. Keep Codex generation behind normal provider enablement path; if issues occur, disable Codex provider and retain existing path-mapping sync behavior.
3. Rollback path: revert codex extension integration and codec wiring while keeping canonical parser isolated if already merged.

## Acceptance Criteria
1. Canonical `.agents/agents` can drive Codex roles/config generation via `oat sync`.
2. Stray subagent adoption works for Claude/Cursor/Copilot/Gemini and Codex.
3. No false claim remains that Codex user-scope agents already work before adapter support.
4. Status/doctor correctly surface codex-specific drift/misconfigurations.
5. Re-running sync is idempotent across all providers.
6. All new and existing relevant CLI tests pass.

## Assumptions and Defaults
1. Work starts only after Gemini/Copilot provider work is present in branch baseline.
2. Codex user-scope role generation is deferred to a later phase.
3. Adoption remains exposed only via `oat init` and `oat status`.
4. Codex missing tool intent defaults to `Read, Grep, Glob, Bash`.
5. Provider-specific semantics are stored in namespaced `x_<provider>` blocks unless portable equivalence is explicit.
6. `@iarna/toml@2.2.5` and `yaml@2.8.2` are pinned exactly as requested.
