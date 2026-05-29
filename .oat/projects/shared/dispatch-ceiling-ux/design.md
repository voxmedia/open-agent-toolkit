---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-28
oat_generated: false
oat_template: false
---

# Design: dispatch-ceiling-ux

## Overview

This project reshapes the dispatch-ceiling surface from a provider-prescriptive prompt
into a **provider-neutral ceiling intent** that compiles to concrete per-provider
values. The user-facing choice becomes a small set of presets (`balanced`, `maximum`,
`cost-conscious`) plus an advanced per-provider option and an explicit "no ceiling"
escape. A preset is pure convenience: it compiles **immediately, at write time** into
concrete per-provider values, and runtime dispatch reads **only** those concrete
values — never the label.

The architectural keystone is a **provider adapter registry**. Each adapter declares
whether its provider can enforce a ceiling, by what mechanism, and how to compile a
ceiling value into dispatch arguments. This is what makes the model genuinely
provider-neutral instead of "two providers with nicer copy": Codex and Claude register
real enforcement mechanisms, every other provider is advisory by default, and a future
Cursor adapter plugs in without schema changes. The resolver
(`oat project dispatch-ceiling resolve`) is the single compilation/join point — it
reads stored intent, joins it with adapter capability, and returns concrete dispatch
arguments plus an enforcement mode the skills render into logs.

Enforcement differs per provider but is verified, not assumed. Codex keeps its
sync-time pinned variant files (per-call effort is unreliable). Claude uses the per-call
Task `model` parameter, which empirical testing confirmed is bidirectional (downgrade,
lateral, and upgrade above the orchestrator) and overrides agent frontmatter — so Claude
needs **no** variant files. Because the agent registry does not hot-reload, no provider
may generate agent files at runtime. The one residual risk — a provider silently failing
to honor an above-orchestrator upgrade on a constrained plan — is handled by
**verify-on-upgrade**: the adapter confirms the actual dispatched model only on the
upgrade path and logs honestly when a request is not honored.

## Architecture

### System Context

The original dispatch-ceiling project established the surfaces this project modifies:
config parsing/normalization, project-state ceiling metadata, the compiled
`oat project dispatch-ceiling resolve` CLI surface, Codex sync (pinned role variants),
and the lifecycle skills (`oat-project-plan`/quick planning preflight and
`oat-project-implement` dispatch). This project changes the _shape_ of the ceiling data
and _inserts an adapter layer_ between the resolver and provider-specific dispatch,
while keeping the resolver as the single source of truth that skills call.

**Key Components:**

- **Ceiling schema (config + project state):** preset + concrete per-provider values;
  runtime reads concrete values only.
- **Preset compiler:** expands a preset into concrete per-provider values at write time.
- **Provider adapter registry:** declares per-provider capability, mechanism, value
  set, and `compileToDispatchArgs`.
- **Resolver (`dispatch-ceiling resolve`):** joins stored intent × adapter capability;
  returns concrete values, dispatch args, and enforcement mode.
- **Dispatch surfaces (implementer + reviewer in `oat-project-implement`):** call the
  resolver, pass through dispatch args, render the enforcement log line.
- **Prompt surfaces (planning preflight + implementation preflight):** provider-neutral
  preset prompt + honest enforcement copy.

### Component Diagram

```
                 write time                          dispatch time
  user choice ──▶ preset compiler ──▶ project state ──▶ resolver ──▶ adapter registry
   (preset /                          (concrete         │  (join)      │  capability +
    advanced /                         per-provider     │              │  compileToDispatchArgs
    no-ceiling)                        values + preset   ▼              ▼
                                       provenance)   concrete value + dispatch args + mode
                                                         │
                                          ┌──────────────┴──────────────┐
                                          ▼                             ▼
                                   Codex: pinned variant         Claude: Task model arg
                                   (sync-time files)             (per-call, no files)
                                          │                             │
                                          └────────▶ dispatch + log ◀────┘
                                            enforced / advisory / unsupported
                                            (verify-on-upgrade before "enforced")
```

### Data Flow

```
1. Planning/implementation preflight: if no ceiling resolves for the active provider
   and the session is interactive, prompt with the provider-neutral preset question.
2. The selected preset (or advanced values, or "no ceiling") is COMPILED at write time
   into concrete per-provider values and persisted to project state with preset
   provenance. The label is never read again.
3. At dispatch, the skill calls `oat project dispatch-ceiling resolve`.
4. The resolver reads concrete values, looks up the active provider's adapter, and
   returns: concrete value, enforcement mode, and compiled dispatch args.
5. Implementer dispatch uses min(preferred, ceiling); reviewer dispatch uses the ceiling
   as a target. The adapter turns that into a Codex variant name or a Claude model arg.
6. For an above-orchestrator (upgrade) request, the adapter verifies the actual model
   before logging "enforced"; a non-honored request logs "advisory (not honored)".
7. The dispatch log states value + provider + mode + mechanism.
```

