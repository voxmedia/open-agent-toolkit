---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-08-27
oat_generated: false
oat_template: false
---

# Specification: user-scope-tool-packs

## Problem Statement

OAT's direct-install lifecycle does not give every tool pack a complete,
consistent user-scope lifecycle. Project-management is restricted to project
scope, user-scoped agents and companion assets are not managed uniformly, and
pack availability can be inferred from one installed member. Users who want
reusable OAT capability therefore still carry managed copies in each repository
and receive repetitive update commits and pull requests.

OAT needs one durable pack contract for project, user, and combined scope.
Reusable capabilities may live in the user's home directory, while repository
adoption, policy, state, and customizations remain repository-owned. An
installed pack must mean the complete, evolving surface defined by the current
OAT release.

## Goals

### Primary Goals

- Make all eight OAT tool packs fully installable and operable at user scope.
- Give skills, agents, templates, scripts, and packaged resources one
  consistent install, inventory, update, removal, and diagnostic lifecycle.
- Record pack intent at the owning scope so updates reconcile current
  release-defined membership, including new or missing members.
- Preserve repository ownership and explicit initialization of PJM state.
- Provide a verified, non-destructive way to move packs between scopes.

### Secondary Goals

- Make user scope the recommended default for fresh reusable pack installs.
- Reduce consumer-repository churn caused solely by refreshing OAT-managed
  capability copies.
- Make duplicate, partial, stale, and mixed-scope installs understandable in
  human and JSON diagnostics.

## Non-Goals

- Resume or ship the parked native provider-plugin project.
- Remove project-scoped installation or silently migrate existing placements.
- Move repository PJM state, backlog, roadmap, decisions, policy, or
  customizations into the user home directory.
- Automatically initialize PJM because its skills are globally available.
- Add new PJM product workflows, agents, or scripts unrelated to scope support.
- Invent provider precedence where the provider exposes no reliable contract.
- Preserve per-member exclusions inside an installed pack.

## Requirements

### Functional Requirements

**FR1: Universal Scope Eligibility**

- **Description:** Every declared OAT pack must support project and user
  installation, except that core may retain its existing user-only semantics if
  explicitly documented.
- **Acceptance Criteria:**
  - Project-management accepts user scope through direct and aggregate flows.
  - Fresh reusable-pack installs recommend and default to user scope.
  - Existing project, user, or combined placement is preserved unless the user
    explicitly requests migration.
  - Project-scoped installation remains supported.
- **Priority:** P0

**FR2: Complete Managed Surface**

- **Description:** Pack lifecycle operations cover every release-declared
  skill, agent, template, script, and packaged skill resource owned by a pack.
- **Acceptance Criteria:**
  - One canonical pack definition identifies every independently managed asset
    and destination class.
  - Install and update materialize the full surface valid for the scope.
  - Removal deletes only assets declared managed at the selected scope.
  - Skill-private resources resolve relative to the installed skill directory
    and work without a source checkout.
- **Priority:** P0

**FR3: Durable Evolving Pack Intent**

- **Description:** Installing a pack durably records intent at each owning
  scope without snapshotting the release's member list.
- **Acceptance Criteria:**
  - Project intent is stored in repository config; user intent in user config.
  - Desired members derive from intent plus the current canonical manifest.
  - Update adds new release members and restores missing required members.
  - Removing one member creates no persistent pack-level exclusion.
  - Legacy installs without intent remain discoverable and can be adopted
    without destructive changes.
- **Priority:** P0

**FR4: Complete Inventory and Availability**

- **Description:** OAT distinguishes desired intent from observed asset state
  and reports accurate placement and completeness.
- **Acceptance Criteria:**
  - Inventory distinguishes complete, partial, absent, and unmanaged per scope.
  - Combined results distinguish project-only, user-only, both, and unavailable.
  - Missing, outdated, newer, duplicate, and unexpected managed assets include
    asset type, scope, and path or provenance.
  - A pack is not complete merely because one member is present.
  - Human and JSON output share the same inventory model.
