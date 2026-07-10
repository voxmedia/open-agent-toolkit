---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
oat_template: false
---

# Design: gate-review-provenance-target-safety

## Overview

This project first repairs the managed-dispatch preflight required to execute its own subagent phases deterministically, then hardens `oat gate review` at the two identity boundaries that a workflow gate must know without inference: the review subject and the configured invocation that performed the review. Dispatch readiness is based on whether the active provider can compile concrete native controls, not merely whether an abstract policy label exists. Missing Codex model-plus-effort targets prompt or block, defaults can be adopted without erasing explicit provider choices, and a finite supported role catalogue is committed so reviewers and implementers exist before provider startup.

After that prerequisite, the CLI will preserve provider-neutral gate target selection, then construct a small immutable invocation record from the selected exec target. That record will be injected into the reviewer prompt, stamped into artifact frontmatter, parsed and corroborated after execution, and returned in the gate JSON envelope. Separately, an explicitly declared project will be carried with a resolution source and corroborated against the artifact's `oat_project` value before a gate can pass.

The implementation extends the existing gate path instead of replacing it. Current exact-scope producer resolution and final/range family-union avoidance stay in place; aggregation output gains an explicit aggregated-stamps source and focused range coverage. The exec-target extension is deliberately local and minimal, containing only invocation model and reasoning effort plus derived source semantics. The prerequisite repairs existing dispatch-policy behavior but does not introduce the broader dispatch-machine report schema, generalized renderer, or runtime-confirmation contract.

Only after these safety contracts are verified will shared planning guidance detect a deliberately configured review target and offer project-level phase-review enablement. The prompt writes the existing `oat_phase_review_gate` shape for all phases, selected phases, or disabled, while reusable lifecycle commands continue to declare `--project` and omit provider/model `--target` pins.

## Architecture

### System Context

`oat gate review` remains the orchestration boundary. It resolves the review subject, producer identity, and provider-neutral exec target before launching a reviewer. The hardened path adds explicit records at that boundary rather than asking the reviewer to infer either identity from ambient state.

**Key components:**

- **Exec-target configuration:** Stores minimal configured invocation metadata alongside the existing runtime and command definition.
- **Dispatch readiness and role catalogue:** Joins policy, provider target, native adapter compilation, the committed supported catalogue, and provenance-scoped custom-role materialization.
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

0. Before any managed workflow dispatch, resolve the active provider and selected work effort. A managed target is ready only when native dispatch args compile; otherwise prompt with fill-missing defaults or block. Prefer the pre-registered exact Codex role and use a fresh child pinned to the same model and effort when the current host cannot select it; do not depend on workflow-time materialization or provider restart.
1. Resolve the project as `{ path, source }`, distinguishing an explicit declaration from active-project or single-candidate ambient fallback.
2. Resolve producer identity from an explicit flag, an exact dispatch stamp, aggregated in-scope stamps, or unknown; retain the union of families to avoid.
3. Select an exec target without adding a provider/model pin to lifecycle commands, then derive one immutable configured invocation record containing run ID, target ID, runtime, model, reasoning effort, and source.
4. Inject the project record and configured invocation record into the review prompt with exact artifact keys and explicit unknown/provider-default values.
5. Execute the target, locate the resulting artifact using run correlation, and parse frontmatter through the existing YAML-aware review verdict path.
6. For a declared project, compare both the artifact's containing project and `oat_project` with the normalized declared path. Compare artifact invocation fields with the gate-owned configured record independently.
7. Return the same configured invocation, project-resolution, producer-diversity, and corroboration metadata in JSON. Any required-field or corroboration failure exits nonzero and cannot be reported as a passed review verdict.
8. After the safety work is available, planning workflows use a canonical read-only gate-target probe to decide whether to offer phase-review enablement; the user choice writes the already-consumed `oat_phase_review_gate` plan shape.

## Component Design

### Dispatch Readiness, Catalogue, and Scoped Materialization

**Purpose:** Prevent managed implementation from silently degrading to provider defaults when policy intent cannot produce concrete provider controls.

**Responsibilities:**

