---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-21
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ["p07"]
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: /Users/thomas.stang/Code/open-agent-toolkit/external-plans/oat-codex-toml-sync-universal-subagent-adoption.md
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: Codex TOML Sync + Universal Subagent Adoption

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Make canonical subagents in `.agents/agents` the source of truth across providers, including Codex TOML generation, and support universal stray subagent adoption in `oat init` and `oat status`.

**Architecture:** Keep existing path-mapping sync engine for current providers and add a Codex-specific post-plan generation extension at command layer, backed by a shared canonical parser/codec pipeline.

**Tech Stack:** TypeScript ESM, pnpm workspaces, Vitest, `yaml@2.8.2`, `@iarna/toml@2.2.5`

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p03-t01): add canonical subagent parser`

## Planning Checklist

- [x] HiLL checkpoints: none required for imported plan workflow

---

## Phase 1: Contract Closure + Baseline Gate

### Task p01-t01: Record deferred Codex user-scope contract and baseline prerequisites

**Files:**
- Modify: `docs/oat/workflow/reviews.md`
- Modify: `docs/oat/cli/provider-interop/overview.md`
- Modify: `.oat/projects/shared/codex-toml-sync-universal-subagent-adoption/references/imported-plan.md` (reference only, no source mutation)

**Step 1: Write test (RED)**

Add/adjust documentation assertions in docs tests or link checks (if available) so wording fails when Codex user-scope agents are described as currently supported.

Run: `pnpm --filter @oat/cli test -- --run` (target docs validation tests if available)
Expected: Test fails before wording is updated.

**Step 2: Implement (GREEN)**

Update docs and implementation notes to explicitly state:
- Codex user-scope role generation is deferred in this release.
- Gemini/Copilot adapter work must be present before this project starts.

Run: `pnpm --filter @oat/cli test -- --run`
Expected: Documentation assertions pass.

**Step 3: Refactor**

Consolidate duplicated wording so a single source of truth defines current support boundaries.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add docs/oat/workflow/reviews.md docs/oat/cli/provider-interop/overview.md
git commit -m "docs(p01-t01): clarify codex scope deferral and baseline gates"
```

---

## Phase 2: Dependency Installation + Wiring

### Task p02-t01: Install TOML/YAML dependencies and wire CLI imports

**Files:**
- Modify: `packages/cli/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/cli/tsconfig.json`
- Create/Modify: `packages/cli/src/**/*.test.ts` (dependency smoke coverage)

**Step 1: Write test (RED)**

Add a minimal test that imports `yaml` and `@iarna/toml` and round-trips sample documents used by the codec flow.

Run: `pnpm --filter @oat/cli test -- --run`
Expected: Test fails before deps are installed/wired.

**Step 2: Implement (GREEN)**

Install exact versions and wire aliases for canonical agent modules:
- `pnpm --filter @oat/cli add @iarna/toml@2.2.5 yaml@2.8.2`
- Update `packages/cli/tsconfig.json` aliases (for example `@agents/*`).

Run: `pnpm --filter @oat/cli test -- --run`
Expected: New dependency smoke tests pass.

**Step 3: Refactor**

Centralize parser helpers so TOML/YAML usage is not duplicated across codecs and command handlers.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/cli/tsconfig.json pnpm-lock.yaml packages/cli/src
git commit -m "chore(p02-t01): add toml/yaml deps and cli alias wiring"
```

---

## Phase 3: Canonical Schema + Parser/Renderer

### Task p03-t01: Add canonical subagent types and parser

**Files:**
- Create: `packages/cli/src/agents/canonical/types.ts`
- Create: `packages/cli/src/agents/canonical/parse.ts`
- Create: `packages/cli/src/agents/canonical/parse.test.ts`

**Step 1: Write test (RED)**

Cover:
- required fields (`name`, `description`)
- optional portable fields (`tools`, `model`, `readonly`)
- compatibility field (`color`)
- unknown `x_*` blocks preserved
- filename/role-safe name validation

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/agents/canonical/parse.test.ts`
Expected: Tests fail before parser implementation.

**Step 2: Implement (GREEN)**