## Component Design

### Ceiling Schema (config + project state)

**Purpose:** Represent ceiling intent provider-neutrally; store only what's stable.

**Responsibilities:**

- Accept a preset OR explicit per-provider values OR "no ceiling" in config.
- Persist compiled concrete per-provider values + preset provenance in project state.
- Never persist enforcement `mode` (capability is resolver/runtime-derived).

**Interfaces:** see Data Models.

**Design Decisions:**

- Config may carry `preset` (convenience) or `providers` (explicit; wins over preset).
- Project state is always normalized to the compiled shape (concrete `providers`).
- `preset` is persisted **only** when a preset was selected. Advanced/manual
  per-provider selection stores only `providers` + `source` (no `preset` key).
- Clean break: no legacy `{provider, value, source}` read path.

### Preset Compiler

**Purpose:** Turn a preset label into concrete per-provider values at write time.

**Responsibilities:**

- Apply the fixed mapping table (below) to produce `providers`.
- Record the preset as provenance only.
- Print the exact compiled result in the post-selection confirmation.

**Design Decisions:**

- Fixed table, not dynamic. `cost-conscious` holds Claude at `sonnet` (no Haiku
  reviewers by default).

| Preset                 | Codex  | Claude          |
| ---------------------- | ------ | --------------- |
| Balanced (recommended) | high   | sonnet          |
| Maximum                | xhigh  | opus            |
| Cost-conscious         | medium | sonnet          |
| No ceiling             | unset  | unset (inherit) |

### Provider Adapter Registry

**Purpose:** Single source of truth for _what each provider can do_ with a ceiling.

**Responsibilities:**

- Expose per provider: `supportsCeiling`, `validValues`, `mechanism`, and
  `compileToDispatchArgs(value)`.
- Let the resolver decide enforced/advisory/unsupported without provider-specific
  branching in skills.

**Interfaces:**

```typescript
type EnforcementMechanism = 'pinned-variant' | 'model-arg' | 'none';

interface ProviderCeilingAdapter {
  provider: string; // 'codex' | 'claude' | ...
  supportsCeiling: boolean;
  validValues: string[]; // codex: low|medium|high|xhigh; claude: haiku|sonnet|opus
  mechanism: EnforcementMechanism;
  // Returns dispatch args, or null when advisory/unsupported.
  compileToDispatchArgs(
    value: string,
    ctx: { orchestratorTier?: string },
  ):
    | { variant: string } // codex pinned-variant
    | { model: string } // claude model-arg
    | null;
}
```

**Design Decisions:**

- Codex adapter → `pinned-variant` (`oat-phase-implementer-<v>` / `oat-reviewer-<v>`),
  resolved from sync-time files.
- Claude adapter → `model-arg` (per-call Task `model`); no variant files.
- Unregistered/other providers → advisory (`mechanism: 'none'`, `compile → null`).
- Registry is internal (exactly codex + claude today) with a clean extension point;
  not a formal third-party-author contract this pass.

### Resolver (`oat project dispatch-ceiling resolve`)

**Purpose:** Compile + join; the only place preset→values and value→capability happen.

**Responsibilities:**

- Resolve concrete per-provider values (config precedence local > shared > user, then
  project state) — never read the preset label for dispatch.
- Join with the active provider's adapter to produce mode + dispatch args.
- Compute enforcement mode at call time (never from persisted state).
- Preserve the existing `--preflight` / `--json` / non-interactive blocking contract
  from the original project.

**Design Decisions:**

- `mode` is resolver output only: `enforced` | `advisory` | `unsupported`.
- **Verify-on-upgrade:** when requested tier > orchestrator tier, confirm the actual
  dispatched model before reporting `enforced`; otherwise report `advisory (not
honored)`. Cap-down / lateral needs no verification.

### Dispatch + Prompt Surfaces (lifecycle skills)

**Purpose:** Consume the resolver; never re-implement mapping or capability logic.

**Responsibilities:**

- Preflight prompt: provider-neutral preset question + honest enforcement copy.
- Implementer dispatch: `min(preferred, ceiling)`; reviewer dispatch: ceiling as target.
- Render the enforcement log line (value + provider + mode + mechanism).

**Design Decisions:**

