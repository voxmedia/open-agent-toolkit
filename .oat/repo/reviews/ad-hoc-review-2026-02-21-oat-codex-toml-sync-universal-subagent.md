---
oat_generated: true
oat_generated_at: 2026-02-21
oat_review_type: artifact
oat_review_scope: external-plans/oat-codex-toml-sync-universal-subagent-adoption.md
oat_review_scope_mode: files
oat_project: null
oat_review_mode: ad_hoc
---

# Artifact Review: Codex TOML Sync + Universal Subagent Adoption Plan

**Reviewed:** 2026-02-21
**Scope:** `--files external-plans/oat-codex-toml-sync-universal-subagent-adoption.md`
**Files reviewed:** 1

## Summary

Comprehensive plan for extending OAT's provider interop to support Codex TOML role generation from canonical `.agents/agents/` markdown files, plus a universal stray-adoption pipeline for all providers. The plan is well-structured across 7 phases with clear scope boundaries, test coverage, and acceptance criteria. However, several codebase assumptions need correction, the relationship between the new codec layer and the existing engine is underspecified, and a behavior change to existing adoption flow is not flagged.

## Findings

### Critical

None.

### Important

**I-1: Gemini/Copilot baseline dependency is unmet on `main`**
- `external-plans/oat-codex-toml-sync-universal-subagent-adoption.md:9` — "Gemini and Copilot provider adapters exist in the reviewed worktree"
- `external-plans/oat-codex-toml-sync-universal-subagent-adoption.md:179` — "Work starts after Gemini/Copilot provider work is baseline-complete."
- **Evidence:** `packages/cli/src/providers/copilot/` and `packages/cli/src/providers/gemini/` do not exist on `main`. Only `claude/`, `codex/`, `cursor/`, and `shared/` are present.
- **Risk:** If this plan is queued for implementation, the baseline claim is misleading. If Gemini/Copilot adapters exist on a different branch, that branch must be specified. If they don't exist anywhere, the assumption should state "depends on prior Gemini/Copilot adapter work completing first."
- **Fix:** Amend baseline item 1 to "Gemini and Copilot provider adapters are expected to exist after prior planned work completes" or explicitly reference the branch/PR where they exist. Add a gate check to Phase 1 start.

**I-2: Locked dependencies `@iarna/toml` and `yaml` are not installed**
- `external-plans/oat-codex-toml-sync-universal-subagent-adoption.md:27-28`
- **Evidence:** Neither `@iarna/toml` nor `yaml` appears in any `package.json` across the monorepo.
- **Risk:** No explicit installation step is listed in any phase. Implementors may forget this prerequisite.
- **Fix:** Add a "Phase 0.5: Dependency Installation" step or prepend to Phase 1: `pnpm --filter @oat/cli add @iarna/toml@2.2.5 yaml@2.8.2`. Also note whether TypeScript path aliases need registration for these packages.

**I-3: Codec-vs-Adapter integration contract is underspecified**
- `external-plans/oat-codex-toml-sync-universal-subagent-adoption.md:55-56` (Phase 2 introduces `agent-codec.types.ts`)
- `external-plans/oat-codex-toml-sync-universal-subagent-adoption.md:102-109` (Phase 4 adds "post-plan extension pipeline")
- **Evidence:** The existing sync engine operates through `ProviderAdapter` → `PathMapping[]` → `computeSyncPlan` → `executeSyncPlan`. The engine assumes one-to-one canonical-to-provider path mappings with symlink/copy strategies (`engine.types.ts:6-13`). Codex TOML generation (one canonical → role file + config fragment) doesn't fit this model.
- **Risk:** The "post-plan extension pipeline at command layer" (Phase 4) creates Codex-specific logic in the sync command rather than generalizing the engine. If future providers (e.g., Windsurf, Zed) also need non-symlink generation, each would require its own command-layer extension.
- **Fix:** The plan should explicitly address whether this is intentional short-term pragmatism or whether a generalized "generator adapter" engine extension is the target architecture. A brief ADR note would suffice: "We accept Codex-specific command-layer extension for this release; engine generalization is deferred until a second non-symlink provider needs it."

**I-4: Adoption behavior change not flagged as breaking**
- `external-plans/oat-codex-toml-sync-universal-subagent-adoption.md:96-100` (Phase 3 conflict handling)
- **Evidence:** Current `packages/cli/src/commands/shared/adopt-stray.ts:48-53` throws `CliError` on content hash mismatch (hard fail, no prompt). Phase 3 proposes interactive prompt (choose "keep canonical" or "replace from stray") and non-interactive skip with warning.
- **Risk:** Existing Claude/Cursor stray adoption callers may depend on the current throw-on-conflict behavior. Changing to prompt/skip alters the error contract.
- **Fix:** Explicitly note this as a behavior change in the plan. Specify whether Phase 3 should: (a) modify `adoptStrayToCanonical` itself, or (b) wrap it in a new conflict-resolution layer that pre-checks before delegating. Option (b) preserves backward compatibility.