- **Priority:** P0

**FR5: Lifecycle Reconciliation**

- **Description:** Install, update, outdated/status, has, remove, and sync use
  the same pack intent and inventory contract.
- **Acceptance Criteria:**
  - Update reconciles every intended pack at every selected installed scope.
  - `--pack` and `--all` restore a pack when all files are missing but durable
    intent remains.
  - Dry runs describe changes without mutating files or config.
  - Removal clears intent only after selected managed assets are removed or
    reports a recoverable failure.
  - User-only operations do not require or mutate an unrelated Git repository.
  - Provider sync receives exact changed canonical skill and agent paths.
- **Priority:** P0

**FR6: PJM Ownership and Initialization Boundary**

- **Description:** User-scoped PJM capability remains separate from repository
  PJM adoption and state.
- **Acceptance Criteria:**
  - PJM skills and managed defaults may install at user scope.
  - PJM state, policy, backlog, roadmap, decisions, handoffs, and customized
    guidance remain repository-local.
  - A PJM workflow in an uninitialized repo fails before writes and explains
    explicit initialization.
  - `oat pjm init` remains the repository-adoption action.
  - Backlog and decision writes target only the resolved repository.
- **Priority:** P0

**FR7: PJM Template Precedence**

- **Description:** User-installed PJM templates are managed defaults and never
  override repository customizations.
- **Acceptance Criteria:**
  - Resolution order is repository override, user default, bundled fallback.
  - Initialization and later backlog/decision creation use the same rule.
  - Initialization never overwrites existing repository files.
  - Diagnostics identify the selected template tier when relevant.
- **Priority:** P0

**FR8: Guided Scope Migration**

- **Description:** Users can move a pack between scopes without losing
  capability or repository-owned data.
- **Acceptance Criteria:**
  - Migration previews additions, duplicates, conflicts, and removals.
  - Destination install and completeness verification precede source removal.
  - Source removal requires explicit confirmation and never occurs in a
    non-interactive migration.
  - Declining removal leaves a valid combined-scope installation.
  - Failure before removal leaves the source intact; removal failure reports
    recovery and preserves the verified destination.
  - Only manifest-managed assets and scope-owned intent are removed.
- **Priority:** P0

**FR9: Backward-Compatible Adoption**

- **Description:** Existing project, user, and combined installs continue
  working while adopting the new intent and inventory model.
- **Acceptance Criteria:**
  - Read-only inventory recognizes legacy physical installs without writes.
  - A later explicit mutation can record inferred intent at the selected scope
    after reporting the change.
  - Existing scope remains authoritative until explicit migration.
  - Duplicates produce diagnostics, not silent deletion or precedence claims.
- **Priority:** P0

**FR10: Documentation and Operator Guidance**

- **Description:** Docs and generated guidance explain scope, ownership,
  updates, migration, and PJM adoption.
- **Acceptance Criteria:**
  - CLI help and docs recommend user scope for fresh installs.
  - Docs distinguish reusable capability from repository state.
  - Update behavior states that pack membership evolves with the OAT release.
  - Migration, duplicate diagnostics, and rollback are documented.
  - Repository guidance does not claim user assets are repository-owned.
- **Priority:** P1

### Non-Functional Requirements

**NFR1: Non-Destructive Safety**

- **Description:** Scope changes and removals fail safely and preserve unowned
  or customized data.
- **Acceptance Criteria:**
  - Destructive steps require explicit scope and confirmation.
  - Destination verification precedes migration source removal.
  - Path validation prevents operations escaping the selected scope root,
    including through resolvable symlink paths.
  - Partial failures provide actionable recovery information.
- **Priority:** P0

**NFR2: Determinism and Idempotency**

