---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: false
---

# Design: Remote Project Management

## Overview

The selected architecture is a local-first, provider-neutral remote binding
system layered onto PJM. A compact association remains in backlog or project
frontmatter for humans, while strict versioned sidecar records hold operational
identity, snapshots, reconciliation baselines, policy restrictions, capability
evidence, operation intent, attempts, and receipts. A binding is the atomic
reconciliation and outcome unit. Higher-level item, project, repository, and
closeout workflows aggregate binding outcomes but never claim a distributed
transaction.

The implementation separates semantic provider adapters from transport
execution. GitHub, Linear, and Jira adapters normalize provider records and map
semantic operations. CLI transports run through a safe injected process runner.
Host MCP or connector transports use a versioned external-action protocol:
tested CLI code persists an intent and emits a bounded action envelope, an OAT
skill invokes the host connector, and the CLI accepts a schema-validated,
sanitized observation before deciding the next step. This boundary is required
because OAuth connector tools are available to the agent host, not directly to
the Node process.

All mutation flows resolve policy, probe exact provider context and capability,
refresh remote state, create a digest-bound preview, persist intent before any
effect, attempt once, and verify through authoritative read-back. Transport
fallback is permitted only before an attempt starts. Any partial or unknown
outcome freezes the route and requires reconciliation. The design deliberately
does not introduce background synchronization, webhooks, locks, leases, or
provider-to-provider mirroring.

## Resolved Design Questions

| Question                               | Decision                                                                                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Association versus operational storage | Keep `associated_issues` compact and compatible; store strict binding and operation records under `.oat/repo/pjm/remote/`.                                                                                         |
| Legacy association shapes              | Accept legacy scalar and `{type, ref}` entries as reference-only. Only an explicit binding identifier enables remote operations.                                                                                   |
| Repository versus user policy          | Shared repository config owns mutation and description policy. User/local config owns transport preference. A dedicated resolver merges them without allowing user config to broaden repository authority.         |
| Managed description content            | Provider codecs own strict section location and replacement. Markdown uses visible OAT heading plus sentinels; Jira uses a uniquely anchored ADF container. Missing, duplicate, or malformed anchors fail closed.  |
| MCP execution                          | Use a host-executor action/observation protocol driven by `oat-pjm-remote`; do not add a direct MCP client or first-party Linear GraphQL client in V1.                                                             |
| Revision evidence                      | Prefer provider revision tokens; otherwise retain updated time plus canonical content hash and label the strength. Unknown revision strength degrades preview confidence but never removes read-back verification. |
| Batch behavior                         | Produce one reviewed batch preview and one outcome per binding. Successful bindings are not rolled back when another binding fails.                                                                                |
| Jira fidelity gaps                     | Advertise only capabilities demonstrated by Rovo MCP or ACLI. Missing changelog, custom-field, archive, or transition metadata returns a degraded or unsupported capability instead of silently adding Jira REST.  |

## Architecture

### System Context

PJM remains the durable local system of record for backlog and project work.
Remote management is an optional adopted capability inside the existing PJM
surface. Repositories without remote configuration behave exactly as they do
today.

The current `associated_issues` field is inert, unvalidated metadata. The new
design treats it as a compatibility-facing link, not as an already-existing
synchronization subsystem. Rich records are introduced explicitly and remain
separate from the existing Git-ref project sync subsystem.

**Key Components:**

- **Association codec:** Reads legacy and canonical human-facing links.
- **Remote config resolver:** Computes effective authority, description policy,
  and transport order from separately owned config layers.
- **Remote sync store:** Persists strict bindings and operation journals.
- **Local projection resolver:** Maps a backlog item or explicit project
  publication projection into normalized shared fields.
- **Reconciliation engine:** Computes per-field base/local/remote differences
  and proposed actions.
- **Authority and preview engine:** Applies purpose defaults, configured policy,
  hard approval floors, and digest-bound approvals.
- **Provider adapters:** Translate GitHub, Linear, and Jira records while
  preserving extensions.
- **Transport registry:** Probes and selects capable configured transports.
- **Mutation coordinator:** Enforces persist-before-effect, one attempt, and
  read-back verification.
- **Agent-host executor bridge:** Lets skills execute MCP or connector actions
  without moving correctness into skill prose.
- **Lifecycle commands and skill:** Expose intake, publish, refresh, reconcile,
  and closeout.
- **PJM doctor and migration:** Diagnose and explicitly upgrade compatibility
  records without making remote setup an adoption requirement.

### Component Diagram

```text
Backlog item / Project state
        |
        | associated_issues: compact link + optional binding ID
        v
Association codec -----> Remote sync store <------ PJM doctor / migration
                              |    |
                              |    +---- operation journals and receipts
                              v
Local projection ---> Reconciler <--- Provider adapter <--- Remote snapshot
                              |
                       Policy + preview
                              |
                    Mutation coordinator
                      /               \
             Safe CLI runner      External-action bridge
             gh / linear-cli /    OAT skill -> MCP connector
             acli                      |
                      \               /
                       Provider read-back
                              |
                       Verified outcome
```

### Persistence Layout and Storage Classes

Portable binding metadata and operational state have different privacy and
portability requirements.

```text
Portable metadata for shared backlog targets:
.oat/repo/pjm/remote/bindings/<binding-id>.json

Portable metadata for shared or synced project targets:
<project-path>/remote/bindings/<binding-id>.json

Default operational state shared by worktrees on one machine:
<git-common-dir>/oat/pjm-remote/<repository-fingerprint>/
├── bindings/<binding-id>.json
├── operations/<operation-id>.json
└── batches/<batch-id>.json
```

Portable metadata contains stable provider identity, aliases, purposes, target,
and non-secret policy restrictions. It never contains descriptions, baselines,
process output, capability probe evidence, approvals, attempts, receipts, or
provider payloads. Metadata for a local project target stays in the common
local store rather than entering tracked repository state. Synced project
metadata travels with that project's existing synced artifact ref rather than
the shared branch.

Operational state is local and gitignored by default, but lives under the Git
common directory so all worktrees on the same machine see the same binding
snapshot, journal, and batch history. A new clone must run refresh to populate
its own local state. Repositories may explicitly select shared operational
storage in `.oat/config.json`; that opt-in requires a previewed user approval
because sanitized ticket content and audit history will enter Git history. In
shared mode, operational records live beside the owning portable metadata and
follow the owning shared or synced scope. Local project targets cannot select
shared operational storage.

All records use deterministic JSON with independent schema versions and stable
IDs rather than mutable paths. Directories are created lazily and do not affect
PJM adoption completeness. No credential, raw authentication header, comment
thread, activity history, or assignee detail may be stored.

The operational binding state contains the bounded core snapshot, including
the complete non-secret remote description. “Bounded” refers to the allowed
field set, not arbitrary truncation. High-confidence credential values are a
hard safety exception: they are replaced with explicit redaction markers before
persistence, the snapshot is marked `contentRedacted`, and the user is told
that the locally retained description is not byte-complete. Provider extensions
use an adapter allowlist and byte limits so an adapter cannot persist an
unbounded raw response.