Implement canonical parser using `yaml@2.8.2` and preserve markdown body as instructions.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/agents/canonical/parse.test.ts`
Expected: Tests pass.

**Step 3: Refactor**

Ensure parser surface is stable and intentionally separate from scanner responsibilities.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/agents/canonical/
git commit -m "feat(p03-t01): add canonical subagent parser and schema"
```

---

### Task p03-t02: Add canonical renderer and regressions for existing canonical agent files

**Files:**
- Create: `packages/cli/src/agents/canonical/render.ts`
- Create: `packages/cli/src/agents/canonical/render.test.ts`
- Modify: `packages/cli/src/agents/canonical/parse.test.ts`

**Step 1: Write test (RED)**

Add round-trip tests for:
- `.agents/agents/oat-reviewer.md`
- `.agents/agents/oat-codebase-mapper.md`
including current `color` field and body preservation.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/agents/canonical/*.test.ts`
Expected: Tests fail before renderer exists.

**Step 2: Implement (GREEN)**

Implement renderer with lossless `x_*` and stable frontmatter serialization.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/agents/canonical/*.test.ts`
Expected: Round-trip tests pass.

**Step 3: Refactor**

Normalize newline/frontmatter formatting behavior to avoid unnecessary churn in generated markdown.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/agents/canonical/
git commit -m "feat(p03-t02): add canonical renderer and round-trip regressions"
```

---

## Phase 4: Provider Codec Layer

### Task p04-t01: Add shared codec interfaces and markdown-provider codecs

**Files:**
- Create: `packages/cli/src/providers/shared/agent-codec.types.ts`
- Create/Modify: `packages/cli/src/providers/shared/*.ts` (markdown codec helpers)
- Create/Modify: `packages/cli/src/providers/shared/*.test.ts`

**Step 1: Write test (RED)**

Define codec contract tests covering import/export behavior for Claude/Cursor/Copilot/Gemini markdown agent files.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/shared`
Expected: Contract tests fail before codec layer exists.

**Step 2: Implement (GREEN)**

Implement shared codec interfaces and markdown codecs, preserving provider-specific metadata via `x_<provider>` mapping.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/shared`
Expected: Contract tests pass.

**Step 3: Refactor**

Remove duplicate provider-side parsing logic now replaced by shared codecs.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/shared/
git commit -m "feat(p04-t01): add shared subagent codec interfaces"
```

---

### Task p04-t02: Implement Codex TOML import/export codecs and config merge policy

**Files:**
- Create: `packages/cli/src/providers/codex/codec/import-from-codex.ts`
- Create: `packages/cli/src/providers/codex/codec/export-to-codex.ts`
- Create: `packages/cli/src/providers/codex/codec/config-merge.ts`
- Create: `packages/cli/src/providers/codex/codec/*.test.ts`
- Create/Modify: `docs/oat/cli/provider-interop/providers.md` (ADR note)

**Step 1: Write test (RED)**

Add tests for:
- role TOML generation
- `config.toml` upsert behavior (`features.multi_agent`, role entries)
- preservation of unmanaged keys/roles
- stale managed-role cleanup only when both markers match
- import default tools fallback (`Read, Grep, Glob, Bash`)

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/codex/codec`
Expected: Tests fail before implementation.

**Step 2: Implement (GREEN)**

Implement Codex codec modules with provenance comments and safe config merge behavior.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/codex/codec`
Expected: Tests pass.

**Step 3: Refactor**

Add concise ADR note documenting intentional command-layer Codex extension for this release.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/codex/codec/ docs/oat/cli/provider-interop/providers.md
git commit -m "feat(p04-t02): add codex toml codecs and config merge"
```

---

## Phase 5: Universal Stray Detection + Adoption

### Task p05-t01: Add provider-aware stray detection across all providers

**Files:**
- Modify: `packages/cli/src/commands/shared/adopt-stray.ts`
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Create/Modify: `packages/cli/src/commands/**/__tests__/*.test.ts`

**Step 1: Write test (RED)**

Add coverage for stray detection sources:
- markdown providers via mapped directories
- codex via `.codex/config.toml` and `.codex/agents/*.toml`

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/init packages/cli/src/commands/status`
Expected: Tests fail before detector expansion.

**Step 2: Implement (GREEN)**

Implement provider-aware detection dispatch while keeping existing entry points (`init`, `status`).

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/init packages/cli/src/commands/status`
Expected: Tests pass.

**Step 3: Refactor**

Normalize stray metadata shape for JSON and human-readable outputs.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/shared/adopt-stray.ts packages/cli/src/commands/init/index.ts packages/cli/src/commands/status/index.ts packages/cli/src/commands
git commit -m "feat(p05-t01): add universal provider-aware stray detection"
```

---

### Task p05-t02: Implement adoption handlers and conflict policy compatibility layer

**Files:**
- Modify: `packages/cli/src/commands/shared/adopt-stray.ts`
- Create/Modify: `packages/cli/src/providers/**/codec/*.ts`
- Create/Modify: `packages/cli/src/commands/**/__tests__/*.test.ts`

**Step 1: Write test (RED)**

Add tests for:
- markdown stray adoption to canonical
- codex TOML stray adoption to canonical
- conflict behavior by mode:
  - interactive prompt (`keep canonical` vs `replace from stray`)
  - non-interactive deterministic skip + warning
- backward compatibility: strict `adoptStrayToCanonical` remains unchanged when called directly

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/shared packages/cli/src/providers`
Expected: Tests fail before conflict policy layer exists.

**Step 2: Implement (GREEN)**

Implement provider handlers and orchestration-layer conflict pre-checks; keep direct strict adoption API behavior stable.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/shared packages/cli/src/providers`
Expected: Tests pass.

**Step 3: Refactor**

Consolidate shared conflict resolution utilities for `init` and `status` pathways.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/shared/adopt-stray.ts packages/cli/src/providers packages/cli/src/commands
git commit -m "feat(p05-t02): add adoption conversion and conflict compatibility policy"
```

---

## Phase 6: Sync Integration for Codex Generation

### Task p06-t01: Add codex post-plan sync extension (dry-run + apply)

**Files:**
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/sync/sync.types.ts`
- Create/Modify: `packages/cli/src/commands/sync/*.test.ts`

**Step 1: Write test (RED)**

Add sync tests for codex extension operations:
- dry-run reports create/update/remove for role files and config updates
- apply writes codex artifacts and second run is idempotent

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/sync`
Expected: Tests fail before extension integration.

**Step 2: Implement (GREEN)**

Add command-layer codex post-plan pipeline using codec outputs.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/sync`
Expected: Tests pass.

**Step 3: Refactor**

Keep extension interfaces isolated so engine generalization can be introduced later without breaking command behavior.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/sync/index.ts packages/cli/src/commands/sync/sync.types.ts packages/cli/src/commands/sync
git commit -m "feat(p06-t01): add codex post-plan sync extension"
```

---

### Task p06-t02: Add aggregate codex config tracking metadata with manifest compatibility guarantees

**Files:**
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Create/Modify: `packages/cli/src/**/__tests__/*.test.ts`
- Modify: `docs/oat/cli/provider-interop/overview.md`
- Modify: `docs/oat/cli/provider-interop/providers.md`

**Step 1: Write test (RED)**

Add tests ensuring:
- role files remain tracked as normal file entries
- `.codex/config.toml` aggregate state is surfaced via codex extension metadata (`aggregateConfigHash`) in sync/status output
- existing one-to-one manifest entry schema remains unchanged and backward compatible

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/sync packages/cli/src/commands/status`
Expected: Tests fail before tracking extension is implemented.

**Step 2: Implement (GREEN)**

Implement aggregate config tracking in codex extension result metadata (command output layer) while keeping manifest schema unchanged.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/sync packages/cli/src/commands/status`
Expected: Tests pass.

**Step 3: Refactor**

Harden hash-generation and deterministic ordering for contributing canonical role set.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/sync packages/cli/src/commands/status docs/oat/cli/provider-interop/overview.md docs/oat/cli/provider-interop/providers.md
git commit -m "feat(p06-t02): add aggregate codex config tracking metadata"
```

---

## Phase 7: Status, Doctor, and Docs Finalization

### Task p07-t01: Extend status/doctor codex drift and consistency checks

**Files:**
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Create/Modify: `packages/cli/src/commands/status/*.test.ts`
- Create/Modify: `packages/cli/src/commands/doctor/*.test.ts`

**Step 1: Write test (RED)**

Add tests for codex drift/misconfiguration:
- missing role file
- modified role file
- config role mismatch
- unmanaged codex role entries
- TOML parse errors
- missing/false `features.multi_agent`
- role entry references missing file

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/status packages/cli/src/commands/doctor`
Expected: Tests fail before checks are added.

**Step 2: Implement (GREEN)**

Add status and doctor codex validations with additive JSON shape changes.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/status packages/cli/src/commands/doctor`
Expected: Tests pass.

**Step 3: Refactor**

Extract shared codex validation helpers to avoid divergence between status and doctor.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/status packages/cli/src/commands/doctor
git commit -m "feat(p07-t01): add codex drift checks to status and doctor"
```

---

### Task p07-t02: Complete provider interop documentation and rollout/rollback guidance

**Files:**
- Modify: `docs/oat/cli/provider-interop/providers.md`
- Modify: `docs/oat/cli/provider-interop/overview.md`
- Modify: `docs/oat/workflow/reviews.md`
- Modify: `README.md`

**Step 1: Write test (RED)**

Add/update docs assertions (if applicable) for:
- canonical `.agents/agents` as source of truth
- codex roles as generated outputs
- adoption in `init`/`status`
- fanout model (`sync --apply`)
- incremental rollout and rollback behavior

Run: `pnpm --filter @oat/cli test -- --run`
Expected: Tests fail until docs are aligned.

**Step 2: Implement (GREEN)**

Update docs with final behavior and release constraints.

Run: `pnpm --filter @oat/cli test -- --run`
Expected: Docs assertions pass.

**Step 3: Refactor**

Eliminate redundant wording and ensure docs are consistent with command output.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm build`
Expected: No errors.

**Step 5: Commit**

```bash
git add docs/oat/cli/provider-interop/providers.md docs/oat/cli/provider-interop/overview.md docs/oat/workflow/reviews.md README.md
git commit -m "docs(p07-t02): document codex generation and universal adoption workflow"
```

---

## Phase 8: Review Fixes from Final Code Review

### Task p08-t01: (review C1) Fix non-interactive status conflict handling

**Task Scope:** Moderate

**Files:**
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`

**Step 1: Understand the issue**

Review finding: `status` conflict handling throws in non-interactive mode instead of deterministic skip + warning.
Location: `packages/cli/src/commands/status/index.ts:517`

**Step 2: Implement fix**

Replace prompt-only conflict resolution path with `confirmAction`/non-interactive-safe guard, preserving interactive replacement behavior and non-interactive warning + issue count behavior.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/status`
Expected: Status conflict tests pass for both interactive and non-interactive paths.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/status/index.ts packages/cli/src/commands/status/index.test.ts
git commit -m "fix(p08-t01): make status conflict flow non-interactive safe"
```

---

### Task p08-t02: (review I1) Add doctor codex integration coverage

**Task Scope:** Moderate

**Files:**
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Understand the issue**

Review finding: Doctor codex drift/misconfiguration checks were implemented without command-level integration coverage.
Location: `packages/cli/src/commands/doctor/index.test.ts`

**Step 2: Implement fix**

Add tests for parseable TOML pass, unparseable TOML failure, missing/false `features.multi_agent` warning, and missing referenced role file warning.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/doctor`
Expected: New codex doctor scenarios pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/doctor/index.test.ts
git commit -m "test(p08-t02): add doctor codex integration scenarios"
```

---

### Task p08-t03: (review I2) Add status codex integration coverage

**Task Scope:** Moderate

**Files:**
- Modify: `packages/cli/src/commands/status/index.test.ts`

**Step 1: Understand the issue**

Review finding: Status codex drift and codex stray reporting lack command-level integration tests.
Location: `packages/cli/src/commands/status/index.test.ts`

**Step 2: Implement fix**

Add tests for codex drift reporting and codex stray candidate detection in status output.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/status`
Expected: Codex status scenarios pass and regressions are prevented.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/status/index.test.ts
git commit -m "test(p08-t03): add status codex drift and stray coverage"
```

---

### Task p08-t04: (review I3) Add init codex stray/adoption integration coverage

**Task Scope:** Moderate

**Files:**
- Modify: `packages/cli/src/commands/init/index.test.ts`

**Step 1: Understand the issue**

Review finding: `init` codex stray detection/adoption behavior lacks command-level integration tests.
Location: `packages/cli/src/commands/init/index.test.ts`

**Step 2: Implement fix**

Add tests validating codex role strays are discovered and presented for adoption in init flows.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/init`
Expected: Init codex stray scenarios pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/index.test.ts
git commit -m "test(p08-t04): add init codex stray adoption coverage"
```

---

### Task p08-t05: (review I4) Add sync codex extension integration coverage

**Task Scope:** Moderate

**Files:**
- Modify: `packages/cli/src/commands/sync/index.test.ts`

**Step 1: Understand the issue**

Review finding: Sync codex extension planning/apply behavior lacks command-level integration tests.
Location: `packages/cli/src/commands/sync/index.test.ts`

**Step 2: Implement fix**

Add tests that verify codex extension operations appear in dry-run/apply output and are wired when codex adapter is active.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/sync`
Expected: Sync codex extension scenarios pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/sync/index.test.ts
git commit -m "test(p08-t05): add sync codex extension integration coverage"
```

---

### Task p08-t06: (review I5) Add conflict policy tests for init/status adoption paths

**Task Scope:** Moderate

**Files:**
- Modify: `packages/cli/src/commands/init/index.test.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`

**Step 1: Understand the issue**

Review finding: Adoption conflict behavior tests do not cover interactive replace vs non-interactive skip + warning at command level.
Location: `packages/cli/src/commands/init/index.test.ts`, `packages/cli/src/commands/status/index.test.ts`

**Step 2: Implement fix**

Add tests that exercise conflict handling for both modes across init and status.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/init packages/cli/src/commands/status`
Expected: Conflict mode handling is fully covered.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/index.test.ts packages/cli/src/commands/status/index.test.ts
git commit -m "test(p08-t06): cover adoption conflict behavior by interaction mode"
```

---

### Task p08-t07: (review I6) Close aggregate codex config tracking gap against p06-t02 contract

**Task Scope:** Large

**Files:**
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/**/__tests__/*.test.ts`
- Modify: `docs/oat/cli/provider-interop/overview.md`
- Modify: `docs/oat/cli/provider-interop/providers.md`
- Modify: `.oat/projects/shared/codex-toml-sync-universal-subagent-adoption/plan.md` (contract clarification)

**Step 1: Understand the issue**

Review finding: p06-t02 contract text implied manifest-level tracking, while implementation exposes aggregate hash via extension output metadata.
Location: `packages/cli/src/commands/sync/*`, `packages/cli/src/commands/status/*`, `docs/oat/cli/provider-interop/*`

**Step 2: Implement fix**

Formally align contract + docs to the implemented extension-only metadata model and add command-level tests proving codex aggregate metadata is emitted in dry-run/apply outputs.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/sync packages/cli/src/commands/status`
Expected: p06-t02 behavior and tests are aligned with final contract.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/sync packages/cli/src/commands/status docs/oat/cli/provider-interop/overview.md docs/oat/cli/provider-interop/providers.md .oat/projects/shared/codex-toml-sync-universal-subagent-adoption/plan.md
git commit -m "fix(p08-t07): align aggregate codex config tracking with p06-t02 contract"
```

---

### Task p08-t08: (review m1) Centralize TOML stringify cast helper

**Task Scope:** Minor

**Files:**
- Modify: `packages/cli/src/providers/codex/codec/shared.ts`
- Modify: `packages/cli/src/providers/codex/codec/export-to-codex.ts`
- Modify: `packages/cli/src/providers/codex/codec/config-merge.ts`
- Modify: `packages/cli/src/providers/codex/codec/*.test.ts`

**Step 1: Understand the issue**

Review finding: repeated `as never` casts for `TOML.stringify` reduce type safety and clarity.
Location: `packages/cli/src/providers/codex/codec/export-to-codex.ts:65`, `packages/cli/src/providers/codex/codec/config-merge.ts:87`

**Step 2: Implement fix**

Introduce a typed helper in shared codec utilities to centralize TOML stringify casting and replace direct call-site casts.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/codex/codec && pnpm --filter @oat/cli type-check`
Expected: Existing codec behavior unchanged and type-check remains clean.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/codex/codec/
git commit -m "refactor(p08-t08): centralize toml stringify casting helper"
```

---

### Task p08-t09: (review m2) Deduplicate adoption conflict error helper

**Task Scope:** Minor

**Files:**
- Modify: `packages/cli/src/commands/shared/adopt-stray.ts`
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/**/__tests__/*.test.ts`

**Step 1: Understand the issue**

Review finding: `isAdoptionConflictError` helper is duplicated in init and status.
Location: `packages/cli/src/commands/init/index.ts:305`, `packages/cli/src/commands/status/index.ts:256`

**Step 2: Implement fix**

Extract helper to shared adoption module and update callers/tests.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/init packages/cli/src/commands/status packages/cli/src/commands/shared`
Expected: Behavior unchanged, duplicate logic removed.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/shared/adopt-stray.ts packages/cli/src/commands/init/index.ts packages/cli/src/commands/status/index.ts packages/cli/src/commands
git commit -m "refactor(p08-t09): share adoption conflict error helper"
```

---

### Task p08-t10: (review m4) Deduplicate codex post-adoption regeneration flow

**Task Scope:** Moderate

**Files:**
- Modify: `packages/cli/src/commands/shared/codex-strays.ts`
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/**/__tests__/*.test.ts`

**Step 1: Understand the issue**

Review finding: codex regeneration block after adoption is duplicated between init and status.
Location: `packages/cli/src/commands/init/index.ts:500-509`, `packages/cli/src/commands/status/index.ts:550-563`

**Step 2: Implement fix**

Extract a shared post-adoption codex regeneration helper and update both command paths.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/commands/init packages/cli/src/commands/status packages/cli/src/commands/shared`
Expected: Post-adoption codex regeneration stays behaviorally identical while duplicate code is removed.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/shared/codex-strays.ts packages/cli/src/commands/init/index.ts packages/cli/src/commands/status/index.ts packages/cli/src/commands
git commit -m "refactor(p08-t10): share codex post-adoption regeneration flow"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| p05 | code | pending | - | - |
| p06 | code | pending | - | - |
| p07 | code | pending | - | - |
| final | code | passed | 2026-02-22 | reviews/final-review-2026-02-22.md |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |
| plan | artifact | pending | - | - |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**
- Phase 1: 1 task - Contract closure and baseline gate documentation
- Phase 2: 1 task - Locked dependencies and import wiring
- Phase 3: 2 tasks - Canonical schema/parser/renderer with regressions
- Phase 4: 2 tasks - Shared codec layer and Codex TOML codecs
- Phase 5: 2 tasks - Universal stray detection and adoption conversion/conflicts
- Phase 6: 2 tasks - Sync codex extension and aggregate config tracking
- Phase 7: 2 tasks - Status/doctor drift checks and docs completion
- Phase 8: 10 tasks - Final review fixes (critical/important + selected minor findings)

**Total: 22 tasks**

Status: Final re-review passed; project ready for PR/finalization.

---

## References

- Imported Source: `references/imported-plan.md`
- External Source Path: `/Users/thomas.stang/Code/open-agent-toolkit/external-plans/oat-codex-toml-sync-universal-subagent-adoption.md`
- Review Input: `.oat/repo/reviews/ad-hoc-review-2026-02-21-oat-codex-toml-sync-universal-subagent.md`
- Design: `design.md` (optional in import mode)
- Spec: `spec.md` (optional in import mode)
- Discovery: `discovery.md`
