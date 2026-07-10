---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: dispatch-schema-matrix-infrastructure

## Overview

Extend the shipped candidate-ladder contract through two reusable cores. A
shared dispatch-matrix module will normalize legacy and modern raw shapes into
canonical candidate ladders, then walk them with structured tier, candidate,
fallback-route, path, and configuration-source provenance. Existing config,
project-state, adoption, doctor, and resolver adapters keep their command-level
warning and presentation behavior while consuming the common core.

A separate versioned dispatch-report module will adapt the resolver's existing
exact-selection result into deterministic JSON and human output. The report
keeps abstract policy, maximum ceiling, requested candidate, candidate tier,
exact selected target, requested controls, configured defaults, immutable gate
invocation metadata, and runtime-observed producer identity distinct. The
parseable `Dispatch:` line is derived from that report for compatibility; it
does not define or constrain the report schema.

Cursor validation will use an explicit pass context shared by config adoption
and doctor. It performs one Task/subagent probe per distinct opaque candidate,
resolves the broad catalog at most once (plus one fallback command), and never
uses catalog presence as eligibility proof. A reproducible evidence artifact
will probe the versioned recommendation's full GPT-5.6 Cursor ladder, call out
the four currently configured candidates separately, and update
recommendations/docs only from recorded results.

## Architecture

### System Context

The completed dependency project already owns policy compilation, candidate
ladder resolution, exact task dispatch, materialized Codex roles, and gate
artifact corroboration. This project sits below and above those behaviors:

- below selection, it centralizes matrix normalization/traversal and validation
  inputs;
- above selection, it turns existing resolver and gate provenance into one
  general report without changing their authority.

This branch is rebased onto merged PR #132 and contains the completed dependency
contract. No task in this project should backport or reimplement candidate
selection.

**Key Components:**

- **Dispatch matrix core:** Canonical raw-shape normalization, compatibility
  exports, and provenance-rich traversal.
- **Matrix adapters:** Layered config, sparse project state, recommendation
  adoption, doctor, and resolver integration.
- **Validation-pass coordinator:** Per-pass Cursor catalog memoization,
  distinct-candidate Task probing, and result fan-out to all source references.
- **Dispatch report core:** Versioned schema, resolver/gate/stamp adapters, human
  formatter, and deterministic JSON serializer.
- **Evidence recorder:** Sanitized live Cursor verification artifact derived
  from the current recommendation asset.

### Component Diagram

```text
raw local/repo/user config + sparse project state
                         |
                         v
               dispatch matrix core
          normalization | provenance-rich walk
                |                 |
                v                 v
     exact-selection resolver   adoption / doctor
                |                 |
                |        validation-pass coordinator
                |          | one Task probe / candidate
                |          | one broad catalog resolution
                v                 v
       dispatch report adapter   explicit outcomes
          | resolver selection          |
          | configured gate invocation  +--> live evidence artifact
          | runtime producer identity
          v
 deterministic JSON + human block + derived Dispatch: stamp
```

### Data Flow

1. Read a matrix layer and normalize legacy provider scalars, direct targets,
   legacy arrays, explicit `{ route: [...] }` fallbacks, and
   `{ candidates: [...] }` ladders into the canonical ladder algebra.
2. Walk the canonical matrix once per layer. Each reference retains provider,
   tier, candidate index, optional fallback-route index, exact source path,
   source layer, opaque value, and structured target when present.
   Repository-owned shared config uses `repo-config` as its structured
   provenance value.
3. Resolver consumers continue existing named-ceiling and exact-candidate
   selection. Named tiers bound the candidate search; they are not exact model
   preferences. Codex model/effort pairs stay atomic and Cursor values stay
   byte-for-byte opaque.
4. Adoption and doctor group Cursor references by exact candidate. Each unique
   string receives one real Task probe for the pass; duplicate locations reuse
   the pass result. If the probe is not decisive, one memoized broad catalog
   resolution provides diagnostic context for all candidates.
5. After selection, build a report from resolver selection, requested controls,
   defaults, optional immutable gate invocation, and optional observed runtime
   identity. Runtime/self-report fields cannot replace configured invocation.