### Data Flow

#### Read-only refresh or intake

1. Resolve the compact association or explicit provider reference.
2. Resolve ordered transports and probe exact account, workspace, site, team,
   and repository context.
3. Select the first available transport that advertises the required read
   capability.
4. Read and normalize the remote issue.
5. Redact credential values, mark any redaction, and persist the complete
   non-secret core snapshot and capability evidence atomically.
6. For intake, create or enrich the local target and establish the initial
   inbound reconciliation baseline.
7. Emit freshness, revision strength, and lifecycle condition without claiming
   any mutation.

#### Reconciliation

1. Load the binding, last-agreed baseline, current local projection, and current
   remote snapshot.
2. Refresh the remote snapshot unless explicitly running an offline comparison.
3. Compute normalized field deltas according to binding purposes and field
   policy.
4. Classify each field as no change, local-only, remote-only, converged,
   disjoint, or conflict.
5. Add lifecycle anomalies and uncertain-operation blocks.
6. Resolve effective authority and description mode for each proposed operation.
7. Emit a preview with an exact digest over binding, target, baseline, observed
   revision, capability fingerprint, and requested field mask.

#### Mutation

1. Require an explicit user instruction or fresh preview approval when the
   effective mode demands it. Complete-description replacement and destructive
   actions always require fresh approval.
2. Persist an operation in `planned`, then `authorized`, before external
   execution.
3. Re-probe identity/capability and re-read the target. Reject a stale preview.
4. Pin the selected transport and persist `attempt-started`.
5. Perform one mutation attempt.
6. Read the target back through the pinned transport and the same provider
   context. If that read is unavailable or ambiguous, persist `uncertain` and
   enter reconciliation; a different transport may contribute evidence only in
   that separate flow after identity and context equivalence are re-established.
7. Verify the requested field mask. Advance the binding snapshot and baseline
   only for verified postconditions.
8. Persist `verified`, `partial`, `uncertain`, or `rejected`. Partial or
   uncertain outcomes block retry and transport switching until reconciliation.

#### MCP or connector action

1. The lifecycle CLI persists the operation and returns
   `external-action-required` with a versioned action envelope.
2. `oat-pjm-remote` discovers the current host tool, validates provider
   context, and invokes exactly the requested semantic action.
3. The skill passes a schema-constrained, sanitized observation to the CLI over
   stdin.
4. The CLI validates the operation and step digests, updates the journal, and
   emits either a verification read action or a terminal outcome.
5. The skill continues the same operation until the CLI returns a terminal
   result. It never independently declares success.

## Component Design

### Association Codec

**Purpose:** Preserve portable human links while introducing stable operational
binding identity.

**Interfaces:**

```typescript
type AssociatedIssueRef =
  | { kind: 'legacy-scalar'; ref: string }
  | {
      kind: 'reference';
      type: string;
      ref: string;
      bindingId?: string; // parsed from the YAML key "binding"
    };

function parseAssociatedIssues(value: unknown): AssociatedIssueRef[];
function serializeAssociatedIssues(
  refs: AssociatedIssueRef[],
): Array<string | { type: string; ref: string; binding?: string }>;
```

**Decisions:**

- Existing scalar values and object values without binding IDs remain valid
  reference-only links.
- Canonical new remote links emit `{type, ref, binding}`.
- An association cannot authorize a remote write. The referenced strict binding
  record and resolved policy are authoritative.
- Doctor reports dangling or mismatched binding IDs; it does not silently
  rewrite historical records.

### Purpose Policy Composer

**Purpose:** Make the uncommon multi-purpose binding safe and deterministic.

Each purpose contributes a provider-neutral default policy before repository,
provider, and binding restrictions are applied:

| Purpose     | Shared-field directions                    | Closeout defaults                                        |
| ----------- | ------------------------------------------ | -------------------------------------------------------- |
| `source`    | title/description/priority inbound only    | annotation or provider-valid transition may be proposed  |
| `planning`  | allowed shared fields inbound and outbound | annotation and provider-valid transition may be proposed |
| `delivery`  | no shared-field reconciliation             | defer to provider-native delivery automation             |
| `reference` | no shared-field reconciliation             | no remote action                                         |

Field directions compose by intersection, never union. A `source + planning`
binding is inbound-only for shared fields because the planning purpose cannot
grant outbound authority to the source purpose. Any combination containing
`delivery` or `reference` has no shared-field direction unless every declared
purpose independently permits that direction. An empty intersection is a safe
no-op, not an implicit grant.

Lifecycle operations compose through the same set intersection. If purpose
defaults request incompatible transition targets or content, the composed
result is `choice-required` and no mutation is planned. Repository/provider
policy and binding restrictions can tighten the composed result but cannot add
a direction or operation removed by purpose composition.

Closeout creates one binding-level composite preview for the remote record. It
deduplicates identical annotation and transition requests, orders any allowed
annotation before an allowed transition, and journals each provider substep.
If one substep succeeds and another cannot be verified, the one combined action
becomes `partial`; it is never repeated as if nothing happened.

```typescript
interface PurposePolicy {
  fields: Partial<
    Record<'title' | 'description' | 'priority', Array<'inbound' | 'outbound'>>
  >;
  lifecycle: MutationClass[];
  closeout: {
    annotation: 'propose' | 'none';
    transition: 'propose' | 'provider-automation' | 'none';
  };
}

function composePurposePolicies(
  purposes: RemoteBindingRecord['purposes'],
): ComposedPurposePolicy;
```

### Remote Configuration Resolver

**Purpose:** Resolve security-sensitive repository policy separately from
machine/user transport preference.

**Shared repository configuration:**

```json
{
  "pjm": {
    "initialized": true,
    "schemaVersion": 1,
    "remote": {
      "schemaVersion": 1,
      "storage": { "state": "local" },
      "policy": {
        "description": "none",
        "authority": {
          "default": "read-only",
          "operations": {}
        },
        "providers": {
          "github": {
            "description": "managed-section",
            "authority": {
              "operations": { "annotate": "user-approved" }
            }
          }
        }
      }
    }
  }
}
```

**User configuration (`~/.oat/config.json`):**

```json
{
  "pjm": {
    "remote": {
      "transports": {
        "github": ["gh", "mcp"],
        "linear": ["mcp", "linear-cli"],
        "jira": ["mcp", "acli"]
      }
    }
  }
}
```

**Repository-local override (`.oat/config.local.json`):**

The same `pjm.remote.transports` shape may override the user default for one
checkout or machine. Shared `.oat/config.json` does not accept transport order;
it owns policy and storage only.

Built-in transport defaults are `github: [gh]`, `linear: [mcp]`, and
`jira: [mcp]`. Optional fallbacks are used only when configured and available.
No external executable is installed by OAT.

**Interfaces:**

