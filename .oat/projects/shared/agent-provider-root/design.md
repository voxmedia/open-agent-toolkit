---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-08-30
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: agent-provider-root

## Overview

This project repairs canonical skill-to-agent reads without changing provider
dispatch. A consuming skill binds a provider-aware local
`${AGENT_PROVIDER_ROOT}` for its workflows-pack dependency and probes three
ordered candidates: the loaded root derived from `${SKILL_DIR}/../..`, the
user canonical root at `${HOME}/.agents`, and the repository canonical root at
`<repo-root>/.agents`. The loaded candidate is eligible only when the exact
unsuffixed role target is the same installation scope's canonical Markdown
file or a symlink resolving exactly to it.

The binding is authored locally in each consumer. It is not a process
environment variable, ambient singleton, CLI resolver, persistent setting, or
provider-selection API. Each dependency binds and validates its own root; when
multiple independent packs are involved, the consumer uses descriptive
pack-qualified binding names instead of sharing one root implicitly.

Provider-native role selection remains authoritative. Codex and Cursor model
and effort variants continue to be selected and launched through the existing
dispatch resolver. Canonical root resolution supplies role instructions only
for direct source-of-truth reads and the bounded fresh-child fallback after a
recorded pre-start native-role rejection. It cannot choose, replace, or
reinterpret the dispatch target.

## Architecture

### System Context

Canonical Markdown under `.agents/agents` is the source of truth for direct
role-instruction reads. Claude and Cursor may expose unsuffixed base agents as
symlinks to that source, while Cursor also materializes suffixed variants and
Codex materializes transformed TOML variants. Only the exact unsuffixed
canonical identity is eligible for this contract; provider variants remain
native dispatch targets rather than instruction sources.

```text
existing dispatch resolver
        |
        +-- exact provider variant/model/effort --> native dispatch first
        |
        `-- after pre-start native rejection only
                 |
                 v
canonical skill consumer
        |
        v
local dependency-owned root binding
        |
        +-- loaded root: ${SKILL_DIR}/../..
        +-- user root:   ${HOME}/.agents
        `-- project:     <repo-root>/.agents
                 |
                 v
exact unsuffixed canonical Markdown instructions
                 |
                 v
fresh child with the original immutable dispatch target
```

**Key Components:**

- **Local root-binding contract:** Defines candidate order, ownership, exact
  target eligibility, miss behavior, and recovery.
- **Exact-target validator:** Distinguishes canonical files and exact canonical
  symlinks from copies, variants, transformed files, and unsafe links.
- **Typed portable-reference classifier:** Detects skill and agent target forms
  for both ratchet scan scopes.
- **Consumer migration layer:** Ports verified live reads while preserving
  dispatch and source-of-truth semantics.
- **Release verification layer:** Protects generated views, skill versions,
  package versions, and repository gates.

### Data Flow

For a direct source-of-truth pointer, the consumer resolves its one owning
dependency, reads the exact canonical role file, or fails with pack-aware
recovery. For dispatch fallback, the existing resolver first fixes the exact
provider target and attempts native dispatch. Only a recorded pre-start
rejection reaches canonical instruction resolution. The fallback then composes
the unchanged target with the resolved canonical instructions.

Candidate evaluation is deterministic. Invalid loaded representations are
candidate misses, not terminal errors, so resolution continues to the user and
project canonical roots. If every candidate misses, the consumer stops before
fresh-child launch. No result from one dependency is reused for another.

Separately, the portability ratchet scans the manifest-derived user-default
surface and every canonical agent through one typed parser. A new executable
bare agent read fails with exact `source -> target` evidence. Provider-view
examples and already-portable forms are classified but do not become findings.

## Component Design

### Local root-binding contract

**Purpose:** Bind one consuming dependency to the first eligible canonical
agent root without relying on the current working directory.

**Responsibilities:**

- Probe `loaded -> user -> project` in that order.
- Keep the binding local to the consuming instruction and dependency.
- Use `${AGENT_PROVIDER_ROOT}` only when one owning pack is involved.
- Use descriptive dependency- or pack-qualified names for simultaneous roots.
- Stop with workflows-pack recovery only after all candidates miss.

**Interface:** This is a shared authored-instruction pattern, not a new runtime
function. Each migrated site names a fixed canonical role and binds the first
valid root before constructing `${AGENT_PROVIDER_ROOT}/agents/<name>.md`.