6. Serialize the same report to stable JSON and human output, then derive the
   legacy `Dispatch:` record through an adapter.
7. At implementation time, re-read the versioned recommendation asset and probe
   every distinct GPT-5.6 Cursor candidate. Record results before changing the
   recommendation or docs.

## Component Design

### Shared Dispatch Matrix Core

**Purpose:** Own the complete matrix input algebra and traversal contract.

**Responsibilities:**

- Move matrix types/guards/normalizers into a reusable module and re-export
  existing public types where needed for compatibility.
- Canonicalize supported legacy inputs to `WorkflowDispatchCandidateLadder`.
- Preserve candidate-ladder objects as atomic values during config flattening
  and layer resolution.
- Return structured normalization issues so callers can preserve their current
  silent-drop, warning, or fail-closed behavior.
- Walk canonical ladders without embedding config-adopt or doctor output policy.

**Interfaces:**

```typescript
interface DispatchMatrixNormalizationIssue {
  path: string;
  kind: 'malformed-provider' | 'malformed-tier' | 'malformed-candidate';
  value: unknown;
}

interface NormalizedDispatchMatrix {
  providers: Record<string, WorkflowDispatchProviderValue>;
  issues: DispatchMatrixNormalizationIssue[];
}

interface DispatchMatrixWalkContext {
  source: 'local-config' | 'repo-config' | 'user-config' | 'project-state';
  pathPrefix: string;
}

interface DispatchMatrixCellRef {
  provider: string;
  tier: WorkflowDispatchMatrixTier | null;
  candidateIndex: number | null;
  fallbackRouteIndex: number | null;
  value: string | null;
  target: WorkflowDispatchRouteTarget | null;
  path: string;
  source: DispatchMatrixWalkContext['source'];
}

function normalizeDispatchMatrix(
  value: unknown,
  options: {
    pathPrefix: string;
    compatibilityMode: 'layered-config' | 'project-state';
  },
): NormalizedDispatchMatrix;

function walkDispatchMatrix(
  providers: Record<string, WorkflowDispatchProviderValue>,
  context: DispatchMatrixWalkContext,
): DispatchMatrixCellRef[];
```

**Design Decisions:**

- Canonical output uses candidate ladders even when input used a legacy scalar
  or route.
- Adapters preserve current externally visible config/project-state behavior;
  the shared core must not assume their existing normalizers are literally
  equivalent.
- A legacy ordered array becomes one fallback-route candidate, not multiple
  ranked candidates.
- Exactly one of `value` and `target` is non-null. Opaque scalar candidates are
  preserved byte-for-byte in `value`; structured route-target consumers use
  `target` as the authoritative representation and do not synthesize a display
  or deduplication string.
- Provider-specific validation remains explicit: Codex materialized targets
  require model plus effort; Cursor strings remain opaque.

### Matrix Consumer Adapters

**Purpose:** Replace duplication without homogenizing command behavior.

**Responsibilities:**

- Layered config and project-state parsing share normalization.
- Config adoption and doctor share traversal and validation orchestration.
- Config target-shape validation consumes the shared walk instead of retaining
  a second parallel ladder traversal.
- Resolver selection consumes the canonical matrix but remains the sole owner
  of ceiling/exact-candidate behavior.
- Caller adapters translate normalization issues into existing warnings/errors.

**Design Decisions:**

- Do not add a third walker for reporting.
- Preserve config-source provenance as structured data rather than reconstructing
  it from formatted paths.

### Validation-Pass Coordinator

**Purpose:** Make multi-cell Cursor validation efficient and semantically
explicit.

**Responsibilities:**

- Group duplicate Cursor references by exact opaque candidate.
- Run one Task/subagent probe per distinct candidate per pass.
- Lazily memoize a single logical broad catalog resolution:
  `cursor-agent models`, then `cursor-agent --list-models` once if needed.
- Fan the normalized result back to every source reference.

**Interfaces:**