```typescript
type DescriptionMode = 'replace' | 'managed-section' | 'none';
type MutationAuthority =
  | 'read-only'
  | 'user-approved'
  | 'user-authorized'
  | 'autonomous';
type MutationClass =
  | 'create'
  | 'update-fields'
  | 'transition'
  | 'annotate'
  | 'delete'
  | 'relink'
  | 'detach'
  | 'recreate';

type ProviderName = 'github' | 'linear' | 'jira';

interface AuthorityPolicy {
  default?: MutationAuthority;
  operations?: Partial<Record<MutationClass, MutationAuthority>>;
}

interface ProviderRemotePolicy {
  description?: DescriptionMode;
  authority?: AuthorityPolicy;
}

interface RepositoryRemotePolicy {
  description: DescriptionMode;
  authority: AuthorityPolicy & { default: MutationAuthority };
  providers?: Partial<Record<ProviderName, ProviderRemotePolicy>>;
}

interface OatPjmRemoteSharedConfig {
  schemaVersion: 1;
  storage?: { state: 'local' | 'shared' };
  policy: RepositoryRemotePolicy;
}

interface BindingPolicyRestriction {
  description?: DescriptionMode;
  authority?: AuthorityPolicy;
}

interface OatPjmRemoteTransportConfig {
  transports?: Partial<Record<ProviderName, string[]>>;
}

interface EffectiveRemotePolicy {
  description: DescriptionMode;
  authority: Record<MutationClass, MutationAuthority>;
  sources: Record<string, 'default' | 'shared' | 'provider' | 'binding'>;
  hardFloors: Array<
    'replace-description' | 'destructive' | 'identity-resolution'
  >;
}
```

**Precedence and validation:**

- `OatConfig.pjm.remote` in `.oat/config.json` accepts only
  `OatPjmRemoteSharedConfig`; it is the only config surface that may broaden the
  built-in `read-only` and `none` defaults or opt into shared operational state.
- `OatLocalConfig.pjm.remote` in `.oat/config.local.json` and
  `UserConfig.pjm.remote` in `~/.oat/config.json` accept only
  `OatPjmRemoteTransportConfig`.
- Provider policy is nested inside the shared repository policy and may broaden
  or narrow the repository default for that provider.
- A binding override may only tighten:
  `autonomous > user-authorized > user-approved > read-only` and
  `replace > managed-section > none`.
- Transport precedence is repository-local > user > built-in. Each provider
  list replaces the lower-precedence list as an ordered, duplicate-free value;
  lists are not concatenated. An empty list explicitly disables remote
  transport for that provider.
- Built-in defaults remain `github: [gh]`, `linear: [mcp]`, and `jira: [mcp]`.
- `oat config get/list/dump/describe` exposes resolved values and sources.
  For example, `oat config set pjm.remote.policy.description managed-section
--shared` and `oat config set pjm.remote.transports.linear
'["mcp","linear-cli"]' --user` enforce the owning surface; cross-surface
  writes are rejected.
- User/local transport preference cannot modify authority, description policy,
  storage, adoption, or hard floors.
- Unknown or invalid policy values fail closed and produce an actionable doctor
  finding instead of being normalized away.

### Remote Sync Store

**Purpose:** Persist restart-safe bindings and operation evidence.

**Interfaces:**

```typescript
interface RemoteSyncStore {
  readBinding(bindingId: string): Promise<RemoteBindingRecord | null>;
  writeBinding(record: RemoteBindingRecord): Promise<void>;
  listBindings(filter?: BindingFilter): Promise<RemoteBindingRecord[]>;
  readOperation(operationId: string): Promise<RemoteOperationRecord | null>;
  createOperation(record: PlannedOperation): Promise<void>;
  transitionOperation(
    operationId: string,
    expectedState: OperationState,
    update: OperationTransition,
  ): Promise<RemoteOperationRecord>;
  readBatch(batchId: string): Promise<RemoteBatchRecord | null>;
  createBatch(record: PlannedBatch): Promise<void>;
  updateBatch(record: RemoteBatchRecord): Promise<void>;
}
```

Writes use unique temporary files in the destination directory, `fsync` where
supported, atomic rename, and restrictive creation mode. Each operation journal
is first created with exclusive `wx` semantics before any effect. A state
transition requires the expected prior state and rejects duplicate step IDs.

This is process-local compare-before-write, not a cross-process lock or remote
CAS guarantee. The operation directory is authoritative for active intents;
the binding does not claim an enforceable single-pending-operation field. If
two processes start concurrently, both unique journals are preserved. After
every binding-state rename the writer re-reads state and scans journals for the
binding. Multiple active intents become a reconciliation block, and doctor can
reconstruct them even if one process overwrote a derived binding hint. No
concurrent intent may be deleted or blindly retried.

### Local Projection Resolver

**Purpose:** Produce the normalized local side of reconciliation without
copying entire project artifacts to a ticket.

**Behavior:**

- Backlog targets project the frontmatter title and priority plus the explicit
  `## Description` section.
- Project targets require an explicit remote publication projection stored on
  the binding. Discovery, spec, design, plan, implementation, and review
  artifacts are never inferred as ticket content.
- Intake may seed the local projection, but enrichment remains a deliberate
  local edit.
- The projection carries hashes and source evidence so previews can identify
  staleness.

### Reconciliation Engine

**Purpose:** Compute deterministic per-binding B/L/R classifications and proposed
actions.

**Interfaces:**

```typescript
type ReconciliationClass =
  | 'no-change'
  | 'local-only'
  | 'remote-only'
  | 'converged'
  | 'disjoint'
  | 'conflict'
  | 'remote-anomaly'
  | 'uncertain-operation';

interface FieldReconciliation<T> {
  field: 'title' | 'description' | 'priority';
  base: T | null;
  local: T | null;
  remote: T | null;
  classification: ReconciliationClass;
  proposedDirection: 'inbound' | 'outbound' | 'none' | 'choice-required';
}

function reconcileBinding(
  input: ReconciliationInput,
): BindingReconciliationPreview;
```

The engine is pure and provider-neutral. Status is handled by lifecycle
transition policy, not by the shared-field reconciler. In managed-section mode,
the description comparison uses only the uniquely identified managed content;
the full remote body remains in the snapshot for offline context. In `none`
mode, no outbound description action can be proposed.

### Authority and Preview Engine

**Purpose:** Convert reconciliation proposals into permitted, blocked, or
approval-required actions.

Every preview includes:

- binding and stable remote identity;
- provider context and selected transport candidate;
- purposes and effective policy with sources;
- observed revision strength and freshness;
- exact affected fields and before/after values or safe hashes;
- conflict and lifecycle conditions;
- required authorization step;
- a digest binding the preview to all load-bearing inputs.

Fresh approval records the preview digest, operation class, approval time, and
non-secret actor/source evidence. It is not reusable after any field, target,
revision, capability, or policy input changes.

### Provider Adapters

**Purpose:** Preserve provider semantics while implementing one semantic
contract.