- Preserve valid built-in provider compilation, including Claude's canonical policy ladder.
- Treat a managed Codex selection without a complete same-harness model-plus-effort target as incomplete configuration during preflight.
- Resolve a lower preferred Codex effort against the corresponding configured matrix target after applying the policy cap.
- Treat Codex `max` as a first-class ordered effort and preserve the exact opaque Cursor model strings selected by the configured matrix.
- Offer versioned provider defaults and merge only missing provider/tier cells, preserving explicit user and project overrides.
- Generate a deterministic supported catalogue for both `oat-phase-implementer` and `oat-reviewer`: Luna and Terra at `low`, `medium`, `high`, and `xhigh`; Sol at those four efforts plus `max`.
- Commit the supported catalogue and its project `.codex/config.toml` registrations so it is available before discovery, planning, artifact review, or implementation begins.
- On `oat sync`, materialize additional configured targets according to configuration provenance: user config to `~/.codex`, project config to the project's `.codex` view. Project-scoped output is version controlled.
- Mark generated roles with their owner and allow each sync scope to delete only stale roles it owns, preserving supported catalogue entries, the other config scope, and unrelated provider entries.
- Prefer an exact registered role at dispatch. If the host cannot select that role in the current session, launch a fresh Codex child with explicit model, reasoning effort, and canonical role instructions; never silently substitute a managed base role.

**Boundary:**

This component reuses the existing resolver response, dispatch matrix, materialization codec, and sync surface. Static catalogue generation and scoped ownership markers are minimal local structures, not a generalized dispatch machine. It does not infer targets from gate exec commands or require a provider hot-reload contract.

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

### Supported Codex Role Catalogue

The immutable supported target set is independent from the mutable recommended dispatch matrix:

```typescript
const SUPPORTED_CODEX_ROLE_TARGETS = [
  // Luna and Terra: low, medium, high, xhigh
  // Sol: low, medium, high, xhigh, max
] as const;
```

The materializer expands each of the 13 targets for both `oat-phase-implementer` and `oat-reviewer`, producing exactly 26 pinned variants. Project sync writes them in stable order, registers them in `.codex/config.toml`, and regenerates the same bytes idempotently. These product-owned provider assets are committed.

### Scoped Custom Role Ownership

Configured targets outside the supported catalogue use the same deterministic codec but retain source ownership:

```typescript
type CodexRoleOwner = 'supported-catalogue' | 'user-config' | 'project-config';
```

- `user-config` roles and registrations are written under `~/.codex`.
- `project-config` roles and registrations are written under the project `.codex` view and are expected to be version controlled.
- `oat sync --scope user`, `--scope project`, and `--scope all` reconcile only the corresponding owners; cleanup never crosses ownership markers.
- A project setting is treated as team-visible configuration even when one user introduced it. OAT does not attempt to keep project-generated roles uncommitted.

### Dispatch Recommendation

Recommended Codex cells use complete same-harness targets rather than legacy effort-only strings:

```json
{
  "harness": "codex",
  "model": "gpt-5.6-sol",
  "effort": "max"
}
```

The versioned default ladder uses complete targets: Codex `economy -> gpt-5.6-luna/high`, `balanced -> gpt-5.6-terra/xhigh`, `high -> gpt-5.6-sol/high`, and `frontier -> gpt-5.6-sol/max`; Claude retains its native values including `frontier -> fable`; Cursor values remain opaque configured model strings. Adoption fills missing cells recursively and never replaces an explicit existing provider/tier value unless a separate explicit replacement operation is requested.

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

### Dispatch Preflight

The existing resolver command remains the source of truth:

```bash
oat project dispatch-ceiling resolve --provider <provider> --preflight --json
```

- A managed result is runnable only when the active provider has concrete native dispatch arguments or an explicit cross-harness target.
- Interactive incomplete configuration returns a promptable unresolved result with recommended remediation.
- `--non-interactive` exits nonzero before work starts.
- Inherit/default behavior and managed uncapped reviewer fallback remain explicit exceptions; they are not inferred from a missing managed target.
- When the current host can select a registered Codex role, dispatch uses the exact resolver variant. Otherwise a fresh child receives explicit model and effort controls plus canonical role instructions. A managed target never degrades to the base role.

### Codex Provider Sync

`oat sync` is the earliest best-effort materialization boundary:

- Project sync always regenerates the complete supported catalogue and reconciles project-config custom targets into `.codex`.
- User sync reconciles user-config custom targets into `~/.codex`.
- All-scope sync performs both operations without allowing either cleanup pass to remove roles owned by the other.
- Config mutation may invoke the same scoped reconciler best-effort, but workflow correctness relies on exact dispatch/fresh-child fallback rather than hot reload.

### Exec-Target Mutation

Extend the existing command without changing current flags:

```bash
oat gate target set <id> \
  --runtime <runtime> \
  --base-command-json '<json-array>' \
  --invocation-model <model|provider-default> \
  --invocation-reasoning-effort <effort|provider-default> \
  --layer <user|shared|local>
```

- Both invocation flags are optional.
- Omitted flags preserve existing partial-update semantics at the selected layer.
- JSON config remains the full-fidelity path for explicitly clearing nested fields if the existing mutation command cannot distinguish omitted from clear without a breaking flag change.

### Exec-Target Inspection

Add a read-only inspection surface:

```bash
oat gate target list --json
```

