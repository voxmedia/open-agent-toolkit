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

**Goal:** Per-skill gates that a gate-aware skill must run before it is "done," plus runtime-agnostic **cross-runtime** execution (`oat gate cross-provider-exec`) so the flagship case — Claude implements → Codex reviews (or vice versa) — works out of the box. V1 is runtime-level only; same-target execution is deferred to backlog `bl-e6fc`.

**Architecture:** Two homes — CLI/TypeScript (`packages/cli`) owns config (schema, resolution, validation), read/write surfaces, and the `cross-provider-exec` dispatcher; skill-authoring (`.agents/skills`) owns the `oat_gateable` marker + a shared "Gate Execution" final step. Config: `workflow.gates.{ execTargets, skills }`. Exit code is the pass/fail signal.

**Tech Stack:** TypeScript ESM (Node 22), `@open-agent-toolkit/cli`, vitest, oxlint/oxfmt, pnpm + Turborepo.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add gate + exec-target schema`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (default: pause after every phase; adjustable)
- [x] Set `oat_plan_hill_phases`
- [x] Evaluated phases for parallelism
- [x] Set `oat_plan_parallel_groups`

---

## Parallelism

**Declared group: `[['p02', 'p03']]`.**

- **p01 (schema)** is foundational — all phases import its types; runs first, alone.
- **p02 (resolver, `config/resolve.ts`)** and **p03 (eligibility validation, `validation/skills.ts`)** depend only on p01, write to **disjoint files**, verify independently → run concurrently, merge in plan order.
- **p04 (read/write commands)** depends on p02; **p05 (dispatcher)** depends on p02 (`resolveExecTargets`) + p04 (command group); **p06 (skills)** depends on p04/p05 (the step calls `oat gate resolve` / `cross-provider-exec`); **p07 (release)** is last. These form a strict chain — not parallelized.

---

## Phase 1: Config schema (`config/oat-config.ts`)

### Task p01-t01: Add gate + exec-target schema, normalization, built-ins

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`

**Step 1: Write test (RED)**

Cases for `workflow.gates`:

- `GateConfig`: valid (`command`+`onFailure`) preserved; empty/missing `command` dropped; bad `onFailure` dropped; `maxAttempts` coercion (default 2, int ≥ 1, else default); `execPolicy.avoid` validated (default `same-runtime`, bad value → default); `null` skill preserved.
- `ExecTarget`: requires non-empty `runtime` + non-empty `baseCommand: string[]`; optional `hostDetectionCommand`/`availabilityCommand` validated as `string[]`; `priority` numeric; invalid dropped; `null` target preserved.
- Built-in exec targets (codex-default/claude-default/cursor-default) exposed as a constant for the resolver to merge.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts`
Expected: RED

**Step 2: Implement (GREEN)**

Add `GateOnFailure`, `GateAvoid`, `GateConfig`, `ExecTarget`. Set `OatWorkflowConfig.gates = { execTargets?: Record<string, ExecTarget | null>; skills?: Record<string, GateConfig | null> }`. Extend `normalizeWorkflowConfig` (validate-or-drop, no throws; preserve `null`). Export `BUILTIN_EXEC_TARGETS` (codex/claude/cursor defaults with `runtime`, `baseCommand`, `hostDetectionCommand`, `availabilityCommand`, `priority`).

Run: same as above. Expected: GREEN

**Step 3: Refactor** — `normalizeGateConfig` / `normalizeExecTarget` helpers paralleling sibling normalizers.

**Step 4: Verify** — `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts
git commit -m "feat(p01-t01): add gate + exec-target schema with normalization and built-ins"
```

---

## Phase 2: Resolver (`config/resolve.ts`)

### Task p02-t01: resolveGate + resolveExecTargets

**Files:**

- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`

**Step 1: Write test (RED)**

- `resolveGate`: local>shared>user wholesale win; `null` disables + short-circuits; fall-through; **no within-gate merge** (a higher layer never inherits sibling fields). Reads raw layers, not flattened `resolved`.
- `resolveExecTargets`: built-ins present by default; keyed **partial** merge (override only `priority` of a built-in); `null` disables a built-in; new id adds a target; precedence user→shared→local.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts` — RED

**Step 2: Implement (GREEN)**

- `resolveGate(effective, skillName)`: read `effective.local/.shared/.user .workflow?.gates?.skills` (raw layer objects — NOT `effective.resolved`, whose `flattenConfig` shreds gate objects and would merge fields across layers). First raw layer mentioning the key wins wholesale (incl. `null`); else `null`.
- `resolveExecTargets(effective)`: start from `BUILTIN_EXEC_TARGETS`, then keyed partial-merge layers user → shared → local; `null` deletes an id; return the merged `Record<string, ExecTarget>`.

Run: same — GREEN

**Step 3: Refactor** — keep consistent with `resolveEffectiveConfig` section style.

**Step 4: Verify** — lint + type-check (filtered).

**Step 5: Commit**

```bash
git add packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts
git commit -m "feat(p02-t01): add resolveGate + resolveExecTargets"
```

---

## Phase 3: Eligibility validation (`validation/skills.ts`)

### Task p03-t01: Warn on gates targeting non-gateable skills

**Files:**

- Modify: `packages/cli/src/validation/skills.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/internal/validate-oat-skills.ts` (the caller — wires resolved config in)
- Modify: `packages/cli/src/commands/internal/validate-oat-skills.test.ts`

**Step 1: Write test (RED)**

- Validator unit (`skills.test.ts`): `gates.skills` key → skill with `oat_gateable: true` → no finding; → skill without marker → warning; → unknown skill → warning. Gate keys injected via the existing `ValidateOatSkillsOptions`/`Dependencies` seam (no disk).
- Caller (`validate-oat-skills.test.ts`): the command resolves config and threads real `gates.skills` keys into the validator, so a configured gate on a non-gateable skill actually surfaces a warning end-to-end (not only via the injected seam).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/internal/validate-oat-skills.test.ts` — RED