```typescript
interface ProviderAdapter {
  readonly provider: 'github' | 'linear' | 'jira';
  probe(input: ProbeInput): Promise<CapabilitySnapshot>;
  resolveIdentity(input: RemoteReference): Promise<RemoteIdentityResolution>;
  normalize(input: ProviderIssue): NormalizedRemoteIssue;
  planRead(input: ReadInput): TransportAction;
  planDiscussionRead(input: DiscussionReadInput): TransportAction;
  planDuplicateSearch(input: DuplicateSearchInput): TransportAction;
  planCreate(input: CreateInput): TransportAction;
  planUpdate(input: UpdateInput): TransportAction;
  planTransition(input: TransitionInput): TransportAction;
  planAnnotation(input: AnnotationInput): TransportAction;
  verify(input: VerificationInput): FieldVerification[];
  managedContent: ManagedContentCodec;
}
```

Provider-specific payloads are namespaced and allowlisted. Adapters advertise
priority mapping, transition metadata, managed-description round-trip support,
duplicate search, and revision strength separately. An unsupported capability
blocks that operation without disabling safe reads.

#### GitHub

- Stable identity includes host, owner, repository ID, issue node/database ID,
  and current issue number/URL aliases.
- Default transport is `gh`; `gh issue` and `gh api` are dialects within
  one transport.
- The adapter verifies every requested field because GitHub surfaces may
  silently omit unsupported fields.
- Pull-request and branch evidence remains delivery evidence, not automatic
  tracker or OAT completion authority.
- Markdown managed content uses a visible `## OAT-managed` heading wrapped by
  unique binding sentinels.

#### Linear

- Stable identity includes workspace, team, issue UUID, and current identifier
  and URL aliases.
- Default transport is host MCP or connector; an installed `linear-cli` is an
  optional configured fallback.
- Exact MCP tools, workspace/team scope, write availability, and connector
  partial-error behavior are runtime capabilities.
- The community CLI is never bundled and its schema/version is probed before
  use.
- First-party GraphQL is deferred; transport failure does not silently activate
  it.

#### Jira Cloud

- Stable identity includes cloud/site ID, project context, immutable issue ID,
  and current key/URL aliases.
- Default transport is Rovo MCP or connector; installed official `acli` is an
  optional configured fallback.
- The adapter discovers create/edit metadata, fields, issue types, and valid
  transitions rather than assuming tenant configuration.
- Missing changelog, archive, arbitrary custom-field, or transition fidelity
  produces explicit degraded capability evidence. V1 does not silently add a
  direct REST credential path.
- Jira Data Center references are rejected as an unsupported provider variant.
- ADF managed content uses one uniquely anchored OAT container. The codec
  requires structural equality for every node, text value, attribute, and mark
  outside that container. It hashes canonical JSON that ignores object key
  ordering while preserving semantically ordered arrays. The original observed
  representation remains evidence, but byte equality is not required. If the
  selected transport cannot demonstrate structural preservation,
  managed-section update is unsupported.

### Managed Content Codecs

**Purpose:** Update only OAT-owned content without overwriting surrounding
remote content.

```typescript
interface ManagedContentCodec<Body = unknown> {
  inspect(body: Body, bindingId: string): ManagedContentInspection;
  insert(body: Body, bindingId: string, content: string): Body;
  replace(body: Body, bindingId: string, content: string): Body;
  verify(body: Body, expected: ManagedContentExpectation): boolean;
}
```

Codecs reject missing anchors during replacement, duplicate anchors, crossing
or malformed sentinels, unexpected node structures, and lossy format
conversion. First insertion is a distinct previewed action. The full body
before and after remains available for preview and verification, but only the
managed region enters the outbound reconciliation baseline.

### Transport Registry and Safe Command Runner

**Purpose:** Probe configured transports and execute discrete, bounded actions.

```typescript
type CapabilityAvailability =
  | 'available'
  | 'authorization-required'
  | 'unsupported-or-unresolved';

interface CapabilitySnapshot {
  schemaVersion: 1;
  provider: string;
  transport: string;
  transportVersion: string | null;
  catalogFingerprint: string;
  context: RemoteAccountContext;
  availability: CapabilityAvailability;
  operations: Partial<Record<SemanticOperation, CapabilityLevel>>;
  permissions: 'known' | 'unknown';
  observedAt: string;
  evidence: SanitizedProbeEvidence;
}

interface SafeCommandRunner {
  run(request: {
    executable: string;
    argv: string[];
    cwd: string;
    timeoutMs: number;
    maxOutputBytes: number;
    environment: Record<string, string>;
  }): Promise<SanitizedProcessResult>;
}
```

Transport config contains registered transport IDs, never shell fragments.
Execution uses discrete argv with no shell interpolation, controlled environment,
bounded time and buffers, injectable process behavior, JSON decoding, and
redaction before logging or persistence.

### Agent-host Executor Bridge

**Purpose:** Use host OAuth connectors while retaining tested state and safety
logic in TypeScript.

```typescript
interface ExternalActionEnvelope {
  schemaVersion: 1;
  operationId: string;
  stepId: string;
  actionDigest: string;
  provider: 'github' | 'linear' | 'jira';
  transport: 'mcp';
  semanticOperation: SemanticOperation;
  context: RemoteAccountContext;
  request: SanitizedProviderRequest;
  expectedObservation: JsonSchemaDescriptor;
}

interface ExternalObservationEnvelope {
  schemaVersion: 1;
  operationId: string;
  stepId: string;
  actionDigest: string;
  observedAt: string;
  toolIdentity: string;
  catalogFingerprint: string;
  context: RemoteAccountContext;
  outcome: SanitizedProviderObservation;
}
```

The bridge accepts observations over stdin, validates size and schema, and
sanitizes again. It rejects stale, duplicated, mismatched, or unplanned steps.
The connector result is evidence, not a success verdict. Only the core verifier
can produce a verified outcome.

### Lifecycle Orchestrator

**Purpose:** Expose deliberate remote workflows while keeping per-binding
atomicity.

The provider-neutral `oat-pjm-remote` skill invokes:

- `intake`: resolve a remote issue, create or enrich a local target, and bind it;
- `publish`: create or update one selected planning record;
- `refresh`: update snapshots without writing remotely;
- `reconcile`: classify changes and optionally execute approved proposals;
- `closeout`: build a reviewed batch of per-binding transitions and completion
  annotations;
- `discussion`: fetch a bounded page of comments or activity as read-only,
  sanitized, non-persisted evidence; an explicit local-only distillation may
  update authored backlog content separately;
- `resolve relink`: verify and attach a replacement remote identity while
  preserving identity history and the last snapshot;
- `resolve detach`: stop operational synchronization, preserve a tombstoned
  binding and snapshot, and remove only the compact operational link;
- `resolve recreate`: search for duplicates, create a replacement only after
  fresh approval, and preserve old and new identity history;
- `operation continue`: advance a prepared MCP action using one external
  observation.

Discussion reads are paginated and bounded by provider cursor plus a configured
maximum page size. Results are sanitized and returned to the caller but are not
written into the binding snapshot, journal, or tracked project artifacts. When
the user asks to distill discussion into a backlog item, the skill proposes a
separate local edit with source/freshness evidence; that is not comment sync.