Each entry reports:

```typescript
interface GateTargetListEntry {
  id: string;
  runtime: string;
  enabled: boolean;
  origin: 'builtin' | 'user' | 'shared' | 'local';
  explicitlyConfigured: boolean;
  available: boolean;
  invocation: {
    model: string | 'provider-default' | 'unknown';
    reasoningEffort: string | 'provider-default' | 'unknown';
    source: 'exec-target-config' | 'unknown';
  };
}
```

The command is informational and does not select or execute a reviewer. Planning workflows consume its JSON result and prompt only when an entry is explicitly configured, enabled, and available.

### Gate Review

The command surface stays compatible:

```bash
oat gate review --project <path-or-name> --review-type <type> --review-scope <scope> <prompt...>
```

- `--project` declares the review subject.
- `--target` remains available for manual/debug routing but is omitted by reusable lifecycle commands.
- Existing stdout and JSON compatibility fields remain; structured identity and corroboration fields are additive.
- Project declarations and configured invocation records are injected after target selection, not accepted from free-form prompt text.

### Planning Workflow Integration

The shared plan-writing procedure runs after a plan has stable phase IDs and before final artifact review:

1. Preserve an existing explicit `oat_phase_review_gate` value.
2. Run `oat gate target list --json`.
3. If no qualifying target exists, leave phase review disabled without prompting.
4. Otherwise offer all phases, selected phases, or disabled and write the canonical frontmatter.

This procedure is called by spec-driven planning, quick-start planning, and imported-plan normalization. Provider-native plan mode reaches the same path through import-plan.

## Error Handling

### Configuration Errors

- Treat a managed active-provider selection that cannot compile native controls as incomplete dispatch configuration, even when the abstract policy label resolved.
- Preserve valid built-in provider mappings; an absent explicit Claude column is not an error when the canonical policy compiles a native model argument.
- Default adoption fills missing cells and preserves explicit provider/tier values.
- Scoped sync treats project-config output as version-controlled project state and user-config output as user state; it never guesses that a project target is personal.
- Ownership markers constrain stale cleanup to the invoking scope and preserve the supported catalogue plus unrelated custom registrations.
- Reject malformed invocation objects and invalid empty values through the existing config normalization/mutation error path.
- Treat the reserved `provider-default` sentinel as valid and omission as `unknown`.
- A missing or unavailable qualifying target causes the phase-review planning prompt to be skipped; it does not block ordinary plan generation.
- If the read-only target probe itself fails, warn, leave phase review unchanged/disabled, and continue planning rather than guessing that a target is usable.

### Provider Execution Errors

- Preserve existing provider nonzero exit and timeout behavior.
- Include project resolution and configured invocation metadata in the diagnostic JSON whenever selection completed.
- Do not claim artifact corroboration when no run-correlated artifact exists.

### Target and Run Corroboration Errors

- A missing/mismatched run ID, an artifact written under a different project, or `oat_project` that differs from an explicitly declared project produces a dedicated fail-closed targeting/correlation outcome.
- This outcome exits nonzero regardless of finding counts, is escalation-biased, and does not consume a review-fix remediation attempt.
- Preserve the discovered artifact path and expected/actual values for diagnosis, but mark the artifact ineligible for automatic review-receive bookkeeping.
- When `--project` was omitted, retain ambient compatibility and report the ambient resolution source instead of pretending the project was declared.

### Invocation Metadata Errors

- Missing or mismatched configured invocation fields produce artifact-validation failure and cannot pass the gate.
- These failures may use the existing bounded artifact-remediation/retry path because a reviewer can correct exact field stamping without changing review scope.
- A model self-report that differs from configured invocation metadata is diagnostic only: preserve it separately when available, never overwrite configured fields, and do not treat it as proof of the provider's actual runtime model.

### Review Verdict and Handoff

- Only after identity corroboration succeeds does the existing severity threshold determine pass/block status.
- Valid gate artifacts are handed to `oat-project-review-receive` whether findings are blocking or sub-threshold, preserving the current durable-disposition contract.
- Invalid or uncorrelated artifacts are reported for diagnosis but are not automatically received into lifecycle state.

### Planning Errors

- Validate selected phase IDs against the finished plan before writing frontmatter.
- Invalid user-selected IDs are corrected during the planning interaction rather than persisted.
- Existing malformed `oat_phase_review_gate` frontmatter remains a blocking implementation-preflight error; planning must not silently disable it.
- Imported or resumed explicit settings remain authoritative unless the user chooses to change them.

## Testing Strategy

### Unit Tests

