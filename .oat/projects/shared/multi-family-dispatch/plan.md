---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-07
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p06']
oat_auto_review_at_hill_checkpoints: true
oat_phase_review_gate:
  enabled: true
  phases: []
  review_type: code
  exit_nonzero_on: important
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: multi-family-dispatch

> Execute this plan using `oat-project-implement` — **in a dedicated implementation
> worktree created after PR #129 merges**, not on the planning branch. Run
> `pnpm run worktree:init` in the new worktree before using the CLI workflow.

**Goal:** Extend the shipped dispatch-policy contract to multi-family providers: a producer-identity stamp with provenance, a family classifier, a layered tier matrix, a Cursor `model-arg` adapter, family-aware gate avoidance (`avoid: same-family` as default), and ordered-route implementation routing with `(harness, model, effort)` targets.

**Architecture:** One shared identity/matrix foundation feeds two consumers — gate avoidance (producer-derived, always-on) and implementation routing (preference-driven, opt-in) — joined only at the producer-identity stamp. Validation delegates to native provider oracles; no curated model catalog.

**Tech Stack:** TypeScript CLI, OAT config/state frontmatter, provider ceiling adapters, gate exec-target registry, bundled Markdown skills/docs, Vitest, oxlint/oxfmt, Turborepo.

**Commit Convention:** `type(pNN-tNN): description`

## Planning Checklist

- [x] Captured quick discovery decisions (Rounds 1–2 + live harness verification)
- [x] Produced lightweight design (signed off 2026-07-07 with plan-gating decisions)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter
- [x] Defer HiLL checkpoint confirmation to oat-project-implement

## Parallelism

This plan is intentionally sequential. p01 gates everything (its experiments decide stamp confidence rules and Cursor error handling). p02 (identity primitives) is consumed by p03 (resolver/matrix), p04 (gates), and p05 (routing). p04 and p05 both modify gate/resolver surfaces and shared config types. p06 propagates to skills/docs/assets after code contracts are stable.

`oat_plan_parallel_groups: []`

## Phase 1: Kickoff Revalidation and Blocking Experiments

Re-verify every assumption this plan inherits, and run the experiment that gates stamp confidence semantics. Findings land in `implementation.md` and, where they change contracts, in `design.md`.

### Task p01-t01: Re-confirm shipped dispatch surfaces against merged main

**Files:**

- Modify: `.oat/projects/shared/multi-family-dispatch/implementation.md` (findings note)
- Modify if drifted: `.oat/projects/shared/multi-family-dispatch/design.md`

**Step 1: Verify**

- Read `packages/cli/src/config/oat-config.ts` (`WorkflowDispatchPolicy`, `GateAvoid`, `BUILTIN_EXEC_TARGETS`), `packages/cli/src/providers/ceiling/registry.ts` (`ProviderCeilingAdapter`, `CLAUDE_TIER_ORDER`), `packages/cli/src/commands/project/dispatch-ceiling/index.ts` (resolver output shape), `packages/cli/src/commands/gate/index.ts` (avoid filter + priority walk).
- Confirm they match the design's grounding (policy shape, `same-runtime | none`, no producer stamp anywhere).

**Step 2: Record**

