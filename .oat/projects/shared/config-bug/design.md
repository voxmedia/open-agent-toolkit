---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-23
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: config-bug

## Overview

The tool-pack lifecycle will distinguish repository installation state from
effective runtime availability. Shared `.oat/config.json#tools` will be
reconciled only from project-scoped canonical assets, while a dedicated
machine-readable capability query will compute whether a pack is available
from project or user scope. Pack-gated workflows will consume that runtime
query instead of treating shared configuration as a machine-specific cache.

Provider sync will gain a generic mutation-path safety boundary shared by
symlink, copy, update, and remove operations. Immediately before each mutation,
the executor will verify lexical containment and walk every existing parent
with `lstat`; a symbolic-link or non-directory parent will reject the operation
before any removal or write. Planning may surface the same condition earlier,
but apply-time validation remains authoritative because filesystem ancestry can
change after plan generation.

The implementation will preserve current scope-aware listing and sync
strategies while adding focused regression coverage, updating pack-gated
canonical skills, and aligning user-facing documentation. Release bookkeeping
will follow the repository's canonical-skill and public-package versioning
rules.

## Architecture

### System Context

The change spans two adjacent flows that begin in tool-pack lifecycle commands:

1. **Pack state and capability:** install, update, and remove mutate canonical
   assets, reconcile project installation state into shared config, and may
   trigger workflows that need an effective project-plus-user capability check.
2. **Provider materialization:** lifecycle auto-sync and direct `oat sync`
   compute provider destinations and apply filesystem mutations. Those
   destinations must never traverse a symlinked provider parent.

The two flows share the same user entry points but remain separate components.
Pack reconciliation owns configuration truth; provider path validation owns
filesystem mutation safety.

**Key Components:**

- **Project Pack Reconciler:** Derives shared `tools.*` solely from
  project-scoped canonical assets.
- **Effective Capability Query:** Reports whether a pack is currently available
  in project scope, user scope, or both without persisting the union.
- **Pack-Gated Consumers:** Use the capability query for runtime routing while
  reserving `oat config get tools.<pack>` for project installation state.
- **Provider Mutation Guard:** Validates lexical containment and existing
  destination ancestry during planning and immediately before mutation.

### Component Diagram

```text
oat tools install/update/remove
          |
          +--> canonical project/user assets
          |          |
          |          +--> Project Pack Reconciler --> .oat/config.json#tools
          |                                      (project scope only)
          |
          +--> oat sync
                    |
Canonical scan --> sync plan --> Provider Mutation Guard --> executor
                                      |                       |
                                      +-- reject unsafe       +-- provider view

oat tools has <pack> --> project + user scans --> effective result
                                               --> pack-gated workflows
```

### Data Flow

#### Project installation reconciliation

1. A lifecycle command completes its requested asset mutations.
2. A shared reconciler scans only the project scope and collects bundled pack
   names from installed canonical tools.
3. When one or more project packs exist, it writes the complete boolean
   `tools` map and preserves every unrelated shared config key.
4. When no project packs exist, it removes `tools` from an existing shared
   config. It does not create `.oat/config.json` when the normalized input is
   only `{ "version": 1 }`.
5. User-scoped canonical assets never influence the shared map.

#### Effective capability resolution

1. The caller supplies a valid bundled pack and an optional scope, defaulting
   to `all`.
2. The resolver scans the requested canonical scopes using the existing tool
   scanner.
3. It returns `available` plus the concrete scopes containing at least one
   bundled member of that pack.
4. Pack-gated skills use this result at decision time, so user installs remain
   usable without becoming repository state.

#### Safe provider mutation

1. Provider adapters compute a lexical destination beneath the inferred sync
   scope.
2. Planning validates that the destination is inside the scope and walks every
   existing parent, excluding the destination itself, with `lstat`.
3. Before execution starts, all mutating plan entries are preflighted so an
   already-unsafe plan cannot partially apply.
4. Each entry is validated again immediately before its first removal or write
   to close the plan/apply race.
5. A symlinked or non-directory parent rejects the operation. The destination
   itself may be a managed symlink because update and removal operations must
   operate on existing provider links.

## Component Design

### Project Pack Reconciler

**Purpose:** Maintain shared project installation truth consistently across all
tool lifecycle entry points.

**Responsibilities:**

- Scan project-scoped canonical tools and reduce them to installed bundled
  packs.
- Build a complete boolean tools map when at least one project pack exists.
- Remove a stale tools map when no project packs remain.
- Skip a write that would create a default-only shared config.
- Preserve unrelated configuration.
- Replace duplicated update/remove logic and the aggregate/direct install
  writes, including the direct brainstorm installer.

**Interfaces:**

```typescript
interface ReconcileProjectToolsOptions {
  repoRoot: string;
  cwd: string;
  home: string;
}

async function reconcileProjectToolsConfig(
  options: ReconcileProjectToolsOptions,
  dependencies: ProjectToolsConfigDependencies,
): Promise<'written' | 'unchanged'>;
```

**Design Decisions:**

- Reconcile after filesystem mutation rather than deriving config from selected
  intent; the canonical project assets remain the source of truth.
- Keep `tools.*` sparse only at the group level: omit the entire map when empty,
  otherwise write every known pack boolean for deterministic stale-flag
  clearing.
- Do not add `tools` to local or user config.

### Effective Capability Query

**Purpose:** Provide a stable, script-friendly runtime answer without
overloading shared config.

**Responsibilities:**

- Validate pack names against the bundled pack registry.
- Scan project, user, or both scopes through existing scanner dependencies.
- Return availability and concrete matching scopes.
- Keep valid negative results distinct from command errors.

**Interfaces:**