- **Description:** Identical manifest, intent, and filesystem state produce the
  same plan; repeated successful operations converge without unnecessary writes.
- **Acceptance Criteria:**
  - Inventory and reconcile ordering are stable.
  - A second install/update against a current pack reports no changes.
  - Dry-run and apply use the same planning model.
- **Priority:** P0

**NFR3: Compatibility**

- **Description:** Existing public CLI shapes and project installs remain usable.
- **Acceptance Criteria:**
  - Project-scope commands retain behavior unless scope change is requested.
  - Legacy config continues to parse.
  - JSON additions are backward-compatible; human output remains actionable.
- **Priority:** P0

**NFR4: Diagnostics Quality**

- **Description:** Blocked or ambiguous operations explain state, scope, and a
  safe next action.
- **Acceptance Criteria:**
  - Errors identify pack, relevant asset, scope, and recovery action.
  - JSON output is structured rather than prose-dependent.
  - Diagnostics expose no credentials or unrelated home content.
- **Priority:** P1

**NFR5: Local Performance**

- **Description:** Inspection and reconciliation remain bounded by the small
  manifest and selected scope roots.
- **Acceptance Criteria:**
  - Operations inspect canonical paths plus existing custom-tool enumeration.
  - No network, database, or whole-home recursive scan is introduced.
- **Priority:** P1

## Constraints

- OAT CLI and canonical provider sync remain authorities for managed assets.
- Current package manifests, not installation snapshots, own pack membership.
- User config never stores project-specific PJM policy or data.
- Repository config owns only project-scope intent and repository behavior.
- Duplicate provider ambiguity is diagnosed, not hidden by invented precedence.
- Bundled asset/doc changes require lockstep public-package versioning.

## Dependencies

- Existing scope resolution, bundling, copy/version checks, provider sync,
  layered config, and typed CLI errors.
- Existing PJM init, doctor, backlog, and decision commands.
- Node.js filesystem APIs; no new service, database, or authentication system.

## High-Level Design (Proposed)

OAT will replace overlapping per-pack lists with a canonical declarative pack
manifest. Each entry describes default and allowed scopes plus all independently
managed assets. A boolean pack intent lives in the config layer owning the
concrete scope; member names remain release-defined. Shared inventory compares
intent and the current manifest with observed assets, and a shared reconciler
plans install, refresh, removal, and migration.

PJM reusable assets use the same lifecycle, but repository adoption remains an
independent precondition. PJM template consumers resolve repository overrides
before user defaults and bundled fallbacks. Skill-private references stay in
the copied skill directory and resolve from the installed artifact.

**Key Components:**

- **Pack Manifest** - complete release-defined asset and scope contract.
- **Scoped Intent Store** - durable project/user opt-in without member snapshots.
- **Inventory and Reconcile Engine** - completeness, drift, plan, and apply.
- **PJM Adoption Boundary** - explicit initialization and template precedence.
- **Lifecycle Commands and Provider Sync** - consistent scope behavior.

**Alternatives Considered:**

- **PJM-only unlock** - rejected because lifecycle inconsistencies remain.
- **Physical presence as intent** - rejected because it cannot restore a fully
  missing pack and treats one member as complete.
- **Member snapshots** - rejected because new release members would not join an
  installed pack automatically.
- **User-only convergence** - rejected because project reproducibility remains
  a supported requirement.

## Success Metrics

- All eight packs pass fresh user-install and full lifecycle acceptance tests.
- Every asset class participates in inventory, update, and removal tests.
- An older-release fixture gains a newly declared member on update.
- Migration fault tests never remove source before destination verification.
- PJM uninitialized-repo tests make zero writes and return initialization help.
- Consumer repos can use user packs without tracked managed capability copies.

## Requirement Index