```typescript
interface CursorCatalogResult {
  status: 'resolved' | 'unavailable' | 'failed';
  candidates: string[];
  sourceCommand: 'models' | 'list-models' | null;
  diagnostic: string | null;
}

interface DispatchMatrixValidationResult {
  ref: DispatchMatrixCellRef;
  status: 'valid' | 'unknown-value' | 'unvalidated';
  evidence: 'task-probe' | 'subagent-allow-list' | 'catalog-only' | 'none';
  catalogPresence: boolean | null;
  diagnostic: string;
}

interface DispatchValidationPassContext {
  cursorCatalog: Promise<CursorCatalogResult> | null;
}

function createDispatchValidationPassContext(): DispatchValidationPassContext;

async function validateDispatchMatrixRefs(
  refs: DispatchMatrixCellRef[],
  context: DispatchValidationPassContext,
): Promise<DispatchMatrixValidationResult[]>;
```

**Design Decisions:**

- The context is command/pass scoped; no module-global cache or TTL.
- A sentinel-confirmed Task launch is definitive. An explicit Cursor
  subagent-allow-list response retains the existing availability semantics.
  Broad catalog presence alone returns `unvalidated`, never `valid`.

### Dispatch Report Core

**Purpose:** Provide one machine contract and renderer for dispatch decisions.

**Responsibilities:**

- Adapt resolver, gate invocation, configured defaults, and runtime identity
  into distinct typed sections.
- Produce deterministic JSON and human-readable output.
- Adapt the report back to `DispatchStampRecord` for compatibility.
- Preserve meaningful `provider-default`, `unknown`, and `not-reported`
  states rather than collapsing them.

**Interfaces:**

```typescript
function buildDispatchReport(input: DispatchReportInput): DispatchReportV1;
function serializeDispatchReport(report: DispatchReportV1): string;
function formatDispatchReport(report: DispatchReportV1): string;
function toDispatchStampRecord(report: DispatchReportV1): DispatchStampRecord;
```

**Design Decisions:**

- Report building is pure and does not select a candidate.
- Gate invocation fields are readonly inputs copied from configured
  `workflow.gates.execTargets`; runtime identity is a separate section.
- Existing stamp parsing and field order remain compatible.

### Cursor Verification Evidence

**Purpose:** Close the slug-verification backlog with auditable live proof.

**Responsibilities:**

- Derive candidates from the recommendation asset version used by the
  implementation, not from family-name guesses.
- Record exact command/prompt, candidate, sanitized environment/client context,
  stdout, stderr, exit status, availability basis, date, and recheck date.
- Call out configured candidates that lack live evidence.
- Update recommendation/docs only after evidence exists.

**Current evidence gap:**

- Recommendation `2026-07-10.2` contains 13 candidates:
  - Economy: `gpt-5.6-luna-low`, `gpt-5.6-luna-medium`,
    `gpt-5.6-luna-high`
  - Balanced: `gpt-5.6-luna-xhigh`, `gpt-5.6-terra-low`,
    `gpt-5.6-terra-medium`, `gpt-5.6-terra-high`,
    `gpt-5.6-terra-xhigh`
  - High: `gpt-5.6-sol-low`, `gpt-5.6-sol-medium`,
    `gpt-5.6-sol-high`
  - Frontier: `gpt-5.6-sol-xhigh`, `gpt-5.6-sol-max`
- No persisted live Task-success artifact currently verifies those candidates.
- The current user configuration selects the subset
  `gpt-5.6-luna-high`, `gpt-5.6-terra-xhigh`,
  `gpt-5.6-sol-high`, and `gpt-5.6-sol-max`; all four must be explicitly
  called out until live evidence resolves them.

## Data Models

### Dispatch Report V1

**Purpose:** Represent requested, configured, selected, and observed dispatch
facts without overloading identity fields.

**Schema:**