- Skills call `dispatch-ceiling resolve` and pass through `dispatchArgs`; they hold no
  preset table and no per-provider capability branching.

## Data Models

### Config: `workflow.dispatchCeiling`

```typescript
interface WorkflowDispatchCeiling {
  preset?: 'balanced' | 'maximum' | 'cost-conscious'; // convenience; compiled at write
  providers?: {
    // explicit values win over preset; omitted provider = no ceiling for it
    codex?: 'low' | 'medium' | 'high' | 'xhigh';
    claude?: 'haiku' | 'sonnet' | 'opus';
  };
}
```

### Project state: `oat_dispatch_ceiling`

```yaml
oat_dispatch_ceiling:
  preset: balanced # provenance label ONLY — never read at dispatch
  providers:
    codex: high
    claude: sonnet
  source: project-state
```

**Validation Rules:**

- Drop invalid provider values during normalization; config command rejects invalid
  enum values with a helpful list.
- Compile preset → `providers` at write time; persist concrete values.
- Persist `preset` only when a preset was chosen; advanced/manual selection omits
  `preset` and stores `providers` + `source` only.
- No enforcement `mode` field persisted anywhere.

**Storage:** project `state.md` frontmatter; config under `.oat/config*.json` + user config.

## API Design

### `oat project dispatch-ceiling resolve`

**Interface:** CLI (extends the existing command; preserves `--preflight`, `--json`,
non-interactive blocking).

**Response (shape):**

```typescript
interface ResolveResult {
  preset: string | null;
  source:
    | 'config-local'
    | 'config-shared'
    | 'config-user'
    | 'project-state'
    | null;
  providers: Record<
    string,
    {
      value: string | null;
      mode: 'enforced' | 'advisory' | 'unsupported';
      mechanism: 'pinned-variant' | 'model-arg' | 'none';
      dispatchArgs: { variant: string } | { model: string } | null;
    }
  >;
  status?: 'resolved' | 'unresolved'; // preflight/non-interactive contract preserved
}
```

## Error Handling

- **Unresolved + non-interactive:** keep the original contract — `oat-project-implement`
  blocks before work starts when no ceiling resolves and `--non-interactive` /
  `OAT_NON_INTERACTIVE=1`. `--preflight --json` may return `status: "unresolved"` for an
  interactive-capable orchestrator.
- **Above-orchestrator upgrade not honored (entitlement):** do not log `enforced`; log
  `advisory (provider did not honor upgrade; ran <tier>)`.
- **Unsupported provider:** log `unsupported by provider <name> — informational`;
  dispatch follows provider defaults; never block on it.
- **Invalid preset/value:** reject at config-set / compile with the valid set.

## Testing Strategy

### Unit Tests

- **Scope:** preset compiler (each preset → exact concrete values; advanced overrides
  win; no-ceiling → unset); config normalization (valid accepted, invalid dropped,
  precedence local > shared > user); adapter registry (codex/claude capability +
  `compileToDispatchArgs`; unknown provider → advisory/null); resolver join (mode
  computed, never persisted; verify-on-upgrade only on upgrade path).
- **Key Test Cases:**
  - `balanced` compiles to `{codex: high, claude: sonnet}` and dispatch reads concrete
    values, not the label.
  - Claude cap-down (orchestrator Opus, ceiling sonnet) → `model-arg` enforced, no
    verification call; Claude above-orchestrator request → verify-on-upgrade path.
  - Codex sync still generates implementer/reviewer variants and treats them as managed.

### Integration / Generated Checks

- `pnpm run cli -- sync --scope project` regenerates `.codex/*`; `--dry-run` clean after
  commit.
- `oat project dispatch-ceiling resolve` JSON shape + non-interactive blocking contract.
- Skill-version-bump validator passes against `origin/main`.

### Manual / Verification

- Provider-neutral prompt copy reads correctly under Codex, Claude, and a non-adapter
  provider (no "Codex/Claude-only" implication; "no ceiling" first-class).
- Log lines show enforced / advisory / unsupported in the right cases.

## Open Questions

- **Plan entitlement (deferred, handled defensively):** whether a constrained plan
  errors vs silently downgrades on above-orchestrator requests. Verify-on-upgrade covers
  both without needing the answer.
- **Advanced mode shape (RESOLVED):** advanced/manual per-provider selection stores
  only `providers` + `source`; `preset` is persisted only when a preset was selected.

## References

- Discovery: `discovery.md`
- Prior project: `.oat/projects/archived/dispatch-ceiling/` (design.md, summary.md)
- Verified test matrix: see `discovery.md` → Verified Facts
