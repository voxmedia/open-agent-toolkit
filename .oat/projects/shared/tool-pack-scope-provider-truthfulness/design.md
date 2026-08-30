---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: false
oat_template: false
---

# Design: Tool-Pack Scope, Provider Reachability, and Dispatch Truthfulness

## Overview

This design confirms discovery's chosen direction: a shared layered evidence
model above the existing canonical pack inventory and provider adapters.
Canonical inventory remains authoritative for declared intent, managed asset
health, completeness, and physical placement. Provider resolution remains
outside deterministic inventory and contributes activation, capability,
materialization, catalog-refresh, and optional runtime-observation evidence.
Lifecycle commands render projections of those facts instead of maintaining
independent `installed` or `available` booleans.

The design preserves PR #227's separate project-artifact
`shared | local | synced` axis, PR #240's content-aware pack inventory and
safe lifecycle transaction, and PR #242's dependency-owned exact canonical
role resolution plus native-first dispatch. It does not create a universal
runtime catalog and does not let filesystem presence prove session visibility.

`scope-adoption-diagnostics` is an active predecessor, not a parallel
implementation lane. Its finalized plan was explicitly approved after its
bounded review override and implementation was initialized on the laptop at
head `25c28dbd1`; at the 2026-08-30 observation it had `0/9` tasks complete and
staged project bookkeeping. This project may continue design and review, but
it must not begin shared-source implementation until that predecessor lands.
It then records the accepted completion SHA, rebases, and adapts to the actual
narrow provider-materialization input, shared-owner attribution, inventory
availability, and doctor/status rendering seams. It never duplicates those
corrections.

## Architecture

### System Context

The feature sits between three existing layers:

1. pack intent and canonical inventory under `commands/tools/shared`;
2. provider activation, sync planning, materialization extensions, and
   manifests under `providers`, `engine`, and `manifest`;
3. CLI lifecycle and dispatch consumers under init/tools, status, doctor,
   dispatch-ceiling, gates, and OAT workflow skills.

The evidence layer is a pure projection. It does not perform provider
detection, filesystem mutation, process restart, or provider launch. Mutating
children keep separate planners and apply-time safety checks.

**Key Components:**

- **Provider registry:** One source for adapters, extensions, content
  capabilities, and catalog-refresh policy.
- **Canonical inventory:** PR #240 inventory with intent and physical
  placement explicitly separated.
- **Pack evidence projector:** Joins canonical and provider facts into one
  normalized report model.
- **Lifecycle outcome projector:** Carries requested scope, canonical apply,
  provider sync, verification, and recovery as separate stages.
- **Provider sync extensions:** Materialize supported user agents and return
  per-content, per-asset evidence rather than aggregate counts alone.
- **Collection alias reconciler:** Plans and owns full-directory inheritance
  without permitting entry mutations through a directory symlink.
- **Project guidance reconciler:** Applies one explicitly opted-in managed
  `AGENTS.md` section independently from capability scope and PJM adoption.
- **Restart adviser:** Converts successful materialization changes and static
  provider refresh policy into truthful advice.
- **Dispatch record augmentation:** Preserves the canonical generic dispatch
  record and adds namespaced role, fallback-link, and optional runtime
  evidence.

### Component Diagram

```text
scoped config ──┐
provider detect ├─> provider registry/resolver ─> provider scope context
adapter mapping ┤                                      │
extension plan ─┘                                      │
                                                       v
pack intent ──> canonical inventory ───────────> pack evidence projector
                    │                                  │
                    v                                  ├─> picker/list/info
             lifecycle planner                         ├─> status/doctor
                    │                                  └─> human + JSON report
                    v
             canonical apply + verify
                    │ changed canonical paths
                    v
       provider sync + collection alias + extensions
                    │
                    v
       lifecycle outcome + restart/refresh advice

dispatch resolver ─> DispatchReportV1 ─> canonical generic dispatch record
                                                 │
canonical role resolver ─────────────────────────┼─> namespaced OAT evidence
native launcher acceptance/rejection ────────────┤
optional transcript observation ─────────────────┘
```

### Data Flow

#### Inspection and rendering

1. Resolve project and user roots and read each scope's pack intent and
   canonical assets through the existing inventory.
2. Resolve scoped sync configuration and provider detection once through
   `getConfigAwareAdapters`. Explicitly enabled providers are active,
   explicitly disabled providers are inactive, unset providers follow
   detection.
3. Derive provider capability from the central registration, inspect the
   applicable manifest and materialization-extension evidence, and create a
   `ProviderReachabilityEvidence` record for each active provider, scope, content
   type, and affected managed asset.
4. Join canonical and provider records into `ToolPackEvidence`. Missing
   provider evidence remains `unknown`; it never becomes success.
5. Picker, list, info, status, and doctor consume the same structured report.
   Human output is a renderer over the JSON model.

#### Installation and synchronization

1. Build picker labels from verified canonical placement. Intent is shown, if
   useful, as `declared only`, never as installed placement.
2. Treat an explicit install scope as additive over already realized scopes.
   Stale intent is excluded from the union. If another scope is retained, the
   prompt says so instead of labeling the choice `only`.
3. Plan all canonical changes, preflight every target, apply and verify
   canonical state, then persist intent exactly as in the current transaction.
4. Auto-sync only scopes whose canonical paths changed. Sync returns detailed
   core-plan, collection, and extension results.
5. Re-inventory every relevant scope and project the verified end state.
   Completion output reports that state, not the requested scope map.
6. A provider failure leaves verified canonical success intact but reports a
   partial lifecycle outcome with provider-specific recovery.

#### Dispatch

1. Preserve `DispatchReportV1` as the resolver and compatibility-stamp source.
2. Resolve exact canonical instructions through the PR #242 loaded, user,
   project search order when a fallback-capable route requires them.
3. Construct and redact the actual launcher payload before recording selected
   axes.
4. Append one native launch attempt. Acceptance permanently closes automatic
   replacement eligibility. Only an explicit rejection proving that no child
   started may authorize one target-preserving canonical-instruction fallback.
5. Record fallback as an approximation linked to the rejected attempt.
6. Append child outcome and optional sanitized runtime observation as separate
   facts. Neither may authorize a new launch.

## Component Design

### Provider Registry and Scope Context Resolver

**Purpose:** Centralize provider registrations and scoped activation so sync,
inventory consumers, provider commands, and diagnostics do not maintain
different provider lists or capability assumptions.

**Responsibilities:**

- Own the adapter, zero or more materialization extensions, content
  capabilities, and catalog-refresh policy for each provider.
- Resolve scoped config before detection and apply the existing activation
  precedence unchanged.
- Describe unsupported scope/content combinations explicitly.
- Keep volatile detection and catalog observations out of durable config.
- Support user-scope provider configuration through the same command contract
  currently available for project scope.

**Interfaces:**

```typescript
type ProviderProjectionMode =
  | 'native-read'
  | 'entry-sync'
  | 'materialization-extension'
  | 'unsupported';

type ManagedContentKind = ContentType | 'directory';

type ProviderCatalogRefreshPolicy =
  | {
      state: 'live' | 'manual-refresh' | 'restart-required';
      provenance: {
        kind:
          | 'official-contract'
          | 'validated-local-behavior'
          | 'repository-decision';
        reference: string;
        verifiedAt: string;
        providerVersion?: string;
      };
    }
  | { state: 'unknown'; reason: string };

type ProviderVisibilityEvidenceSource =
  | 'provider-policy'
  | 'runtime-catalog-probe'
  | 'not-reported';

interface ProviderContentCapability {
  scope: ConcreteScope;
  contentKind: ManagedContentKind;
  projectionModes: readonly ProviderProjectionMode[];
  nativeRoleSurface: boolean;
  collectionAlias: 'supported' | 'unsupported';
  catalogRefresh: ProviderCatalogRefreshPolicy;
  unsupportedReason?: string;
}

interface ProviderRegistration {
  adapter: ProviderAdapter;
  extensions: readonly SyncMaterializationExtension[];
  capabilities: readonly ProviderContentCapability[];
}

interface ProviderScopeContext {
  scope: ConcreteScope;
  configSource: RedactedPath;
  activeProviders: readonly string[];
  activation: readonly ProviderActivationEvidence[];
  registrations: readonly ProviderRegistration[];
}

function getProviderRegistrations(): readonly ProviderRegistration[];

async function resolveProviderScopeContext(input: {
  scope: ConcreteScope;
  scopeRoot: string;
  config: SyncConfig;
  registrations?: readonly ProviderRegistration[];
}): Promise<ProviderScopeContext>;
```