```typescript
interface DispatchReportV1 {
  schemaVersion: 1;
  route: {
    scope: string;
    action: 'implementation' | 'fix' | 'review';
    role: 'implementer' | 'fix' | 'reviewer';
    target: string;
  };
  policy: {
    status: 'resolved' | 'unresolved' | 'blocked';
    mode: 'managed' | 'inherit' | null;
    name: string | null;
    source: string | null;
  };
  selection: {
    requestedCandidate: { model: string; effort?: string } | null;
    candidateTier: WorkflowDispatchMatrixTier | null;
    candidateIndex: number | null;
    ceilingTier: WorkflowDispatchMatrixTier | null;
    ceilingTarget: ResolvedDispatchTargetReport | null;
    selectedValue: string | null;
    exactSelectedTarget: ResolvedDispatchTargetReport | null;
    selectionMode: string;
    selectionBranch: string;
    cellSource: string | null;
  };
  requestedControls: {
    model: DispatchControlRequest;
    effort: DispatchControlRequest;
  };
  configuredDefaults: {
    model: string | null;
    modelSource: string | null;
    effort: string | null;
    effortSource: string | null;
  };
  gateInvocation: {
    readonly runId: string;
    readonly targetId: string;
    readonly runtime: string;
    readonly model: string;
    readonly reasoningEffort: string;
    readonly source: 'exec-target-config' | 'unknown';
  } | null;
  runtimeIdentity: {
    producer: string | null;
    model: string | null;
    effort: string | null;
    provenance: 'declared' | 'observed' | 'inferred' | 'unknown';
    confidence: string;
  };
}

interface DispatchReportInput {
  scope: string;
  action: 'implementation' | 'fix' | 'review';
  role: 'implementer' | 'fix' | 'reviewer';
  resolution: DispatchCeilingResolution;
  requestedControls: DispatchReportV1['requestedControls'];
  configuredDefaults: DispatchReportV1['configuredDefaults'];
  gateInvocation?: DispatchReportV1['gateInvocation'];
  runtimeIdentity?: DispatchReportV1['runtimeIdentity'];
}

interface ResolvedDispatchTargetReport {
  harness: string;
  model?: string;
  effort?: string;
  crossHarness: boolean;
  routeIndex: number;
  routeLength: number;
}

interface DispatchControlRequest {
  value: string | null;
  mechanism:
    | 'task-model-argument'
    | 'materialized-role'
    | 'base-role'
    | 'provider-default'
    | 'host-inherited'
    | 'not-applicable';
  reason: string;
}
```

**Validation Rules:**

- Named ceilings and requested candidates are never represented by the same
  field.
- Unresolved/blocked policy state is explicit; absence is not rewritten as
  managed Uncapped or host inheritance.
- `exactSelectedTarget` is resolver output, not reconstructed from candidate
  text.
- Exact-candidate resolution propagates its matched `candidateIndex` into
  `ResolvedDispatchPolicy` and `DispatchSelection`; the report never tries to
  rediscover it.
- Policy source (including invocation-only ceilings), selected-cell source, and
  gate invocation source remain separate.
- Candidate order and a selected target's fallback `routeIndex` remain
  separate semantics.
- `selection.selectionBranch` is the sole selection-branch field; route
  metadata does not mirror it.
- V1 validates the workflow-action/resolver-role pairs as
  `implementation`/`implementer`, `fix`/`fix`, and `review`/`reviewer`.
- Gate invocation accepts `provider-default` and `unknown` as meaningful
  configured values and remains immutable.
- Runtime identity cannot mutate or replace gate invocation or requested
  controls.
- When `runtimeIdentity` is omitted, `buildDispatchReport` emits
  `producer`, `model`, and `effort` as `null`, `provenance: 'unknown'`, and
  `confidence: 'not-reported'`.
- The JSON key order is stable and `schemaVersion` is mandatory.

**Storage:** The report is transient CLI/workflow output. Live Cursor evidence
is persisted in the project references; no database or long-lived cache is
introduced.

## API Design

### Resolver and Workflow Integration

- Preserve existing top-level `dispatch-ceiling resolve --json` fields for
  compatibility. Add optional report-context inputs for scope and action; when
  supplied, the resolver output includes the versioned report. Existing calls
  without report context remain unchanged.
- Use explicit `--report-scope <scope>` and
  `--report-action <implementation|fix|review>` options rather than inferring
  those values from target names.
- Workflow callers supply scope/action explicitly so the report owns stable
  workflow semantics and project-phase scope independently of resolver inputs.
  V1 validates the action/role mapping defined above rather than inferring
  either field from target names.
- Human resolver/workflow output uses `formatDispatchReport` after parity
  tests cover current output states.
