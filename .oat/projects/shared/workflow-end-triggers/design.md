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

The workflow-end-triggers feature adds a **per-skill gate**: a configured final step that a gate-aware skill must run before it is considered fully executed. A gate is a thin config object (`command`, `onFailure`, `description`, `maxAttempts`) attached to a skill by name. When a gate-aware skill finishes its primary work, it runs the gate's `command` as its last act; the command's **exit code** is the universal pass/fail signal.

The flagship use is **cross-runtime verification** — Claude implements, then the gate has Codex run `oat-project-review-provide` as an independent review (or vice versa). To make that ergonomic without OAT hard-coding any runtime's CLI, the gate `command` is typically the bundled dispatcher **`oat gate cross-provider-exec <prompt>`**, which picks a _different runtime_ than the current host from a configurable **exec-target registry** and runs the prompt there. The command stays generic, though: any CLI/bash/npm/pnpm invocation works.

The design rests on these pillars:

1. **Thin mechanism, smart command.** OAT supplies no verdict schema and no context-passing plumbing. Pass/fail is the process exit code; the command carries its own intelligence and resolves its own context implicitly via OAT state and the skill it invokes.
2. **Skill-opts-in eligibility.** A skill advertises `oat_gateable: true` in its frontmatter and carries a standard "Gate Execution" final step. Config can only attach gates to skills that advertise the capability, so honoring the gate is part of the skill's own contract — satisfying "MUST run before done" — and a gate configured for a non-gate-aware skill is detectable, not a silent no-op.
3. **`onFailure` spans the enforcement spectrum.** `block` drives a bounded autonomous remediation loop (agent reads feedback, addresses it, re-runs, up to `maxAttempts`, then escalates); `prompt` surfaces the failure and asks; `warn` records it and continues. "Trigger" is just `onFailure: warn`.
4. **Runtime-agnostic cross-runtime execution.** OAT never learns a runtime's command syntax. An `execTargets` registry (with built-ins for codex/claude/cursor) describes how to run and detect each runtime; `cross-provider-exec` selects a non-current runtime by priority. **V1 scope is runtime-level only** (`avoid: same-runtime`). Same-_target_ execution (same runtime, different model/effort) and target-level detection are deferred to backlog **bl-e6fc**.

Configuration lives in `workflow.gates` (split into `execTargets` and `skills`) across all config layers, resolved most-specific-wins: local (`.oat/config.local.json`) > shared repo (`.oat/config.json`) > user config — with user config the expected primary home since runtime/CLI availability is user-specific. The v1 enforcement boundary is the agent-enforced skill step; deterministic CLI-boundary enforcement is deferred.

## Architecture

### System Context

This feature spans **two homes** in the OAT codebase:

- **CLI / TypeScript side** (`packages/cli`) — owns gate _config_ (schema, layered resolution, validation), the _read/write_ surfaces, and the `cross-provider-exec` _dispatcher_. The dispatcher is the one piece that actually runs a child process; it stays runtime-agnostic by driving the configured `execTargets`.
- **Skill-authoring side** (`.agents/skills`) — owns gate _execution orchestration_: the `oat_gateable` marker + a standard "Gate Execution" final step authored into each gateable skill. The agent running the skill executes the gate and drives the remediation loop.

The mechanism is deliberately thin: OAT resolves config and dispatches; the behavioral intelligence lives in skill prose + the user's command + the exec-target registry. No daemon, no provider-specific logic baked into OAT.

**Key Components:**

- **Gate config schema** (`config/oat-config.ts`) — `OatWorkflowConfig.gates = { execTargets?, skills? }`; `GateConfig`, `ExecTarget`, normalized in `normalizeWorkflowConfig`.
- **Gate resolver** (`config/resolve.ts`) — `resolveGate(skill)` (whole-object, per-skill-key, local>shared>user) and `resolveExecTargets()` (built-ins + layers, keyed partial merge, `null` disables).
- **`oat gate resolve <skill>`** — JSON lookup the skill's Gate Execution step calls.
- **`oat gate cross-provider-exec <prompt>`** — the runtime-agnostic dispatcher (select non-current runtime by priority → run → pass through exit code).
- **Write surfaces** — `oat gate set/unset <skill>` (skill gates) and `oat gate target set/unset <id>` (exec targets); needed because `oat config set` uses a closed `ConfigKey` union that can't express these structured objects.
- **Skill opt-in + Gate Execution step** — `oat_gateable: true` + a shared authored final step; `oat-project-implement` and `oat-project-plan` first.
- **Eligibility validation** (`validation/skills.ts` / `validateOatSkills`) — warns when a configured `gates.skills` key targets a skill lacking `oat_gateable`.

