---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-27
oat_generated: false
oat_template: false
---

# Design: user-scope-tool-packs

## Overview

This change establishes one scope-neutral pack lifecycle for every OAT tool
pack. The release bundle owns a canonical manifest describing each pack's
allowed/default scopes and complete managed asset surface. A scoped intent bit
records that a user or repository opted into a pack; it does not copy the
manifest's member list. Inventory compares intent plus the current release
manifest against observed files, and reconciliation produces deterministic
plans for install, update, removal, and migration.

The design deliberately separates reusable capability from mutable state.
Skills, agents, templates, scripts, and skill-private resources can be managed
assets. Seeded workspaces, PJM records, policy, and repository overrides are
mutable owner data and never become removal targets merely because a pack
created them. Project and user scopes remain independently supported, with user
scope recommended for a fresh reusable installation.

## Architecture

### System Context

The feature remains inside the TypeScript ESM CLI. It builds on the existing
asset bundle, layered JSON config, provider adapters, filesystem helpers,
Commander command surface, and Vitest test architecture. It introduces no
service, database, credential, or network dependency.

**Key Components:**

- **Canonical Pack Manifest:** One typed release-owned definition for all pack
  metadata, members, destinations, and lifecycle policies.
- **Scoped Intent Store:** Reads and writes pack opt-in in the concrete owning
  config layer without merging away provenance.
- **Pack Inventory:** Observes canonical paths and computes completeness,
  version/drift, intent provenance, and cross-scope placement.
- **Reconcile Planner and Executor:** Produces deterministic operations, then
  applies them with scope validation and ordered safety boundaries.
- **Lifecycle Command Adapters:** Install, list/info/has/outdated, update,
  remove, migration, config guidance, status/doctor, and provider sync.
- **PJM Adoption and Template Resolver:** Keeps repository adoption explicit and
  applies repository → user → bundle template precedence.

### Component Diagram

```text
bundled assets ────────┐
                      v
                Pack Manifest
                      |
project config ─┐     |     ┌─ user config
                v     v     v
                 Scoped Intent
                      |
filesystem ───────────v
                 Pack Inventory
                      |
                      v
                Reconcile Planner
                      |
             dry-run  |  apply
                      v
          Files + scoped config + sync
                      |
                      v
          CLI output / status / doctor

PJM commands ──> adoption guard ──> repo state
            └──> template resolver: repo → user → bundle
```

### Data Flow

#### Install or Update

```text
1. Resolve concrete scope roots without requiring Git for user-only work.
2. Read scoped pack intent and canonical release manifest.
3. Inventory each declared canonical asset path.
4. Plan create/update/chmod/no-op operations in stable manifest order.
5. Apply file operations and verify the intended scope is complete.
6. Persist intent=true at that concrete scope after successful fresh install.
7. Synchronize only changed canonical provider paths.
8. Emit the same structured result to human and JSON renderers.
```

An update with existing intent does not need any physical member to discover
the pack; this is what restores a fully missing pack. Legacy physical installs
without intent are reported as inferred candidates. A mutating operation may
adopt inferred intent only for the explicitly selected scope and reports that
write in its plan.

#### Removal

```text
1. Resolve explicit target scope and inventory the intended pack.
2. Enumerate manifest-managed assets only; exclude mutable/seed/override data.
3. Show the removal plan and require confirmation when interactive safety does.
4. Remove managed paths and verify they are absent.
5. Persist intent=false only after successful removal.
6. Synchronize removed canonical provider paths.
```

If file removal fails, intent remains true so a later update can repair the
pack. Unmanaged files at or below a managed directory are handled according to
the asset's ownership policy; skill directories are whole managed bundles,
while mutable roots are never recursive removal targets.

#### Scope Migration

```text
preview → install destination → verify destination complete
        → persist destination intent → confirm source removal
        → remove source managed assets → clear source intent → sync
```

Declining source removal leaves both intents true and reports a complete
combined installation. A failure before destination verification leaves source
untouched. A source-removal failure preserves the verified destination and
source intent, making retry safe.

## Component Design

### Canonical Pack Manifest

**Purpose:** Replace duplicated membership and companion-asset lists with one
release-defined source of truth.

**Primary location:**
`packages/cli/src/commands/tools/shared/pack-manifest.ts`.

**Interfaces:**