**Dependencies:** Existing adapters, `getConfigAwareAdapters`, sync config,
and materialization extensions. No external service or dependency is added.

**Design Decisions:**

- `PathMapping` remains the canonical path mapping. Capabilities describe the
  higher-level support and refresh semantics that mappings cannot express.
- Multiple projection modes are allowed because a provider may entry-sync
  canonical agent files while an extension owns native managed-role records.
- A missing capability row is a validation error in the provider registry,
  not implicit support.
- `manual-refresh` and `restart-required` are invalid without a source and
  verification date. The registry defaults to `unknown` when an official
  contract, a reproducible local validation, or a repository decision does not
  establish the policy for the relevant provider version.
- The current `USER_SCOPE_MANAGED_AGENT_FILES` list remains a bundled base-role
  seed contract; it stops being the reachability oracle.

### Canonical Inventory and Pack Evidence Projector

**Purpose:** Preserve PR #240 inventory while removing the intent-to-placement
collapse and exposing one normalized evidence model.

**Responsibilities:**

- Keep current asset status, version, digest, seed, override, completeness,
  and shared-owner behavior.
- Derive realized placement only from present non-shared managed assets.
- Expose declared and inferred intent separately from realized placement.
- Join provider evidence without performing provider detection internally.
- Preserve `user-agent-unmaterialized` as a one-release compatibility summary
  generated from richer provider evidence.

**Interfaces:**

```typescript
type ScopeRealization = 'present' | 'absent' | 'unknown';
type RealizedPackPlacement = 'project' | 'user' | 'both' | 'none' | 'unknown';

interface PackScopeFacts {
  scope: ConcreteScope;
  intent: ScopedPackIntent;
  inventory: {
    state: 'available' | 'unavailable';
    source: 'pack-inventory';
    reason?: string;
  };
  completeness: PackCompleteness | 'unknown';
  health: 'absent' | 'current' | 'drifted' | 'newer' | 'mixed' | 'unknown';
  realization: ScopeRealization;
}

interface ToolPackEvidence {
  schemaVersion: 1;
  pack: PackName;
  canonical: PackInventory | null;
  scopes: readonly PackScopeFacts[];
  knownRealizedScopes: readonly ConcreteScope[];
  unknownScopes: readonly ConcreteScope[];
  realizedPlacement: RealizedPackPlacement;
  providers: readonly ProviderReachabilityEvidence[];
  diagnostics: readonly PackEvidenceDiagnostic[];
}

function hasScopedPackRealizationEvidence(
  inventory: ScopedPackInventory,
): boolean;

function projectPackEvidence(input: {
  canonical: PackInventory | null;
  scopes: readonly PackScopeFacts[];
  providers: readonly ProviderReachabilityEvidence[];
}): ToolPackEvidence;
```

**Dependencies:** Current pack manifest, scoped intent, content digest, and the
predecessor's normalized provider input and diagnostic-availability seams.

**Design Decisions:**

- `present` and `absent` are emitted only from an available scope inventory.
  A failed scope read emits `unknown`, preserves independently read intent and
  every available scope fact, and never supplies a placement default.
- `realizedPlacement` is `unknown` whenever any evaluated scope is unknown;
  `knownRealizedScopes` still exposes verified partial facts. `none` means that
  every evaluated scope was available and verified absent.
- `PackInventory.placement` keeps its legacy meaning for one compatibility
  release and is never consumed by new selectors or renderers. The new
  `realizedPlacement` field carries corrected semantics; its later promotion
  to the legacy field requires an explicit deprecation release.
- `completeness` remains managed-presence only. Health is separately derived
  from asset statuses.
- Provider diagnostics live outside the small canonical `PackDiagnostic`
  union so inventory stays deterministic and provider-neutral.

### Lifecycle Selection and Outcome Projector

**Purpose:** Make requested, applied, synced, and verified states separately
observable without rewriting the safe canonical transaction.

**Responsibilities:**

- Build install choices from realized placement.
- Use consistent additive semantics across aggregate and per-pack installs.
- Produce scope deltas only from verified placement and explicit selections.
- Retain exact canonical reconcile plans and post-apply inventory.
- Return provider sync evidence, final evidence, and partial-failure recovery.

**Interfaces:**

```typescript
interface PackScopeSelection {
  pack: PackName;
  requested: ConcreteScope | 'both';
  retainedRealizedScopes: readonly ConcreteScope[];
  targetScopes: readonly ConcreteScope[];
}

interface PackLifecycleOutcome {
  schemaVersion: 1;
  selection: PackScopeSelection;
  canonical: {
    status: 'unchanged' | 'applied' | 'failed' | 'verification-failed';
    results: readonly PackLifecycleResult[];
  };
  sync: ProviderSyncOutcome;
  finalEvidence: ToolPackEvidence | null;
  status: 'complete' | 'partial' | 'failed';
  recovery: readonly RecoveryAction[];
}

function resolveAdditivePackScopeSelection(input: {
  pack: PackName;
  requested: ConcreteScope | 'both';
  knownRealizedScopes: readonly ConcreteScope[];
  unknownScopes: readonly ConcreteScope[];
}): PackScopeSelection;

function evaluatePackLifecycleOutcome(input: {
  selection: PackScopeSelection;
  lifecycle: readonly PackLifecycleResult[];
  sync: ProviderSyncOutcome;
  finalEvidence: ToolPackEvidence | null;
}): PackLifecycleOutcome;
```

**Dependencies:** Existing picker/install state, pack lifecycle, auto-sync,
provider scope resolver, and pack evidence projector.

**Design Decisions:**

- Install remains additive. Removal remains an explicit remove command.
- Choice labels are contextual: when project is already realized, choosing
  user says `Add user scope; keep project` rather than `User scope only`.
- Selection requires `unknownScopes` to be empty. Known realized scopes remain
  renderable during partial inventory failure but cannot be used to guess the
  missing half of an additive target.
- Inventory failure during default scope resolution no longer silently selects
  the manifest default. Non-interactive commands fail closed with recovery;
  interactive commands may offer a clearly labeled default only after showing
  that placement is unknown.
- Canonical success is not rolled back when provider sync fails. The result is
  `partial`, with exact failed provider/content evidence.

### Provider Materialization and Restart Adviser

**Purpose:** Make supported user agents reachable and distinguish filesystem
materialization from current-session visibility.

**Responsibilities:**

- Expand user sync to scan canonical agents as well as skills.
- Let each active provider process only capabilities it explicitly declares.
- Return per-provider, per-content, and per-asset plan/apply evidence from core
  mappings and extensions.
- Materialize managed reviewer and implementer roles for every supported
  active provider, including Claude's user agent directory.
- Derive restart or refresh advice only after successful relevant changes.

**Interfaces:**

```typescript
type ProviderMaterializationState =
  | 'not-required'
  | 'current'
  | 'planned'
  | 'changed'
  | 'missing'
  | 'failed'
  | 'unsupported'
  | 'unknown';

type ProviderVisibilityState =
  | 'visible'
  | 'restart-required'
  | 'refresh-required'
  | 'unknown'
  | 'not-reported'
  | 'unsupported';

interface ProviderReachabilityEvidence {
  provider: string;
  scope: ConcreteScope;
  contentKind: ManagedContentKind;
  assets: readonly string[];
  activation: EvidenceFact<
    'active' | 'inactive' | 'unknown',
    ProviderActivationSource
  >;
  capability: EvidenceFact<
    'supported' | 'unsupported' | 'unknown',
    'provider-registration'
  >;
  projectionModes: readonly ProviderProjectionMode[];
  materialization: EvidenceFact<
    ProviderMaterializationState,
    'native-read' | 'sync-plan' | 'sync-result' | 'sync-manifest'
  >;
  visibility: EvidenceFact<
    ProviderVisibilityState,
    ProviderVisibilityEvidenceSource
  >;
  recovery: readonly RecoveryAction[];
}

interface ProviderSyncOutcome {
  scopes: readonly ConcreteScope[];
  status: 'not-run' | 'complete' | 'partial' | 'failed';
  providers: readonly ProviderReachabilityEvidence[];
}

function adviseProviderRefresh(input: {
  policy: ProviderCatalogRefreshPolicy;
  materialization: ProviderMaterializationState;
  observation?: ProviderCatalogObservation;
}): EvidenceFact<ProviderVisibilityState, ProviderVisibilityEvidenceSource>;
```

