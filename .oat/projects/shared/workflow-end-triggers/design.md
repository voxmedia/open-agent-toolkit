---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-06-20
oat_generated: false
oat_template: false
---

# Design: workflow-end-triggers

## Overview

The workflow-end-triggers feature adds a **per-skill gate**: a configured final step that a gate-aware skill must run before it is considered fully executed. A gate is a thin config object (`description`, `command`, `onFailure`, `maxAttempts`) attached to a skill by name. When a gate-aware skill finishes its primary work, it runs the gate's `command` as its last act; the command's **exit code** is the universal pass/fail signal. The flagship use is cross-model/cross-provider verification — e.g. Claude implements, then a gate dispatches Codex to run `oat-project-review-provide` as an independent final review in a fresh session — but the command is generic (any CLI/bash/npm/pnpm invocation).

The design rests on three pillars established in discovery:

1. **Thin mechanism, smart command.** OAT supplies no verdict schema and no context-passing plumbing. Pass/fail is the process exit code; the command carries its own intelligence and resolves its own context implicitly via OAT state and the skill it invokes.
2. **Skill-opts-in eligibility.** A skill advertises `oat_gateable: true` in its frontmatter and carries a standard "run configured gate" final step. Config can only attach gates to skills that advertise the capability, so honoring the gate is part of the skill's own contract — satisfying "MUST run before done" — and a gate configured for a non-gate-aware skill is detectable rather than a silent no-op.
3. **`onFailure` spans the enforcement spectrum.** `block` drives a bounded autonomous remediation loop (agent reads feedback, addresses it, re-runs, up to `maxAttempts`, then escalates to the human); `prompt` surfaces the failure and asks; `warn` records it and continues. "Trigger" is just `onFailure: warn`.

Configuration lives in `workflow.gates` (keyed by skill name) across all config layers, resolved most-specific-wins: local project config > repo project config > user config, with user config the expected primary home since provider choice is user-specific. The v1 enforcement boundary is the agent-enforced skill step; deterministic CLI-boundary enforcement is explicitly deferred.

## Architecture

### System Context

This feature spans **two homes** in the OAT codebase, and the split is the key architectural fact:

- **CLI / TypeScript side** (`packages/cli`) — owns the gate _config_: schema, layered resolution, and validation. This is where a skill (or any caller) asks "what gate applies to skill X here?" and gets a resolved answer.
- **Skill-authoring side** (`.agents/skills`) — owns gate _execution_: the `oat_gateable` opt-in marker plus a standard "Gate Execution" final step authored into each gateable skill. The agent running the skill is what actually executes the gate and drives the remediation loop.

The mechanism is deliberately thin on the CLI side (resolve + validate config) and carries the behavioral intelligence in skill prose + the user's command. No new runtime daemon, no execution engine in the CLI.

**Key Components:**

- **Gate config schema** — extends `OatWorkflowConfig` with `gates?: Record<string, GateConfig>` in `config/oat-config.ts`, normalized in `normalizeWorkflowConfig` (validates `command`, `onFailure` enum, `maxAttempts`, `description`).
- **Gate resolver** — layered, per-skill-key resolution in `config/resolve.ts` (`resolveEffectiveConfig`), most-specific-wins (local > repo > user), no within-gate value merge; `null` at a higher layer disables a skill's gate.
- **Gate lookup surface** — a dedicated `oat gate resolve <skill>` command returning the merged result as JSON, so a skill's Gate Execution step fetches its own resolved gate without re-implementing the per-skill-key merge / `null`-disable semantics.
- **Gate config write surface** — a dedicated `oat gate set <skill>` / `oat gate unset <skill>` command pair that writes a full `GateConfig` (or `null` to disable) to a chosen layer. Required because `oat config set` uses a closed `ConfigKey` union (`commands/config/index.ts`) that rejects `workflow.gates.*` and cannot express structured gate objects; a dedicated command keeps the structured write + `null`-disable out of that fixed-key surface.
- **Skill opt-in + Gate Execution step** — `oat_gateable: true` frontmatter marker + a shared, authored final-step block; adopted by `oat-project-implement` and `oat-project-plan` first.
- **Eligibility validation** — detects a gate configured for a skill lacking `oat_gateable`, surfaced through the existing skill-validation surface (`validation/skills.ts` / `validateOatSkills`, which already scans `.agents/skills/*/SKILL.md`) and doctor tooling as a **warning** (non-blocking; the gate no-ops with a visible note). _Not_ `agents/canonical/parse.ts`, which models `.agents/agents/*.md` agent docs.