- Gate review maps its existing frozen invocation record into
  `gateInvocation`; it does not ask the reviewer/runtime to recreate it.
- Producer-stamp aggregation maps only into `runtimeIdentity`/diversity
  context.
- `formatDispatchStamp` remains available; new code derives its record through
  `toDispatchStampRecord`.

No new network API or persistent service is introduced.

## Error Handling

- **Malformed matrix input:** Return path-specific normalization issues. Config
  and project adapters preserve current ignore/warn/fail behavior.
- **Invalid Codex pair:** Keep model-plus-effort validation atomic and fail
  candidate compilation rather than validating axes separately.
- **Exact candidate failure:** Missing, ambiguous, above-ceiling, or
  non-compilable candidates remain fail-closed.
- **Cursor probe rejection:** Explicit exclusion maps to `unknown-value`;
  broad catalog presence without Task eligibility maps to `unvalidated`.
- **Cursor CLI/catalog failure:** Preserve `unvalidated`; do not silently
  convert it to valid, unknown, uncapped, or provider default.
- **Gate invocation mismatch:** Preserve existing fail-closed corroboration
  before severity processing.
- **Evidence safety:** Redact API keys/tokens and record only relevant
  environment/client metadata.

## Performance Considerations

- One validation pass performs at most one `models` call and one
  `--list-models` fallback call.
- Task probes remain necessary and run once per distinct candidate, not once per
  matrix reference.
- Promise-based pass state coalesces concurrent catalog requests.
- No cache survives the adopt/doctor command, avoiding stale catalog state.

## Testing Strategy

### Unit Tests

- Normalize provider scalars, direct targets, legacy fallback arrays, explicit
  fallback routes, candidate ladders, malformed candidates, and sparse
  project-state overrides.
- Walk every shape with exact tier, candidate index, fallback-route index, path,
  target, and source provenance.
- Preserve opaque Cursor strings byte-for-byte and atomic Codex model/effort
  targets.
- Format/serialize reports deterministically across exact candidate,
  inherit/default, runtime-unreported, and gate-invocation cases.
- Derive and parse compatibility stamps without changing existing grammar.

### Integration Tests

- Switch config loading and project-state parsing to the shared normalizer with
  characterization parity.
- Switch config adoption and doctor to the shared walker and prove no private
  third traversal remains.
- Verify exact non-first candidate selection reports requested candidate,
  candidate tier, maximum ceiling, cell source, and exact selected target.
- Verify configured invocation remains unchanged when observed/self-reported
  producer differs or is unknown.
- Verify two or more Cursor references cause one Task probe per distinct value,
  one primary catalog call, and at most one fallback call.
- Preserve valid, unknown-value, and unvalidated command output.
- Run skill/bundle contract tests if workflow guidance changes.

### Live Verification

- Re-read the current recommendation asset and enumerate distinct GPT-5.6
  Cursor candidates.
- Run the canonical Task/subagent probe for each exact string.
- Record sanitized raw evidence and outcome basis in
  `references/cursor-gpt-5-6-subagent-verification.md`.
- If unavailable, record a concrete recheck date; do not guess or silently edit
  the ladder.

### Repository Verification

- Run exact Vitest files for matrix config, project dispatch resolution, config
  adoption, doctor, availability, stamp/report, gate provenance, and bundle
  contracts.
- Run `pnpm lint`, `pnpm format`, `pnpm type-check`, and relevant builds.
- Bump all five public packages together and run `pnpm release:validate`.

## References

- Discovery: `discovery.md`
- Completed dependency summary:
  `.oat/repo/reference/project-summaries/20260710-gate-review-provenance-target-safety.md`
- Recommendation:
  `packages/cli/config/dispatch-matrix-recommendation.json`
- Backlog:
  - `.oat/repo/pjm/backlog/items/BL-260709-add-dispatch-machine-schema.md`
  - `.oat/repo/pjm/backlog/items/BL-260707-consolidate-dispatch-matrix.md`
  - `.oat/repo/pjm/backlog/items/BL-260707-cache-cursor-model-catalog.md`
  - `.oat/repo/pjm/backlog/items/BL-260708-verify-cursor-gpt-5-6-subagent.md`