Write a dated revalidation note in `implementation.md`; update `design.md` only where reality drifted.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli type-check`
Expected: clean (no code changed; this validates the worktree is healthy).

**Step 4: Commit**

```bash
git add .oat/projects/shared/multi-family-dispatch/
git commit -m "docs(p01-t01): revalidate shipped dispatch surfaces"
```

### Task p01-t02: Characterize Cursor invalid-model behavior (BLOCKING experiment)

**Files:**

- Modify: `.oat/projects/shared/multi-family-dispatch/implementation.md`
- Modify: `.oat/projects/shared/multi-family-dispatch/design.md` (Error Handling + stamp confidence rules)

**Step 1: Experiment (live `cursor-agent` binary required)**

- Run `cursor-agent -p --model <valid-slug> "reply OK"` → record success shape and the init-event `model` echo.
- Run `cursor-agent -p --model definitely-not-a-model "reply OK"` → record: hard error (exit code/message) vs **silent fallback** to the default model.
- Run with a display name (`--model "Composer 2.5"`) → record whether display names are accepted.
- Run `cursor-agent models` → record output shape vs `--list-models`.

**Step 2: Record and update contracts**

- If invalid slugs **error**: `declared` Cursor stamps qualify as high-confidence without corroboration; update design consumption rules.
- If they **silently fall back**: pre-dispatch validation is mandatory and the init-event echo is the post-dispatch truth check; confirm the design's current (conservative) rules stand.

**Step 3: Verify**

Run: the four experiment commands above.
Expected: each behavior recorded verbatim in `implementation.md` with exit codes.

**Step 4: Commit**

```bash
git add .oat/projects/shared/multi-family-dispatch/
git commit -m "docs(p01-t02): characterize cursor invalid-model behavior"
```

### Task p01-t03: Decide stamp record format and declaration path

**Files:**

- Modify: `.oat/projects/shared/multi-family-dispatch/design.md` (Open Questions → resolved)
- Modify: `.oat/projects/shared/multi-family-dispatch/implementation.md`

**Step 1: Decide**

- Fix the parseable grammar for formalized Dispatch Notes records (single-line key=value form extending the shipped `Dispatch: pNN ... model_axis=... effort_axis=...` convention; must add resolved identity + provenance + role, e.g. `producer=<slug> provenance=declared|observed|inferred|unknown role=implementer|fix|reviewer`).
- Decide whether a launcher declaration path (`OAT_CURRENT_TARGET`-style stamping) is available now or deferred (probe-only), based on p01-t02 findings and current launch flows.

**Step 2: Record**

Update the design's two remaining open questions to resolved with the chosen grammar and declaration decision.

**Step 3: Verify**

Run: `grep -n "producer=" .oat/projects/shared/multi-family-dispatch/design.md`
Expected: the chosen grammar appears in the design.

**Step 4: Commit**

```bash
git add .oat/projects/shared/multi-family-dispatch/
git commit -m "docs(p01-t03): fix stamp grammar and declaration path"
```

## Phase 2: Shared Identity Foundation

Family classifier, identity/provenance types, the Cursor probe helper, and the producer-identity stamp writer/reader. All new modules are colocated-`.test.ts` TDD.

### Task p02-t01: Family classifier module

**Files:**

- Create: `packages/cli/src/providers/identity/family.ts`
- Create: `packages/cli/src/providers/identity/family.test.ts`

**Step 1: Write test (RED)**

Cases: representative slugs per family (`sonnet-4-thinking`/`opus`/`fable-5` → `claude`; `gpt-5.5-high` → `openai`; `composer-2.5-fast` → `composer`; `glm-5.2` → `glm`); display names (`"Claude 4 Sonnet"`, `"Composer 2.5 Fast"`); structured `model_provider_id` consumed directly when provided; unrecognized string → `unknown`; never throws.

**Step 2: Implement (GREEN)**

`classifyModelFamily(input: { value: string; providerId?: string }): ModelFamily` — ordered pattern map, extensible, `unknown` fallback.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/family.test.ts`
Expected: all cases pass.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/identity/
git commit -m "feat(p02-t01): add model family classifier"
```

### Task p02-t02: Identity provenance types and corroboration rules

**Files:**

- Create: `packages/cli/src/providers/identity/provenance.ts`
- Create: `packages/cli/src/providers/identity/provenance.test.ts`

**Step 1: Write test (RED)**

Cases: `declared`+matching `observed` → `high` confidence; uncorroborated `declared` → `high` only when the harness is flagged reject-on-invalid (from p01-t02), else `medium`; declared/observed mismatch → observed value wins and `mismatch: true`; `observed`/`inferred` alone → `low`; `unknown` → diversity non-claimable.

**Step 2: Implement (GREEN)**

`IdentityProvenance = 'declared' | 'observed' | 'inferred' | 'unknown'`; `resolveIdentityConfidence(records: IdentityRecord[]): ResolvedIdentity` implementing the design's consumption rules.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/provenance.test.ts`
Expected: all cases pass.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/identity/
git commit -m "feat(p02-t02): add identity provenance model"
```

### Task p02-t03: Cursor current-model probe helper (`oat internal cursor-current-target`)

**Files:**

- Create: `packages/cli/src/commands/internal/cursor-current-target.ts`
- Create: `packages/cli/src/commands/internal/cursor-current-target.test.ts`
- Modify: `packages/cli/src/commands/internal/index.ts` (command registration)

**Step 1: Write test (RED)**

With mocked subprocess/file reads: `--list-models` `(current)` marker wins (slug-shaped); init-event display name is second (mapped through the classifier, marked `inferred`); `cli-config.json` `.model` last; sources disagreeing → exact-match-or-degrade (no auto-normalization of `composer-2.5` vs `composer-2.5-fast`); all sources failing → `unknown`; `--json` output includes value, source, and provenance.

**Step 2: Implement (GREEN)**

One helper owning the probe chain; no inline `awk` anywhere else may duplicate it.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/internal/cursor-current-target.test.ts`
Expected: all cases pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/internal/
git commit -m "feat(p02-t03): add cursor current-target probe helper"
```

### Task p02-t04: Producer-identity stamp writer and reader

**Files:**

- Create: `packages/cli/src/providers/identity/stamp.ts`
- Create: `packages/cli/src/providers/identity/stamp.test.ts`

**Step 1: Write test (RED)**

Round-trip: format a dispatch record using the p01-t03 grammar (role, resolved identity, provenance, tier axes) → parse it back; parse the shipped legacy lines (`model_axis=inherited, effort_axis=selected:high, ...`) as best-effort (`provenance: unknown`, no resolved identity); reader scans `implementation.md` orchestration-run Dispatch Notes and returns per-phase producer identities; malformed lines → skipped with warning, never throw.

**Step 2: Implement (GREEN)**

`formatDispatchStamp(record): string` / `parseDispatchStamps(markdown): DispatchStamp[]` — pure functions; consumers do their own file I/O.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/stamp.test.ts`
Expected: all cases pass, including legacy-line tolerance.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/identity/
git commit -m "feat(p02-t04): add producer-identity stamp writer/reader"
```

## Phase 3: Tier Matrix, Resolver, Cursor Adapter, and Validation Oracles

The layered matrix cells (extending `workflow.dispatchCeiling.providers.*`), sparse project override, resolver integration with per-cell source provenance, the Cursor ceiling adapter, and oracle-based validation.

Validation-checkpoint coverage map (design defines five): adopt-time → p03-t07; set-time → p03-t05; doctor → p03-t06; **preflight** and **dispatch-time backstop** are wired at runtime by the lifecycle-skill updates in p05-t03/p06-t01 (preflight validates the run's cells and routes holes to prompt-and-persist; the dispatch backstop is cell-naming rejection errors plus the subagent report echo as `observed` cross-check).

### Task p03-t01: Extend `workflow.dispatchCeiling.providers.*` with matrix cells

Per the design's "no third parallel shape" decision, the matrix **extends the existing
`providers.*` namespace** — no new top-level config key.

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`