**Design decisions:** A valid earlier tier wins; coexisting valid tiers are not
ambiguous. A root is never inferred from a different dependency's successful
read. No global cache or exported environment value is introduced.

### Exact-target validator

**Purpose:** Admit a loaded provider view only when its requested unsuffixed
target has canonical identity.

**Responsibilities:**

- Check exactly `agents/<canonical-name>.md` under the candidate root.
- Accept the same-scope canonical file directly.
- Accept a symlink only when its realpath is exactly that canonical file.
- Treat missing files, broken or escaping links, regular provider copies,
  transformed formats, wrong names, and suffixed variants as misses.
- Produce equivalent results whether `${SKILL_DIR}` is logical or already
  realpathed.

**Dependencies:** Existing `.agents`, `.claude`, and `.cursor` installation
layouts and normal filesystem identity checks.

**Design decisions:** Extension, byte equality, and role-name similarity are
insufficient. The validator compares exact canonical identity, which allows
Claude and Cursor base symlinks but excludes Cursor model variants and Codex
TOML.

### Typed portable-reference classifier

**Purpose:** Prevent new non-portable canonical skill and agent reads.

**Responsibilities:**

- Return typed `skill` or `agent` targets with exact source evidence.
- Detect canonical bare agent forms, dot-relative forms, and repeated-parent
  `agents/<name>.md` hops from nested skill content.
- Exclude portable bindings, provider-view examples, suffixed variants, Codex
  TOML, and unanchored prose.
- Serve both the manifest-derived user-default scan and the every-canonical-
  agent scan.
- Preserve the existing six-entry historical skill baseline byte-for-byte and
  enforce a separate zero-executable agent baseline.

**Interface:**

```typescript
type PortableAssetTarget =
  | { kind: 'skill'; name: string }
  | { kind: 'agent'; name: string };

type PortableAssetFinding = {
  source: string;
  target: string;
  asset: PortableAssetTarget;
};

function classifyPortableAssetTargets(markdown: string): PortableAssetFinding[];
```

**Design decisions:** One parser prevents regex drift, while retaining two
scan scopes avoids assuming that manifest coverage will always remain
identical to every-canonical-agent coverage. Duplicate matcher code may be
removed only after proving current manifest representation. Both scan scopes
remain even if their matcher implementation is centralized.

### Consumer migration and dispatch boundary

**Purpose:** Port the live role reads without changing how subagents are
selected or launched.

**Responsibilities:**

- Port five executable spellings across the four mandatory sites.
- Port two remote-review source-of-truth pointers as live reads.
- Retain the two `skeptic` Claude/Cursor descriptions as classified examples
  after revalidation.
- Re-sweep the full canonical skill surface before planning and implementation.
- Preserve exact native variant-first and fresh-child rejection semantics.

**Interface:** Dispatch consumers compose an existing immutable resolved target
with canonical instructions only after native-role rejection. Root resolution
has no provider, model, effort, variant, or route-selection authority.

**Design decisions:** Direct canonical reads remain for bounded fallback and
source-of-truth paths. Moving role delivery behind dispatch would require a
broader behavioral API and is outside this repair.

### Release verification layer

**Purpose:** Ship canonical skill and ratchet changes consistently.

**Responsibilities:** Revalidate generated provider views and sync drift, bump
each changed skill once per PR, advance the five public package versions in
lockstep, and run focused plus repository-wide gates with evidence-grade exit
codes.

## Data Models

These models describe contract and test evidence. This project creates no new
persistent runtime record, configuration file, or public response schema.

### Canonical agent resolution

```typescript
type AgentCandidateTier = 'loaded' | 'user' | 'project';

type AgentCandidateAttempt = {
  tier: AgentCandidateTier;
  candidate: string;
  outcome:
    | 'missing'
    | 'broken-symlink'
    | 'escaping-symlink'
    | 'noncanonical-copy'
    | 'transformed-format'
    | 'wrong-target';
};

type CanonicalAgentResolution =
  | {
      status: 'resolved';
      dependency: string;
      canonicalName: string;
      tier: AgentCandidateTier;
      providerRoot: string;
      selectedFile: string;
      canonicalFile: string;
      validation: 'direct-canonical' | 'exact-canonical-symlink';
    }
  | {
      status: 'miss';
      dependency: string;
      canonicalName: string;
      attempts: AgentCandidateAttempt[];
    };
```

The attempt order is fixed. A resolved loaded candidate records both the
provider-facing file and exact canonical target. Resolution data contains no
model, effort, provider variant, or dispatch-route fields.

