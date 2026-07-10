---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
oat_template: false
---

# Design: gate-review-provenance-target-safety

## Overview

This project hardens `oat gate review` at the two identity boundaries that a workflow gate must know without inference: the review subject and the configured invocation that performed the review. The CLI will preserve provider-neutral target selection, then construct a small immutable invocation record from the selected exec target. That record will be injected into the reviewer prompt, stamped into artifact frontmatter, parsed and corroborated after execution, and returned in the gate JSON envelope. Separately, an explicitly declared project will be carried with a resolution source and corroborated against the artifact's `oat_project` value before a gate can pass.

The implementation extends the existing gate path instead of replacing it. Current exact-scope producer resolution and final/range family-union avoidance stay in place; aggregation output gains an explicit aggregated-stamps source and focused range coverage. The exec-target extension is deliberately local and minimal, containing only invocation model and reasoning effort plus derived source semantics. It does not introduce the broader dispatch-machine route, policy, defaults, or runtime-confirmation schema.

Only after these safety contracts are verified will shared planning guidance detect a deliberately configured review target and offer project-level phase-review enablement. The prompt writes the existing `oat_phase_review_gate` shape for all phases, selected phases, or disabled, while reusable lifecycle commands continue to declare `--project` and omit provider/model `--target` pins.

## Architecture

### System Context

`oat gate review` remains the orchestration boundary. It resolves the review subject, producer identity, and provider-neutral exec target before launching a reviewer. The hardened path adds explicit records at that boundary rather than asking the reviewer to infer either identity from ambient state.

**Key components:**

- **Exec-target configuration:** Stores minimal configured invocation metadata alongside the existing runtime and command definition.
- **Gate invocation assembler:** Resolves project source and selected target, creates a unique run correlation ID, and assembles exact prompt metadata.
- **Review artifact parser and corroborator:** Parses typed frontmatter, correlates the artifact to the run, and compares project and invocation fields with the gate-owned records.
- **Producer identity resolver:** Preserves exact-scope resolution and represents final/range aggregation explicitly.
- **Planning integration:** Detects a deliberately configured review target and writes the existing phase-review gate frontmatter after user choice.

### Component Diagram

```text
layered gate config ----> exec-target resolver ----> configured invocation record
                                  |                              |
project argument/config --> project resolver                     |
           |                      |                              |
producer dispatch stamps --> producer resolver                   |
           |                      |                              |
           +----------------------+------------------------------+
                                  v
                       gate prompt + unique run ID
                                  |
                         target-neutral dispatch
                                  |
                                  v
                         produced review artifact
                                  |
                                  v
                 typed parse + run/project/invocation checks
                                  |
                    +-------------+-------------+
                    |                           |
             valid verdict + JSON      fail-closed diagnostic JSON
```

### Data Flow

1. Resolve the project as `{ path, source }`, distinguishing an explicit declaration from active-project or single-candidate ambient fallback.
2. Resolve producer identity from an explicit flag, an exact dispatch stamp, aggregated in-scope stamps, or unknown; retain the union of families to avoid.
3. Select an exec target without adding a provider/model pin to lifecycle commands, then derive one immutable configured invocation record containing run ID, target ID, runtime, model, reasoning effort, and source.
4. Inject the project record and configured invocation record into the review prompt with exact artifact keys and explicit unknown/provider-default values.
5. Execute the target, locate the resulting artifact using run correlation, and parse frontmatter through the existing YAML-aware review verdict path.
6. For a declared project, compare both the artifact's containing project and `oat_project` with the normalized declared path. Compare artifact invocation fields with the gate-owned configured record independently.
7. Return the same configured invocation, project-resolution, producer-diversity, and corroboration metadata in JSON. Any required-field or corroboration failure exits nonzero and cannot be reported as a passed review verdict.
8. After the safety work is available, planning workflows use a canonical read-only gate-target probe to decide whether to offer phase-review enablement; the user choice writes the already-consumed `oat_phase_review_gate` plan shape.

## Component Design

### Exec-Target Invocation Metadata

**Purpose:** Extend existing gate target configuration with only the configured invocation controls needed for review provenance.

**Responsibilities:**

- Normalize and merge optional nested invocation metadata through user, shared, and local config layers.
- Preserve metadata through target cloning, selection, CLI mutation, and JSON inspection.
- Reserve explicit `provider-default` as a configured sentinel; an omitted field is `unknown` and is never inferred from an opaque command.

**Interface:**

```typescript
interface ExecTargetInvocation {
  model?: string | 'provider-default';
  reasoningEffort?: string | 'provider-default';
}

interface ExecTarget {
  // Existing runtime, baseCommand, detection, model-list, and priority fields.
  invocation?: ExecTargetInvocation;
}
```

### Gate Invocation and Project Resolution

**Purpose:** Convert resolved pre-dispatch state into immutable records owned by OAT rather than the reviewer.

**Responsibilities:**

- Return project path plus `declared`, `active-project`, or `single-candidate` source.
- Generate the run ID before prompt assembly.
- Derive explicit configured invocation values and source after exec-target selection.
- Reuse the same records in prompts and every JSON outcome.

**Interfaces:**

```typescript
interface ResolvedReviewProject {
  path: string;
  source: 'declared' | 'active-project' | 'single-candidate';
}

interface GateInvocationMetadata {
  runId: string;
  targetId: string;
  runtime: string;
  model: string | 'provider-default' | 'unknown';
  reasoningEffort: string | 'provider-default' | 'unknown';
  source: 'exec-target-config' | 'unknown';
}
```