**Step 1: Write test (RED)**

Cases: `workflow.dispatchCeiling.providers.cursor` accepts a bare slug (single pinned model), a per-tier map (`{economy, balanced, high, frontier}` → slug), or per-tier ordered route arrays whose entries are bare slugs or `{harness, model, effort}` objects; existing bare `providers.codex`/`providers.claude` ceiling values parse exactly as before (zero regression); tier maps are also accepted for codex/claude cells; unknown keys ignored; invalid shapes → `undefined` (matching existing normalization style); `dispatchPolicy` parsing unchanged.

**Step 2: Implement (GREEN)**

Widen the `WorkflowDispatchCeiling['providers']` value type (bare value | tier map | route cells) + extend the existing normalization following `normalizeWorkflowConfig` patterns.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts`
Expected: new cases pass; zero regressions.

**Step 4: Commit**

```bash
git add packages/cli/src/config/
git commit -m "feat(p03-t01): add dispatch matrix config model"
```

### Task p03-t02: Sparse project-layer matrix override in state frontmatter

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Step 1: Write test (RED)**

`oat_dispatch_policy.matrix` in `state.md` frontmatter parses as a sparse override (only deviating cells); absent matrix key → no override; malformed → ignored with warning; legacy `oat_dispatch_ceiling` still readable.

**Step 2: Implement (GREEN)**

Extend the project-state parser; overrides feed the deep-merge in p03-t03.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
Expected: pass, zero regressions.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling/
git commit -m "feat(p03-t02): parse sparse project matrix override"
```

### Task p03-t03: Resolver deep-merge with per-cell source and selection provenance

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Step 1: Write test (RED)**