### Fresh-child fallback composition

```typescript
type FreshChildFallback = {
  dispatchTarget: ExistingResolvedDispatchTarget;
  roleInstructions: CanonicalAgentResolution & { status: 'resolved' };
};
```

`dispatchTarget` is selected by the existing resolver and remains immutable.
`roleInstructions` supplies canonical Markdown only. The composition is
consumer-owned and persisted only where an existing workflow already records
fallback provenance.

## API Design

There is no new public CLI command, runtime API, environment variable,
configuration surface, or network endpoint.

### Authored local-binding interface

Each migrated consumer follows this conceptual procedure:

```text
bind canonical agent dependency:
  1. test ${SKILL_DIR}/../.. as the loaded provider root
  2. test ${HOME}/.agents
  3. test <repo-root>/.agents
  4. bind the first valid root locally
  5. if none is valid, report workflows-pack recovery and stop that fallback
```

The loaded candidate accepts only the exact canonical file or an exact
canonical symlink. User and project candidates are direct canonical `.agents`
targets. The canonical role name is a fixed consumer-owned literal.

### Dispatch integration

The existing resolver selects the provider target and attempts native dispatch
first. Canonical resolution is consulted only for direct pointers or after a
recorded pre-start native rejection. It cannot modify the target. Missing
canonical instructions block only the fresh-child fallback and do not
invalidate successful native dispatch.

### Ratchet parser interface

`classifyPortableAssetTargets(markdown)` is internal test infrastructure used
by both scan scopes. It returns exact typed evidence and is not shipped as a
command or supported public API.

## Security Considerations

This is local read-only filesystem resolution. It introduces no
authentication, network access, elevated privilege, or provider-directory
write.

- Canonical role names are fixed literals, not user-supplied paths.
- Paths are quoted and normalized before exact comparison.
- Loaded symlinks are accepted only when their resolved target exactly equals
  the expected same-scope canonical file.
- Broken links, traversal, escaping links, transformed copies, and differently
  named targets are rejected.
- Each dependency validates its own target.
- Resolution never rewrites provider views, canonical assets, user
  configuration, or dispatch policy.
- Diagnostics report dependency, candidate tier, and miss reason without
  printing role contents or unrelated home-directory data.
- Canonical resolution cannot weaken or replace the selected provider, model,
  effort, or variant.

Ordinary local-user filesystem trust still applies. Defending against an
attacker who can concurrently rewrite the user's OAT installation is outside
scope; observed invalid state nevertheless fails closed.

## Performance Considerations

Resolution performs at most three targeted filesystem checks per dependency.
It does not recursively scan provider directories, refresh catalogs, restart
processes, or access the network. Native dispatch remains the primary route;
canonical resolution affects direct pointers and the bounded fallback only.

Roots are not cached globally. Per-dependency revalidation avoids stale
symlink results and cross-dependency reuse. The ratchet scans existing bounded
Markdown surfaces and shares one parser between its two scopes. No database,
cache, resource-limit, or scalability mechanism is required beyond preserving
the constant candidate count and avoiding directory-wide discovery.

## Error Handling

Candidate failures are classified but are not terminal until all eligible
tiers have been checked.

| Condition                                                                | Behavior                                                        |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Loaded target missing, broken, escaping, transformed, copied, or wrong   | Record a miss; continue to user and project roots               |
| User target missing or invalid                                           | Continue to the project root                                    |
| Project target missing or invalid                                        | Complete resolution as unavailable                              |
| All candidates miss                                                      | Stop before fresh-child fallback; do not improvise instructions |
| One dependency is missing                                                | Fail only that dependency; do not reuse another root            |
| Native dispatch succeeds                                                 | Do not invoke fallback failure handling                         |
| Native target is rejected before start, but instructions are unavailable | Preserve target evidence and block fallback                     |
| Ratchet detects a bare executable agent read                             | Fail with exact `source -> target` evidence                     |

Terminal recovery names the workflows dependency and intended scope and
reports these available actions:

```text
oat tools install workflows --scope <user|project>
oat tools update --pack workflows --scope <user|project>
```