```typescript
interface PackAvailability {
  pack: PackName;
  available: boolean;
  scopes: ConcreteScope[];
}

async function resolvePackAvailability(
  pack: PackName,
  scopes: ConcreteScope[],
  context: CommandContext,
  dependencies: PackAvailabilityDependencies,
): Promise<PackAvailability>;
```

**Design Decisions:**

- Add a narrow `oat tools has` command instead of requiring skills to parse
  `oat tools list --json`.
- Treat any installed bundled member as pack availability, matching existing
  reconciliation behavior.
- Print a boolean and exit successfully for valid negative queries so shell
  consumers do not need error suppression.

### Pack-Gated Consumers

**Purpose:** Preserve user-scoped capabilities after shared config becomes
project-only.

**Responsibilities:**

- Replace runtime `oat config get tools.<pack>` checks with
  `oat tools has <pack>`.
- Update canonical copies only; provider views remain generated output.
- Bump each changed canonical skill version once for the final PR.

**Initial Consumers:**

- `oat-brainstorm` for ideas, project-management, and workflows destinations.
- `oat-project-document` for project-management refresh.
- `oat-project-summary` for project-management summary behavior.

### Provider Mutation Guard

**Purpose:** Prevent sync from deleting or writing canonical/external content
through a symlinked provider ancestor.

**Responsibilities:**

- Derive the sync scope root from the canonical entry using the existing
  executor convention.
- Reject destinations that lexically escape the scope or resolve to the scope
  root.
- Walk existing parent segments with `lstat`, stopping after the first missing
  segment.
- Reject symbolic-link and non-directory parents.
- Exclude the final destination from ancestor rejection.
- Run during planning, whole-plan apply preflight, and per-entry apply.

**Interfaces:**

```typescript
async function assertSafeProviderMutationPath(
  scopeRoot: string,
  providerPath: string,
): Promise<void>;
```

**Design Decisions:**

- Centralize the guard in the generic sync engine rather than patching only the
  Claude adapter; other provider parents have the same risk.
- Use `lstat`, not `stat` or `realpath`, so symbolic-link ancestors are detected
  rather than followed.
- Validate before every operation that mutates provider paths:
  `create_symlink`, `update_symlink`, `create_copy`, `update_copy`, and
  `remove`. `detach` and `skip` do not mutate provider paths.
- Keep create-symlink copy fallback behind the same guard because its cleanup
  path is also destructive.

## API Design

### `oat tools has`

**Command:**

```bash
oat tools has <pack> [--scope project|user|all] [--json]
```

**Plain output:**

```text
true
```

or:

```text
false
```

**JSON output:**

```json
{
  "pack": "workflows",
  "available": true,
  "scopes": ["project", "user"]
}
```

**Exit behavior:**

- `0`: valid pack query, whether available or unavailable.
- `1`: invalid pack or actionable input error.
- `2`: unexpected scan/runtime failure through the standard CLI boundary.

The default scope is `all`, meaning effective availability. `--scope project`
and `--scope user` expose explicit checks without changing persistence.

### Existing config API

`oat config get tools.<pack>` remains supported but now means project-installed
state only. Documentation and descriptions must stop calling it an effective
project-or-user capability signal. No config schema version change is required;
the behavioral correction is applied on the next lifecycle reconciliation.

## Error Handling

### Invalid capability queries

Unknown pack names return the canonical valid-pack list and exit `1`. A valid
but unavailable pack prints/returns `false` and exits `0`.

### Unsafe provider paths

Planning rejects an unsafe ancestry with an actionable error identifying the
provider-relative parent and explaining that provider parent directories must
be real directories. No sync plan is applied.

Apply performs a whole-plan preflight before mutations. If ancestry changes
after that preflight, the immediate per-entry guard fails the affected entry
before its first mutation; the executor records failure and does not update
manifest ownership for that entry. Canonical content and symlink targets remain
untouched.

### Config writes

Scanner or config-write failures propagate through existing lifecycle error
handling. Reconciliation never replaces unrelated shared keys. A direct user
install with no project packs completes without creating shared config.

### Recovery

Users can replace the provider parent symlink with a real provider directory
and rerun `oat sync`. OAT does not automatically unlink or rewrite the unsafe
parent because its ownership and target may be user-managed.

## Testing Strategy

### Unit Tests

- **Project pack reconciler**
  - user-only packs do not create shared config;
  - project-only and both-scope installs set only project-derived flags;
  - removing the last project pack omits `tools` even when it remains at user
    scope;
  - stale union flags are cleared while unrelated config is preserved;
  - aggregate install and direct brainstorm install share the same semantics.
- **Capability query**
  - default `all`, project-only, user-only, both, and unavailable results;
  - plain boolean and JSON contracts;
  - valid unavailable query exits `0`; invalid pack exits `1`.
- **Mutation guard**
  - accepts ordinary and partially missing directory ancestry;
  - rejects lexical escape, symlinked parent, and non-directory parent;
  - permits the final destination itself to be a managed symlink.

### Engine Regression Tests

- Planning refuses `.claude/skills -> ../.agents/skills` before classifying a
  child operation.
- Apply refuses a plan when a real provider parent is replaced by a symlink
  after planning.
- Table-driven cases cover create/update symlink, create/update copy, and
  remove.
- Canonical skill directories and external symlink targets remain byte-for-byte
  unchanged after every refusal.
- Ordinary provider directories continue to materialize and remove entries
  successfully.

### Consumer and Documentation Tests

- Canonical skill contract tests assert pack-gated consumers use
  `oat tools has`.
- Updated tool-pack/configuration docs describe project-installed versus
  effective availability accurately.
- Help snapshots and command registration cover `oat tools has`.

### Verification

Run focused CLI tests while implementing, then:

```bash
pnpm --filter @open-agent-toolkit/cli test
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm format
pnpm release:validate
```

## References

- Discovery: `discovery.md`