Layer precedence: project override > repo config > user config; resolved cell reports its source layer; `selection` reports the precedence branch (`matrix-pinned | prompt-persisted | escalation-target | inherit`) and classified family (or `unknown`); mid-run provider switch simulation — same tier resolves through a different provider column with no cached state; absent cell + interactive unavailable → unresolved (never silently uncapped).

**Step 2: Implement (GREEN)**

Deep-merge in the resolver; extend the JSON output shape additively (existing consumers unaffected).

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling/
git commit -m "feat(p03-t03): resolve matrix with source and selection provenance"
```

### Task p03-t04: Cursor ceiling adapter

**Files:**

- Modify: `packages/cli/src/providers/ceiling/registry.ts`
- Modify: `packages/cli/src/providers/ceiling/registry.test.ts`

**Step 1: Write test (RED)**

Mirroring codex/claude adapter tests: `getCeilingAdapter('cursor').supportsCeiling === true`; `mechanism === 'model-arg'`; `compileToDispatchArgs('<slug>', role, ctx)` → `{ model: '<slug>' }` (slugs are opaque — no enum gate; empty/blank → `null`); `verifyOnDispatch` → `false` always (verify-on-upgrade N/A, no total order); resolver reports `enforced` for cursor when a value resolves.

**Step 2: Implement (GREEN)**

`cursorAdapter` registered in `REGISTERED_ADAPTERS`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/ceiling/registry.test.ts`
Expected: pass; `bl-c3d8` acceptance criteria satisfiable.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/ceiling/
git commit -m "feat(p03-t04): register cursor ceiling adapter"
```

### Task p03-t05: Availability oracles and set-time validation

**Files:**

- Create: `packages/cli/src/providers/identity/availability.ts`
- Create: `packages/cli/src/providers/identity/availability.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts` (set-time warning hook)
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

Oracle per provider class: claude → closed registry enum; codex → effort enum + pinned-variant file existence; cursor → parsed live `cursor-agent models`/`--list-models` output (mocked). Oracle unavailable (CLI missing) → cell marked `unvalidated`, **not** invalid. `oat config set workflow.dispatchCeiling.providers...` warns on unknown values but does not block.

**Step 2: Implement (GREEN)**

`validateMatrixCell(provider, value): 'valid' | 'unknown-value' | 'unvalidated'` + config-set integration.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/availability.test.ts src/commands/config/index.test.ts`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/identity/ packages/cli/src/commands/config/
git commit -m "feat(p03-t05): add availability oracles and set-time validation"
```

### Task p03-t06: Doctor dispatch-matrix drift check

**Files:**

- Modify: `packages/cli/src/commands/doctor/index.ts` (register the check, following the `pjm:*` check pattern)
- Modify: `packages/cli/src/commands/doctor/index.test.ts`

**Step 1: Write test (RED)**

Configured cell whose value is no longer available → WARN naming the exact cell and config layer; unvalidated (oracle absent) → informational, not WARN; clean matrix → PASS.

**Step 2: Implement (GREEN)**

`project:dispatch_matrix` check reusing `validateMatrixCell`.

**Step 3: Verify**

Run: the doctor test file's scoped vitest invocation.
Expected: pass; existing doctor checks unaffected.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/doctor/
git commit -m "feat(p03-t06): add dispatch matrix doctor check"
```

### Task p03-t07: Recommended default matrix as adopt-time template

**Files:**

- Create: template asset for the recommended matrix (decision criterion: user-editable scaffolds live under `.oat/templates/`; assets bundled into the shipped CLI live under `packages/cli/assets/` — the adopt command reads a bundled asset, so default to `packages/cli/assets/` unless implementation finds config templates already conventionally elsewhere)
- Modify: `packages/cli/src/commands/config/index.ts` (adopt command, e.g. `oat config adopt dispatch-matrix`)
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

Adopt copies the recommendation into the chosen config layer with a recommendation-version stamp; every cell validated at adoption (warnings surfaced per cell); re-adopt over an existing matrix requires explicit confirmation; OAT updating the shipped recommendation later does not change adopted config.

**Step 2: Implement (GREEN)**