Lifecycle resolution has explicit safety rules:

- **Relink** requires fresh user approval, verifies the replacement's stable
  identity and context, rejects duplicates, moves the former identity into
  history, retains the former snapshot, establishes a fresh snapshot/baseline,
  and updates the compact association only after the binding transition is
  durable.
- **Detach** requires fresh user approval because it removes operational
  protection. It removes the compact binding ID, keeps a reference link when
  requested, tombstones rather than deletes binding state, and retains all
  snapshots and receipts for recovery.
- **Recreate** requires the configured `create` authority plus a non-configurable
  fresh-approval floor. It first searches provenance and aliases for a possible
  existing record. After create/read-back verification, the old identity enters
  history and the new identity becomes current. An uncertain create leaves the
  old binding frozen and cannot be retried blindly.

All three are restart-safe journaled operations. A crash between binding and
association writes is diagnosed and repairable from the operation receipt;
neither side is silently discarded.

Commands live under `oat pjm remote` to avoid collision with the existing
Git-ref project `push`, `pull`, `remote`, and `synced` vocabulary.
Machine output uses one versioned success/error envelope from the beginning.

### PJM Doctor and Migration

Doctor checks:

- malformed or unsupported record versions;
- filename and stable identity mismatch;
- dangling or duplicate binding IDs;
- portable metadata versus local/shared operational-state divergence;
- compact link and binding target disagreement;
- invalid provider context or display aliases;
- stale, pending, partial, or uncertain operations;
- concurrent active intents reconstructed from operation journals;
- missing verification evidence;
- policy values that were ignored or would broaden illegally;
- connector or executable availability without exposing credentials;
- snapshot fields outside the allowed retention boundary.
- credential-shaped content or operational state in a disallowed storage class.

Migration is explicit and idempotent. Legacy associations remain usable without
migration. The migration command can report candidates, add canonical object
form, or create a reference-only binding proposal, but it never guesses provider
context or mutation authority and never performs a remote write.

## Data Models

### Remote Binding Metadata and Operational State

```typescript
interface RemoteBindingMetadataRecord {
  schemaVersion: 1;
  bindingId: string;
  localTarget: {
    kind: 'backlog' | 'project';
    id: string;
    scope?: 'shared' | 'local' | 'synced';
  };
  provider: 'github' | 'linear' | 'jira';
  remoteIdentity: {
    stableId: string;
    context: RemoteAccountContext;
    aliases: RemoteAlias[];
  };
  identityHistory: HistoricalRemoteIdentity[];
  purposes: Array<'source' | 'planning' | 'delivery' | 'reference'>;
  policyRestriction?: BindingPolicyRestriction;
  lifecycle: RemoteLifecycleState;
  createdAt: string;
  updatedAt: string;
}

interface RemoteBindingStateRecord {
  schemaVersion: 1;
  bindingId: string;
  localProjection: LocalIssueProjection;
  snapshot: RemoteIssueSnapshot | null;
  baseline: ReconciliationBaseline | null;
  capability: CapabilitySnapshot | null;
  contentRedacted: boolean;
  activeOperationIds: string[]; // derived hint; journals are authoritative
  createdAt: string;
  updatedAt: string;
}

type RemoteBindingRecord = RemoteBindingMetadataRecord & {
  state: RemoteBindingStateRecord;
};
```

Validation rules:

- IDs are generated locally and path-safe; filenames must match `bindingId`.
- Purposes are unique and non-empty.
- Stable provider identity and context are immutable except through explicit
  relink or recreate; prior identities move to append-only `identityHistory`.
- One active operational binding owns a provider/context/stable-ID tuple in a
  PJM repository. Additional local links to the same remote record remain
  reference-only unless the existing binding is explicitly relinked.
- Aliases are append-only with one current alias per kind.
- A binding policy must be no broader than the resolved provider policy.
- The normal path permits one active mutation intent per binding, but this is a
  best-effort sequencing rule, not a lock-backed invariant. Multiple journals
  discovered for one binding block new writes and require reconciliation.

### Local Issue Projection

```typescript
interface LocalIssueProjection {
  title: string;
  description: string | null;
  priority: string | null;
  source: 'backlog-description' | 'explicit-project-publication';
  sourceRevision: string;
  observedAt: string;
}
```

### Remote Issue Snapshot

```typescript
interface RemoteIssueSnapshot {
  observedAt: string;
  observedBy: CapabilityReference;
  identity: RemoteIdentity;
  title: string;
  description: RemoteDescription;
  status: ProviderStatus;
  priority: ProviderPriority | null;
  revision: {
    strength: 'token' | 'updated-at-and-hash' | 'hash-only' | 'unknown';
    token: string | null;
    updatedAt: string | null;
    contentHash: string;
  };
  lifecycle:
    | 'active'
    | 'archived'
    | 'moved'
    | 'missing-or-invisible'
    | 'deleted-confirmed'
    | 'temporarily-unavailable';
  extensions: Record<string, JsonValue>;
  contentRedacted: boolean;
  redactionCount: number;
}
```

The snapshot never includes comments, activity history, assignees, credentials,
or an unfiltered raw response.

### Reconciliation Baseline

```typescript
interface ReconciliationBaseline {
  acceptedAt: string;
  acceptedByOperationId: string;
  fields: {
    title?: string;
    description?: {
      scope: 'full' | 'managed-section';
      content: string;
      fullRemoteSnapshotHash: string;
    };
    priority?: string;
  };
  localProjectionRevision: string;
  remoteRevision: RemoteIssueSnapshot['revision'];
}
```

The baseline advances only after an inbound acceptance or verified outbound
write. Refreshing the snapshot alone never changes it.

### Remote Operation Record

```typescript
type OperationState =
  | 'planned'
  | 'pending'
  | 'authorized'
  | 'attempt-started'
  | 'verification-pending'
  | 'blocked'
  | 'verified'
  | 'partial'
  | 'uncertain'
  | 'failed'
  | 'rejected';

interface RemoteOperationRecord {
  schemaVersion: 1;
  operationId: string;
  correlationId: string;
  bindingId: string;
  lifecycleOperation:
    | 'intake'
    | 'publish'
    | 'refresh'
    | 'reconcile'
    | 'closeout'
    | 'discussion'
    | 'relink'
    | 'detach'
    | 'recreate';
  mutationClass: MutationClass | null;
  state: OperationState;
  reason: OperationReason | null;
  lastSafeStep: OperationSafeStep;
  preview: OperationPreview;
  authority: AuthorityDecision;
  approval: ApprovalEvidence | null;
  selectedTransport: CapabilityReference | null;
  attempts: OperationAttempt[];
  observations: ExternalObservationSummary[];
  verification: FieldVerification[];
  retryDisposition:
    | 'not-applicable'
    | 'safe-before-attempt'
    | 'reconcile-required';
  createdAt: string;
  updatedAt: string;
}
```

