---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-23
oat_generated: false
oat_template: false
---

# Design: dispatch-ceiling

## Overview

This project replaces Codex "inherited effort" semantics with an explicit OAT dispatch ceiling. The key design shift is that OAT owns a provider-aware ceiling value selected by the user or configured in the repo, while Codex provider default effort is surfaced only as explanatory context for base/unpinned roles. OAT should not claim xhigh or any other effort was used unless it selected a pinned role or the provider explicitly reports that behavior.

The implementation spans config parsing, Codex generated role variants, lifecycle skill guidance, templates, docs, and validation. Runtime behavior remains orchestrated by the OAT skills, but the generated Codex role surface makes the normal path deterministic: implementer and reviewer dispatches select concrete low/medium/high/xhigh role variants capped by the resolved OAT ceiling.

The design is provider-aware. Codex ceilings use effort values; Claude ceilings use model-tier values and keep `effort_axis=not-applicable`. This avoids forcing Codex terminology into Claude while still giving both providers a common "dispatch ceiling" concept.

## Architecture

### System Context

OAT dispatch selection is currently split between markdown skills and provider sync code:

- `oat-project-plan` and quick planning guidance define when users can set project decisions before implementation.
- `oat-project-implement` owns phase/review dispatch policy and logs dispatch decisions.
- Codex sync exports canonical agents to `.codex/agents/*.toml` and registers managed roles in `.codex/config.toml`.
- CLI config parsing exposes workflow preferences through `.oat/config.json`, `.oat/config.local.json`, and user config.
- Docs explain the resulting workflow to users.

### Key Components

- **Dispatch ceiling config:** Adds provider-specific workflow config keys and validation.
- **Project ceiling metadata:** Uses project-state frontmatter to persist the planning/preflight answer.
- **Codex role variants:** Generates pinned implementer/reviewer variants for every selectable Codex effort.
- **Lifecycle skill guidance:** Updates planning and implementation prompts so prompting happens only at planning or implementation preflight, never mid-run.
- **Documentation and generated views:** Keeps docs, bundled assets, and `.codex` role/config outputs in sync.

### Data Flow

```text
repo config workflow.dispatchCeiling.<provider>
        |
        v
project state oat_dispatch_ceiling
        |
        v
planning prompt or implementation preflight prompt (interactive only)
        |
        v
resolved ceiling + source
        |
        v
preferred effort/model from phase/review needs
        |
        v
selected control = min(preferred, resolved ceiling)
        |
        v
pinned Codex role or Claude model dispatch + structured OAT Dispatch log
```

## Component Design

### Dispatch Ceiling Config

**Purpose:** Represent the repo/user/local workflow ceiling in a provider-aware way.

**Responsibilities:**

- Accept `workflow.dispatchCeiling.codex` values `low`, `medium`, `high`, and `xhigh`.
- Accept `workflow.dispatchCeiling.claude` values `haiku`, `sonnet`, and `opus`.
- Preserve existing workflow preference precedence (`local > shared > user`, with env where already supported).
- Expose keys through `oat config get/set/describe`.

**Interfaces:**

```typescript
type CodexDispatchCeiling = 'low' | 'medium' | 'high' | 'xhigh';
type ClaudeDispatchCeiling = 'haiku' | 'sonnet' | 'opus';

interface WorkflowDispatchCeiling {
  codex?: CodexDispatchCeiling;
  claude?: ClaudeDispatchCeiling;
}
```

### Project Ceiling Metadata

**Purpose:** Persist a project-local ceiling selected at planning or implementation preflight.

**Responsibilities:**

- Store provider, value, and source in project `state.md` frontmatter.
- Override unresolved repo config during implementation.
- Keep dry-run from mutating state.

**Storage:**

```yaml
oat_dispatch_ceiling:
  provider: codex
  value: high
  source: project-state
```

### Codex Role Variants