### Component Diagram

```
 Config layers (local > shared > user)        Skill execution (agent, current runtime = R)
 ┌─────────────────────┐                       ┌────────────────────────────────┐
 │ workflow.gates:     │                       │ gate-aware SKILL.md            │
 │   execTargets {…}   │   built-ins merged    │  (oat_gateable: true)          │
 │   skills {…}        │   under config         │  ...primary work...            │
 └─────────┬───────────┘                       │  ▼ Gate Execution step         │
           │                                    │   runs gate.command            │
   resolveGate(skill) / resolveExecTargets()    └──────────┬─────────────────────┘
           ▼                                               │ command = oat gate cross-provider-exec "<prompt>"
 ┌─────────────────────┐   oat gate resolve <skill>        ▼
 │   Gate resolver     │◄──────────────────────  ┌────────────────────────────┐
 │ (resolve.ts)        │                          │ cross-provider-exec        │
 └─────────────────────┘                          │  detect current runtime R  │
   ▲ write       ▲ validate (gateable?)           │  pick priority target ≠ R  │
 ┌──────────┐  ┌──────────────────────┐           │  run baseCommand+[prompt]  │
 │ oat gate │  │ validateOatSkills    │           │  exit with child status    │
 │ set/unset│  │ (validation/skills)  │           └────────────────────────────┘
 └──────────┘  └──────────────────────┘
```

### Data Flow

```
1. Gate-aware skill finishes primary work → Gate Execution step.
2. Step runs `oat gate resolve <skill>`. null → done.
3. Gate resolved → run gate.command (typically `oat gate cross-provider-exec "<prompt>"`),
   capturing stdout/stderr + exit code.
   cross-provider-exec internally:
     a. resolveExecTargets() → merged registry (built-ins + config).
     b. current runtime: OAT_CURRENT_RUNTIME → else hostDetectionCommand in priority
        order (short-circuit on first exit 0) → else unknown.
     c. avoid same-runtime: drop targets whose runtime == current.
     d. in priority order, availabilityCommand passes → first available wins.
     e. no eligible target → exit nonzero (independence unmet; no same-runtime fallback
        unless `--avoid none`).
     f. exec baseCommand + [prompt...]; pass through; exit with child status.
4. gate.command exit 0 → skill done.
5. nonzero → branch on onFailure:
     • block  → read feedback (stdout/artifact), remediate, re-run; ≤ maxAttempts then
                escalate with accumulated feedback (appended to implementation.md).
     • prompt → surface, ask human.
     • warn   → record, continue (done).
   NB: once a chosen target actually runs and exits nonzero, that IS the gate result —
   never fall back to another target (a real failed review must not be masked).
```

## Component Design

### Component 1 — Gate config schema (`config/oat-config.ts`)

**Interfaces:**