There are no automatic retries. A valid later tier resolves normally without
presenting an earlier loaded-provider miss as a workflow failure.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification                | Key Scenarios                                                                                       |
| ---- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| FR1  | Integration                 | Loaded, user-only, and project-only resolution; exact candidate ordering                            |
| FR2  | Integration                 | Claude/Cursor canonical symlinks; Codex canonical root; variant, TOML, copy, and unsafe-link misses |
| FR3  | Unit + integration          | Independent bindings; one-present/one-missing dependencies in both directions                       |
| FR4  | Unit + mutation             | Bare and portable table cases; exact evidence; zero agent baseline; unchanged skill baseline        |
| FR5  | Contract + manual inventory | Seven migrated live reads; classified `skeptic` examples; full canonical re-sweep                   |
| FR6  | Integration                 | Continue after loaded misses; first valid tier; fail-closed workflows recovery                      |
| FR7  | Repository gates            | Documentation, skill frontmatter, five-package lockstep, generated-view sync                        |
| NFR1 | Integration                 | Deterministic invalid/missing outcomes and no unrelated substitution                                |
| NFR2 | Unit + regression           | Existing cross-skill suite, candidate order, and historical evidence unchanged                      |
| NFR3 | Contract + manual           | No provider mutation, restart, runtime resolver, or dispatch-target change                          |

### Matcher unit tests

Table-driven positive cases cover `.agents/agents/<name>.md`, dot-relative
forms, repeated-parent `agents/<name>.md` hops, and existing bare skill forms.
Negative cases cover portable root bindings, canonical user/repo bindings,
legitimate Claude/Cursor examples, suffixed variants, Codex TOML, and
unanchored prose. Both scan scopes call the same parser. Current manifest
representation of every canonical agent must be proven before any duplicate
matcher implementation is removed; both scan scopes remain.

### Provider-layout integration fixtures

Fixtures cover safe Claude and Cursor base symlinks, ignored Cursor variants,
Codex native `.agents` resolution, rejected TOML, logical and realpathed skill
directories, unsafe loaded targets, candidate ordering, valid coexistence,
dependency isolation, and pack-aware recovery.

### Dispatch regression assertions

Focused contracts preserve exact native variant-first selection, immutable
model and effort pins, pre-start-rejection gating, fallback composition, and
the rule that missing instructions cannot affect a successful native launch.

### Ratchet and mutation verification

The final executable agent baseline is zero and the six-entry historical skill
baseline is byte-for-byte unchanged. A temporary bare read injected into a
user-default skill must fail with exact `source -> target` evidence. The file
is restored in all cases, the worktree is checked clean, and the focused suite
must then pass.

### Repository verification

Revalidate provider-generated views and sync drift. Run `pnpm lint` and
`pnpm format`, then the full Definition of Done in documented order. Capture
every exit code explicitly and use uncached, isolated-`HOME` evidence where
required by `AGENTS.md`.

## Deployment Strategy

This ships through the existing workflows pack and CLI package release
process. It requires no service deployment, feature flag, database migration,
provider restart, or new configuration.

1. Update canonical skills, ratchet tests, and applicable documentation.
2. Revalidate generated Claude, Cursor, and Codex views and sync drift.
3. Apply one frontmatter version bump to each changed skill.
4. Advance the five public package versions in lockstep.
5. Run focused resolution, matcher, dispatch, mutation, and sync checks.
6. Run lint, format, and the complete Definition of Done.
7. Release through the repository's normal package process.

Users receive the behavior through existing workflows install/update commands.
Before publication, rollback reverts the source and metadata changes. After
publication, rollback requires a new patch version restoring prior behavior;
published versions are never decremented. No persistent state or user data
requires restoration, and this project defines no new monitoring surface.

## Migration Plan

This is a source-contract migration, not a database or persistent-data
migration.

1. Re-sweep all canonical skill Markdown before editing.
2. Introduce the shared typed parser and table-driven matcher coverage.
3. Add the separate zero agent expectation without changing the six historical
   skill entries.
4. Port the five executable spellings across the four mandatory sites.
5. Port the two remote-review source-of-truth pointers.
6. Retain and classify the two `skeptic` provider-view descriptions.
7. Classify any new findings before deciding their treatment.
8. Revalidate provider mappings, generated views, sync, versions, and the
   clean ratchet.

Existing project-scope consumers remain compatible because the repository
canonical root stays in the chain. User-scope consumers gain the loaded and
user candidates. Dispatch policy and provider variants are not migrated.
Rollback restores the prior wording and matcher behavior and then verifies the
original focused suite and generated-view state.

## Open Questions

No material design questions remain open.

- Loaded roots are eligible only through exact canonical-target validation.
- `${AGENT_PROVIDER_ROOT}` names one owning pack; multiple roots are qualified.
- Each dependency binds independently even when roots coincide physically.
- Direct canonical reads remain for bounded fallback and source-of-truth paths.
- `tool-pack-scope-provider-truthfulness` may consume this contract later but
  is not a prerequisite for this project to ship.