- **Dispatch readiness:** Missing Codex target, complete Codex target, valid built-in Claude target, explicit cross-harness route, inherit/default, and non-interactive blocking.
- **Selected-target resolution:** Preferred below/equal/above cap, reviewer cap, and managed uncapped paths retain the correct model-plus-effort target and compiled role.
- **Cursor opacity:** The four configured Cursor strings (`gpt-5.6-luna-high`, `gpt-5.6-terra-xhigh`, `gpt-5.6-sol-high`, and `gpt-5.6-sol-max`) survive selection and compile as exact model arguments without Codex-style parsing.
- **Default adoption:** Complete Codex targets validate and existing Cursor/Claude/custom cells survive fill-missing adoption.
- **Supported catalogue:** Exactly 26 deterministic variants are generated, Sol includes `max`, Luna/Terra omit catalogue `max`, registrations are stable, and a second sync is byte-identical.
- **Scoped custom materialization:** User targets write only to user scope, project targets write only to project scope, all-scope sync reconciles both, and cleanup preserves other owners and unrelated roles.
- **Dispatch execution:** Exact registered variants are selected when available; managed dispatch uses a pinned fresh child when agent-type selection is unavailable and never falls back to an unpinned base role.
- **Config model and normalization:** Explicit model/effort, `provider-default`, omitted/unknown values, malformed values, target tombstones, and partial layered invocation overrides.
- **Target selection and cloning:** Invocation metadata survives built-in/config resolution, candidate expansion, selection, and both clone paths without changing provider-neutral selection.
- **Project resolution:** Declared path/name, active-project fallback, single-candidate fallback, normalization, and source reporting.
- **Artifact parsing:** Existing manual/auto artifacts remain compatible; gate artifacts parse run, project, target, runtime, model, effort, and source fields.
- **Corroboration:** Matching records, missing fields, wrong run ID, wrong containing project, wrong `oat_project`, and wrong configured invocation values.
- **Producer aggregation:** Exact phase behavior unchanged; final and contiguous ranges aggregate only in-scope implementer/fix stamps, deduplicate family unions, and report contributing scopes/count.
- **Phase selection:** All, selected, disabled, invalid phase IDs, preserved resumed/imported values, and stable plan-order serialization.

### CLI Integration Tests

- `oat gate target set` persists explicit invocation metadata at each supported layer and preserves unrelated target fields.
- `oat sync --scope user|project|all` writes custom Codex roles to the configuration-owning scope and project sync maintains the complete committed catalogue.
- `oat gate target list --json` distinguishes built-in-only targets from explicitly configured targets and reports enabled, available, origin, and normalized invocation values.
- Gate prompt assembly stamps exact configured values for explicit Codex model/effort, explicit Claude model with provider-default effort, and unknown/default Cursor-style targets.
- Gate JSON carries the same identity record on success, provider failure, artifact-validation failure, and target-corroboration failure.
- A run-correlated artifact in the declared project passes corroboration before severity evaluation.
- An artifact written into a sibling project, a mismatched `oat_project`, or a missing/mismatched run ID fails closed with expected/actual diagnostics and no receive-eligible handoff.
- Ambient legacy invocation remains supported and reports its resolution source.
- Invocation-field mismatch blocks as artifact validation; optional self-report disagreement remains separate.

### Workflow Contract Tests

- Implementation preflight may use a base Codex role only for explicit inherit/default or documented uncapped-reviewer behavior, never because a managed target is missing.
- Plan-producing workflows flag an incomplete active-provider matrix and offer valid defaults before implementation readiness.
- Spec-driven, quick-start, import-plan, and provider-plan import artifact reviews resolve the configured reviewer before review; managed Codex review uses the exact registered role or pinned fresh-child fallback.
- Spec-driven plan, quick-start, and import-plan skill text all invoke the shared phase-review setup after stable phase IDs and before plan artifact review.
- Provider-plan import inherits the import-plan behavior.
- Built-in-only, unavailable, or failed target probes do not prompt or enable the phase gate.
- Qualifying configuration offers all, selected, and disabled choices and writes the existing frontmatter shape.
- Explicit resumed/imported settings are preserved without re-prompting.
- Lifecycle gate guidance includes `--project` substitution while continuing to prohibit reusable `--target` pins.
- Every changed canonical skill has one PR-scoped frontmatter version bump, and provider sync/skill validation detects drift.

### Regression and Release Validation

- Run the exact gate/config/plan test files while iterating, followed by package-level CLI tests.
- Run `pnpm lint`, `pnpm format`, `pnpm type-check`, `pnpm test`, and `pnpm build` after implementation integration.
- Build the docs surface after workflow-gate, review-artifact, planning, and artifact-contract documentation updates.
- Bump the lockstep public package set because CLI and bundled skill/docs behavior ships through published packages.
- Run `pnpm release:validate` as the final publishable-package guardrail.