```typescript
type PackAssetKind = 'skill' | 'agent' | 'template' | 'script' | 'seed';
type PackAssetOwnership = 'managed' | 'seed-if-missing';

interface PackAssetDefinition {
  id: string;
  kind: PackAssetKind;
  source: string;
  destination: string;
  scopes: readonly ConcreteScope[];
  ownership: PackAssetOwnership;
  executable?: boolean;
}

interface PackDefinition {
  name: PackName;
  allowedScopes: readonly ConcreteScope[];
  defaultScope: ConcreteScope;
  assets: readonly PackAssetDefinition[];
}
```

**Responsibilities:**

- Define all eight packs, stable member order, allowed scopes, and fresh-install
  defaults.
- Include workflow and research agents at both scopes.
- Include workflow/PJM templates and scripts as managed static assets.
- Model ideas backlog/scratchpad and other mutable scaffolds as
  `seed-if-missing`, not managed update/removal targets.
- Treat references/scripts nested under a skill directory as part of the skill
  directory asset rather than separate global assets.
- Supply derived helpers for canonical provider paths, members by kind, and
  bundle consistency tests.

**Design Decisions:**

- Every reusable pack defaults to user scope. Core remains user-only because it
  already has that product contract; the manifest makes this explicit.
- Manifest membership evolves with the installed CLI release. Config stores
  only intent, never member arrays or exclusions.
- Destination paths are relative to a validated scope root. Absolute and parent
  traversal paths are rejected at manifest validation.
- Existing installer exports may temporarily re-export derived lists to avoid a
  large unsafe flag day, but tests prohibit independent authoritative arrays.

### Scoped Pack Intent Store

**Purpose:** Preserve whether a pack is intended at project and/or user scope,
even when physical assets are missing.

**Primary location:**
`packages/cli/src/commands/tools/shared/scoped-pack-intent.ts`.

**Interfaces:**

```typescript
type PackIntentSource = 'declared' | 'inferred-legacy' | 'none';

interface ScopedPackIntent {
  pack: PackName;
  scope: ConcreteScope;
  enabled: boolean;
  source: PackIntentSource;
  configPath: string;
}

function readScopedPackIntent(
  input: IntentReadInput,
): Promise<ScopedPackIntent>;
function writeScopedPackIntent(input: IntentWriteInput): Promise<void>;
```

**Storage:**

- Project scope: `<repo>/.oat/config.json` at `tools.<pack>`.
- User scope: `<home>/.oat/config.json` at `tools.<pack>`.
- Combined placement: independently true in both concrete layers.

The existing boolean shape remains compatible. Reads are deliberately
scope-specific instead of using a merged config, because merged values lose
ownership provenance. `reconcileProjectToolsConfig` stops deriving booleans
from “any member found”; explicit lifecycle operations own intent writes.

**Legacy adoption:**

- Physical canonical assets with no explicit key produce
  `source: inferred-legacy` in inventory.
- Read-only commands never persist the inference.
- Install/update/remove at an explicit scope include the proposed intent change
  in dry-run output and persist only after their filesystem safety boundary.
- An explicit `false` is authoritative and is never overridden by inference.

### Pack Inventory

**Purpose:** Produce one complete observed-state model used by all lifecycle
commands.

**Primary locations:**

- `packages/cli/src/commands/tools/shared/pack-inventory.ts`
- `packages/cli/src/commands/tools/shared/types.ts`

**Interfaces:**

```typescript
type AssetStatus = 'missing' | 'current' | 'outdated' | 'newer' | 'present';
type PackCompleteness = 'complete' | 'partial' | 'absent';

interface PackAssetInventory {
  definition: PackAssetDefinition;
  path: string;
  status: AssetStatus;
  installedVersion: string | null;
  bundledVersion: string | null;
}

interface ScopedPackInventory {
  pack: PackName;
  scope: ConcreteScope;
  intent: ScopedPackIntent;
  completeness: PackCompleteness;
  assets: PackAssetInventory[];
  diagnostics: PackDiagnostic[];
}

interface PackInventory {
  pack: PackName;
  placement: 'project' | 'user' | 'both' | 'unavailable';
  scopes: ScopedPackInventory[];
}
```

**Rules:**

- Completeness considers all `managed` assets valid at the concrete scope.
  `seed-if-missing` state is reported separately and cannot make a pack partial.
- Skill status uses frontmatter versions; agent status uses agent frontmatter;
  non-versioned static assets use presence plus the existing copy comparison
  contract where available.