**Dependencies:** Scanner, core sync planner/executor, extension plans, manifest,
and provider registration.

**Design Decisions:**

- Static inventory never launches a provider and never performs a network
  request.
- `restart-required` is emitted only when a successful current-run change
  affects a catalog whose declared policy requires restart. A current view
  without a current-session probe is `unknown`, not visible.
- Missing, failed, or unsupported materialization never receives restart
  advice; recovery targets the actual missing layer.
- Runtime catalog observations are valid only for the current command/session
  and are not persisted as current truth.
- `not-reported` means an available evidence channel returned no visibility
  value. `unknown` means no available observation or sourced provider policy
  can establish the visibility state.
- Claude user agents are projected through its declared `.claude/agents`
  mapping. Codex and Cursor managed roles remain extension-owned. Other
  provider rows must be proven by focused adapter tests before being marked
  supported.

### Collection Alias Reconciler

**Purpose:** Implement `BL-260724` as a collection-level plan and manifest
concept without weakening per-entry path safety.

**Responsibilities:**

- Prove exact canonical target identity for existing absolute or relative
  collection symlinks.
- Create an alias automatically only when the provider collection is absent.
- Adopt an existing exact safe alias without rewriting it.
- Never replace an existing real directory in the first release, even when its
  entries appear fully managed; use per-entry sync instead.
- Fall back to per-entry sync for real, unmanaged, foreign, nested, mismatched,
  or otherwise divergent collections.
- Revalidate target, ancestry, and ownership immediately before apply.
- Record inherited entry ownership without issuing child-path mutations.

**Interfaces:**

```typescript
type CollectionSyncAction =
  | 'create-collection-link'
  | 'adopt-collection-link'
  | 'inherit-collection'
  | 'fallback-per-entry'
  | 'detach-collection'
  | 'reject-collection';

interface CollectionProjectionPlan {
  provider: string;
  scope: ConcreteScope;
  contentType: ContentType;
  canonicalDir: string;
  providerDir: string;
  action: CollectionSyncAction;
  ownership: 'oat-created' | 'adopted-exact' | 'none';
  proof: CollectionIdentityProof;
  inheritedEntries: readonly string[];
  reason: string;
}
```

**Dependencies:** Provider mappings, canonical scanner, provider path safety,
manifest manager, drift detector, and sync executor.

**Design Decisions:**

- Collection aliases are not modeled as relaxed provider ancestry. Entry
  operations under an inherited collection are forbidden.
- Exact identity is stricter than PR #240 skill comparison: provider-only
  entries, type differences, broken links, and target mismatch all defeat
  collection adoption.
- When a provider is disabled, an `adopted-exact` collection record is removed
  from the manifest while its user-created on-disk alias is left untouched.
  OAT-created unchanged aliases may be removed as links only; their targets
  are never removed.
- Real-directory conversion is excluded from the first release. Adding it
  later requires a separate destructive-operation design and approval, not a
  hidden extension of `auto`.
- Collection creation and its manifest update are one recoverable transaction:
  snapshot identities, call a dedicated no-clobber primitive that creates the
  symlink directly at the final absent path, rescan exact identity, atomically
  write the complete manifest, then report success. The primitive has no copy
  fallback and never removes a destination; `EEXIST` is a race abort that
  preserves the foreign path unchanged. Any later verification or manifest
  failure unlinks only the unchanged just-created symlink. A failed rollback
  is a `partial` outcome with exact recovery and never records OAT ownership.
- Adopting an existing exact alias mutates only the manifest. The atomic
  manifest write is its commit point. Collection operation groups do not use
  the current executor's save-after-partial-operation behavior.

### Project Guidance Reconciler

**Purpose:** Implement `BL-260828` as an independent project-local choice with
one managed owner.

**Responsibilities:**

- Offer one interactive guidance choice in `oat init`, guided aggregate tools
  installation, and standalone workflows installation.
- Require `--project-guidance` for non-interactive mutation.
- Reuse the `<!-- OAT tools -->` section so all entry points share ownership.
- Preserve unrelated content and update the section idempotently.
- Remove a legacy `<!-- OAT workflows -->` section only during an approved
  guidance update.
- Validate a root `AGENTS.md` symlink before following it.

**Interfaces:**

```typescript
type AgentsGuidanceAction =
  | 'declined'
  | 'not-requested'
  | 'create'
  | 'update'
  | 'no-change'
  | 'blocked';

interface AgentsGuidancePlan {
  repoRoot: string;
  target: RedactedPath;
  action: AgentsGuidanceAction;
  sectionKey: 'tools';
  body: string;
  legacySectionAction: 'preserve' | 'remove';
  reason: string;
}

type ProjectGuidanceChoice =
  | { choice: 'accepted'; source: 'prompt' | 'flag' }
  | { choice: 'declined'; source: 'prompt' | 'flag' }
  | { choice: 'not-requested'; source: 'non-interactive-default' };

async function planProjectGuidance(input: {
  repoRoot: string;
  packs: readonly PackScopeInfo[];
  guidance: ProjectGuidanceChoice;
}): Promise<AgentsGuidancePlan>;

async function applyProjectGuidance(
  plan: AgentsGuidancePlan,
): Promise<UpsertSectionResult>;
```

**Dependencies:** Existing tool-pack section renderer and managed-section
helper, enhanced with no-follow validation and atomic write support.

**Design Decisions:**

- Guidance is neither pack placement nor PJM adoption. It writes no pack
  intent and no PJM marker.
- Interactive prompt defaults to decline; non-interactive execution never
  writes without `--project-guidance`.
- A regular root file is supported. A symlink is supported only when it
  resolves to a regular file inside the repository and remains unchanged at
  apply. Broken, external, cyclic, or race-swapped links fail closed.
- PJM and decision managed sections are never read as evidence for this choice
  and are never modified.

### Canonical Dispatch Record Augmentation and Recorder

**Purpose:** Add canonical-role, fallback, and optional runtime provenance to
the existing generic OAT dispatch record without defining a competing request,
selection, launch, or outcome schema.

**Responsibilities:**

- Preserve the generic dispatch record from
  `oat-dispatch-subagents/references/record-schema.md` as the authority for the
  request, selected controls, configured invocation evidence, launch status,
  child outcome, diagnostics, and continuation events.
- Preserve `DispatchReportV1` as the resolver and compatibility-stamp source;
  adapt its values into the generic record rather than persisting it as a
  second selection object.
- Extract PR #242 canonical-role resolution into production code and attach
  exact selected path, tier, version, digest, and candidate misses under one
  namespaced `oat` augmentation.
- Require the wrapper that invokes the native provider API to attest the exact
  payload before launch and its accepted or rejected-before-start result
  immediately after the API returns.
- Permit one target-preserving fallback only when the generic record contains
  source-qualified rejection evidence proving no child started.
- Store optional sanitized runtime observation without changing launch or
  fallback authority.

**Interfaces:**

```typescript
interface PersistedOatDispatchRecordV1 extends GenericDispatchRecord {
  oat: {
    schemaVersion: 1;
    canonicalRole: CanonicalRoleEvidence | null;
    fallback: CanonicalFallbackEvidence;
    runtimeObservation: RuntimeObservation;
  };
}

function augmentDispatchRecord(input: {
  record: GenericDispatchRecord;
  event: OatDispatchEvidenceEvent;
}): PersistedOatDispatchRecordV1;

async function persistProjectDispatchRecord(input: {
  projectPath: string;
  record: PersistedOatDispatchRecordV1;
}): Promise<PersistedOatDispatchRecordV1>;
```

**Dependencies:** The canonical generic dispatch record, `DispatchReportV1`,
dispatch stamp adapter, exact canonical agent parser/resolver, project scope
resolver, and atomic JSON file utilities.

**Design Decisions:**

- Generic field names and meanings remain unchanged. The augmentation may add
  only namespaced `oat` metadata, as the canonical record contract permits.
- The existing `Dispatch:` compatibility stamp remains unchanged and derives
  only from `DispatchReportV1`.
- The one persistence surface is
  `.oat/projects/<scope>/<project>/dispatch/<request-id>.json`, containing the
  complete generic record plus its namespaced augmentation. Non-project
  callers return the same record to their caller but do not invent another
  durable surface.
- Gate workflows may store only the stable dispatch request ID or path as a
  reference. Gate receipt shape, creation, and validation remain out of scope.
- The recorder validates evidence but never claims to observe a host launch.
  The provider wrapper that made the API call owns the launch attestation.
