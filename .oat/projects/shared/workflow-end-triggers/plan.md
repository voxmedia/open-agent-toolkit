---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-06-20
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: [] # phases to pause AFTER completing (empty = every phase)
oat_plan_parallel_groups: [['p02', 'p03']] # resolver + eligibility validation are file-disjoint
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: workflow-end-triggers

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Add a per-skill gate mechanism — a configured final step a gate-aware skill must run before it is "done" — with config schema, layered resolution, read/write CLI surfaces, eligibility validation, and the skill-side opt-in marker + Gate Execution step. Flagship use: cross-model/cross-provider verification.

**Architecture:** Two homes — CLI/TypeScript side (`packages/cli`) owns gate config (schema, resolution, validation, read/write commands); skill-authoring side (`.agents/skills`) owns gate execution (`oat_gateable` marker + a shared "Gate Execution" final step the agent runs). Thin mechanism, smart command; exit code is the pass/fail signal.

**Tech Stack:** TypeScript ESM (Node 22), `@open-agent-toolkit/cli`, vitest, oxlint/oxfmt, pnpm workspaces + Turborepo.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add GateConfig schema + normalization`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (default: pause after every phase; adjustable)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

**Declared group: `[['p02', 'p03']]`.**

- **p01 (schema)** is foundational — every other phase imports `GateConfig` from it, so it runs first, alone.
- **p02 (resolver, `config/resolve.ts`)** and **p03 (eligibility validation, `validation/skills.ts`)** both depend only on p01's types and write to **disjoint files** with independent verification (resolver unit tests vs skills-validation unit tests). They run concurrently in isolated worktrees and merge back in plan order.
- **p04 (CLI commands)** depends on p02 (`oat gate resolve` calls `resolveGate`) and p01 — runs after the group.
- **p05 (skill-side + release)** depends on p04 (the Gate Execution step calls `oat gate resolve`) — runs last.

Not parallelized further: p04 and p05 are a strict dependency chain on the resolve command; p01 is a shared-type prerequisite for everything.

---

## Phase 1: Gate config schema (`config/oat-config.ts`)

### Task p01-t01: Add GateConfig schema + normalization

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`

**Step 1: Write test (RED)**

Add cases to `oat-config.test.ts` asserting `normalizeWorkflowConfig` / `normalizeOatConfig` handling of `workflow.gates`:

- valid gate (`command` + `onFailure`) is accepted and preserved
- entry with empty/missing `command` is dropped
- entry with invalid `onFailure` is dropped
- `maxAttempts` coercion: default `2` when absent; integers `≥ 1` kept; non-numeric/`< 1` ignored (falls to default)
- `description` optional, preserved when present
- `null` value preserved (disable signal), distinct from an absent key

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts`
Expected: New cases fail (RED)

**Step 2: Implement (GREEN)**

In `oat-config.ts`: add `export type GateOnFailure = 'block' | 'prompt' | 'warn';` and `export interface GateConfig { command: string; onFailure: GateOnFailure; description?: string; maxAttempts?: number; }`. Add `gates?: Record<string, GateConfig | null>;` to `OatWorkflowConfig`. Extend `normalizeWorkflowConfig` with a `gates` branch following the existing validate-or-drop pattern (no throws): preserve `null`, drop invalid objects, coerce `maxAttempts` to integer `≥ 1` default `2`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Factor a `normalizeGateConfig(value): GateConfig | null | undefined` helper if the branch grows; keep parity with sibling normalizers.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts
git commit -m "feat(p01-t01): add GateConfig schema + normalization"
```

---

## Phase 2: Gate resolver (`config/resolve.ts`)

### Task p02-t01: Implement resolveGate with layered precedence

**Files:**

- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`

**Step 1: Write test (RED)**

Add `resolveGate` cases to `resolve.test.ts`:

- only one layer defines the gate → that gate resolves
- precedence local > shared > user: highest layer that mentions the key wins **wholesale**
- **no within-gate value merge**: a higher layer defining the key never inherits sibling fields from a lower layer
- `null` at a higher layer → resolves to "disabled" (`null`) and short-circuits lower layers
- key omitted in a layer → falls through to the next
- no layer defines it → `null`

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts`
Expected: New cases fail (RED)

**Step 2: Implement (GREEN)**