- `has --pack` returns success only for complete intended or complete legacy
  placement. Partial intent is a distinct failure result with missing members.
- List/info/status/doctor may still enumerate custom tools, but pack inventory
  never recursively scans the user's home directory.
- Duplicate scope diagnostics show both canonical paths and versions without
  asserting provider execution precedence.

### Reconcile Planner and Executor

**Purpose:** Share deterministic lifecycle behavior across install, update,
remove, and migration.

**Primary locations:**

- `packages/cli/src/commands/tools/shared/pack-reconcile.ts`
- Existing copy/path/sync helpers under `commands/init/tools/shared`, `fs`, and
  provider sync modules.

**Interfaces:**

```typescript
type PackOperation =
  | { kind: 'copy-dir'; source: string; destination: string; force: boolean }
  | { kind: 'copy-file'; source: string; destination: string; force: boolean }
  | { kind: 'chmod'; path: string; mode: number }
  | { kind: 'remove-dir'; path: string }
  | { kind: 'remove-file'; path: string }
  | {
      kind: 'write-intent';
      pack: PackName;
      scope: ConcreteScope;
      enabled: boolean;
    };

interface PackReconcilePlan {
  pack: PackName;
  scope: ConcreteScope;
  action: 'install' | 'update' | 'remove' | 'migrate-destination';
  operations: readonly PackOperation[];
  expectedCompleteness: PackCompleteness;
  changedCanonicalPaths: readonly string[];
}
```

Planning is pure and stable; apply consumes the plan. Dry-run serializes the
same plan without execution. All destination and removal paths pass
`validatePathWithinScope`; existing paths that may traverse symlinks also pass
`validateRealPathWithinScope` before destructive action.

Static project templates require a policy distinction:

- User-scope templates are managed defaults and update with the pack.
- A repository template is an override surface. Installation seeds it only when
  absent; update/removal never overwrites or deletes an existing repository
  override.
- Bundled CLI templates remain the fallback when neither higher tier exists.

This safety-first rule intentionally treats legacy repository templates as
repository-owned because OAT cannot prove whether a pre-provenance file was
customized.

### Lifecycle Command Adapters

**Purpose:** Keep CLI command parsing/rendering thin while routing every pack
through the shared model.

**Affected surfaces:**

- `oat tools install [pack] [--scope project|user]`
- `oat tools list|info|has|outdated`
- `oat tools update [name|--pack|--all]`
- `oat tools remove [name|--pack|--all]`
- New `oat tools migrate --pack <name> --from <scope> --to <scope>`
- Guided setup, `oat status`, `oat doctor`, and automatic provider sync.

**Behavior:**

- Fresh installs without `--scope` choose manifest `defaultScope`; existing
  placement wins and is never narrowed.
- Explicit `tools install --scope` remains additive. Moving/removing a scope is
  expressed by `tools migrate`, avoiding destructive ambiguity in install.
- Direct pack subcommands and aggregate install call the same planner.
- User-only operations resolve the home scope directly and do not call
  `resolveProjectRoot`, write `AGENTS.md`, or reconcile repository config.
- Repository guidance is updated only when project-scope pack intent changes or
  the user invokes an explicit repository setup command.
- Update/outdated/all use declared intent first and legacy inference second;
  they no longer discover installed packs from one arbitrary member.
- Remove operates from the manifest even if some or all assets are already
  absent, allowing it to clear durable intent safely.
- Sync is called once per affected scope with the exact changed canonical skill
  and agent paths. Templates/scripts do not masquerade as provider paths.

### Scope Migration Command

**Purpose:** Make narrowing placement an explicit, inspectable transaction.

**Command contract:**

```text
oat tools migrate --pack <pack> --from project|user --to project|user
                   [--dry-run] [--json]
```

`from` and `to` must differ. Non-interactive invocation without `--dry-run`
stops after destination verification and reports that source removal requires
an interactive confirmation; it does not accept a force/yes bypass in this
project. The resulting combined install is valid and can be completed by
re-running interactively.

**Verification boundary:** Destination verification re-runs inventory from the
filesystem after apply; successful copy return values alone are insufficient.
The command records no custom rollback journal because the source itself is the
rollback path until verification. After verified destination plus partial
source-removal failure, the destination is retained and the result lists the
remaining source paths.

### PJM Adoption Guard

**Purpose:** Ensure globally available PJM skills do not imply repository
initialization or authorize writes.