| ID   | Description                                    | Priority | Verification                                      | Planned Tasks                                                                   |
| ---- | ---------------------------------------------- | -------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| FR1  | Every pack supports the intended scope model   | P0       | integration: install scope matrix                 | p01-t01, p01-t02, p02-t03, p02-t04                                              |
| FR2  | Lifecycle covers the full managed surface      | P0       | unit + integration: manifest asset reconciliation | p01-t01, p01-t02, p01-t03, p01-t06, p02-t01, p02-t08, p04-t05                   |
| FR3  | Scoped intent opts into evolving membership    | P0       | unit + integration: intent and release evolution  | p01-t04, p01-t05, p02-t07                                                       |
| FR4  | Inventory reports placement and completeness   | P0       | unit: inventory state matrix                      | p01-t06, p02-t05, p02-t06, p05-t01                                              |
| FR5  | Lifecycle commands share reconciliation rules  | P0       | integration: install/update/remove/has/sync       | p02-t01, p02-t02, p02-t03, p02-t05, p02-t06, p02-t07, p02-t08, p02-t09, p05-t03 |
| FR6  | PJM capability remains separate from adoption  | P0       | integration: initialized/uninitialized repos      | p04-t01, p04-t02, p04-t04, p04-t06, p04-t07                                     |
| FR7  | PJM templates use repo-user-bundled precedence | P0       | unit + integration: template source matrix        | p04-t03, p04-t04                                                                |
| FR8  | Scope migration is verified and reversible     | P0       | integration: migration and injected failures      | p03-t01, p03-t02, p03-t03, p03-t04, p03-t05                                     |
| FR9  | Legacy placements adopt without silent changes | P0       | integration: legacy and duplicate fixtures        | p01-t05, p02-t03, p02-t07, p02-t08, p03-t05, p04-t07                            |
| FR10 | Docs explain the ownership and lifecycle model | P1       | manual + integration: docs/help/guidance          | p02-t06, p03-t04, p05-t01, p05-t02                                              |
| NFR1 | Destructive operations fail safely             | P0       | unit + integration: confirmation/path/rollback    | p01-t07, p02-t02, p02-t08, p03-t01, p03-t02, p03-t03, p03-t05                   |
| NFR2 | Operations are deterministic and idempotent    | P0       | unit + integration: repeat/dry-run parity         | p01-t03, p02-t01, p02-t02, p02-t07, p02-t08, p05-t04                            |
| NFR3 | Existing CLI/config behavior remains usable    | P0       | integration: compatibility regression suite       | p01-t04, p01-t05, p02-t03, p02-t04, p02-t06, p02-t08, p04-t07, p05-t04          |
| NFR4 | Diagnostics are structured and actionable      | P1       | unit + integration: human/JSON contracts          | p02-t05, p02-t06, p03-t04, p05-t01                                              |
| NFR5 | Inspection remains local and bounded           | P1       | unit: canonical-path enumeration                  | p01-t03, p01-t06, p01-t07                                                       |

## Open Questions

None. Skill-private resources will ship inside each skill directory and resolve
relative to the installed artifact. Shared managed assets use explicit
scope-root destinations declared by the pack manifest.

## Assumptions

- Providers can consume user-scoped skills/agents after consistent sync.
- User config is an acceptable owner for user-scope pack intent.
- Pack manifests remain small enough for direct canonical-path inspection.
- Legacy installs can be inferred conservatively without read-only writes.

## Risks

- **Intent/observation conflation:** Current reconciliation derives config from
  physical presence. Mitigate with separate scoped intent and inventory APIs.
- **Unexpected repo writes:** Current aggregate install updates repo guidance.
  Gate repository mutations on project intent or explicit adoption.
- **Incomplete catalog:** Asset mappings live in several installers. Add
  consistency tests across manifest, bundle, and destinations.
- **Duplicate provider views:** Diagnose both paths and require explicit
  migration rather than silently pruning.

## References

- Discovery: `discovery.md`
- Backlog: `.oat/repo/pjm/backlog/items/BL-260818-make-the-project-management.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