**I-5: Relationship between Phase 1 parser and existing scanner not specified**
- `external-plans/oat-codex-toml-sync-universal-subagent-adoption.md:37-53` (Phase 1)
- **Evidence:** `packages/cli/src/engine/scanner.ts:59-89` already scans `.agents/agents/` for `.md` files and produces `CanonicalEntry` objects with `type: 'agent'`, `name`, `canonicalPath`, `isFile`. Phase 1 introduces a separate canonical parser that reads the same files but extracts YAML frontmatter.
- **Risk:** Two subsystems operating on the same files with different abstractions. The plan doesn't specify how they compose: does the sync engine's scanner call the canonical parser? Does the codec layer call the scanner first then the parser? This ambiguity will lead to inconsistent implementations.
- **Fix:** Add a note to Phase 1 specifying the integration point. Likely: the scanner produces `CanonicalEntry` references, then the codec layer calls `parse(canonicalPath)` to extract frontmatter when needed for generation. The scanner itself should not need modification.

### Minor

**M-1: Existing canonical agents have frontmatter the parser must handle**
- `.agents/agents/oat-reviewer.md:1-6` has frontmatter: `name`, `description`, `tools`, `color`
- `.agents/agents/oat-codebase-mapper.md` likely similar
- Phase 1's schema says top-level required: `name`, `description`; optional: `tools`, `model`, `readonly`. There is no mention of `color` as a recognized field.
- **Fix:** Verify existing agent files against the proposed schema. Either add `color` to the portable optional fields or clarify it lives in `x_claude` (since it's a Claude-specific rendering hint).

**M-2: Missing TypeScript alias registration for new directories**
- Phase 1 creates `packages/cli/src/agents/canonical/`. Phase 2 creates `packages/cli/src/providers/codex/codec/`.
- Per `AGENTS.md`: "use explicit TypeScript aliases for anything outside the current directory."
- **Fix:** Note that `tsconfig.json` path aliases need updating for `@agents/canonical` (or similar) and any cross-directory codec imports.

**M-3: `config.toml` as aggregate artifact diverges from manifest model**
- `external-plans/oat-codex-toml-sync-universal-subagent-adoption.md:109` — "Treat `.codex/config.toml` as aggregate managed artifact outside one-to-one canonical mapping entries."
- Current `ManifestEntry` (`packages/cli/src/manifest/manifest.types.ts`) assumes one canonical path → one provider path. An aggregate artifact that merges multiple canonical sources doesn't fit this model.
- **Fix:** Briefly specify how `.codex/config.toml` will be tracked in or alongside the manifest. Options: (a) single manifest entry with special `contentType`, (b) tracked outside manifest entirely, (c) composite hash of all contributing canonical entries.

**M-4: Phase dependency graph not explicit**
- Phases 1→2 are sequential (codec depends on schema). Phase 3 depends on Phase 2 codecs. Phase 4 depends on Phase 2 Codex codecs. Phase 5 depends on Phase 4. Phase 6 can run after any phase.
- **Fix:** Add a brief dependency graph or note like: "Phase 1 → Phase 2 → Phase 3, Phase 4 (parallel) → Phase 5 → Phase 6. Phase 0 is independent."

**M-5: Test plan missing coverage for existing canonical agents**
- `.agents/agents/oat-reviewer.md` and `.agents/agents/oat-codebase-mapper.md` exist with frontmatter.
- No test case validates that Phase 1's parser handles these existing files correctly (regression gate).
- **Fix:** Add to Unit Tests: "Canonical parser correctly handles existing `.agents/agents/*.md` files with current frontmatter format."

**M-6: No incremental rollout or rollback strategy**
- Seven phases spanning multiple subsystems with no mention of feature flags, incremental mergeability, or rollback guidance.
- **Fix:** Add a brief note: "Each phase is independently testable and mergeable behind the existing provider-config enable/disable mechanism. Codex generation only activates when the `codex` provider is enabled in sync config."

## Verification Commands

```bash
# Verify Gemini/Copilot adapters don't exist yet
ls packages/cli/src/providers/copilot/ packages/cli/src/providers/gemini/ 2>&1

# Verify locked deps not installed
grep -r '"@iarna/toml\|"yaml"' packages/*/package.json 2>/dev/null; echo "exit: $?"

# Verify current adoption behavior (throws on mismatch)
grep -n 'throw.*CliError' packages/cli/src/commands/shared/adopt-stray.ts

# Verify scanner already handles agents
grep -n "type.*agent" packages/cli/src/engine/scanner.ts

# Verify existing agent frontmatter fields
head -6 .agents/agents/oat-reviewer.md
```

## Next Step

- Apply the Important and Minor fixes to the plan document before implementation begins.
- Once Gemini/Copilot adapter work lands, re-validate baseline assumptions.
- Otherwise, apply fixes directly and re-run `oat-review-provide` for a follow-up pass.