**Primary locations:**

- PJM command preflight shared by `pjm`, backlog, and decision commands.
- The four `oat-pjm-*` skills and their tests.

**Contract:**

- `oat pjm init` is the only capability in this surface allowed to create the
  canonical PJM scaffold from an uninitialized state.
- Other mutating commands resolve a Git repository, inspect the canonical PJM
  adoption markers, and throw a typed `CliError` before creating directories or
  files when adoption is absent.
- The error identifies the repository and says to run `oat pjm init`.
- `oat pjm doctor` remains read-only and reports disabled/uninitialized state.
- Skills perform the CLI/read-only preflight before any write instruction.

### PJM Template Resolver

**Purpose:** Give all PJM content creation one source-aware precedence rule.

**Primary location:**
`packages/cli/src/commands/pjm/template-source.ts`, consumed by PJM init,
backlog creation, and decision creation.

```typescript
type PjmTemplateTier = 'repository' | 'user' | 'bundled';

interface ResolvedPjmTemplate {
  tier: PjmTemplateTier;
  path: string;
  content: string;
}

function resolvePjmTemplate(
  input: ResolvePjmTemplateInput,
): Promise<ResolvedPjmTemplate>;
```

Resolution order is:

1. `<repo>/.oat/templates/<name>` — repository-owned override.
2. `<home>/.oat/templates/<name>` — user-managed default.
3. `<assets>/templates/<name>` — bundled CLI fallback.

All call sites receive `home` explicitly through command context; tests avoid
ambient HOME mutation. Human verbose/doctor output and JSON results may include
the tier/path, but normal success output need not become noisy.

### Skill-Local Resource Resolution

**Purpose:** Make static references work from user scope without an OAT checkout.

Every skill that needs static resources must ship them beneath its own installed
directory and describe resolution relative to the loaded `SKILL.md` directory.
PJM skills must not instruct an agent to read
`<repo>/.agents/skills/<skill>/references/...`. Bundle consistency tests recurse
skill directories and verify referenced packaged files exist. Shared templates
needed by CLI commands remain independently declared manifest assets.

## Data Models and Validation

The manifest is TypeScript-owned and validated at module/test boundaries.
Layered config retains the existing `tools: Record<PackName, boolean>` JSON
shape. No new migration file or database schema is required.

**Validation invariants:**

- Every `PackName` has exactly one definition.
- Asset IDs are unique within a pack; canonical destination paths do not collide
  across packs unless an explicit shared-owner contract exists.
- Every default scope is allowed.
- `managed` destinations are canonical and remain within a scope root.
- `seed-if-missing` assets are excluded from update and removal plans.
- Agent filenames and skill directory names map to provider canonical paths.
- Every bundled manifest source exists and every pack-owned bundled asset is
  represented, enforced by consistency tests.

## API and CLI Design

This is a local CLI feature; there are no HTTP endpoints.

JSON lifecycle results gain additive fields:

```typescript
interface PackCommandResult {
  status: 'ok' | 'blocked' | 'error';
  operation: 'install' | 'update' | 'remove' | 'migrate' | 'inspect';
  pack: PackName;
  scopes: ConcreteScope[];
  inventories: ScopedPackInventory[];
  planned: PackOperationSummary[];
  applied: PackOperationSummary[];
  diagnostics: PackDiagnostic[];
  recovery?: string[];
}
```

Existing tool-level arrays remain where compatibility requires them. New
pack-completeness fields are additive. Commands use `CliError` for invalid
scope, unsafe path, uninitialized PJM, and blocked migration; JSON mode emits a
single structured document.

## Security Considerations

### Authentication and Authorization

No authentication system is added. Authorization is local filesystem authority
plus explicit user confirmation. Provider authentication remains outside this
feature.

### Data Protection

- Do not enumerate or log unrelated home-directory content.
- Human output may abbreviate home paths; JSON may return canonical managed
  paths but never file content, tokens, or environment variables.
- Validate lexical and real paths before destructive operations.
- Never follow a managed-path symlink outside the selected scope root.
- User-scope installation never grants permission to write repository PJM data.

### Threat Mitigation

- **Path traversal/symlink escape:** Validate manifest paths at definition time
  and resolved paths before removal.
- **Destructive scope confusion:** Require explicit source/destination and
  confirmation; do not overload install as migration.
- **Customized-data deletion:** Only `managed` manifest assets are removable;
  mutable seeds and repository overrides are excluded.
