---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-28
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04'] # final-phase checkpoint only (from workflow.hillCheckpointDefault: final)
oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
oat_plan_parallel_groups: [] # sequential — see Parallelism
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: dispatch-ceiling-ux

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Reshape the dispatch-ceiling surface into a provider-neutral ceiling intent:
user-facing presets that compile to concrete per-provider values, behind a provider
adapter registry, with honest enforced/advisory/unsupported semantics and
verify-on-upgrade. No migration of the old shape.

**Architecture:** Write-time preset compiler → concrete per-provider values in project
state; dispatch-time resolver joins stored intent with a provider adapter registry to
return concrete value + enforcement mode + dispatch args. Codex enforces via existing
sync-time pinned variants; Claude via per-call Task `model`; others advisory.

**Tech Stack:** TypeScript ESM (`@open-agent-toolkit/cli`), Vitest, oxlint/oxfmt,
canonical Markdown skills under `.agents/skills/`, Fumadocs docs.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t02): add dispatch-ceiling preset compiler`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (default: pause after p02; confirm in handoff)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Sequential. Phase 2 (adapter registry + resolver) reads the Phase 1 schema; Phase 3
(skill prompts/dispatch/logs) consumes the Phase 2 resolver output shape; Phase 4
(docs + lockstep release) describes the final behavior and runs the single
`release:validate` gate that depends on everything. Phase 3 (`.agents/skills/**`) and
the Phase 4 docs edits (`apps/oat-docs/docs/**`) are file-disjoint, but docs content
depends on final skill copy and both feed one release gate, so the parallelism payoff
is negative. No legacy/migration coupling exists (clean break), but the dependency
chain is real — keep it sequential.

---

## Dispatch Profile

_No explicit per-phase overrides. Runtime selection (capped by the resolved OAT
dispatch ceiling) chooses tiers._

---

## Phase 1: Ceiling Schema + Preset Compiler

### Task p01-t01: New ceiling schema types + normalization (clean break)

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`

**Step 1: Write test (RED)**

```typescript
// oat-config.test.ts
describe('normalizeWorkflowConfig dispatchCeiling (new shape)', () => {
  it('accepts preset + providers and drops invalid provider values', () => {
    // input: { dispatchCeiling: { preset: 'balanced', providers: { codex: 'high', claude: 'sonnet' } } }
    // expect normalized providers preserved; preset preserved
  });
  it('accepts providers-only (advanced/manual) with no preset', () => {
    // input: { dispatchCeiling: { providers: { codex: 'medium' } } } → preset undefined
  });
  it('rejects/drops invalid preset and invalid enum values', () => {});
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts`
Expected: RED

**Step 2: Implement (GREEN)**

```typescript
// oat-config.ts
export type WorkflowDispatchCeilingPreset =
  | 'balanced'
  | 'maximum'
  | 'cost-conscious';
export interface WorkflowDispatchCeiling {
  preset?: WorkflowDispatchCeilingPreset; // convenience; compiled at write time
  providers?: {
    codex?: WorkflowCodexDispatchCeiling; // 'low'|'medium'|'high'|'xhigh'
    claude?: WorkflowClaudeDispatchCeiling; // 'haiku'|'sonnet'|'opus'
  };
}
// Clean break: remove flat dispatchCeiling.codex/.claude. normalizeWorkflowConfig
// validates preset against VALID_DISPATCH_CEILING_PRESETS and providers against the
// existing per-provider allowlists; drops unknown keys/values.
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts`
Expected: GREEN

**Step 3: Refactor** — share allowlist constants; keep one source for valid presets.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts
git commit -m "feat(p01-t01): provider-neutral dispatchCeiling schema (preset + providers)"
```

---

### Task p01-t02: Preset compiler (fixed table, compile at write time)

**Files:**

- Create: `packages/cli/src/config/dispatch-ceiling-preset.ts`
- Create: `packages/cli/src/config/dispatch-ceiling-preset.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('compileDispatchCeilingPreset', () => {
  it('balanced → { codex: high, claude: sonnet }', () => {});
  it('maximum → { codex: xhigh, claude: opus }', () => {});
  it('cost-conscious → { codex: medium, claude: sonnet } (never haiku)', () => {});
  it('returns providers + preset provenance for a preset selection', () => {});
  it('advanced/manual input passes providers through with NO preset key', () => {});
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/dispatch-ceiling-preset.test.ts`
Expected: RED

**Step 2: Implement (GREEN)**

```typescript
export const DISPATCH_CEILING_PRESETS = {
  balanced: { codex: 'high', claude: 'sonnet' },
  maximum: { codex: 'xhigh', claude: 'opus' },
  'cost-conscious': { codex: 'medium', claude: 'sonnet' },
} as const;

// compileDispatchCeilingPreset(preset) → { preset, providers }
// compileAdvanced(providers) → { providers }  (no preset key)
```

Run: same as above. Expected: GREEN

**Step 3: Refactor** — keep the table the single mapping authority (skills/resolver never re-map).

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/config/dispatch-ceiling-preset.ts packages/cli/src/config/dispatch-ceiling-preset.test.ts
git commit -m "feat(p01-t02): add dispatch-ceiling preset compiler"
```

---

### Task p01-t03: Config command keys + effective-config shape

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts` (ConfigKey, CONFIG_CATALOG, WORKFLOW_ENUM_VALUES)
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `packages/cli/src/config/resolve.ts` (default workflow config + flatten)
- Modify: `packages/cli/src/config/resolve.test.ts`

**Step 1: Write test (RED)**

```typescript
// config/index.test.ts — get/set/describe for the new keys
it('sets workflow.dispatchCeiling.preset with enum validation', () => {});
it('sets workflow.dispatchCeiling.providers.codex / .claude with enum validation', () => {});
// resolve.test.ts — precedence + flatten of new keys
it('flattens dispatchCeiling.providers.* and resolves local > shared > user', () => {});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/config/resolve.test.ts`
Expected: RED

**Step 2: Implement (GREEN)**

```typescript
// ConfigKey += 'workflow.dispatchCeiling.preset'
//            | 'workflow.dispatchCeiling.providers.codex'
//            | 'workflow.dispatchCeiling.providers.claude'
// WORKFLOW_ENUM_VALUES: preset enum + per-provider enums
// CONFIG_CATALOG: descriptions/paths/scope for the new keys (replace flat entries)
// resolve.ts default: dispatchCeiling: { preset: null, providers: { codex: null, claude: null } }
```

Run: same. Expected: GREEN

**Step 3: Refactor** — remove dead references to the old flat keys.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts
git commit -m "feat(p01-t03): register provider-neutral dispatchCeiling config keys"
```

---

## Phase 2: Adapter Registry + Resolver

### Task p02-t01: Provider ceiling adapter registry

**Files:**

- Create: `packages/cli/src/providers/ceiling/registry.ts`
- Create: `packages/cli/src/providers/ceiling/registry.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('provider ceiling adapters', () => {
  it('codex adapter: mechanism pinned-variant; high → { variant: "oat-phase-implementer-high" } / reviewer variant', () => {});
  it('claude adapter: mechanism model-arg; sonnet → { model: "sonnet" }', () => {});
  it('claude adapter flags verifyOnDispatch when requested tier is above orchestrator', () => {});
  it('unknown provider: supportsCeiling false, mechanism none, compile → null (advisory)', () => {});
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/ceiling/registry.test.ts`
Expected: RED

**Step 2: Implement (GREEN)**

```typescript
type EnforcementMechanism = 'pinned-variant' | 'model-arg' | 'none';
interface ProviderCeilingAdapter {
  provider: string;
  supportsCeiling: boolean;
  validValues: string[];
  mechanism: EnforcementMechanism;
  compileToDispatchArgs(
    value: string,
    role: 'implementer' | 'reviewer',
    ctx: { orchestratorTier?: string },
  ): { variant: string } | { model: string } | null;
}
// codexAdapter (pinned-variant), claudeAdapter (model-arg), getCeilingAdapter(provider)
// → falls back to an advisory no-op adapter for unknown providers.
```

Run: same. Expected: GREEN

**Step 3: Refactor** — codex variant naming derives from the existing sync variant names (no new generation).

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/providers/ceiling/registry.ts packages/cli/src/providers/ceiling/registry.test.ts
git commit -m "feat(p02-t01): add provider ceiling adapter registry"
```

---

### Task p02-t02: Rework `dispatch-ceiling resolve` to join intent × adapter

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Step 1: Write test (RED)**

```typescript
describe('resolveDispatchCeiling (adapter-aware)', () => {
  it('reads concrete providers (config precedence then project state), never the preset label', () => {});
  it('returns per-provider { value, mode, mechanism, dispatchArgs }', () => {});
  it('mode is computed, never read from persisted state', () => {});
  it('upgrade request sets verifyOnDispatch; cap-down does not', () => {});
  it('preserves --preflight/--json and non-interactive blocking contract', () => {});
});
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
Expected: RED

**Step 2: Implement (GREEN)**

```typescript
// resolveDispatchCeiling: resolve concrete providers → getCeilingAdapter(provider)
//   → { preset, source, providers: { [p]: { value, mode, mechanism, dispatchArgs } }, status? }
// mode: 'enforced' | 'advisory' | 'unsupported' (computed here)
// verifyOnDispatch flag surfaced for above-orchestrator (upgrade) requests
// Keep resolveCodexProviderDefaultEffort as informational only.
// REGRESSION from p01 review (must close here): readResolvedConfigCeiling must read
// workflow.dispatchCeiling.providers.<provider> (the flat key was removed in p01-t01);
// fix blockMessage copy to reference providers.<provider>; update the two now-red
// resolver tests (index.test.ts repo-config JSON shape + Claude human-readable output).
```

Run: same. Expected: GREEN

**Step 3: Refactor** — keep resolver the single compilation/join point; skills must not re-map.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling/index.ts packages/cli/src/commands/project/dispatch-ceiling/index.test.ts
git commit -m "feat(p02-t02): resolve dispatch ceiling via adapter registry with modes"
```

---

## Phase 3: Lifecycle Skill Prompts + Dispatch + Logs

### Task p03-t01: Provider-neutral preset prompt + honest copy

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md` (Step 3.5 ceiling prompt)
- Modify: `.agents/skills/oat-project-implement/SKILL.md` (preflight prompt copy)
- Modify: `.agents/skills/oat-project-plan/SKILL.md` (only if it carries ceiling prompt text)
- Bump `version:` frontmatter on each changed skill (PR-scoped, once per skill)

**Step 1: Author**

Replace provider-prescriptive prompt with the provider-neutral preset prompt:

```text
Set the dispatch ceiling — the maximum subagent tier OAT may use.

  1. Balanced (recommended) — Codex: high · Claude: sonnet
  2. Maximum                — Codex: xhigh · Claude: opus  (reviews always run at this tier)
  3. Cost-conscious         — Codex: medium · Claude: sonnet
  4. Advanced — set per provider
  5. No ceiling

OAT applies this where the provider exposes a reliable mechanism (Codex: pinned
variants; Claude: Task model parameter). Other providers may treat it as advisory.
```

Record: preset selection persists preset + compiled providers; Advanced persists
providers + source only (no preset). Post-selection confirmation prints the exact
compiled per-provider result.

**Step 2: Verify**

Run: `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main`
Expected: passes (each changed skill bumped)

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p03-t01): provider-neutral dispatch-ceiling preset prompt"
```

---

### Task p03-t02: Dispatch wiring + enforced/advisory/unsupported logs

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md` (dispatch + logging guidance)
- Bump `version:` if not already bumped this PR

**Step 1: Author**

- Skill calls `oat project dispatch-ceiling resolve`, takes the active provider entry,
  passes `dispatchArgs` through (Codex variant name / Claude Task `model`).
- Implementer dispatch: `min(preferred, ceiling)`. Reviewer dispatch: ceiling as target.
- Verify-on-upgrade: when `verifyOnDispatch`, confirm the dispatched model before
  logging `enforced`; otherwise log `advisory (provider did not honor upgrade; ran <tier>)`.
- Log line states value + provider + mode + mechanism, e.g.:
  ```text
  Dispatch ceiling: high (codex, enforced — variant oat-reviewer-high)
  Dispatch ceiling: sonnet (claude, enforced — Task model arg)
  Dispatch ceiling: balanced (cursor, unsupported — no adapter; informational)
  ```

**Step 2: Verify**

Run: `pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main`
Expected: passes

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p03-t02): adapter-aware dispatch + enforced/advisory/unsupported logs"
```

---

## Phase 4: Docs + Lockstep Release

### Task p04-t01: Documentation

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `apps/oat-docs/docs/provider-sync/config.md` (if it references ceiling)

**Step 1: Author**

- Document the preset model, advanced/no-ceiling, the new config keys
  (`workflow.dispatchCeiling.preset` / `.providers.*`), and that runtime reads concrete
  values only.
- Document enforced/advisory/unsupported, per-provider mechanisms, verify-on-upgrade,
  and the clean break (no migration of the old shape).

**Step 2: Verify**

Run: `pnpm build:docs && pnpm run cli -- docs generate-index`
Expected: docs build succeeds; index regenerated

**Step 3: Commit**

```bash
git add apps/oat-docs/docs
git commit -m "docs(p04-t01): document provider-neutral dispatch ceiling model"
```

---

### Task p04-t02: Lockstep version bump + release validation

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`,
  `packages/docs-config/package.json`, `packages/docs-theme/package.json`,
  `packages/docs-transforms/package.json` (lockstep bump)
- Modify: any regenerated provider views from `oat sync`

**Step 1: Bump + sync**

```bash
# bump all five public packages together (e.g. 0.1.8 → 0.1.9)
pnpm run cli -- sync --scope project
```

**Step 2: Verify**

Run:

```bash
pnpm check && pnpm test && pnpm build:docs
pnpm run cli -- sync --scope project --dry-run   # clean
pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main
pnpm release:validate
```

Expected: all pass; sync dry-run clean

**Step 3: Commit**

```bash
git add -A
git commit -m "chore(p04-t02): bump public packages and validate release"
```

---

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                                                                              |
| ------ | -------- | ----------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| p01    | code     | fixes_added | 2026-05-29 | reviews/p01-review-2026-05-29.md (1 Important: resolver reads removed flat key → resolved by p02-t02) |
| p02    | code     | pending     | -          | -                                                                                                     |
| p03    | code     | pending     | -          | -                                                                                                     |
| p04    | code     | pending     | -          | -                                                                                                     |
| final  | code     | pending     | -          | -                                                                                                     |
| spec   | artifact | pending     | -          | -                                                                                                     |
| design | artifact | pending     | -          | -                                                                                                     |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks — provider-neutral schema, preset compiler, config keys
- Phase 2: 2 tasks — adapter registry, adapter-aware resolver
- Phase 3: 2 tasks — neutral preset prompt, dispatch + enforcement logs
- Phase 4: 2 tasks — docs, lockstep version bump + release validation

**Total: 9 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Prior project: `.oat/projects/archived/dispatch-ceiling/` (design.md, summary.md)