- The first accepted launch status closes automatic replacement. Timeout,
  interruption, `BLOCKED`, refusal, task failure, or runtime mismatch cannot
  authorize fallback.
- `BL-260826` owns transcript parsing. This component accepts its sanitized
  output and defaults to `not-reported`.

## Data Models

### Source-Qualified Evidence Fact

**Purpose:** Give every layer a state, source, and reason without pretending
that one generic confidence scale fits config, filesystem, and runtime facts.

**Schema:**

```typescript
interface EvidenceFact<TState extends string, TSource extends string> {
  state: TState;
  source: TSource;
  reason: string;
  observedAt?: string;
}

type ProviderActivationSource =
  | 'config-enabled'
  | 'config-disabled'
  | 'detected-unset'
  | 'undetected-unset'
  | 'resolution-failed';

interface RecoveryAction {
  code: string;
  command?: string;
  message: string;
}

type PackEvidenceDiagnosticCode =
  | 'inventory-unavailable'
  | 'declared-only'
  | 'partial-placement'
  | 'duplicate-placement'
  | 'provider-inactive'
  | 'provider-unsupported'
  | 'provider-materialization-missing'
  | 'provider-materialization-failed'
  | 'visibility-unknown'
  | 'refresh-required'
  | 'restart-required';

interface PackEvidenceDiagnostic {
  code: PackEvidenceDiagnosticCode;
  severity: 'info' | 'warning' | 'error';
  pack: PackName;
  scope?: ConcreteScope;
  provider?: string;
  contentKind?: ManagedContentKind;
  affectedAssets: readonly string[];
  source: string;
  detail: string;
  recovery: readonly RecoveryAction[];
}
```

**Validation Rules:**

- `observedAt` is required only for observations, not static declarations.
- `unknown` and `not-reported` require a reason and may not carry a recovery
  that claims success.
- Commands and paths are redacted before serialization.
- Diagnostic codes identify the failed evidence layer. They never collapse an
  unavailable inventory, unsupported provider, failed materialization, or
  unknown visibility state into one generic unavailable result.

**Storage:** Pack and provider evidence is transient and reconstructed per
command. Only established config, manifests, and dispatch journals persist.

### Provider Reachability Matrix

**Purpose:** Represent provider, scope, content, and affected assets without
collapsing capability, materialization, and visibility.

**Validation Rules:**

- Exactly one activation record exists for every registered provider in the
  evaluated scope.
- Active providers produce one capability row for each relevant canonical
  content kind. Missing rows become `unknown`, never supported. Pack-owned
  directory assets receive explicit supported or unsupported rows even when
  they do not participate in provider projection.
- `visible` requires a runtime catalog observation. `restart-required` or
  `refresh-required` requires successful materialization and a matching static
  provider policy.
- An inactive provider may report capability but has materialization
  `not-required`; it is not diagnosed as missing.
- Unsupported rows include provider, scope, content, affected assets, and
  actionable recovery.

**Storage:** Registry declarations live in source. Per-run evidence is
transient. Sync manifest state supplies filesystem ownership, not visibility.

The initial registry target is:

| Provider | Project projection                                                              | User projection                                                                            | Managed native roles                         | Catalog refresh                                   |
| -------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------- |
| Claude   | skills, agents, rules by entry sync                                             | skills and agents by entry sync; rules unsupported                                         | supported through the agent mapping          | unknown pending sourced provider-version evidence |
| Codex    | skills by native read; agents by native canonical source plus extension         | skills by native read; agents by native canonical source plus extension; rules unsupported | supported through the managed-role extension | unknown pending sourced provider-version evidence |
| Cursor   | skills by native read; agents by entry sync plus extension; rules by entry sync | skills by native read; agents by entry sync plus extension; rules unsupported              | supported through the managed-role extension | unknown pending sourced provider-version evidence |
| Copilot  | skills by native read; agents and rules by entry sync                           | skills by native read; agents by entry sync; rules unsupported                             | supported through the agent mapping          | unknown pending sourced provider-version evidence |
| Gemini   | skills and agents by native read; rules unsupported                             | skills and agents by native read; rules unsupported                                        | supported by the native agent mapping        | unknown pending sourced provider-version evidence |

Every projection row is validated against the adapter mappings and registered
extensions. Every refresh row remains `unknown` until it independently meets
the provenance contract above; adapter mappings do not prove catalog refresh
behavior. If implementation evidence disproves a row, the registry reports it
as unsupported or unknown rather than preserving the table by inference.

### Sync Manifest V2

**Purpose:** Add explicit collection ownership while retaining per-entry
evidence for inherited canonical entries.

**Schema:**

```typescript
interface CollectionPathIdentity {
  device: string;
  inode: string;
  type: 'directory' | 'symlink';
  modifiedAtNanoseconds: string;
}

type CollectionIdentityProof =
  | {
      status: 'absent';
      canonicalDirectory: CollectionPathIdentity;
      providerParent: CollectionPathIdentity;
      checkedAt: string;
    }
  | {
      status: 'exact-link';
      providerLink: CollectionPathIdentity;
      canonicalDirectory: CollectionPathIdentity;
      linkTextKind: 'relative' | 'absolute';
      resolvedTarget: string;
      entrySetDigest: string;
      checkedAt: string;
    }
  | {
      status: 'ineligible';
      reason:
        | 'real-directory'
        | 'broken-link'
        | 'foreign-target'
        | 'divergent-entries'
        | 'unsafe-ancestry'
        | 'identity-unavailable';
      observedIdentity?: CollectionPathIdentity;
      checkedAt: string;
    };

interface ManifestV2 {
  version: 2;
  oatVersion: string;
  entries: ManifestEntryV2[];
  collections: ManifestCollectionEntry[];
  lastUpdated: string;
}

interface ManifestEntryV2 {
  canonicalPath: string;
  providerPath: string;
  provider: string;
  contentType: ContentType;
  strategy: 'symlink' | 'copy' | 'collection';
  collectionId?: string;
  contentHash: string | null;
  isFile: boolean;
  lastSynced: string;
}

interface ManifestCollectionEntry {
  id: string;
  provider: string;
  contentType: ContentType;
  canonicalDir: string;
  providerDir: string;
  linkTarget: string;
  ownership: 'oat-created' | 'adopted-exact';
  lastVerified: string;
}
```

**Validation Rules:**

- `exact-link` requires the provider link to resolve to the same canonical
  directory identity and entry-set digest represented by the plan. Paths in
  the proof are normalized scope-relative identities, not absolute home paths.
- Proofs are transient preflight evidence. Apply rechecks the captured
  provider-parent, provider-link, and canonical-directory identities before
  mutation; any mismatch invalidates the plan without retry or removal.
- A `collection` entry references exactly one matching collection record.
- Collection provider/content and directory ancestry match every inherited
  entry.
- `canonicalDir`, `providerDir`, and `linkTarget` are normalized POSIX paths
  relative to the applicable project or user scope root. They are never
  absolute and contain no empty, `.`, or `..` segments.
- The on-disk symlink text may be absolute or may contain `..`; exact adoption
  resolves it from `dirname(providerDir)` and requires the resolved real target
  to equal `scopeRoot/linkTarget`. Both provider and canonical paths must stay
  inside that same validated scope root, with no broken or race-swapped
  ancestor.
- No collection and per-entry operation may own the same
  `(canonicalPath, provider)` pair.
- V1 manifests normalize to V2 in memory without mutation. V2 is written only
  after a successful sync apply. A collection transaction contributes entries
  only after alias verification; manifest-write failure rolls back a newly
  created alias before returning.

**Storage:** `.oat/sync/manifest.json` per scope, atomically written through the
existing manager.

### Project Guidance Plan

**Purpose:** Keep prompt decision, planned mutation, and applied result
separate.

**Validation Rules:**

- Declined and non-requested plans contain no filesystem mutation.
- The section key is always `tools`.
- The target must be repository-root `AGENTS.md` or its validated contained
  symlink target.
- Marker pairs must be unique and ordered; malformed duplicate markers block
  automatic modification.

**Storage:** The managed section persists in repository `AGENTS.md`; no
separate choice flag is stored.

### Namespaced Dispatch Provenance

**Purpose:** Extend the canonical generic dispatch record with only the
canonical-role and runtime facts that its neutral schema does not own.

**Schema:**