Allowed transitions are:

```text
planned -> pending | authorized | blocked | failed
pending -> authorized | blocked | failed
authorized -> attempt-started | blocked | failed
attempt-started -> verification-pending | partial | uncertain | rejected
verification-pending -> verified | partial | uncertain
```

`pending` covers an offline intent, authorization requirement, or prepared
external action. `blocked` is a safely persisted user/capability/policy
condition before effect. `failed` is a pre-effect runtime or persistence failure
with no possible remote effect. `rejected` is a provider-declared non-commit
after an attempt. `partial` and `uncertain` always require reconciliation.
Terminal records are retained, and terminal state never transitions back to an
attempt state. Every command envelope is derived from the atomically persisted
record; the CLI never returns a durable status that the record cannot represent.

### Remote Batch Record

```typescript
interface RemoteBatchRecord {
  schemaVersion: 1;
  batchId: string;
  lifecycleOperation: 'closeout' | 'refresh' | 'reconcile';
  state:
    | 'planned'
    | 'pending'
    | 'authorized'
    | 'in-progress'
    | 'complete'
    | 'partial'
    | 'uncertain'
    | 'blocked';
  membershipDigest: string;
  previewDigest: string;
  members: Array<{
    bindingId: string;
    operationId: string;
    bindingPreviewDigest: string;
  }>;
  authority: AuthorityDecision;
  approval: ApprovalEvidence | null;
  outcomes: Record<string, OperationState>;
  createdAt: string;
  updatedAt: string;
}
```

Batch membership and order become immutable when previewed. Approval binds to
the membership digest and every member preview. Bindings added or changed after
preview require a new batch. On restart, the orchestrator reconstructs state
from the batch and member journals: verified members remain complete, blocked
members remain blocked, uncertain or partial members are never retried, and
only never-attempted authorized members may continue after policy and freshness
are revalidated. The batch reports all outcomes and never rolls back a verified
member.

### Provider Outcome

```typescript
type ProviderOutcome =
  | { kind: 'verified'; fields: FieldVerification[] }
  | { kind: 'partial-write'; fields: FieldVerification[]; recovery: string }
  | {
      kind: 'pending';
      reason: 'offline' | 'authorization-required' | 'external-action-required';
    }
  | { kind: 'needs-review'; conflicts: ReconciliationConflict[] }
  | { kind: 'blocked'; code: RemoteErrorCode; recovery: string }
  | { kind: 'unknown-remote-outcome'; evidence: SanitizedEvidence }
  | { kind: 'rejected'; providerCode?: string; evidence: SanitizedEvidence }
  | { kind: 'failed'; code: RemoteErrorCode; providerCode?: string };
```

## API Design

### CLI Command Family

**Namespace:** `oat pjm remote`

Representative forms:

```text
oat pjm remote intake <provider-ref> --to-backlog <id> --json
oat pjm remote publish --binding <binding-id> --json
oat pjm remote refresh --binding <binding-id> --json
oat pjm remote reconcile --binding <binding-id> --json
oat pjm remote closeout --project <project-path> --json
oat pjm remote discussion --binding <binding-id> --limit <n> --json
oat pjm remote resolve relink --binding <binding-id> <provider-ref> --json
oat pjm remote resolve detach --binding <binding-id> --json
oat pjm remote resolve recreate --binding <binding-id> --json
oat pjm remote operation continue --operation <id> --observation-stdin --json
oat pjm remote doctor --json
oat pjm remote migrate --check --json
```

Exact option names may be adjusted to existing Commander conventions during
implementation, but the semantic split and machine envelope are stable.

### Success Envelope

```typescript
interface RemoteCommandEnvelope {
  schemaVersion: 1;
  status:
    | 'ok'
    | 'pending'
    | 'needs-review'
    | 'partial'
    | 'uncertain'
    | 'blocked'
    | 'failed';
  operation: string;
  projectRoot: string;
  persisted: boolean;
  results: BindingOperationResult[];
  externalAction: ExternalActionEnvelope | null;
  recovery: RecoveryInstruction[];
}
```

Human output derives from the same envelope and must identify provider, target,
freshness, effective authority, and independent binding outcomes.

### Exit Semantics

| Envelope status | Durable operation state                              | Exit | Meaning                                                                                        |
| --------------- | ---------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| `ok`            | `verified`                                           | 0    | Requested operation reached a verified successful terminal state.                              |
| `pending`       | `pending`                                            | 1    | Intent or external-action handoff was safely persisted; more user or agent action is required. |
| `needs-review`  | `blocked` with conflict reason                       | 1    | Conflicts require an explicit choice before mutation.                                          |
| `partial`       | `partial`                                            | 1    | Some postconditions verified; reconciliation is required.                                      |
| `uncertain`     | `uncertain`                                          | 1    | A remote effect may have occurred; reconciliation is required.                                 |
| `blocked`       | `blocked`                                            | 1    | Policy, capability, lifecycle, or approval safely prevented progress.                          |
| `failed`        | `failed`, or no record if initial persistence failed | 2    | Runtime or persistence failed before a safe durable handoff was established.                   |

JSON and human modes use the same mapping. A host-executor skill treats
`pending` plus a valid `externalAction` as a successful structured handoff even
though the shell exit is 1. If the CLI cannot persist the corresponding state,
it returns the system error envelope with exit 2 instead. Command-wiring tests
assert stdout/stderr separation and human/JSON parity for every row.

### Preview and Apply Boundary

Read commands may execute directly. A mutation-capable command first returns a
preview unless effective authority is `user-authorized` and the current user
instruction exactly authorizes the action, or `autonomous` and the caller
provides active workflow authority. Even in those cases, the preview is
persisted and emitted in JSON. `user-approved`, complete-description
replacement, and destructive actions require a second invocation tied to the
preview digest.

### Internal Programmatic API

Command factories inject filesystem, clock, ID generation, config, provider
registry, transport registry, process runner, and host-observation parsing.
This keeps all remote behavior deterministic in tests and prevents skill-inline
shell logic from becoming a second implementation.

## Security Considerations

### Authentication

- Authentication remains owned by `gh`, `linear-cli`, `acli`, host
  connectors, keychains, or their supported environment-backed secret stores.
- OAT probes auth presence and account context but never reads or persists
  credential values.
- A transport authenticated to the wrong account, workspace, site, or repository
  is unavailable for the requested binding.

### Authorization

- Effective policy is resolved for every binding and operation.
- A preview digest binds authorization to target, fields, revision, capability,
  and policy.
- Complete-description replacement and destructive actions always require fresh
  approval.
- Autonomous mode requires caller evidence of an active, otherwise-authorized
  OAT workflow; config alone is not a background execution grant.

### Data Protection

- Snapshots retain only the bounded core field allowlist and adapter-approved
  extensions.
- Full descriptions may contain sensitive business content. Operational state
  therefore uses the common machine-local store by default; shared Git storage
  requires explicit repository configuration and a previewed approval.