- **Supply drift:** Bundle consistency and release validation prove manifest
  sources match shipped assets.

## Performance Considerations

Each pack has a small bounded manifest. Inventory performs direct `stat`/read
operations against canonical paths; tool-list custom enumeration remains the
only directory listing. Project and user scope inventories may run in parallel.
There is no network request or cache. Deterministic manifest order avoids extra
sorting complexity and stable JSON makes tests straightforward.

## Error Handling

### Error Categories

- **User errors:** Invalid pack/scope, ambiguous migration, declined removal,
  or PJM not initialized. Return typed, actionable errors without mutation.
- **Filesystem errors:** Preserve original error details without exposing file
  content; identify the failed operation and recovery state.
- **Manifest errors:** Fail closed before mutation; these represent release
  defects and should be caught by tests/validation.
- **Provider sync errors:** Preserve completed canonical changes, report sync
  failure, and provide the exact `oat sync --scope ...` recovery command.

### Retry and Rollback

No automatic filesystem retry is introduced. Install/update is idempotent and
can be re-run. Migration ordering retains source as rollback until destination
is verified. Remove failure leaves intent true. If intent persistence fails
after verified files are written, report the pack as complete legacy/unrecorded
and instruct the user to re-run the same command; never delete the new files to
simulate rollback.

### Logging

- **Info:** Pack, scope, summary counts, intent changes, and sync disposition.
- **Warn:** Partial/legacy/duplicate state, newer local versions, skipped source
  removal, customized repository overrides, or deferred sync.
- **Error:** Failed operation, affected canonical path, unchanged safety state,
  and recovery action.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification         | Key Scenarios                                      |
| ---- | -------------------- | -------------------------------------------------- |
| FR1  | integration          | all-pack scope matrix, fresh default, preservation |
| FR2  | unit + integration   | all asset kinds, bundle consistency, resources     |
| FR3  | unit + integration   | scoped intent, new member, fully missing restore   |
| FR4  | unit                 | complete/partial/absent/legacy/both matrix         |
| FR5  | integration          | install/update/outdated/has/remove/sync parity     |
| FR6  | integration          | PJM initialized/uninitialized and zero-write guard |
| FR7  | unit + integration   | repo/user/bundle template precedence               |
| FR8  | integration          | preview, decline, failure boundaries, retry        |
| FR9  | integration          | legacy project/user/both and duplicates            |
| FR10 | manual + integration | help, docs, generated guidance                     |
| NFR1 | unit + integration   | path escape, confirmation, rollback                |
| NFR2 | unit + integration   | stable plans, repeat no-op, dry-run parity         |
| NFR3 | integration          | existing CLI/config fixtures                       |
| NFR4 | unit + integration   | human/JSON diagnostics and recovery                |
| NFR5 | unit                 | canonical path access, no recursive home scan      |

### Unit Tests

- Manifest validation, derived members, destination ownership, and defaults.
- Intent precedence: explicit true/false, absent, inferred legacy.
- Inventory state matrix across asset kinds and scopes.
- Reconcile plan ordering, dry-run parity, removal exclusions, and changed
  canonical paths.
- PJM template resolution and adoption guards.
- Human and JSON result rendering.

### Integration Tests

- Temporary HOME plus temporary Git repository for every pack/scope matrix.
- Fresh install, repeat install, update from older fixture, missing-member
  repair, complete disappearance with retained intent, remove, and reinstall.
- Workflow/research agents and workflow/PJM templates/scripts at user scope.
- Legacy installs with no intent and combined duplicate versions.
- Migration destination failure, verification failure, declined removal,
  removal failure, and successful retry.
- PJM init and post-init operations using each template tier; uninitialized
  operations assert an unchanged filesystem snapshot.
- Provider auto-sync receives exact scope and canonical paths.

### End-to-End and Release Validation

- CLI command integration covers direct and aggregate flows in human/JSON mode.
- Bundle consistency covers manifest ↔ bundled npm asset parity.
- Help snapshots and docs build cover public command changes.
- Public package release dry-run validates the lockstep version bump and shipped
  assets.

No numeric coverage percentage is introduced; the acceptance matrix is the
coverage contract.

## Deployment Strategy

The feature ships in the normal npm CLI release. No feature flag or environment
variable is required. Rollout is backward-compatible: legacy installs are read
without writes, project scope remains valid, and fresh defaults change only for
packs with no existing placement.