Add `export function resolveGate(effective, skillName): GateConfig | null` to `resolve.ts`. **Read the raw layer objects directly — `effective.local.workflow?.gates`, `effective.shared.workflow?.gates`, `effective.user.workflow?.gates` — NOT `effective.resolved`.** `flattenConfig` recurses into nested records, so reading the flattened `resolved` map would shred each `GateConfig` into leaf keys (`workflow.gates.<skill>.command`, …) and silently merge fields across layers — exactly the within-gate merge the design forbids. Return the first (most-specific) raw layer that mentions the skill key, wholesale (including a `null` disable), else `null`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Reuse the existing per-section resolution shape in `resolveEffectiveConfig`; keep `resolveGate` consistent with how other `workflow.*` values are surfaced.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts
git commit -m "feat(p02-t01): add resolveGate layered per-skill resolution"
```

---

## Phase 3: Eligibility validation (`validation/skills.ts`)

### Task p03-t01: Warn on gates targeting non-gateable skills

**Files:**

- Modify: `packages/cli/src/validation/skills.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)**

Add cases to `skills.test.ts`:

- a configured `workflow.gates` key targeting a skill whose `SKILL.md` has `oat_gateable: true` → no finding
- a key targeting a skill **without** the marker → a warning finding (non-blocking)
- a key targeting an unknown/missing skill → a warning finding

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: New cases fail (RED)

**Step 2: Implement (GREEN)**

`validateOatSkills(repoRoot, options, dependencies)` currently takes no config and only scans `.agents/skills/*`. Wire gate keys in via the existing injection seam: extend `ValidateOatSkillsOptions` (or `ValidateOatSkillsDependencies`) to accept the resolved `workflow.gates` keys (or a `ResolvedConfig`), populated by the `validate-oat-skills` caller (the entry behind `pnpm oat:validate-skills`) from real resolved config — so tests inject gate config without touching disk. **Validate the union of gate keys across all layers** (so any misconfiguration is visible even if a higher layer disables the key with `null`). For each key, read the named `.agents/skills/<skill>/SKILL.md` frontmatter using the existing helpers (`getFrontmatterBlock` / `frontmatterHasKey`) and push a non-blocking warning finding when the skill lacks `oat_gateable: true` or does not exist. Do **not** use `agents/canonical/parse.ts`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

If reading skill frontmatter needs a small shared reader, extract it next to the existing helpers rather than duplicating parse logic.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/validation/skills.ts packages/cli/src/validation/skills.test.ts
git commit -m "feat(p03-t01): warn on gates configured for non-gateable skills"
```

---

## Phase 4: CLI gate commands (`commands/gate/`)

### Task p04-t01: `oat gate resolve <skill>`

**Files:**

- Create: `packages/cli/src/commands/gate/index.ts`
- Create: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `packages/cli/src/commands/index.ts` — add `program.addCommand(createGateCommand())` in `registerCommands`

**Step 1: Write test (RED)**

In `commands/gate/index.test.ts`:

- gate present → prints resolved `GateConfig` JSON, exit 0
- absent → prints `null`, exit 0
- disabled (`null` in config) → prints `null`, exit 0
- unknown skill → prints `null`, exit 0 (never errors)

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: Fails (RED)

**Step 2: Implement (GREEN)**

Implement `oat gate resolve <skill>` calling `resolveGate` against the loaded effective config; print JSON (default/only shape). Register the `gate` command group. Keep the handler thin (route logic through config modules) per CLI package conventions.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: Passes (GREEN)

**Step 3: Refactor**

Confirm exit semantics (0 success) and logger usage (no raw `console.*`).

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check && pnpm run cli -- gate resolve oat-project-plan --json`
Expected: No errors; prints a gate or `null`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/ packages/cli/src/commands
git commit -m "feat(p04-t01): add oat gate resolve command"
```

---

### Task p04-t02: `oat gate set` / `oat gate unset`

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

Add cases:

- `set` then `resolve` round-trips the gate back
- `--disable` writes `null` at the chosen layer (resolve returns `null`)
- `unset` removes the key entirely
- invalid `--command` (empty) / invalid `--on-failure` rejected with a non-zero actionable error
- `--layer local|shared|user` writes the right config file (shared→`writeOatConfig`, local→`writeOatLocalConfig`, user→`writeUserConfig`) and leaves sibling skills' gates untouched

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: New cases fail (RED)

**Step 2: Implement (GREEN)**

Implement `oat gate set <skill> --command <cmd> --on-failure <block|prompt|warn> [--description <text>] [--max-attempts <N>] [--layer <local|shared|user>]` (default layer `user`), `oat gate unset <skill> [--layer]`, and `oat gate set <skill> --disable [--layer]` (writes `null`). Use the `shared` layer name to match the existing `ConfigSurface = 'auto' | 'shared' | 'local' | 'user'` vocabulary (`.oat/config.json` is the "shared" layer), mapping shared→`writeOatConfig`, local→`writeOatLocalConfig`, user→`writeUserConfig`. Validate inputs through the Component 1 normalization before writing; write per-skill-key into `workflow.gates`, leaving siblings intact. Do not route through the closed-`ConfigKey` `oat config set` surface. _Note: set/unset tests live in `commands/gate/index.test.ts` (co-located, per CLI file-naming convention) rather than design's tentative `config/index.test.ts` — intentional divergence._

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts`
Expected: Passes (GREEN)