Adopt command + version-stamped template.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/ packages/cli/assets/ .oat/templates/
git commit -m "feat(p03-t07): add adopt-time recommended dispatch matrix"
```

## Phase 4: Family-Aware Gate Avoidance

`avoid: same-family` as the shipped default, the `models` dimension on exec targets, producer-anchored filtering, and achieved-diversity metadata.

### Task p04-t01: Extend gate avoid enum with `same-family`

The gate's **load-bearing** avoid enum is the local `CrossProviderAvoid` type in
`gate/index.ts` (plus `VALID_CROSS_PROVIDER_AVOIDS` and the hardcoded
`'same-runtime'` default in `parseCrossProviderAvoid`) — `GateAvoid` in
`oat-config.ts` is an orphan type referenced nowhere; sync it or delete it, but the
gate-file edits are the change.

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts` (`CrossProviderAvoid`, `VALID_CROSS_PROVIDER_AVOIDS`, the `parseCrossProviderAvoid` default, validation message)
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `packages/cli/src/config/oat-config.ts` (keep the orphan `GateAvoid` in sync, or remove it if truly unused)

**Step 1: Write test (RED)**

`--avoid same-family` accepted; `--avoid none` and `--avoid same-runtime` unchanged; invalid value error message lists all values; **default becomes `same-family`** (the flip is this task — assert the new default via `parseCrossProviderAvoid` with no/blank value).

**Step 2: Implement (GREEN)**

Local enum + valid-values array + default change; keep `same-runtime` fully supported.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/config/ packages/cli/src/commands/gate/
git commit -m "feat(p04-t01): add same-family gate avoidance as default"
```

### Task p04-t02: `models` dimension on exec targets and candidate expansion

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts` (`ExecTarget`/`ExecTargetConfig` + `normalizeExecTarget`)
- Modify: `packages/cli/src/commands/gate/index.ts` (candidate expansion)
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

Target with `models: [a, b]` expands to `(target, a)`, `(target, b)` preserving target priority then list order; target without `models` expands to one implicit candidate; dispatch of a modeled candidate appends `--model <winner>` to `baseCommand`; long-form pinned `--model` in `baseCommand` is detected and treated as that candidate's model (no double `--model`).

**Step 2: Implement (GREEN)**

Additive config field + expansion in the candidate walk.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/config/ packages/cli/src/commands/gate/
git commit -m "feat(p04-t02): add model dimension to gate exec targets"
```

### Task p04-t03: Producer-anchored family filtering

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

The design's walk-through as tests: producer `gpt-5.5-xhigh` (openai) → `(claude-default, sonnet)` survives; `(cursor-default, gpt-5.5)` filtered (same family) while `(cursor-default, composer-2.5)` survives — same target, both outcomes; producer identity supplied via `--producer-identity <value:provenance>` flag and via stamp-reader fallback; `unknown` producer → run with explicit non-claim; single-family runtimes derive family without a pinned model; the reproduced shipped bug (cursor gate inheriting producer model) now fails the filter.

**Step 2: Implement (GREEN)**

Family filter using `classifyModelFamily` + `parseDispatchStamps`; pre-dispatch only (preserve "no fallback after dispatch").

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p04-t03): filter gate candidates by producer family"
```

### Task p04-t04: Achieved-diversity metadata and confidence-graded logging

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

Gate outcome records achieved level: `different-family` / `degraded-to-different-slug` / `same-family — no diverse target available` / `unknown-producer`; no-diverse-family-available → warn and run (flagged), never block, never silent; confidence line follows stamp provenance (high on corroborated declared, per p02-t02 rules); `--json` output carries the metadata.

**Step 2: Implement (GREEN)**

Structured outcome fields + log lines.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p04-t04): record achieved gate diversity metadata"
```

## Phase 5: Multi-Family Implementation Routing

Ordered routes (floor → escalation) over the matrix, `(harness, model, effort)` targets with same-harness dispatch, and escalation wired to existing hooks.

### Task p05-t01: Ordered-route resolution in the resolver

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Step 1: Write test (RED)**

A route cell (`high: [composer-2.5, {harness: cursor, model: gpt-5.5-xhigh}]`) resolves to the floor by default; `--escalation-level N` selects the Nth route entry (discrete jump, no `min()`); selection metadata reports `escalation-target` and the entry's harness/model; single-axis providers unchanged (`min(preferred, ceiling)` untouched).

**Step 2: Implement (GREEN)**

Route resolution branch in the resolver.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling/
git commit -m "feat(p05-t01): resolve ordered escalation routes"
```

### Task p05-t02: `(harness, model, effort)` target objects with same-harness dispatch

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Step 1: Write test (RED)**