```typescript
export type GateOnFailure = 'block' | 'prompt' | 'warn';
export type GateAvoid = 'same-runtime' | 'none'; // V1; the value of cross-provider-exec's --avoid flag ('same-target' deferred → bl-e6fc)

export interface GateConfig {
  command: string; // required; the gate runner's command (often `oat gate cross-provider-exec --avoid same-runtime ...`)
  onFailure: GateOnFailure; // required
  description?: string; // for the orchestrating agent: why + next steps
  maxAttempts?: number; // block-only; default 2
}
// NB: avoidance policy is NOT a GateConfig field in V1. It lives on the command
// itself (`oat gate cross-provider-exec --avoid <same-runtime|none>`), where it
// is actually consumed. Config-driven per-skill `execPolicy` rejoins in V2 (bl-e6fc)
// with the richer same-target semantics.

export interface ExecTarget {
  runtime: string; // logical family used for same-runtime independence (codex|claude|cursor|custom)
  baseCommand: string[]; // argv; the prompt is appended (argv form avoids shell-quoting)
  hostDetectionCommand?: string[]; // exit 0 ⇒ current host IS this runtime
  availabilityCommand?: string[]; // exit 0 ⇒ runnable here; absent ⇒ assume available
  priority: number; // higher wins
}

// in OatWorkflowConfig:
//   gates?: {
//     execTargets?: Record<string, ExecTarget | null>; // null disables a built-in/lower-layer target
//     skills?: Record<string, GateConfig | null>;       // null disables a skill's gate
//   }
```

**Normalization rules (validate-or-drop, no throws — matches `normalizeWorkflowConfig`):**

- `GateConfig`: `command` non-empty string and `onFailure` in enum, else the gate entry is dropped; `maxAttempts` coerced to int ≥ 1 (default 2); `null` preserved as the disable signal. (No `execPolicy` in V1.)
- `ExecTarget`: `runtime` non-empty string, `baseCommand` non-empty `string[]`, `priority` a number (default e.g. 0); `hostDetectionCommand`/`availabilityCommand` validated as `string[]` when present; `null` preserved (disable).
- **Built-in exec targets** are provided by OAT and merged as the lowest layer (see Component 2); a user `null` disables one. Concretely:
  - `codex-default` — `runtime: codex`, `baseCommand: ["codex","exec"]`, `hostDetectionCommand: ["sh","-c","test -n \"$CODEX_SESSION_ID\""]`, `availabilityCommand: ["codex","--version"]`, `priority: 100`
  - `claude-default` — `runtime: claude`, `baseCommand: ["claude","-p"]`, `hostDetectionCommand: ["sh","-c","test -n \"$CLAUDECODE\""]`, `availabilityCommand: ["claude","--version"]`, `priority: 100`
  - `cursor-default` — `runtime: cursor`, `baseCommand: ["cursor-agent","-p","--force"]`, `hostDetectionCommand: ["sh","-c","test -n \"$CURSOR_AGENT\""]`, `availabilityCommand: ["cursor-agent","--version"]`, `priority: 70`
  - These detectors are **best-effort**; `OAT_CURRENT_RUNTIME` is the authoritative override (Component 4 / Component 6).

### Component 2 — Gate resolver (`config/resolve.ts`)

```typescript
export function resolveGate(
  effective: ResolvedConfig,
  skillName: string,
): GateConfig | null;
export function resolveExecTargets(
  effective: ResolvedConfig,
): Record<string, ExecTarget>;
```