- Credential-shaped values are redacted before either storage class is written;
  the snapshot records the redaction instead of claiming complete retention.
- Human previews
  display concise diffs or hashes by default and require an explicit verbose
  view for full bodies.
- Public GitHub publication passes a privacy/sanitization check so private OAT
  artifacts are not copied into a public issue.
- Process output and external observations pass redaction before logging and
  again before persistence.
- Paths are derived from validated generated IDs, never provider-supplied
  strings.

### Threat Mitigation

- **Command injection:** Registered transport IDs map to fixed executables and
  discrete argv; no shell templates are accepted.
- **Credential leakage:** Controlled environment, redaction, bounded evidence,
  and schema allowlists exclude auth values.
- **Approval replay:** Digest-bound, freshness-checked approval becomes invalid
  after any load-bearing input changes.
- **Connector result spoofing:** Action and step digests plus provider context
  are validated; the result still requires read-back verification.
- **Body overwrite:** Description mode defaults to none; managed codecs reject
  ambiguous boundaries; full replacement has a hard approval floor.
- **Duplicate creation:** Persist intent before effect, prefer provider
  provenance, search after uncertainty, and forbid blind retry.
- **Confused provider identity:** Probe stable identity and exact context before
  reads and again before writes.

## Performance Considerations

### Scalability

The expected PJM scale is file-backed and repository-sized. V1 scans binding
records for doctor, repository batches, and lookup fallback. An in-memory
per-command map avoids repeated reads. A derived index may be added later only
if measured repository scale requires it; correctness never depends on an
index.

Read-only refreshes across independent bindings may use bounded concurrency.
Mutation attempts are sequenced per binding, and reviewed batches use a small
bounded concurrency only when each operation already has independent policy and
intent. No concurrency claim implies atomicity or race prevention.

### Caching

Capability snapshots are evidence with an observation time, not durable proof
of availability. Reads may reuse a snapshot within one operation when its
provider-declared freshness window remains valid. Every mutation re-probes
identity, auth state, and required capability.

### Resource Limits

- Process runners impose timeout and stdout/stderr byte limits.
- External observation envelopes impose JSON depth and byte limits.
- Provider extensions use per-adapter allowlists and byte limits.
- Full descriptions are retained, but commands avoid duplicating them in logs,
  receipts, and previews.

## Error Handling

### Error Categories

- **User errors:** Invalid target, malformed config, missing explicit binding,
  stale preview, unresolved conflict, or missing approval. Return `blocked`
  with corrective guidance and no remote attempt.
- **Capability errors:** Tool unavailable, auth required, permission unknown,
  operation unsupported, or schema/catalog drift. Return `pending` or
  `blocked` before mutation.
- **Remote lifecycle errors:** Not found or invisible, moved, archived, deleted,
  or temporarily unavailable. Preserve binding and snapshot; stop writes.
- **Mutation errors:** Provider rejection before acceptance is `rejected`.
  Timeout, partial output, connector ambiguity, or failure after an attempt
  begins is `uncertain` unless authoritative read-back proves the result.
- **Persistence errors:** Failure to durably record intent blocks the external
  call. Failure after a possible external effect produces a visible recovery
  blocker and never a success claim.

### Retry Logic

- Read-only probes may retry bounded transient failures with provider-aware
  backoff.
- No mutation is automatically retried after `attempt-started`.
- A pre-start unavailable transport may fall through to the next configured
  candidate.
- Partial or uncertain results require refresh and reconciliation on the pinned
  binding before a new operation can be authorized.
- Provider rate-limit evidence is retained, but a retry-after time is advisory
  and never bypasses the mutation rule.

### Logging

- **Info:** Operation and binding IDs, semantic action, provider, transport ID,
  capability state, and terminal classification.
- **Warn:** Stale capability, degraded revision strength, partial verification,
  lifecycle anomaly, or pending reconciliation.
- **Error:** Sanitized persistence, schema, or transport failure with recovery
  instructions.

No log includes credential values, raw environment, authentication headers,
full comments, or unfiltered provider payloads.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification                | Key Scenarios                                                                       |
| ---- | --------------------------- | ----------------------------------------------------------------------------------- |
| FR1  | integration + e2e           | Shared adapter conformance for GitHub, Linear, Jira; several same-provider bindings |
| FR2  | e2e                         | Local PJM with every transport disabled; pending intent never shown as success      |
| FR3  | unit + integration          | Purpose-policy intersection, incompatible purposes, combined closeout action        |
| FR4  | integration                 | Intake, publish, refresh, reconcile, closeout; no transitive propagation            |
| FR5  | unit + integration          | Strict binding persistence, identity aliases, restart recovery                      |
| FR6  | unit                        | Title/description contract, optional safe priority, provider extensions             |
| FR7  | unit + integration          | None/managed/replace matrix, malformed boundaries, binding tightening               |
| FR8  | unit + integration          | Full authority truth table and immutable approval floors                            |
| FR9  | unit + integration          | B/L/R classification and explicit same-field conflict                               |
| FR10 | integration                 | Reviewed batch partial failure with independent outcomes                            |
| FR11 | integration                 | Refresh, one attempt, read-back, timeout, no blind retry                            |
| FR12 | integration                 | Non-secret snapshot, local/shared storage, redaction, bounded discussion read       |
| FR13 | integration                 | Anomalies plus approved relink, detach, and duplicate-safe recreate                 |
| FR14 | integration                 | Persisted create intent, provenance search, uncertain create                        |
| FR15 | e2e                         | Multi-binding closeout, annotation verification, delivery/reference defaults        |
| FR16 | integration                 | Ordered probes, capability matching, pre-start fallback, pinned uncertainty         |
| FR17 | e2e                         | GitHub to Linear, GitHub to Jira, and GitHub-only workflows                         |
| FR18 | integration + manual        | Project artifacts not published; discussion remains informational                   |
| NFR1 | integration + security scan | Secret fixtures redacted; no local or shared record leakage                         |
| NFR2 | integration                 | Ambiguity, permission, schema drift, and uncertainty all fail closed                |
| NFR3 | integration                 | Crash injection, batch restart, and concurrent-intent preservation                  |
| NFR4 | e2e                         | Disconnected search and snapshot use with visible freshness                         |
| NFR5 | integration                 | ADF, aliases, transition metadata, and extension retention                          |
| NFR6 | manual + e2e                | Preview sources, freshness, conflicts, and per-binding outcomes                     |
| NFR7 | integration                 | Existing backlog/project suites unchanged without remote config                     |
| NFR8 | integration                 | Same semantic fixtures through eligible CLI and MCP transports                      |

### Unit Tests

- Strict Zod schemas, filename/identity agreement, and canonical serialization.
- Association compatibility parser and canonical emitter.
- Description and authority precedence truth tables.
- Pure reconciliation classifications and field direction.
- Preview digest and approval invalidation.
- Managed Markdown and ADF codec round trips and malformed boundaries.
- Provider normalization, identity aliases, field masks, and verification.
- Error/outcome taxonomy and safe human rendering.