A route entry `{harness: cursor, model: gpt-5.5-xhigh}` with active harness cursor → dispatch args `{model: 'gpt-5.5-xhigh'}` (same-harness native); active harness ≠ entry harness → resolver returns the target with an explicit `crossHarness: true` marker and **no dispatch args** (cross-harness-exec is deferred; honest advisory, never a silent same-harness substitution); bare-slug entries imply the active harness.

**Step 2: Implement (GREEN)**

Target-object handling; deferred path clearly logged.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch-ceiling/index.test.ts`
Expected: pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling/
git commit -m "feat(p05-t02): support harness-model-effort route targets"
```

### Task p05-t03: Wire escalation to existing retry/Dispatch Profile hooks

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md` (runtime dispatch selection: route floor from Dispatch Profile/default; advance one route entry on repeated review failure within `oat_orchestration_retry_limit`; write producer stamps using the p01-t03 grammar on every dispatch)
- Bump `version:` in the skill frontmatter

**Step 1: Draft**

Instruction updates only — no new trigger machinery; escalation advances along the route exactly where the fix-loop already escalates.

**Step 2: Verify**

Run: `pnpm run oat:validate-skills`
Expected: pass, version bump detected.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/
git commit -m "docs(p05-t03): wire route escalation into implement skill"
```

## Phase 6: Propagation, Docs, and Release

Skills/docs/templates propagation, provider-view sync, and the lockstep release bump.

### Task p06-t01: Update remaining lifecycle skills and templates

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md` and `.agents/skills/oat-project-quick-start/SKILL.md` (matrix-aware dispatch policy prompt additions, prompt-and-persist hole-filling)
- Modify: `.oat/templates/state.md` (matrix override comment shape)
- Bump `version:` on each changed skill

**Verification:**

```bash
pnpm run oat:validate-skills
```

**Commit:** `docs(p06-t01): propagate matrix dispatch to lifecycle skills`

### Task p06-t02: Docs site updates

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md` (matrix, routes, provenance)
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md` (same-family default — **loud release note**, models dimension, achieved-diversity metadata, `--avoid none` escape hatch)
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md` (matrix cells under `workflow.dispatchCeiling.providers.*`, adopt command)

**Verification:**

```bash
pnpm run cli -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
pnpm build:docs
```

**Commit:** `docs(p06-t02): document multi-family dispatch and gate diversity`

### Task p06-t03: Sync provider views and bundled assets

**Files:**

- Regenerated: `packages/cli/assets/**`, `.claude/**`, `.cursor/**`, `.codex/**`, `.oat/sync/manifest.json`

**Verification:**

```bash
pnpm run cli -- sync --scope all
pnpm run cli -- status --scope project --json
git diff --check
```

**Commit:** `chore(p06-t03): sync multi-family dispatch assets`

### Task p06-t04: Lockstep version bump and release validation

**Files:**

- Modify: the five public `package.json` files + `packages/cli/assets/public-package-versions.json`

**Verification:**

```bash
pnpm --filter @open-agent-toolkit/cli test
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter @open-agent-toolkit/cli lint
pnpm release:validate
```

**Commit:** `chore(p06-t04): bump public packages for multi-family dispatch`

## Phase 7: Final Review Fixes

Final-review findings that require code changes before the project can pass final re-review. Deferred review findings are tracked in PJM backlog items and recorded in `implementation.md`.

### Task p07-t01: (review) Restore same-runtime floor for unknown-producer same-family gates

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Understand the issue**

Review finding: Under the new default `avoid=same-family`, `listExecTargetCandidates` only applies family filtering when the producer family is known. With an unknown producer, no avoidance filter runs and the highest-priority target can be the same runtime/model that produced the work, regressing the shipped same-runtime independence floor for unstamped projects.

Location: `packages/cli/src/commands/gate/index.ts:832`

**Step 2: Implement fix**