### Component Diagram

```
 User config layers                      Skill execution (agent)
 ┌─────────────────────┐                 ┌──────────────────────────────┐
 │ config.local.json   │                 │ gate-aware SKILL.md          │
 │ config.json (repo)  │                 │  (oat_gateable: true)        │
 │ user config.json    │                 │  ...primary work...          │
 └─────────┬───────────┘                 │  ▼ Gate Execution step       │
           │ workflow.gates[skill]        │     │                        │
           ▼                              └─────┼────────────────────────┘
 ┌─────────────────────┐  oat gate resolve      │ lookup
 │   Gate resolver     │◄───────────────────────┘
 │ (resolve.ts)        │────────► GateConfig | null
 └─────────────────────┘
     ▲ write          ▲ validate (gateable?)
 ┌────────────────┐  ┌─────────────────────────────┐
 │ oat gate set/  │  │ Eligibility check           │
 │ unset <skill>  │  │ validation/skills.ts        │
 └────────────────┘  │ (validateOatSkills)         │
                     └─────────────────────────────┘
```

### Data Flow

```
1. Gate-aware skill finishes primary work, reaches its Gate Execution step.
2. Step resolves the gate for its own skill name via `oat gate resolve <skill>`.
3. No gate resolved  → skill is done.
4. Gate resolved     → run `command`; capture stdout/stderr + exit code.
5. Exit 0            → skill is done.
6. Exit nonzero      → branch on onFailure:
     • block  → read feedback (stdout + any artifact), remediate, re-run.
                Repeat up to maxAttempts. Still failing → escalate to human
                with accumulated per-attempt feedback (appended to tracking).
     • prompt → surface failure, ask human to disposition.
     • warn   → record failure, continue (skill is done).
```

## Component Design

### Component 1 — Gate config schema (`config/oat-config.ts`)

**Purpose:** Define and normalize `GateConfig`; extend `OatWorkflowConfig.gates`.

**Interfaces:**

```typescript
export type GateOnFailure = 'block' | 'prompt' | 'warn';

export interface GateConfig {
  command: string; // required; the gate runner's self-contained command
  onFailure: GateOnFailure; // required
  description?: string; // for the orchestrating agent: why + next steps
  maxAttempts?: number; // block-only; default 2; ignored for prompt/warn
}

// in OatWorkflowConfig:
//   gates?: Record<string, GateConfig | null>;  // key = skill name; null = disabled
```

**Responsibilities / normalization rules:**

- `command` must be a non-empty string, else the gate entry is dropped (invalid).
- `onFailure` must be one of the enum, else dropped.
- `maxAttempts` coerced to an integer ≥ 1; default 2; only meaningful for `block`.
- `null` is preserved (it is the disable signal), distinct from "absent."
- Follows the existing `normalizeWorkflowConfig` validate-or-drop pattern (no throws).

### Component 2 — Gate resolver (`config/resolve.ts`)

**Purpose:** Resolve the effective gate for a skill across config layers.

**Interfaces:**

```typescript
export function resolveGate(
  effective: ResolvedConfig, // already-loaded shared/local/user layers
  skillName: string,
): GateConfig | null; // null = no gate (none defined, or disabled)
```

**Responsibilities:**

- Per-skill-key precedence: local > repo > user. First layer that mentions the key wins **wholesale** (no within-gate merge).
- A layer setting the key to `null` resolves to "disabled" — short-circuits, lower layers ignored.
- A layer omitting the key falls through to the next.