### Integration Tests

- Injected filesystem with crash points before and after every local transition.
- Fake `gh`, `linear-cli`, and `acli` executables for argv, timeouts,
  invalid JSON, nonzero exits, partial output, version drift, and redaction.
- Fake connector catalogs and observations for unavailable operations,
  authorization-required, context ambiguity, partial errors, and stale step
  digests.
- Repository config versus user transport preference resolution.
- Local/common-dir versus explicitly shared storage location and privacy rules.
- Existing backlog creation/archive/index, PJM adoption, project parsing, and
  Git project sync regression suites.
- Doctor and migration against mixed historical association shapes.

### End-to-End Tests

- CLI fixture workflows with all providers unavailable.
- GitHub issue as source and planning record without duplication.
- GitHub source plus Linear planning with independent closeout.
- GitHub source plus Jira planning with ADF and discovered transition.
- Reviewed multi-binding batch with one verified, one blocked, and one uncertain
  result.
- Interrupted closeout reconstructing immutable membership and member outcomes.
- Agent-host action loop using fake MCP tools; no live credentials in CI.

### Provider-Specific Cases

- **GitHub:** Silently dropped fields, transfer aliases, 404 versus confirmed
  deletion, rate limit, and PR linkage as evidence only.
- **Linear:** Missing MCP operation, workspace/team ambiguity, moved-team alias,
  archived visibility, connector partial response, and CLI schema drift.
- **Jira:** Create/edit metadata drift, ADF invalid nodes, stable ID with changed
  key, revision unknown, JQL lag, unavailable transition, and unknown create
  outcome.

### Concurrency and Recovery

Concurrency tests assert the actual guarantee: no false success and no blind
retry after uncertainty. They do not assert prevention of simultaneous-writer
races. A two-process start fixture must preserve both unique operation journals,
detect concurrent intents after binding re-read, and prove that neither is lost
or blindly retried. That detection is not presented as a distributed lock.

## Deployment Strategy

This ships as an opt-in PJM capability:

1. Add schemas, resolver, store, doctor diagnostics, and read-only commands
   while remote policy remains fail-closed.
2. Add reconciliation and preview before any provider mutation path.
3. Add the host-executor skill and fake connector conformance.
4. Enable provider transports incrementally behind capability probes.
5. Publish docs and examples with no credentials and with destructive/full-body
   approval floors prominent.

Changes to CLI behavior, bundled templates, docs, or canonical skills require
the repository's lockstep public-package version bump. Any changed canonical
skill receives one frontmatter version bump in the final PR.

## Migration Strategy

- Repositories without `pjm.remote` remain read-only for remote descriptions
  and mutations; local behavior is unchanged.
- Remote directories are lazy and do not change `pjm init` adoption
  completeness.
- Existing repositories default to common machine-local operational storage.
  Enabling shared Git storage is a separate previewed config migration; local
  project targets remain local regardless.
- Legacy scalar associations and object associations without `binding` parse
  as reference-only.
- New bindings add canonical `{type, ref, binding}` entries without rewriting
  unrelated associations.
- `oat pjm remote migrate --check` reports safe transformations and ambiguous
  cases. `--apply` performs only local schema changes after explicit user
  approval.
- Migration never contacts a provider or infers account context, stable remote
  identity, purpose, or mutation authority.
- Binding and operation schemas version independently from
  `pjm.schemaVersion`, which continues to describe adoption scaffolding.

## Implementation Phases

1. **Domain, configuration, and persistence:** Compatibility association codec,
   strict metadata/state/batch records, storage locator, split config resolver,
   atomic store, and doctor foundations.
2. **Reconciliation and safety engine:** Local projections, field policies,
   B/L/R reconciliation, authority, previews, operation state machine, and
   verification.
3. **Execution substrate and lifecycle UX:** Safe CLI runner, transport registry,
   external-action protocol, command envelopes, and `oat-pjm-remote` skill.
4. **GitHub adapter and `gh` transport:** Identity, normalization, managed
   Markdown, create/update/transition/annotation, and conformance.
5. **Linear adapter and transports:** MCP action mappings, optional
   `linear-cli`, workspace/team identity, and conformance.
6. **Jira Cloud adapter and transports:** MCP action mappings, optional ACLI,
   ADF managed content, metadata/transition discovery, and conformance.
7. **Cross-provider workflows and closeout:** Reviewed batches, completion
   annotations, discussion evidence, relink/detach/recreate recovery,
   representative E2E flows, migration, doctor completion, docs, and release
   validation.

Phases 4, 5, and 6 are peer provider lanes after phases 1–3 establish the shared
contract. They have separate provider files and tests but converge on shared
conformance fixtures and closeout in phase 7. The implementation plan must make
that dependency topology explicit. It must not declare parallel execution
groups without the separate confirmation required by the planning workflow.

## Design Risks

- **Agent-host bridge drift:** Skill prose and TypeScript may diverge.
  - **Mitigation:** Keep all state, policy, schemas, and verdicts in CLI code;
    the skill only discovers tools, invokes one envelope, and returns an
    observation. Test the bridge with captured catalogs.
- **Snapshot sensitivity:** Full ticket descriptions may contain business data
  or credential-shaped values.
  - **Mitigation:** Keep operational state machine-local by default, require
    previewed opt-in for shared Git storage, retain only core fields, redact
    credentials before persistence, mark redacted snapshots, and avoid
    comments, assignees, and raw payloads.
- **Managed ADF lossiness:** Connector or CLI representations may not preserve
  surrounding Jira content.
  - **Mitigation:** Capability-test round trips; fail closed to no description
    update when exact structural preservation cannot be demonstrated.
- **Provider capability drift:** Tool catalogs, CLI schemas, fields, and
  workflows change.
  - **Mitigation:** Probe at runtime, fingerprint capability evidence, re-probe
    before writes, and preserve explicit degraded outcomes.
- **Operation journal persistence gap:** A process may fail after remote effect
  but before local receipt update.
  - **Mitigation:** Mark attempt before effect and treat any post-attempt gap as
    uncertain until read-back reconciliation.
- **Scope and review load:** Shared core plus three providers is a large change.
  - **Mitigation:** Use shared conformance first, independent provider lanes,
    bounded task commits, two design review loops, plan self-review, and an
    external plan gate.
- **Accepted writer race:** Another actor may mutate after OAT's final pre-read.
  - **Mitigation:** State the limitation honestly, use revision evidence where
    available, verify postconditions, and stop after uncertainty. V1 does not
    claim prevention.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Current architecture: `.oat/repo/knowledge/architecture.md`
- Current integration inventory: `.oat/repo/knowledge/integrations.md`
- Current testing conventions: `.oat/repo/knowledge/testing.md`
- GitHub dossier: `reference/github-issues-provider-dossier-gpt-5-6-luna.md`
- Linear dossier: `reference/linear-provider-dossier-gpt-5-6-luna.md`
- Jira dossier: `reference/jira-provider-dossier-gpt-5-6-luna.md`