```typescript
type OatDispatchEvidenceEvent =
  | {
      kind: 'canonical-role-resolution';
      requestId: string;
      source: 'canonical-role-resolver';
      evidence: CanonicalRoleEvidence;
    }
  | {
      kind: 'pre-start-rejection-attestation';
      requestId: string;
      source: 'provider-wrapper';
      expectedLaunchStatus: 'blocked-before-start';
      rejection: {
        code: string;
        rejectedAt: string;
        provesNoChildStarted: true;
      };
    }
  | {
      kind: 'fallback-link';
      requestId: string;
      source: 'provider-wrapper';
      evidence: CanonicalFallbackEvidence & { status: 'fallback-dispatch' };
    }
  | {
      kind: 'runtime-observation';
      requestId: string;
      source: 'runtime-observer';
      observation: RuntimeObservation;
    };

type CanonicalRoleEvidence =
  | {
      status: 'resolved';
      dependency: string;
      canonicalRole: string;
      tier: 'loaded' | 'user' | 'project';
      validation: 'direct-canonical' | 'exact-canonical-symlink';
      canonicalPath: RedactedPath;
      selectedPath: RedactedPath;
      roleVersion: string;
      contentDigest: string;
      candidateMisses: readonly CandidateMiss[];
    }
  | {
      status: 'missing';
      dependency: string;
      canonicalRole: string;
      candidateMisses: readonly CandidateMiss[];
      recovery: readonly RecoveryAction[];
    };

type CanonicalFallbackEvidence =
  | { status: 'not-applicable'; reason: string }
  | {
      status: 'fallback-dispatch';
      triggerRequestId: string;
      fallbackRequestId: string;
      trigger: 'pre-start-rejection';
      fallbackReason: string;
      kind: 'canonical-instruction-fresh-child';
      approximation: true;
      preservedTarget: ExactTargetRef;
      rejection: {
        source: string;
        code: string;
        rejectedAt: string;
        provesNoChildStarted: true;
      };
      roleInstructions: CanonicalRoleEvidence & { status: 'resolved' };
    };

type RuntimeObservation =
  | { status: 'not-reported' }
  | {
      status: 'reported';
      provider: string;
      childLineage?: string;
      role?: string;
      model?: string;
      effort?: string;
      serviceTier?: string;
      source: string;
      observedAt: string;
      match: 'matching' | 'mismatching' | 'not-comparable';
    };
```

**Validation Rules:**

- Each event names exactly one existing generic request ID and a fixed allowed
  source. Pre-start rejection requires the generic record already to carry
  `launch_status: blocked-before-start`; it cannot mutate or reconstruct that
  field from namespaced evidence.
- Fallback links require matching trigger/fallback request IDs, resolved
  canonical role evidence, preserved configured controls, and no earlier
  fallback for the trigger. Runtime events accept metadata only.
- Generic request IDs are stable and unique. A fallback is a fresh canonical
  generic dispatch record linked to the rejected native record by both request
  IDs; it is not a second attempt array inside the original record.
- The generic record remains authoritative for provider, native role/variant,
  model, effort, reasoning mode, service tier, route, authority, sandbox,
  tools, deadline, retry limit, selection source/reason, configured invocation,
  launch status, child outcome, diagnostics, and candidates considered.
- Role evidence stores dependency, canonical role, loaded/user/project tier,
  direct-file or exact-symlink validation, redacted path, version, digest, and
  candidate misses. It never stores role content.
- The provider wrapper records a source-qualified pre-start rejection with
  `provesNoChildStarted: true` alongside the generic
  `launch_status: blocked-before-start`; a free-form error alone is
  insufficient.
- A fallback record preserves the exact target and controls, identifies its
  trigger request, repeats structured rejection evidence and fallback reason,
  and sets `approximation: true`. At most one fallback record may name a given
  trigger request.
- Runtime observation contains metadata fields only. Prompts, messages,
  credentials, and transcript bodies are rejected by strict schema validation.

**Storage:** One atomically written canonical generic record per request under
the optional project `dispatch/` directory. Old projects require no migration.

Planning and implementation define the smaller supporting types
`RedactedPath`, `CandidateMiss`, `ExactTargetRef`,
`ProviderActivationEvidence`, `ProviderCatalogObservation`, and the TypeScript
representation of the canonical `GenericDispatchRecord` directly from the
constraints and existing generic record schema cited above; they may not
weaken or rename those contracts.

## API Design

This feature adds no HTTP API and no authentication surface. Its public API is
the CLI/JSON contract plus internal TypeScript interfaces.

### Tool-Pack Inspection and Lifecycle JSON

Existing commands keep their top-level shapes and add one versioned block:

```typescript
interface PackEvidenceBlockV1 {
  schemaVersion: 1;
  status: 'ok' | 'partial' | 'error';
  items: readonly ToolPackEvidence[];
  diagnostics: readonly PackEvidenceDiagnostic[];
}
```

The additive locations and compatibility behavior are command-specific:

| Command family                        | Existing successful top-level JSON retained                               | Additive V1 field                                      | Partial/error and exit behavior                                                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools list`                          | `tools`, `packs`                                                          | `packEvidence: PackEvidenceBlockV1`                    | Bounded inventory/provider gaps set `partial` and retain available items; exit remains successful unless an existing command-level fatal error occurs.                        |
| `tools info <pack>`                   | `tool`, `pack`; existing not-found `error`                                | `packEvidence: PackEvidenceBlockV1`                    | Pack evidence failure is structured `partial`; invalid/not-found input keeps its current error and exit contract.                                                             |
| aggregate tools install               | `status`, `installedPacks`, `syncScopes`, optional `adoptedPacks`         | `lifecycle: PackLifecycleOutcome[]`                    | Canonical or provider apply/verification failure returns structured partial/error evidence and exit 1.                                                                        |
| reconciled per-pack install           | `status`, `pack`, `scopes`, `results`, optional `adoptedPacks`            | `lifecycle: PackLifecycleOutcome`                      | Failure keeps the existing `status: error` shape and exit 1, with structured lifecycle evidence when planning began.                                                          |
| standalone core installer             | `status`, `scope`, `targetRoot`, `result`                                 | `lifecycle: PackLifecycleOutcome`                      | Existing error shape and exit behavior remain; successful and partial lifecycle states are additive.                                                                          |
| standalone brainstorm/ideas/workflows | `status`, `scope`, `targetRoot`, `assetsRoot`, `result`                   | `lifecycle: PackLifecycleOutcome`                      | Existing error shape and exit behavior remain; successful and partial lifecycle states are additive.                                                                          |
| standalone utility/research/docs      | `status`, `scope`, `targetRoot`, `assetsRoot`, `selectedSkills`, `result` | `lifecycle: PackLifecycleOutcome`                      | Existing error shape and exit behavior remain; successful and partial lifecycle states are additive.                                                                          |
| standalone project-management         | `status`, `scope`, `targetRoot`, `assetsRoot`, `result`, `adoption`       | `lifecycle: PackLifecycleOutcome`                      | Existing error shape and exit behavior remain; PJM adoption remains an independent sibling field.                                                                             |
| `tools update`                        | `target`, `dryRun`, `result`, optional `adoptedPacks`                     | optional `lifecycle: PackLifecycleOutcome[]` for packs | Pack apply/verification failure returns structured partial/error evidence and exit 1; non-pack tool targets omit this pack-specific field.                                    |
| `tools remove`                        | `target`, `dryRun`, `result`                                              | optional `lifecycle: PackLifecycleOutcome[]` for packs | Pack apply/verification failure returns structured partial/error evidence and exit 1; non-pack tool targets omit this pack-specific field.                                    |
| `status`                              | `scope`, `reports`, `summary`, `packs`, optional remediation              | `packEvidence: PackEvidenceBlockV1`                    | Inventory unavailability does not throw; it retains known scope facts and follows the predecessor's warning/exit policy while unrelated existing status findings keep theirs. |
| `doctor`                              | `scope`, `checks`                                                         | `packEvidence: PackEvidenceBlockV1`                    | Evidence diagnostics also project to existing checks; the current doctor fail/warn exit policy remains authoritative.                                                         |

For one compatibility release, legacy `packs`/`pack` inventory values and
their legacy `placement` field remain byte-shape compatible and are marked
deprecated in TypeScript/docs. New selectors, human renderers, and clients use
`packEvidence.items[].realizedPlacement`. The legacy field is not silently
reinterpreted. A later removal or semantic promotion requires its own release
note and schema transition.

Human output is generated from the new evidence model. Errors identify the
failed layer and include recovery actions. Home paths render as `~` or
scope-relative paths.

### Provider Configuration and Inspection

`oat providers set --scope user` becomes a supported command rather than a
catalog-only promise. Provider list/inspect output adds separate activation,
capability, materialization, and visibility fields and includes native-read
mappings instead of filtering them out of the reported content surface.

No provider process is launched by list, inspect, status, or doctor.

### Project Guidance Choice

`oat init`, aggregate tools installation, and
`oat tools install workflows` accept:

```text
--project-guidance       explicitly create or refresh managed guidance
--no-project-guidance    explicitly decline guidance
```

In interactive mode, absence of either flag prompts once and defaults to no.
In non-interactive mode, absence means no mutation plus an actionable notice.
The flag changes no pack scope and no PJM state.

### Collection Alias Adoption

`oat sync` retains `--strategy auto|symlink|copy`. Under `auto`, an absent
provider collection may receive an OAT-created alias and an existing exact
safe alias may be adopted without rewriting. Existing real directories are
never converted in the first release; they remain on per-entry sync. Dry-run
reports the same collection transaction and fallback reasons that apply will
execute.

### Dispatch Provenance Recording

Project-aware provider skills and wrappers use:

```text
oat project dispatch record \
  --project <project-path> \
  --event-file <json-file-or-dash> \
  --json