- **`resolveGate`** — read the **raw** layer objects (`effective.local/.shared/.user .workflow?.gates?.skills`), NOT `effective.resolved` (whose `flattenConfig` would shred gate objects and merge fields across layers — forbidden). Most-specific layer that mentions the skill key wins **wholesale** (including a `null` disable); else `null`.
- **`resolveExecTargets`** — start from OAT **built-ins**, then apply layers user → shared → local as a **keyed partial merge per target id**: a partial object overrides individual fields of a lower target; `null` disables a target id; new ids add targets. (Deliberately _different_ from `skills`, which is whole-object — you tweak a target's priority, you replace a gate.)

### Component 3 — `oat gate resolve <skill>`

- Prints resolved `GateConfig` JSON (exit 0); no gate / disabled / unknown skill → `null` (exit 0, never errors). Eligibility is a validation concern, not a resolve-time error.

### Component 4 — `oat gate cross-provider-exec <prompt...>` (the dispatcher)

**Purpose:** Run a prompt on a **different runtime** than the current host, runtime-agnostically.

**Behavior:**

- **Signature:** `oat gate cross-provider-exec [--avoid <same-runtime|none>] [--current-runtime <r>] <prompt...>`. The prompt is the trailing args (joined with spaces) — reduces quote sensitivity; quoted strings also work. (`--prompt`/stdin can come later; no prompt-files for v1.)
- **`--avoid`** (default `same-runtime`) carries the avoidance policy — it lives on the command, not in config (V1). The skill's `command` string is where per-skill policy is expressed (`oat gate cross-provider-exec --avoid none "…"`).
- Resolves the merged `execTargets` registry (Component 2).
- **Current runtime:** `--current-runtime` flag → `OAT_CURRENT_RUNTIME` env → run each target's `hostDetectionCommand` in descending priority order, **short-circuit on first exit 0** → else `unknown`. (Declaration-first; detection is the fallback.)
- **`--avoid same-runtime`** (default): drop every target whose `runtime` equals the current runtime. `--avoid none`: keep all (no independence requirement).
- **Select:** in descending priority, run `availabilityCommand` (absent ⇒ available); first that passes wins.
- **Execute** `baseCommand + [prompt...]`; pass through stdout/stderr; **exit with the child's status**.
- **No eligible target** (all filtered or unavailable) → exit nonzero with an actionable message; do **not** silently fall back to the current runtime unless `--avoid none`. Independence is the point.
- **No fallback after dispatch:** once a target runs, its nonzero exit is the result.

### Component 5 — Write surfaces

- **`oat gate set <skill> --command <cmd> --on-failure <…> [--description] [--max-attempts N] [--layer local|shared|user]`** (default layer `user`), **`oat gate unset <skill>`**, **`oat gate set <skill> --disable`** (writes `null`). (No `--avoid` — avoidance is a `cross-provider-exec` flag inside the command, not a gate field, in V1.)
- **`oat gate target set <id> --runtime <r> --base-command-json '<json argv>' [--host-detection-json '<json argv>'] [--availability-json '<json argv>'] [--priority N] [--layer …]`**, **`oat gate target unset <id>`**, **`--disable`** (writes `null`). **argv inputs are JSON arrays**, not variadic options: the repo uses Commander, and a variadic `--base-command claude -p --model opus` would make Commander reject `-p`/`--model` as unknown OAT options. `--base-command-json '["claude","-p","--model","opus"]'` parses cleanly and round-trips through the `ExecTarget.baseCommand: string[]` shape.
- Both validate through Component 1 normalization before writing; both write **per-key** (one skill / one target id), leaving siblings intact. `--layer` is the three concrete write layers `shared|local|user` (a subset of `ConfigSurface` excluding `auto`): `shared` = `.oat/config.json` → `writeOatConfig`; `local` → `writeOatLocalConfig`; `user` → `writeUserConfig`. A dedicated command is required because `oat config set`'s closed `ConfigKey` union rejects `workflow.gates.*` and can't carry structured objects.

### Component 6 — Skill opt-in marker + Gate Execution step

- **Frontmatter:** `oat_gateable: true` on gateable skills (`oat-project-implement`, `oat-project-plan` first).
- **Authored "Gate Execution" step** (shared identical prose): run `oat gate resolve <this-skill>`; `null` → done; else run `command`, capture stdout/stderr + exit code; exit 0 → done; nonzero → branch on `onFailure` (block loop ≤ `maxAttempts` then escalate / prompt / warn), using `description` to orient next steps.
- **Current-runtime declaration:** the launcher that dispatches gated work (e.g. `oat-project-implement`, which already selects the tier) exports **`OAT_CURRENT_RUNTIME`** so `cross-provider-exec` knows the host without guessing; `hostDetectionCommand` built-ins are the fallback when it's absent (e.g. human-launched session).

### Component 7 — Eligibility validation (`validation/skills.ts` / `validateOatSkills`)

- Wire configured `gates.skills` keys in via the existing injection seam (`ValidateOatSkillsOptions` / `ValidateOatSkillsDependencies`), populated by the `validate-oat-skills` caller from resolved config (tests inject without disk). Validate the **union** of keys across layers.
- For each key, read `.agents/skills/<skill>/SKILL.md` frontmatter with the existing helpers (`getFrontmatterBlock` / `frontmatterHasKey`) — **not** `agents/canonical/parse.ts` (that models `.agents/agents/*.md`). Missing marker or unknown skill → non-blocking **warning**.

## Error Handling

- **No eligible alternate runtime.** `cross-provider-exec` exits nonzero with a clear "no non-current runtime available (checked: …)" message — the gate then follows `onFailure`. This is the independence guarantee, not a crash.
- **Command fails to launch vs nonzero exit.** A child that can't start (ENOENT / missing CLI on PATH / availability check failed) is distinguished from "ran and reported issues," and biases toward escalation rather than consuming remediation attempts.
- **No fallback after dispatch.** Pre-dispatch fallback (unavailable target) is fine; a dispatched target's nonzero exit is final.
- **`maxAttempts` exhausted (`block`).** Never silently passes; escalates with accumulated feedback; skill stays not-done.
- **Malformed gate / target config.** Dropped at normalization → resolves to absent/`null` → surfaces via validation/doctor tooling, not a runtime crash.
- **Resolve is read-only and total.** `oat gate resolve` never throws on no-gate/unknown skill.

## Testing Strategy

### Unit Tests

- **Schema normalization** (`oat-config.test.ts`): `GateConfig` (drop invalid command/onFailure, coerce maxAttempts, preserve `null`; no `execPolicy` field in V1); `ExecTarget` (require runtime + non-empty argv `baseCommand`, validate optional argv fields, preserve `null`); built-in exec targets present with the pinned detectors.
- **`resolveGate`** (`resolve.test.ts`): local>shared>user wholesale win; `null` disables/short-circuits; fall-through; **no within-gate merge** (raw layers, not flattened `resolved`).
- **`resolveExecTargets`** (`resolve.test.ts`): built-ins present by default; keyed **partial** merge (override one field); `null` disables a built-in; new id adds a target; layer precedence.
- **`cross-provider-exec` selection** (command test, child process mocked): current runtime via `--current-runtime` / `OAT_CURRENT_RUNTIME` / detection short-circuit; `--avoid same-runtime` exclusion; built-in detectors resolve the host (`$CLAUDECODE`/`$CODEX_SESSION_ID`/`$CURSOR_AGENT`); priority + availability ordering; no-eligible-target → nonzero; exit-code passthrough; `--avoid none` keeps same-runtime targets.
- **`oat gate resolve` / `set` / `unset` / `target set/unset`** round-trips, `--disable` → `null`, layer targeting, sibling isolation, invalid-input rejection.

### Integration Tests

- **Layered resolution end-to-end** across real config fixtures (gates.skills + execTargets).
- **Eligibility validation** (`validation/skills.test.ts`): gate → gateable skill (clean); → non-gateable skill (warning); → unknown skill (warning).

### Manual / Skill-Level Verification

The Gate Execution loop (`block`/`prompt`/`warn`, escalation) is **agent prose, not TypeScript** — verified by manual scenario walkthroughs + `pnpm oat:validate-skills` (no regression; version bumps detected), not unit tests. Manual cross-runtime scenario: from a Claude host, a gate whose command is `oat gate cross-provider-exec` selects the Codex target and runs the review (and vice versa).

## Open Questions

Resolved / dispositioned:

- **Same-target execution + target-level detection** — **deferred to backlog `bl-e6fc`** (the full settled design, incl. `execPolicy.avoid: same-target`, `onUnknownTarget`, and the best-effort Cursor `--list-models` probe, is captured there). V1 is runtime-level only.
- **Current-runtime detection** — declaration-first (`OAT_CURRENT_RUNTIME`, stamped by the launcher), with `hostDetectionCommand` built-ins as best-effort fallback; `unknown` host means `same-runtime` simply excludes nothing (all targets eligible).
- **Loop state / observability** — accumulated `block` feedback held in-conversation, appended to `implementation.md` on escalation. No new store.
- **CLI-boundary enforcement** — out of scope for v1; agent-enforced Gate Execution step is the enforcement boundary.

## References

- Discovery: `discovery.md` (quick mode — no `spec.md`)
- Follow-up: backlog `bl-e6fc` (Gates V2 — same-target execution + target-level detection)
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