- Provider-specific variants remain dispatch targets, not instruction sources.

## Implementation Phases

### Phase 1: Contract and ratchet

**Goal:** Establish exact resolution and portable-reference protection.

**Tasks:** Add the shared typed parser, matcher cases, provider-layout fixtures,
separate zero agent baseline, and mutation proof while preserving historical
skill evidence.

**Verification:** Focused parser, provider-layout, dependency-isolation, and
mutation contracts pass with exact evidence.

### Phase 2: Consumer migration

**Goal:** Port live reads without changing native dispatch.

**Tasks:** Port seven live reads/pointers, preserve model and effort selection,
classify provider examples, and re-sweep the canonical surface.

**Verification:** All live reads are portable, dispatch regressions pass, and
the agent ratchet is clean.

### Phase 3: Release verification

**Goal:** Prove shipped artifacts and repository gates remain coherent.

**Tasks:** Revalidate generated views and sync drift, apply skill/package
version bumps, and run focused plus complete repository checks.

**Verification:** Lint, format, release checks, and the Definition of Done pass
with explicit evidence.

## Dependencies

There are no new external packages, services, APIs, environment variables, or
runtime processes.

- `BL-260829-unified-agent-provider-root` is the requirements authority.
- The pack manifest defines shipped user-default and canonical-agent surfaces.
- The existing portable cross-skill classifier and historical baseline provide
  the ratchet foundation.
- Provider sync/materialization supplies layouts that this project validates
  but does not own.
- Existing dispatch resolvers remain authoritative for variant, model, and
  effort selection.
- Existing skill, generated-view, lockstep package, and release gates enforce
  shipment integrity.
- `tool-pack-scope-provider-truthfulness` may consume the contract later.
- `BL-260724-support-provider-directory` owns broader provider-directory
  symlink behavior.

If a provider cannot expose an exact same-scope canonical target, its loaded
candidate is skipped and normal canonical fallbacks remain available.

## Risks and Mitigation

| Risk                                                       | Probability | Impact | Mitigation                                                   | Contingency                                      |
| ---------------------------------------------------------- | ----------- | ------ | ------------------------------------------------------------ | ------------------------------------------------ |
| Canonical resolution changes native model/effort selection | Low         | High   | Immutable target boundary and dispatch regression assertions | Block release and restore prior consumer wording |
| Provider layout drift                                      | Medium      | High   | Exact-target validation and generated-view fixtures          | Miss loaded candidate and use canonical fallback |
| Variants become instruction sources                        | Low         | High   | Unsuffixed exact Markdown identity only                      | Fail closed and correct the provider mapping     |
| Matcher misses a new path form                             | Medium      | High   | Table cases, two scans, full sweep, mutation proof           | Extend the shared parser before migration        |
| Matcher flags legitimate documentation                     | Medium      | Medium | Typed exclusions and classified examples                     | Add a narrow evidence-backed exclusion           |
| Dependency roots bleed together                            | Low         | High   | Independent bindings and two-direction fixtures              | Block the missing dependency only                |
| Logical and real skill paths diverge                       | Medium      | Medium | Test both against canonical identity                         | Continue to user/project candidates              |
| HOME or cache creates false confidence                     | Medium      | High   | Isolated HOME, uncached runs, explicit exit codes            | Discard evidence and rerun cleanly               |
| Canonical and generated assets drift                       | Medium      | Medium | Sync, frontmatter, lockstep, lint, and format gates          | Regenerate or correct before release             |
| Provider-truthfulness work overlaps files                  | Medium      | Medium | Preserve the documented ownership boundary                   | Reconcile sequencing before implementation       |
| All fallback candidates are unavailable                    | Medium      | Medium | Fail before launch with precise recovery                     | Install or update workflows at intended scope    |

The residual risk is intentionally fail-closed: a novel provider layout may
miss the loaded candidate temporarily, but it cannot silently substitute
transformed instructions or alter the selected execution target.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Backlog: `../../../repo/pjm/backlog/items/BL-260829-unified-agent-provider-root.md`
- Related project: `../tool-pack-scope-provider-truthfulness/`
- Knowledge base: `../../../repo/knowledge/project-index.md`
- Architecture: `../../../repo/knowledge/architecture.md`
- Conventions: `../../../repo/knowledge/conventions.md`