### Rollback

Reverting the CLI release leaves physical project/user assets in place. Older
CLIs ignore user `tools` intent they do not consume but continue parsing the
existing boolean config shape. Users can retain both scopes during rollout.
Documentation must warn that scope migration should be run with the upgraded
CLI, not approximated by manual deletion.

### Monitoring

There is no telemetry service. Verification relies on structured CLI results,
doctor/status diagnostics, issue reports, and CI/release gates.

## Migration Plan

1. Introduce the manifest/inventory/intent model while retaining legacy
   inference and existing command output compatibility.
2. Route read-only commands through inventory.
3. Route install/update/remove through reconcile plans and add user eligibility
   for every pack.
4. Add explicit migration and PJM ownership/template boundaries.
5. Update docs/help/guidance and ship the lockstep package release.

Existing installs are not rewritten eagerly. The next explicit mutating pack
operation can persist inferred intent at its selected scope. Users choose
whether to retain combined placement or use the migration command.

## Open Questions

None blocking. Provider execution precedence for duplicate same-name tools is
intentionally not asserted; OAT reports both sources and lets explicit migration
resolve the duplication.

## Implementation Phases

### Phase 1: Canonical Contract and Inventory

**Goal:** Establish manifest, scoped intent, inventory, and compatibility seams.

**Verification:** Unit tests cover every pack/asset and the complete state
matrix; existing targeted lifecycle suites stay green.

### Phase 2: Unified Lifecycle Commands

**Goal:** Route install, list/info/has/outdated, update, remove, config writes,
and sync through the shared contract for both scopes.

**Verification:** All-pack temporary-root integration matrix plus legacy and
idempotency coverage.

### Phase 3: Safe Scope Migration

**Goal:** Add preview-first destination-verified migration with explicit source
removal.

**Verification:** Success, decline, and injected failure tests prove safety
boundaries and recovery.

### Phase 4: PJM Ownership and Resource Portability

**Goal:** User-scope PJM assets, explicit adoption guards, shared template
precedence, and skill-local static references.

**Verification:** PJM zero-write guard, template-source matrix, skill bundle
contracts, and representative initialized workflows.

### Phase 5: Diagnostics, Documentation, and Release

**Goal:** Complete status/doctor/help/docs/guidance, provider materialization
tests, and release lockstep.

**Verification:** Human/JSON contracts, provider sync/materialization, repo
gates, release validation, and docs build.

## Dependencies

### External Dependencies

None beyond existing Node.js and CLI dependencies.

### Internal Dependencies

- Asset bundle resolution and copy/version helpers.
- Layered OAT config readers/writers.
- Provider sync canonical-path adapters.
- PJM init/doctor/backlog/decision modules.
- Existing CLI context/logger, `CliError`, and filesystem path validation.

### Development Dependencies

- Vitest temporary-filesystem fixtures.
- Existing bundle, skill, release, and docs validation commands.

## Risks and Mitigation

- **Manifest migration misses a hidden asset:** High probability, high impact.
  - **Mitigation:** Derive old exports from manifest and add reverse bundle
    consistency tests before deleting duplicated authorities.
  - **Contingency:** Keep compatibility adapters until every installer and
    lifecycle command is covered.
- **Legacy intent inference opts into the wrong pack:** Medium probability,
  high impact.
  - **Mitigation:** Read-only inference is non-mutating; only explicit scoped
    mutation persists it, with dry-run visibility.
  - **Contingency:** Explicit false disables inference; removal can clear intent
    even when files are absent.
- **Repository template updates surprise current users:** Medium probability,
  medium impact.
  - **Mitigation:** Treat existing repository templates as owner overrides;
    managed updates happen at user scope and bundle fallback.
  - **Contingency:** Document how to delete an override to resume managed
    default behavior.
- **Cross-scope duplicate provider behavior differs by host:** High probability,
  medium impact.
  - **Mitigation:** Diagnose paths/versions without claiming precedence and
    provide explicit migration.
- **Cross-cutting command regressions:** Medium probability, high impact.
  - **Mitigation:** Migrate in phases behind shared pure planning APIs and run
    existing plus new lifecycle integration matrices.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Backlog: `.oat/repo/pjm/backlog/items/BL-260818-make-the-project-management.md`
- Architecture: `.oat/repo/knowledge/architecture.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
- Testing: `.oat/repo/knowledge/testing.md`