### Review Artifact Parser and Corroborator

**Purpose:** Prove that a produced artifact belongs to this gate run and faithfully carries gate-owned identity metadata.

**Responsibilities:**

- Extend the YAML-aware verdict parser with project, run, and invocation fields.
- Locate the produced artifact by run ID across active project review directories; retain before/after detection only as a compatibility diagnostic, not as identity proof.
- Compare containing project and artifact project with an explicitly declared target.
- Compare stamped configured invocation fields with the selected invocation record.
- Return structured expected/actual diagnostics without converting invalid artifacts into passed verdicts.

**Interface:**

```typescript
interface GateCorroboration {
  run: 'matched' | 'missing' | 'mismatched';
  project: 'matched' | 'ambient' | 'missing' | 'mismatched';
  invocation: 'matched' | 'missing' | 'mismatched';
  expected: { project: string; invocation: GateInvocationMetadata };
  actual: { containingProject?: string; artifactProject?: string };
}
```

### Producer Identity Resolver

**Purpose:** Select a diverse reviewer using producer records relevant to the requested review scope.

**Responsibilities:**

- Preserve explicit flag and exact-scope stamp precedence.
- Aggregate final and contiguous-range implementer/fix stamps.
- Keep `avoidFamilies` as the authoritative union; do not present the latest producer value as the aggregate.
- Report `aggregated-stamps` with contributing scopes/count in JSON while leaving exact phase behavior unchanged.

### Review-Target Capability Probe

**Purpose:** Give planning workflows one canonical way to decide whether phase-review enablement should be offered.

**Responsibilities:**

- Add a read-only `oat gate target list --json` surface over resolved target config.
- Report origin, enabled state, and availability separately so built-in definitions alone do not trigger the prompt.
- Treat at least one explicitly configured, enabled, available target as qualifying configuration.

### Shared Phase-Review Setup

**Purpose:** Keep plan, quick-start, and import workflows consistent when phase gates are available.

**Responsibilities:**

- Live in the shared plan-writing contract and be invoked by all plan producers after phase IDs are known.
- Offer all phases, selected phases, or disabled.
- Validate selected IDs against the generated plan and preserve explicit imported/resumed settings.
- Write the existing `oat_phase_review_gate` shape; do not add provider/model `--target` pins.

## Data Models

### Exec-Target Configuration

```typescript
interface ExecTargetInvocation {
  model?: string | 'provider-default';
  reasoningEffort?: string | 'provider-default';
}
```

Validation and merge rules:

- A non-empty string declares the configured value.
- `provider-default` explicitly declares that OAT did not request a concrete value.
- Omission resolves to `unknown`; it does not inherit a guess from `baseCommand` parsing.
- Layered partial overrides merge the two invocation fields consistently with other exec-target config. A target tombstone still removes the whole target.

### Gate Review Artifact Frontmatter

Gate-originated review artifacts add these required fields to the existing review template:

```yaml
oat_review_invocation: gate
oat_project: .oat/projects/shared/example
oat_gate_run_id: 00000000-0000-0000-0000-000000000000
oat_gate_target: codex-5.5-xhigh
oat_gate_runtime: codex
oat_invocation_model: gpt-5.5 # or provider-default | unknown
oat_invocation_reasoning_effort: xhigh # or provider-default | unknown
oat_invocation_source: exec-target-config # or unknown
```

Rules:

- These fields describe OAT's configured invocation, not model self-identification or runtime-confirmed execution.
- The reviewer copies exact prompt-provided values. It never replaces them with a self-report.
- Manual and auto review artifacts remain compatible; gate fields are required only when `oat_review_invocation: gate` and gate context supplied them.
- `oat_project` remains the canonical review subject. Project resolution source is gate-owned output metadata rather than a reviewer-authored claim.

### Gate JSON Envelope

Preserve existing top-level compatibility fields (`target`, string `project`, and `invocation` where the latter means the review invocation marker) and add unambiguous gate-owned structures:

```typescript
interface ReviewGateIdentityOutput {
  projectResolutionSource: 'declared' | 'active-project' | 'single-candidate';
  gateInvocation: GateInvocationMetadata;
  corroboration: GateCorroboration;
  diversity?: {
    producer: {
      source: 'flag' | 'stamp' | 'aggregated-stamps' | 'unknown';
      avoidFamilies: string[];
      contributingScopes?: string[];
      contributingStampCount?: number;
    };
  };
}
```

The same `gateInvocation` and project-resolution metadata appear in success, provider execution failure, missing/invalid artifact, and corroboration-failure outputs whenever target selection completed.

### Phase Review Plan Frontmatter

Reuse the existing implementation contract:

```yaml
oat_phase_review_gate:
  enabled: true
  phases: [] # empty = all implementation phases
  review_type: code
  exit_nonzero_on: important
```

- All phases writes `phases: []`.
- Selected phases writes validated `pNN` IDs in plan order.
- Disabled is represented by an absent setting or preserved explicit `enabled: false`; resumed/imported explicit settings are not overwritten.

## API Design

_Pending collaborative validation._

## Error Handling

_Pending collaborative validation._

## Testing Strategy

_Pending collaborative validation._