```

The input is the complete canonical generic dispatch record plus a strict
namespaced `oat` evidence event. The command resolves project scope, verifies
that generic fields were not redefined, validates the transition, atomically
updates that request's canonical record, and returns it. `-` reads one event
from standard input. The command never launches a provider and never accepts
prompt or message content.

Provider wrappers create or update the record immediately around the native
launch call. Other workflows, including gates, may retain only its stable
request ID or path; this design adds no gate receipt fields or gate lifecycle.

## Security Considerations

### Authentication

No new authentication is introduced. Commands run with the invoking user's
local filesystem and provider authority. Provider credentials and environment
values are never inspected or persisted by evidence collection.

### Authorization

- Pack mutation remains limited to validated `.agents` and `.oat` managed
  roots.
- Provider projection remains limited to registered scope-relative mappings.
- Project guidance requires an interactive affirmative answer or explicit
  non-interactive flag.
- Existing provider directories are never replaced by collection aliases in
  the first release.
- Dispatch fallback requires a recorded pre-start rejection and caller policy;
  the recorder cannot grant new provider, model, route, tool, sandbox, or
  authority permissions.

### Data Protection

- **Encryption:** No new remote or encrypted storage is required. Data remains
  local repository/config state.
- **Sensitive content:** Dispatch journals exclude prompts, messages,
  credentials, transcript bodies, and role-file contents.
- **Path redaction:** Home paths serialize with `~`; project paths serialize
  relative to the project root. Raw absolute paths remain process-local.
- **Input validation:** Zod schemas validate config, manifest V2, provider
  registrations, JSON evidence, and dispatch events at boundaries.

### Threat Mitigation

- **Symlink traversal:** Collection and `AGENTS.md` paths receive lexical,
  realpath, lstat, containment, exact-target, and apply-time ancestry checks.
- **Race-swapped targets:** Plans retain identity proof and repeat lstat/realpath
  immediately before mutation; mismatch aborts without retry.
- **Unmanaged-content loss:** Provider divergence falls back to per-entry sync.
  Existing real directories are never converted in the first release.
- **Canonical deletion through alias:** No child remove/update operation is
  allowed below an inherited collection. Removing an OAT-created alias unlinks
  only the provider link.
- **Instruction-file overwrite:** Duplicate/malformed markers and external or
  broken root symlinks block managed-section updates.
- **Dispatch evidence forgery:** Validation preserves every canonical generic
  field, requires stable IDs and provider-wrapper launch attestation, and
  limits additions to the namespaced schema. Runtime self-report cannot
  overwrite configured invocation or launch status.

## Performance Considerations

### Scalability

The workload is local and bounded by packs, scopes, providers, mappings, and
managed assets. Provider activation is resolved once per scope. Canonical
inventory is computed once per pack/scope and reused by picker, lifecycle, and
report projection during a command.

Collection identity proof scans one provider collection only when the mapping
is eligible for alias creation/adoption. Digests and directory listings are
memoized within the command, not across commands.

### Caching

- **Layer:** Per-command in-memory memoization only.
- **Strategy:** Cache resolved provider scope context, canonical digests, and
  exact collection proof by scope root and mapping.
- **Invalidation:** Discard all cached facts at command exit and after any
  mutation affecting the key.
- **Runtime observations:** Never cached across provider sessions.

### Database Optimization

No database is used. JSON manifests and journals are small, scope-local files.
One dispatch request updates one journal file instead of rewriting unrelated
records.

### Resource Limits

- **Memory:** Linear in the managed inventory and active provider matrix.
- **CPU:** Dominated by content digests already required for drift and exact
  collection proof.
- **Network:** None for static inventory, sync planning, status, doctor, or
  restart advice.
- **Processes:** No provider process is launched for basic evidence. Optional
  probes and transcript observations remain separate capability-gated work.

## Error Handling

### Error Categories

- **Unknown inventory:** Emit `inventory-unavailable`, retain known scope
  context, and do not choose or report a placement default as fact.
- **Unsupported provider capability:** Fail the affected provider/content
  lifecycle stage with an exact project-scope or provider-config recovery.
- **Canonical apply failure:** Preserve unrelated config/assets, omit intent
  writes that follow the failed verification, and report `failed`.
- **Provider sync failure:** Preserve verified canonical state and report a
  `partial` outcome with affected provider/content/assets.
- **Visibility unknown:** Report `unknown` or `not-reported`; do not convert it
  to an error or success.
- **Unsafe collection or guidance path:** Block that mutation with the rejected
  path class and safe recovery. Do not follow or replace it.
- **Dispatch record violation:** Reject the update, preserve the prior
  canonical record, and block launch/fallback progression.
- **Runtime mismatch:** Record a diagnostic only. It cannot authorize fallback,
  replacement, or retry.

### Retry Logic

- Static inventory and safety failures are not retried automatically.
- An apply-time filesystem race aborts and asks the user to re-run from a new
  plan.
- Existing sync per-operation failure accounting remains, but failed evidence
  is not reported as applied.
- Native launch is attempted once. One canonical-instruction fallback may be
  attempted only after qualifying pre-start rejection. No post-acceptance
  outcome can start another route.

### Logging

- **Info:** Requested scopes, retained realized scopes, canonical apply,
  provider materialization changes, guidance action, and restart advice.
- **Warn:** Declared-only intent, partial placement, disabled provider,
  unsupported content, visibility unknown, per-entry collection fallback, and
  deprecated compatibility diagnostic use.
- **Error:** Validation failure, unsafe path, canonical verification failure,
  provider materialization failure, invalid dispatch transition, or missing
  canonical fallback instructions.
- **JSON parity:** Every human message derives from a structured evidence or
  lifecycle record. Logs redact home paths and omit sensitive content.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification         | Key Scenarios                                                                                                                                                     |
| ---- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1  | unit + integration   | Every layer has explicit source/state; unknown is preserved; human/JSON parity                                                                                    |
| FR2  | e2e                  | Issue #228 ideas, utility, research, brainstorm user selection; declared-only project intent; additive verified placement; auto-sync scopes; verified completion  |
| FR3  | integration          | Absent, declared-only, partial, current, drifted, newer, duplicate, provider-unreachable across picker/list/install/status/doctor                                 |
| FR4  | unit + integration   | Enabled/disabled/unset/detected matrix; every provider/scope/content row; managed Claude/Codex/Cursor roles; unsupported recovery                                 |
| FR5  | integration          | Absent collection, exact relative/absolute alias, real-directory per-entry fallback, divergence, broken/foreign/nested/race-swapped link, add/remove, disablement |
| FR6  | integration          | Missing/existing/contained-symlinked `AGENTS.md`; opt-in, decline, non-interactive, repeated runs, legacy block, unrelated content                                |
| FR7  | unit + integration   | Changed/current/failed/unsupported materialization under live/manual/restart/unknown provider policies                                                            |
| FR8  | unit + integration   | Native accept, qualifying pre-start rejection, preserved-controls fallback, instruction digest/version, no post-acceptance replacement                            |
| FR9  | integration          | Matching, mismatching, missing, and not-reported sanitized metadata; no prompts/messages; no fallback trigger                                                     |
| FR10 | integration          | PR #227 config preservation, PR #240 drift/seed/mode/ownership, PR #242 root order/exact identity/native-first                                                    |
| NFR1 | integration          | Managed-root containment, no-follow ancestry, race fixtures, unmanaged preservation, redacted durable paths                                                       |
| NFR2 | integration          | Repeated init/install/sync/guidance/dispatch records; partial canonical/provider failure; atomic collection/manifest/record writes                                |
| NFR3 | unit + integration   | Source-qualified diagnostics and recovery; generic fallback always marked approximation                                                                           |
| NFR4 | integration + manual | V1 manifest compatibility, JSON transition, skill versions, lockstep package versions, release/docs gates                                                         |
| NFR5 | unit                 | No provider launch/network in static inventory; per-run observation lifetime; bounded resolver calls                                                              |

### Unit Tests

- **Scope:** Pure placement, scope selection, evidence projection, provider
  capability resolution, restart advice, collection proof classification,
  guidance planning, dispatch-record augmentation validation, and renderers.
- **Coverage Target:** Every discriminated state and transition has a direct
  assertion. The repository has no numeric coverage gate, so branch/state
  coverage is the enforceable target.
- **Key Test Cases:**
  - declared-only intent never sets realized placement;
  - physical partial state remains realized and partial;
  - explicit provider config precedence is unchanged;
  - missing capability rows become unknown;
  - accepted dispatch rejects every fallback event;
  - runtime mismatch leaves launch/fallback unchanged.

### Integration Tests

- **Scope:** Real temporary scope roots, configs, manifests, provider
  directories, pack lifecycle, sync extensions, `AGENTS.md`, journals, status,
  and doctor.
- **Test Environment:** `mkdtemp` roots with injected homes/configs and isolated
  `HOME` for bundle-tier tests. Provider adapters and catalog observations are
  injected; no live provider is required for static tests.
- **Key Test Cases:**
  - issue #228 pre-install picker and post-install output for all four packs;
  - active provider cross-product for project/user and skill/agent/rule;
  - canonical success plus provider failure yields partial evidence;
  - exact collection adoption and unsafe/divergent fallback lose no content;
  - foreign content created after collection preflight causes `EEXIST`, stays
    byte-for-byte unchanged, and produces no manifest ownership;
  - guidance update is idempotent and preserves user text;
  - canonical dispatch record survives rejection, links exactly one fallback
    record, and rejects illegal generic-field rewrites;
  - compatibility suites for PR #227, #240, and #242 remain green.

### End-to-End Tests

- **Scope:** CLI argument parsing, prompts, JSON, scope application, auto-sync,
  and completion output.
- **Test Scenarios:**
  - `--scope user` and `--scope=user` behave identically;
  - aggregate and per-pack installs share additive verified-placement
    semantics;
  - non-interactive guidance requires explicit opt-in;
  - `oat providers set --scope user` controls later user sync;
  - dry-run and apply serialize the same collection plan;
  - dispatch record CLI preserves the canonical generic schema and rejects
    sensitive or invalid namespaced input.

Evidence-grade verification uses uncached Turbo where relevant and runs the
focused smoke, skill, release, and validation suites separately when their
contracts change.

## Deployment Strategy

### Build Process

No new build system or external dependency is required. TypeScript compiles in
the existing CLI package; bundled skills/agents/docs follow the existing asset
bundle. Every shipped phase advances all five public package versions in
lockstep above freshly fetched `origin/main`.

### Deployment Steps

1. Land the accepted `scope-adoption-diagnostics` implementation and record its
   final SHA, or formally reconcile that project if its scope changes.
2. Rebase and revalidate this project's plan against the landed inventory,
   doctor/status, and test seams.
3. Land the shared evidence/placement/provider-registry contract before any
   child implementation consumes it.
4. Stage provider materialization/restart and collection-alias work
   sequentially because both change sync planning, manifests, and provider
   tests.
5. Allow AGENTS guidance and dispatch provenance to proceed as independent
   reviewed slices after the shared contract, provided they do not share a
   release fan-in worktree.
6. Run the repository Definition-of-Done gates in documented CI order with
   explicit exit codes, plus lint/format for touched skills or smoke tooling.

### Rollback Plan

Each shipped slice is independently revertible. Readers continue accepting
manifest V1. After any V2 manifest exists, rollback must use the released
compatibility reader that accepts V2 and treats collection records read-only;
downgrading to a V1-only binary is unsupported because it cannot safely
interpret collection ownership. Disabling new collection creation preserves
existing records and never deletes provider or canonical content.
Provider materialization rollback detaches only verified OAT ownership.
Guidance rollback leaves the managed section in place unless an explicit
removal is separately authorized. Dispatch journal files are inert evidence
and remain readable even if recording is reverted.

### Configuration

- **Environment Variables:** None added.
- **Feature Controls:** Existing provider enabled/strategy config remains
  authoritative. Existing real directories always use per-entry sync in the
  first release. Project guidance requires prompt approval or a CLI opt-in
  flag.

### Monitoring

There is no hosted telemetry. Human and JSON outcomes expose counts and states
for canonical apply, provider materialization, collection fallback, restart
advice, and dispatch transitions. Release monitoring uses CI, release dry-run,
and smoke artifacts.

## Migration Plan

No database or remote data migration is required.

### Migration Steps

1. Accept both manifest V1 and V2. Normalize V1 to empty collections in memory;
   write V2 only after a successful sync apply.
2. Add explicit intent, scope availability, and `realizedPlacement` fields.
   Retain each command's old JSON fields and legacy `placement` meaning for one
   compatibility release; new selectors and renderers use only the new model.
3. Keep `user-agent-unmaterialized` for one compatibility release as a summary
   derived from provider evidence. New consumers use provider-specific codes.
4. Expand user scanning to agents only after the provider registry and
   materialization conflict tests are in place.
5. Add real user-scope support to `oat providers set`; existing config files
   already parse the necessary provider entries.
6. Migrate legacy `OAT workflows` guidance only during explicit guidance
   opt-in; declining or non-interactive default makes no change.
7. Preserve `DispatchReportV1`, its compatibility stamp, and the canonical
   generic dispatch record. Add only namespaced OAT provenance; old project
   dispatch notes remain valid with runtime/fallback evidence not reported.
8. Update bundled skills and tests to attest canonical records around native
   launches. No old record is synthesized from prose.

### Rollback Strategy

- Manifest V2 readers must tolerate collection entries after collection
  creation is disabled and must never translate them into child deletions.
- Scope/report rollback may omit new fields but may not restore intent-based
  installed labels.
- Provider rollback preserves canonical user agents and removes only unchanged
  OAT-owned provider records.
- Dispatch rollback stops new recording but preserves journals as inert
  evidence.

### Data Validation

- Load round-trip fixtures for V1 and V2 manifests.
- Compare pre/post migration canonical and provider trees byte-for-byte except
  for planned managed outputs.
- Verify config sibling fields from PR #227 remain unchanged.
- Verify every manifest collection target and dispatch journal path is
  scope-relative/redacted.
- Verify repeated migration/sync produces no semantic change.

## Open Questions

- **Diagnostics predecessor:** Which final landed
  `scope-adoption-diagnostics` SHA and implemented interfaces become the
  planning baseline? Its approved plan is active on the laptop, but its
  observed `25c28dbd1` head is not a completion or landing SHA.
- **Release grouping:** Should the shared contract and four child slices ship
  as several sequential PRs, as recommended, or one large release PR? The
  design keeps one umbrella project either way.

## Implementation Phases

### Phase 0: Predecessor Landing and Revalidation

**Goal:** Establish one accepted current-main diagnostic baseline.

**Tasks:**

- Allow the approved laptop `scope-adoption-diagnostics` run to complete its
  sequential nine-task plan; do not edit its shared source files from this
  project while it is active.
- Record the landed SHA and compare actual types/renderers/tests with this
  design.
- Rebase and revise only affected interfaces before planning execution.

**Verification:** The predecessor is merged at the recorded SHA, its focused
and release gates pass there, and no overlapping umbrella source
implementation occurred before the rebase.

### Phase 1: Shared Evidence and Truthful Scope

**Goal:** Land the normalized canonical/provider contract and fix issue #228
scope behavior without broad provider mutation yet.

**Tasks:**

- Separate realized placement from intent.
- Add provider registry and scope context.
- Add pack evidence and lifecycle outcome projections.
- Make picker, aggregate/per-pack installs, list, status, and doctor consume the
  normalized report.
- Add issue #228 and baseline compatibility tests.

**Verification:** Declared-only state never renders installed; four reported
user selections realize user only when no other scope is physically present;
human/JSON agree.

### Phase 2: Provider Materialization and Restart Truth

**Goal:** Make supported user agents reachable and report visibility limits.

**Tasks:**

- Expand user canonical agent scanning under registry control.
- Add per-asset materialization evidence to core and extension results.
- Materialize supported managed roles, including Claude user roles.
- Add user provider configuration support and provider inspection fields.
- Establish versioned catalog-refresh provenance for registered providers from
  an official contract, reproducible local validation, or repository decision.
  At least one supported provider must receive a sourced non-`unknown` policy
  before FR7 is considered delivered; otherwise return to HiLL review and
  record the first-release limitation instead of shipping vacuous advice.
- Add restart/refresh adviser and documentation.

**Verification:** Provider/scope/content cross-product tests pass; missing,
unsupported, failed, and sourced restart-required states have distinct
recovery, while unsourced refresh behavior stays unknown.

### Phase 3: Collection Alias Child

**Goal:** Implement safe collection inheritance with explicit ownership.

**Tasks:**

- Add manifest V2 and collection plan types.
- Add exact identity/divergence proof and apply-time safety.
- Integrate collection plans into compute/apply/drift/disable behavior.
- Document automatic absent-target creation, existing alias adoption, the
  atomic alias/manifest transaction, and first-release real-directory
  fallback.

**Verification:** Alias integration suite proves deterministic add/remove,
disablement, repeated sync, race rejection, and zero unmanaged loss.

### Phase 4: Project Guidance Child

**Goal:** Offer one independent and safe project guidance choice.

**Tasks:**

- Add prompt/flag resolution shared by init and workflows installation.
- Harden managed-section path/marker/atomicity behavior.
- Reuse the tools section and handle legacy workflows only on opt-in.
- Add CLI and docs coverage for scope versus guidance versus adoption.

**Verification:** All entry points produce one idempotent section; decline and
non-interactive default produce zero writes.

### Phase 5: Dispatch Provenance Child

**Goal:** Add executable pre-launch, rejection, fallback, and outcome lineage.

**Tasks:**

- Extract the PR #242 exact canonical-role resolver into production code.
- Add namespaced generic-record augmentation, validation, atomic persistence,
  CLI, and rendering.
- Integrate the resolver and provider wrappers; lifecycle skills preserve the
  canonical record and may reference it without redefining gate receipts.
- Preserve the compatibility stamp and native provider/model/effort/route
  controls.

**Verification:** Native acceptance closes replacement; only qualifying
pre-start rejection permits one exact-target approximation; sensitive content
cannot enter a journal.

### Phase 6: Optional Runtime Observation and Integrated Release

**Goal:** Consume `BL-260826` metadata when available and close the umbrella.

**Tasks:**

- Integrate sanitized matching/missing/mismatching/not-reported observations
  without changing launch state.
- Run cross-child human/JSON/docs consistency tests.
- Advance lockstep package and changed skill versions.
- Archive backlog items only after their owned acceptance criteria are met.
- Run the complete repository gate sequence.

**Verification:** Optional observation remains non-authoritative; every P0
requirement and release gate passes at the final reviewed head.

## Dependencies

### External Dependencies

No new library, network service, credential, or provider API is required for
the P0 static evidence and materialization work. Optional runtime observation
depends on provider transcript metadata already scoped by `BL-260826`.

### Internal Dependencies

- Merged PR #227 project-artifact scope and config preservation.
- Merged PR #240 inventory, lifecycle, seed, drift, ownership, and mode rules.
- Merged PR #242 canonical-role identity and native-first dispatch rules.
- Final accepted and landed `scope-adoption-diagnostics` baseline.
- Provider adapters, scanner, sync planner/executor, extensions, manifest,
  status/doctor renderers, and dispatch report/stamp modules.
- Backlog children `BL-260724`, `BL-260828`, and `BL-260826`.

### Development Dependencies

Existing TypeScript, Zod, Vitest, pnpm, Turborepo, oxlint, oxfmt, and docs
tooling are sufficient.

## Risks and Mitigation

- **Evidence model becomes a universal runtime catalog:** Probability Medium |
  Impact High
  - **Mitigation:** Keep config, canonical, materialization, visibility,
    dispatch, and runtime facts as separate records; static commands never
    launch providers.
  - **Contingency:** Remove unsupported probe fields and report unknown rather
    than broadening provider integration.

- **Diagnostics predecessor changes its reviewed interfaces:** Probability
  Medium | Impact High
  - **Mitigation:** Treat its landed SHA as a planning gate and prohibit
    concurrent implementation.
  - **Contingency:** Revise the umbrella plan and consume the actual seam; do
    not duplicate its renderer or ownership corrections.

- **Intent-based placement compatibility surprises consumers:** Probability
  Medium | Impact Medium
  - **Mitigation:** Add explicit intent and realized fields without
    reinterpreting each command's legacy JSON field during the compatibility
    release; cover exact command-shape snapshots.
  - **Contingency:** Extend the compatibility window while keeping selectors
    and human installed labels on verified realized evidence.

- **Provider registry drifts from mappings/extensions:** Probability Medium |
  Impact High
  - **Mitigation:** Validate every mapping and extension has matching
    capability rows and generate provider inspection from registrations.
  - **Contingency:** Mark unmatched rows unknown and fail release validation.

- **User-agent expansion causes duplicate provider writes:** Probability
  Medium | Impact High
  - **Mitigation:** Declare per-content projection modes and extension
    ownership, then test core-plan/extension target collisions before enabling
    user agent scanning.
  - **Contingency:** Disable the conflicting registry row and report
    unsupported until one owner is selected.

- **Unsafe collection alias transaction hides or deletes user content:** Probability
  Medium | Impact High
  - **Mitigation:** Ship absent-target creation and exact-alias adoption only,
    bind alias creation and manifest commit into one recoverable transaction,
    and forbid child mutations through aliases.
  - **Contingency:** Disable collection creation while retaining a V2-aware
    read-only compatibility reader; continue per-entry sync.

- **Filesystem presence is rendered as session visibility:** Probability High |
  Impact High
  - **Mitigation:** Visibility defaults unknown; only current observation proves
    visible and only successful current-run changes can trigger static restart
    advice.
  - **Contingency:** Remove visibility claims and retain materialization-only
    evidence until a trustworthy probe exists.

- **Guidance update follows an unsafe symlink or malformed marker:** Probability
  Low | Impact High
  - **Mitigation:** Containment, no-follow/apply-time checks, unique markers,
    atomic writes, and explicit opt-in.
  - **Contingency:** Emit a manual recovery block without changing the file.

- **Fallback record legitimizes a different target:** Probability Medium |
  Impact High
  - **Mitigation:** Immutable configured payload, exact trigger linkage,
    preserved controls, canonical digest, approximation flag, and transition
    reducer.
  - **Contingency:** Block fallback and return to the user when any axis cannot
    be preserved.

- **Runtime observation overwrites configured truth:** Probability Medium |
  Impact High
  - **Mitigation:** Separate field, strict metadata-only schema, non-authority
    rule, and no-replacement transition tests.
  - **Contingency:** Store `not-reported` and omit provider parser integration.

- **Multiple child PRs collide at release fan-in:** Probability High | Impact
  Medium
  - **Mitigation:** Land shared/sync phases sequentially, isolate AGENTS and
    dispatch slices, fetch `origin/main` before each lockstep bump, and archive
    each backlog item once.
  - **Contingency:** Rebase the later slice and choose a fresh version; do not
    run simultaneous release bookkeeping.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Laptop-clone sibling project
  `scope-adoption-diagnostics/.oat/projects/shared/scope-adoption-diagnostics/plan.md`
  (explicitly approved; implementation initialized at observed head
  `25c28dbd1`; final landed SHA still pending)
- `BL-260829-make-tool-pack-scope-selection`
- `BL-260724-support-provider-directory`
- `BL-260828-add-project-level-oat-guidance`
- `BL-260826-populate-native-subagent`
- PR #227 merge `a3ac2a01982c02e8690d5016912917b7bf3307b7`
- PR #240 merge `cd07d72e51eaa3c50660612186a54550067d20e5`
- PR #242 merge `ce7c3225da52508a123849cdd549f449651a5770`
- `.oat/repo/reference/project-summaries/20260830-agent-provider-root.md`
- `.oat/repo/knowledge/architecture.md`
- `.oat/repo/knowledge/conventions.md`
- `.oat/repo/knowledge/testing.md`