**Purpose:** Make Codex dispatch deterministic through configured role files instead of unreliable per-call `reasoning_effort` or base-role inheritance.

**Responsibilities:**

- Generate `oat-phase-implementer-low|medium|high|xhigh`.
- Generate `oat-reviewer-low|medium|high|xhigh`.
- Set `model_reasoning_effort` in each generated TOML role.
- Register all generated roles as managed to avoid stray detection.

**Design Decisions:**

- Base roles remain available but are documented as provider-default/unpinned behavior.
- Normal deterministic dispatch uses variants, including review dispatch.

### Lifecycle Skills

**Purpose:** Define the human-facing contract for when ceilings are selected and how dispatch logs must be written.

**Responsibilities:**

- Planning asks once at the end when the current provider ceiling is unresolved and the session is interactive.
- Implementation preflight resolves and prints ceiling, source, provider default, and deterministic dispatch note before phase work.
- Non-interactive unresolved implementation blocks before work starts.
- Dry-run reports unresolved ceiling/planned behavior without state mutation.
- Codex preferred effort is capped by the resolved ceiling; reviewer dispatch uses the resolved ceiling variant.
- Claude keeps model-axis semantics and `effort_axis=not-applicable`.

### Documentation

**Purpose:** Align user docs with the new authoritative-ceiling contract.

**Responsibilities:**

- Explain config keys and project-state override.
- Replace "Codex inherited xhigh" wording with provider-default/unpinned wording.
- Show structured dispatch log examples for implementation and review.
- Document non-interactive failure instructions.

## Data Models

### Workflow Dispatch Ceiling

**Purpose:** Provider-aware workflow preference.

**Schema:**

```typescript
interface OatWorkflowConfig {
  dispatchCeiling?: {
    codex?: 'low' | 'medium' | 'high' | 'xhigh';
    claude?: 'haiku' | 'sonnet' | 'opus';
  };
}
```

**Validation Rules:**

- Drop invalid provider values during config normalization.
- Config command rejects invalid values with a helpful enum list.
- Unknown providers are ignored by normalization in the first pass.

## API Design

### Config Keys

**Interface:** `oat config`

```bash
oat config get workflow.dispatchCeiling.codex
oat config set workflow.dispatchCeiling.codex high --shared
oat config get workflow.dispatchCeiling.claude
oat config set workflow.dispatchCeiling.claude sonnet --shared
```

The shared config example is:

```json
{
  "workflow": {
    "dispatchCeiling": {
      "codex": "high",
      "claude": "sonnet"
    }
  }
}
```

## Error Handling

- If implementation preflight cannot resolve a ceiling and the session is non-interactive, print a `BLOCKED` message before phase work and include exact config/project-state instructions.
- If Codex provider default effort cannot be resolved, display `unknown` rather than using it as a ceiling.
- If a base/unpinned Codex role is used, logs must say `Selected effort: provider-default` and include the provider default when known.
- If a selected effort is capped, logs must include preferred effort, ceiling, selected effort, source, dispatch target, and rationale.

## Testing Strategy

### Unit Tests

- Config normalization accepts valid `workflow.dispatchCeiling.codex` and `.claude` values and drops invalid values.
- Effective config resolves dispatch ceiling with local > shared > user precedence.
- `oat config` get/set/describe handles the new keys and rejects invalid enum values.
- Codex sync generates implementer xhigh and reviewer low/medium/high/xhigh variants, registers them as managed, and remains idempotent.
- Codex stray detection treats generated variants as managed.

### Integration / Generated Checks

- `pnpm run cli -- sync --scope project` regenerates `.codex/agents/*.toml` and `.codex/config.toml`.
- `pnpm run cli -- sync --scope project --dry-run` is clean after generated files are committed.
- Skill version bump validator passes against `origin/main`.

### Docs / Release Checks

- `pnpm check`
- Focused Vitest targets for config and Codex sync
- `pnpm test` if feasible
- `pnpm build:docs`
- `pnpm release:validate`