**Step 3: Refactor**

Share a write helper with the existing config-write utilities (`writeOatConfig` / `writeOatLocalConfig` / `writeUserConfig`); keep per-skill mutation isolated.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p04-t02): add oat gate set/unset write surface"
```

---

## Phase 5: Skill-side opt-in + release bookkeeping

### Task p05-t01: Add `oat_gateable` marker + Gate Execution step to lifecycle skills

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-plan/SKILL.md`

**Step 1: Author the changes**

To both skills: add `oat_gateable: true` to frontmatter and bump each skill's `version:` (PR-scoped bump per AGENTS.md). Append a shared, identical **"Gate Execution"** final step authored as prose:

1. Run `oat gate resolve <this-skill> --json`.
2. `null` → skill is done.
3. Else run `command`, capturing stdout/stderr + exit code.
4. Exit 0 → done. Nonzero → branch on `onFailure`:
   - `block` → read feedback (stdout + any artifact), remediate, re-run; repeat up to `maxAttempts` (default 2); on exhaustion escalate to the human with accumulated per-attempt feedback appended to `implementation.md`; distinguish a launch failure (missing binary / PATH) and bias it toward escalation rather than consuming remediation attempts.
   - `prompt` → surface failure, ask the human to disposition.
   - `warn` → record and continue (done).
   - Use `description` to orient remediation + next steps.

**Step 2: Verify**

Run: `pnpm oat:validate-skills`
Expected: Skills still validate (required frontmatter intact, name/dir match, version bumps detected) with no regression from adding `oat_gateable` or the Gate Execution prose. Note: `validateOatSkills` does not treat `oat_gateable` as a required key and has no generic "step-structure" check — the real signal is a clean pass plus the version-bump detection. (Adding explicit `oat_gateable`/step validation would be a separate change to `validateOatSkills`, not in scope here.)

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-plan/SKILL.md
git commit -m "feat(p05-t01): add oat_gateable marker + Gate Execution step to lifecycle skills"
```

---

### Task p05-t02: Lockstep public-package version bump + release validation

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Bump versions**

This PR ships CLI functionality **and** bundled-asset (`.agents/skills`) changes, so bump all five lockstep public packages together by the same increment (per AGENTS.md release policy).

**Step 2: Verify (definition of done)**

Run: `pnpm release:validate`
Expected: Passes (publishable-package PR is not done until this passes)

Then a full gate: `pnpm build && pnpm lint && pnpm type-check && pnpm test`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "chore(p05-t02): lockstep public-package version bump + release validation"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date       | Artifact                                              |
| ------ | -------- | ------- | ---------- | ----------------------------------------------------- |
| p01    | code     | pending | -          | -                                                     |
| p02    | code     | pending | -          | -                                                     |
| p03    | code     | pending | -          | -                                                     |
| p04    | code     | pending | -          | -                                                     |
| p05    | code     | pending | -          | -                                                     |
| final  | code     | pending | -          | -                                                     |
| plan   | artifact | passed  | 2026-06-20 | structured review (in-session); all findings applied  |
| spec   | artifact | n/a     | -          | - (quick mode — no spec.md)                           |
| design | artifact | passed  | 2026-06-20 | reviews/archived/artifact-design-review-2026-06-20.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 1 task — Gate config schema + normalization
- Phase 2: 1 task — Layered `resolveGate`
- Phase 3: 1 task — Eligibility validation warning
- Phase 4: 2 tasks — `oat gate resolve` + `oat gate set/unset`
- Phase 5: 2 tasks — Skill marker + Gate Execution step; lockstep version bump + release validation

**Total: 7 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Spec: n/a (quick mode — no `spec.md`)