**Step 2: Implement (GREEN)**

- Validator: `validateOatSkills(repoRoot, options, dependencies)` takes no config today and only scans `.agents/skills/*`. Extend `ValidateOatSkillsOptions`/`ValidateOatSkillsDependencies` to accept the resolved `gates.skills` keys. Validate the **union** of keys across layers; for each read `.agents/skills/<skill>/SKILL.md` frontmatter via `getFrontmatterBlock`/`frontmatterHasKey` (NOT `agents/canonical/parse.ts`); non-blocking warning when marker missing or skill absent.
- **Caller wiring (closes the end-to-end gap):** `commands/internal/validate-oat-skills.ts` currently calls `validateOatSkills(context.cwd, options)` with no config. Resolve effective config (`resolveEffectiveConfig`), extract the union of `gates.skills` keys from the raw `.shared/.local/.user` layers, and pass them through the extended options — otherwise `pnpm oat:validate-skills` never fires the warning even though the unit test passes.

Run: same — GREEN

**Step 3: Refactor** — extract a small shared frontmatter reader if needed, beside existing helpers.

**Step 4: Verify** — lint + type-check (filtered) + end-to-end smoke: `pnpm run cli -- internal validate-oat-skills --json` surfaces the warning when a gate targets a non-gateable skill.

**Step 5: Commit**

```bash
git add packages/cli/src/validation/skills.ts packages/cli/src/validation/skills.test.ts packages/cli/src/commands/internal/validate-oat-skills.ts packages/cli/src/commands/internal/validate-oat-skills.test.ts
git commit -m "feat(p03-t01): warn on gates configured for non-gateable skills (validator + caller wiring)"
```

---

## Phase 4: CLI read/write surfaces (`commands/gate/`)

### Task p04-t01: `oat gate resolve <skill>`

**Files:**

- Create: `packages/cli/src/commands/gate/index.ts`
- Create: `packages/cli/src/commands/gate/index.test.ts`
- Modify: `packages/cli/src/commands/index.ts` — `program.addCommand(createGateCommand())` in `registerCommands`

**Step 1: Write test (RED)** — gate present → JSON + exit 0; absent/disabled/unknown skill → `null` + exit 0 (never errors).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts` — RED

**Step 2: Implement (GREEN)** — `oat gate resolve <skill>` via `resolveGate`; register the `gate` command group. Thin handler; logger (no raw `console.*`); exit 0.

Run: same — GREEN

**Step 4: Verify** — lint + type-check + `pnpm run cli -- gate resolve oat-project-plan --json`

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/ packages/cli/src/commands/index.ts
git commit -m "feat(p04-t01): add oat gate resolve command"
```

---

### Task p04-t02: `oat gate set/unset <skill>` + `oat gate target set/unset <id>`

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)**

- `gate set <skill>` then `resolve` round-trips; `--disable` → `null`; `unset` removes; invalid `--command`/`--on-failure` rejected (nonzero, actionable).
- `gate target set <id> --runtime --base-command …` then resolve registry shows it; `--disable` → `null`; `unset` removes; invalid argv rejected.
- `--layer local|shared|user` writes the right file (shared→`writeOatConfig`, local→`writeOatLocalConfig`, user→`writeUserConfig`); siblings untouched.

Run: same test path — RED

**Step 2: Implement (GREEN)**

Implement `gate set/unset <skill>` (writes `gates.skills.<skill>`, `--disable` → `null`) and `gate target set/unset <id>` (writes `gates.execTargets.<id>`, `--disable` → `null`). `--layer` accepts the **three concrete write layers `shared|local|user`** — a subset of `ConfigSurface` that **excludes `auto`** (which has no write helper) — default `user`, mapping shared→`writeOatConfig`, local→`writeOatLocalConfig`, user→`writeUserConfig`. Reject `auto`/invalid layer with a nonzero actionable error. Validate via Component 1 normalization. Per-key writes only — never touch sibling skills/targets. Do not route through the closed-`ConfigKey` `oat config set` surface. _Tests co-located in `commands/gate/index.test.ts`._

Run: same — GREEN