### Component 3 — `oat gate resolve <skill>` command

**Purpose:** The lookup surface skills call.

**Behavior:**

- Prints resolved `GateConfig` as JSON to stdout, exit 0.
- No gate (absent or disabled) → prints `null`, exit 0 — _not_ an error; "no gate" is a normal answer.
- Unknown/invalid skill name → still exit 0 with `null` (resolution is config-driven, not registry-driven); eligibility is a _validation_ concern, not a resolve-time error.
- JSON is the default/only shape (machine-consumed by the skill step).

### Component 4 — Skill opt-in marker + Gate Execution step (skill-side)

**Purpose:** Make honoring the gate part of the skill's own contract.

**Two parts:**

- **Frontmatter:** `oat_gateable: true` added to gateable skills (`oat-project-implement`, `oat-project-plan` first).
- **Authored "Gate Execution" step** (shared prose, appended as the skill's final step) that:
  1. Runs `oat gate resolve <this-skill>`.
  2. If `null` → done.
  3. Else run `command`, capture stdout/stderr + exit code.
  4. Exit 0 → done. Nonzero → branch on `onFailure` (block loop ≤ `maxAttempts` then escalate / prompt / warn), using `description` to orient remediation + next steps.

**Design decision:** authored as a reusable step block so every gateable skill carries identical gate semantics rather than bespoke per-skill logic.

### Component 5 — Eligibility validation

**Purpose:** Catch gates configured for non-gate-aware skills.

**Home:** the existing skill-validation surface — `packages/cli/src/validation/skills.ts` (`validateOatSkills`), which already scans `.agents/skills/*/SKILL.md` and carries frontmatter helpers (`getFrontmatterBlock`, `frontmatterHasKey`). **Not** `agents/canonical/parse.ts` — that parser models `.agents/agents/*.md` agent documents (name/description/tools), a different subsystem.

**Behavior:**

- Reads configured `workflow.gates` keys; for each, reads the named skill's `SKILL.md` frontmatter via the existing helper and checks for `oat_gateable: true` (reuse `frontmatterHasKey` / a small shared frontmatter-reader rather than a new parser).
- A configured gate whose target skill **lacks** the marker → **warning** through `validateOatSkills` + doctor tooling. Non-blocking; the gate simply never fires.
- An unknown/missing skill name in `workflow.gates` → same warning path.

**Tests:** configured gate targeting a skill **with** `oat_gateable: true` (clean), a skill **without** the marker (warning), and an unknown/missing skill (warning) — added to `validation/skills.test.ts`.

### Component 6 — Gate config write surface (`oat gate set` / `oat gate unset`)

**Purpose:** Give users a defined way to _write_ gate config, since discovery makes user config the expected primary home for the cross-model gate.

**Why a dedicated command (not `oat config set`):** `oat config set` validates against a **closed `ConfigKey` union** with a `VALID_CONFIG_KEYS` allowlist (`commands/config/index.ts`); `workflow.gates.*` keys are absent and rejected before writing, and the fixed-key surface cannot express a structured `GateConfig` object or the `null`-disable. Extending that union with nested per-skill gate keys would bloat it and still couldn't carry the object shape cleanly.

**Behavior:**

```
oat gate set <skill> --command <cmd> --on-failure <block|prompt|warn>
                      [--description <text>] [--max-attempts <N>]
                      [--layer <local|repo|user>]   # default: user (provider-specific home)
oat gate unset <skill> [--layer <...>]              # remove the key
oat gate set <skill> --disable [--layer <...>]      # write null (disable at this layer)
```

- Validates inputs against `GateConfig` normalization (Component 1) before writing; rejects an empty `command` or invalid `onFailure`.
- Writes into the chosen layer's `workflow.gates[<skill>]`, leaving sibling skills' gates untouched (per-skill-key write, mirroring the resolver's per-skill-key merge).
- `--disable` writes `null` (the disable signal); `unset` removes the key entirely.

**Tests:** round-trip set → `oat gate resolve` reads it back; `--disable` writes `null`; `unset` removes; invalid `command`/`onFailure` rejected; layer targeting writes the right file. Added to `config/index.test.ts` (or a dedicated `gate` command test).

## Error Handling

Non-obvious scenarios this design must handle explicitly:

- **Command fails to launch vs nonzero exit.** A gate whose `command` cannot start (ENOENT, shell error, missing `codex`/`claude` on PATH) is treated as a gate failure and enters the `onFailure` branch, but the surfaced message distinguishes "gate command could not run (likely a config/PATH problem)" from "gate ran and reported issues." A launch failure should bias toward escalation rather than endless remediation, since the agent can't fix a missing binary.
- **`maxAttempts` exhausted (`block`).** The loop never silently passes. On exhaustion it escalates to the human with the accumulated per-attempt feedback, and the skill does not mark itself done.
- **Malformed gate config.** Invalid entries are dropped at normalization (validate-or-drop), so `resolveGate` returns `null` and the skill proceeds ungated. The misconfiguration surfaces through validation/doctor tooling, not as a runtime crash.
- **Resolve is read-only and total.** `oat gate resolve` never throws on "no gate" / unknown skill; it always answers with a gate or `null`.

## Testing Strategy

### Unit Tests

- **`GateConfig` normalization** (`oat-config.test.ts` style): valid gate accepted; empty/missing `command` dropped; invalid `onFailure` dropped; `maxAttempts` coercion (default 2, integers ≥ 1, non-numeric ignored); `null` preserved as the disable signal distinct from absent.
- **`resolveGate` precedence** (`resolve.test.ts` harness): local > repo > user wholesale win; `null` at a higher layer disables and short-circuits; key omitted in a layer falls through; **no within-gate value merge** (a higher layer defining the key never inherits sibling fields from a lower layer).
- **`oat gate resolve` output:** gate present → JSON + exit 0; absent → `null` + exit 0; disabled (`null`) → `null` + exit 0; unknown skill → `null` + exit 0.
- **`oat gate set` / `unset` round-trip** (`config/index.test.ts` or a dedicated gate-command test): `set` then `resolve` reads it back; `--disable` writes `null`; `unset` removes the key; invalid `command`/`onFailure` rejected; `--layer` targets the right config file without touching sibling skills' gates.

### Integration Tests

- **Layered resolution end-to-end:** real `config.local.json` + `config.json` + user `config.json` fixtures (mirroring `resolveEffectiveConfig` tests) resolve to the expected gate per skill.
- **Eligibility validation** (`validation/skills.test.ts`): a gate configured for a skill **with** `oat_gateable: true` passes clean; a skill **without** the marker emits a warning (non-blocking) through `validateOatSkills`; an unknown/missing skill name emits the same warning.

### Manual / Skill-Level Verification

The Gate Execution loop (`block` remediation, `prompt`, `warn`, escalation-on-exhaustion) is **skill prose executed by an agent**, not TypeScript — so it is verified by manual scenario walkthroughs and `pnpm oat:validate-skills` (frontmatter + step-structure validation), not by automated unit tests. Key manual scenarios: a `block` gate that fails twice then escalates; a `warn` gate that records and continues; a `prompt` gate that surfaces and waits.

## Open Questions

Resolved during design (recorded here for traceability):

- **Loop state / observability** — accumulated per-attempt feedback is held in-conversation across the `block` loop and appended to the project's existing tracking artifact (`implementation.md`) on escalation. No new persistent store.
- **CLI-boundary enforcement** — out of scope for v1; the agent-enforced Gate Execution step is the only enforcement boundary. Revisit if skill non-compliance proves to be a real problem.

## References

- Discovery: `discovery.md` (quick mode — no `spec.md`)
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Architecture Docs: `.oat/repo/knowledge/architecture.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