When `avoid === 'same-family'` and producer identity is unknown or non-claimable, retain the same-runtime filter as a conservative floor. Fall back to unfiltered selection only through the existing no-eligible-target fallback and preserve honest achieved-diversity metadata/logging. Update the existing unknown-producer regression coverage so it expects the same-runtime floor rather than no fallback.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: pass, including coverage for unknown producer identity under the default `same-family` mode.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "fix(p07-t01): restore unknown-producer gate diversity floor"
```

### Task p07-t02: (review) Reject invalid closed-provider matrix values at set time

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Understand the issue**

Review finding: `oat config set workflow.dispatchCeiling.providers.claude.high opus-4.8` currently warns that the value was not recognized but says it is "saving anyway". For closed-enum providers such as Codex and Claude, invalid values are later dropped by config normalization, so the saved value is inert and misleading.

Location: `packages/cli/src/commands/config/index.ts:1010`

**Step 2: Implement fix**

For closed-enum provider cells (`codex`, `claude`), fail `config set` when the supplied value is not accepted by that provider's enum/availability rules and include the valid-value list in the error. Keep open-provider behavior for Cursor and future providers, where unrecognized values may still be saved with an availability warning.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/config/oat-config.test.ts`
Expected: pass, including a regression that closed-provider invalid values are rejected at set time and open-provider values retain current warning/save behavior.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/ packages/cli/src/config/
git commit -m "fix(p07-t02): reject invalid closed-provider dispatch cells"
```

### Task p07-t03: (review) Reject invalid closed-provider recommendation cells

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Understand the issue**

Fable final re-review minor: `oat config adopt dispatch-matrix` reused the
availability warning path for recommendation cells. A repo-controlled bundled
recommendation containing an invalid closed-provider value would warn and save
an inert value, even after p07-t02 fixed direct `config set`.

**Step 2: Implement fix**

Reuse the closed-provider enum validation during recommendation adoption before
calling the availability oracle or writing config.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts src/config/oat-config.test.ts`
Expected: pass, including invalid recommendation cells rejected before save.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/
git commit -m "fix(p07-t03): reject invalid recommendation cells"
```

### Task p07-t04: (review) Warn when unknown-producer fallback abandons the floor

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Understand the issue**

Fable final re-review minor: when unknown-producer `same-family` avoidance
attempted the same-runtime floor but fell back to an unfiltered target, metadata
reported `unknown-producer` without an explicit warning that the floor had been
abandoned.

**Step 2: Implement fix**

Emit the existing no-diverse-target warning when a no-diverse fallback is used
and achieved diversity is `unknown-producer`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: pass, including warning metadata in review-gate output.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "fix(p07-t04): warn on unknown-producer gate fallback"
```

## Reviews

| Scope  | Type     | Status | Date       | Artifact                                                    |
| ------ | -------- | ------ | ---------- | ----------------------------------------------------------- |
| design | artifact | passed | 2026-07-07 | signed off in-session (Q23)                                 |
| plan   | artifact | passed | 2026-07-07 | reviews/archived/artifact-plan-review-2026-07-07T052748Z.md |
| p01    | code     | passed | 2026-07-07 | reviews/archived/p01-review-2026-07-07T130154Z.md           |
| p02    | code     | passed | 2026-07-07 | reviews/archived/p02-review-2026-07-07T133749Z.md           |
| p03    | code     | passed | 2026-07-07 | reviews/archived/p03-review-2026-07-07T150751Z.md           |
| p04    | code     | passed | 2026-07-07 | reviews/archived/p04-review-2026-07-07T155438Z.md           |
| p05    | code     | passed | 2026-07-07 | reviews/archived/p05-review-2026-07-07T163044Z.md           |
| p06    | code     | passed | 2026-07-07 | reviews/archived/p06-review-2026-07-07T171242Z.md           |
| final  | code     | passed | 2026-07-07 | reviews/archived/final-review-2026-07-07T215509Z.md         |

## Implementation Complete

Implementation is complete when all seven phases pass review, final re-review passes, and release validation succeeds.

| Phase | Tasks | Status    |
| ----- | ----- | --------- |
| p01   | 3     | passed    |
| p02   | 4     | passed    |
| p03   | 7     | passed    |
| p04   | 4     | passed    |
| p05   | 3     | passed    |
| p06   | 4     | passed    |
| p07   | 4     | completed |

**Total:** 29 tasks.

## References

- Discovery: `.oat/projects/shared/multi-family-dispatch/discovery.md`
- Design: `.oat/projects/shared/multi-family-dispatch/design.md`
- Parent (shipped): `.oat/projects/shared/model-dispatch-improvements/`
- Backlog: `bl-c3d8` (third-provider ceiling adapter), `bl-e6fc` (gate cross-target execution)
- Adapter registry: `packages/cli/src/providers/ceiling/registry.ts`
- Gate avoidance: `packages/cli/src/commands/gate/index.ts`
- Resolver: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