**Step 4: Verify** — lint + type-check (filtered).

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p04-t02): add gate + exec-target write surfaces"
```

---

## Phase 5: Cross-runtime dispatcher

### Task p05-t01: `oat gate cross-provider-exec <prompt...>`

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write test (RED)** (child process mocked/injected)

- Current runtime resolution: `--current-runtime` flag wins; else `OAT_CURRENT_RUNTIME`; else `hostDetectionCommand` in descending priority, **short-circuit on first exit 0**; else `unknown`.
- `avoid: same-runtime` (default) excludes targets whose `runtime` == current; `avoid: none` keeps them.
- Selection: highest-priority target whose `availabilityCommand` passes (absent ⇒ available).
- No eligible target → nonzero + actionable message; **no** same-runtime fallback unless `avoid: none`.
- Executes `baseCommand + [prompt...]` and **exits with the child's status**; passes through stdout/stderr.
- `unknown` current runtime → `same-runtime` excludes nothing (all eligible).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts` — RED

**Step 2: Implement (GREEN)**

Implement `cross-provider-exec` per Component 4: resolve merged `execTargets`; resolve current runtime (flag → env → detection short-circuit → unknown); filter by `avoid`; pick by priority + availability; spawn `baseCommand` + trailing prompt args; inherit/stream stdio; exit with child status; no post-dispatch fallback. Prompt = trailing args joined with spaces.

Run: same — GREEN

**Step 3: Refactor** — isolate selection logic into a pure, unit-testable function (registry + currentRuntime + avoid → chosen target | null).

**Step 4: Verify** — lint + type-check (filtered).

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/
git commit -m "feat(p05-t01): add oat gate cross-provider-exec dispatcher"
```

---

## Phase 6: Skill opt-in + Gate Execution step

### Task p06-t01: `oat_gateable` marker + Gate Execution step on lifecycle skills

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-plan/SKILL.md`

**Step 1: Author**

Add `oat_gateable: true` + bump each skill's `version:` (PR-scoped). Append a shared identical **"Gate Execution"** final step:

1. `oat gate resolve <this-skill> --json`; `null` → done.
2. Else run `command` (typically `oat gate cross-provider-exec "<prompt>"`), capture stdout/stderr + exit code.
3. Exit 0 → done. Nonzero → branch on `onFailure`:
   - `block` → read feedback, remediate, re-run ≤ `maxAttempts` (default 2); on exhaustion escalate with accumulated feedback appended to `implementation.md`; treat a launch failure (missing CLI / no eligible runtime) as escalation-biased, not a remediation attempt.
   - `prompt` → surface, ask human.
   - `warn` → record, continue.
   - Use `description` to orient next steps.
4. Note: `cross-provider-exec` learns the current host from `OAT_CURRENT_RUNTIME` when the launcher exports it, else from built-in `hostDetectionCommand`s — the step does not need to detect the host itself.

_Anti-drift: the two skills' Gate Execution blocks must be kept **verbatim-identical**. A shared-include / snippet mechanism is out of scope for V1 (two hand-authored copies); revisit if more skills adopt the marker._

**Step 2: Verify** — `pnpm oat:validate-skills` (skills still validate; required frontmatter intact; version bumps detected; no regression — note `oat_gateable` is not a required key and there is no generic step-structure check).

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-plan/SKILL.md
git commit -m "feat(p06-t01): add oat_gateable marker + Gate Execution step"
```

---

## Phase 7: Release bookkeeping

### Task p07-t01: Lockstep public-package version bump + release validation

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Bump** — this PR ships CLI functionality + bundled-asset (`.agents/skills`) changes; bump all five lockstep public packages together by the same increment (AGENTS.md release policy).

**Step 2: Verify (definition of done)**

- `pnpm release:validate` (publishable-package PR is not done until this passes)
- `pnpm build && pnpm lint && pnpm type-check && pnpm test`

**Step 3: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "chore(p07-t01): lockstep public-package version bump + release validation"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date       | Artifact                                                |
| ------ | -------- | ------- | ---------- | ------------------------------------------------------- |
| p01    | code     | pending | -          | -                                                       |
| p02    | code     | pending | -          | -                                                       |
| p03    | code     | pending | -          | -                                                       |
| p04    | code     | pending | -          | -                                                       |
| p05    | code     | pending | -          | -                                                       |
| p06    | code     | pending | -          | -                                                       |
| final  | code     | pending | -          | -                                                       |
| plan   | artifact | passed  | 2026-06-20 | structured re-review (in-session); all findings applied |
| spec   | artifact | n/a     | -          | - (quick mode — no spec.md)                             |
| design | artifact | passed  | 2026-06-20 | reviews/archived/artifact-design-review-2026-06-20.md   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 1 task — gate + exec-target schema, normalization, built-ins
- Phase 2: 1 task — `resolveGate` + `resolveExecTargets`
- Phase 3: 1 task — eligibility validation warning
- Phase 4: 2 tasks — `oat gate resolve` + gate/target write surfaces
- Phase 5: 1 task — `cross-provider-exec` dispatcher
- Phase 6: 1 task — skill marker + Gate Execution step
- Phase 7: 1 task — lockstep version bump + release validation

**Total: 8 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Follow-up backlog: `bl-e6fc` (Gates V2 — same-target execution + target-level detection)
- Spec: n/a (quick mode — no `spec.md`)
