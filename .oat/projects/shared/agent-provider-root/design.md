---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-29
oat_generated: false
---

# Design: agent-provider-root

> Revalidation notice: this design is an initial architecture proposal, not an
> exhaustive implementation design. Revalidate the provider matrix, canonical
> asset inventory, candidate roots, generated views, and changed consumer sites
> before converting it into a plan or implementation work.

## Overview

This project closes the skill-to-agent direction left outside the merged PR #231
portability ratchet. Canonical skills need a stable way to locate canonical OAT
agent instructions when packs are installed at user scope, while provider-native
views remain a separate materialization concern.

The recommended design uses an agent-root abstraction with `/agents` and, where
shared vocabulary is valuable, `/skills` leaves. The root is resolved in the
canonical user/project tiers and is bound independently for each consuming
dependency. This preserves the existing isolation guarantee while avoiding
bare repository-relative reads.

No provider restart, provider-directory mutation, or native catalog update is
performed by this project. The neighboring scope/provider project owns those
behaviors and consumes this contract only when it needs canonical fallback role
instructions.

## Architecture

### System Context

```text
canonical skill consumer
        |
        v
per-dependency portable agent-root binding
        |
        +--> user canonical root (~/.agents/agents)
        |
        +--> project canonical root (<repo>/.agents/agents)
        |
        v
canonical Markdown role instructions
        |
        +--> fallback dispatch provenance (consumer-owned)
        +--> provider materialization/catalog visibility (separate project)
```

**Key Components:**

- **Root-binding contract:** Resolves an eligible canonical root for one
  dependency and exposes the agent leaf without consulting the current working
  directory.
- **Asset inventory and ratchet:** Derives the checked surface from the
  manifest, detects bare agent-read forms, and produces exact evidence.
- **Consumer migration layer:** Replaces or classifies the nine identified
  sites, with special attention to executable fallback paths.
- **Release/documentation layer:** Keeps contributor docs, bundled assets,
  frontmatter versions, and lockstep package versions synchronized.

### Component Diagram

```text
PACK_MANIFEST
     |
     v
portable-reference inventory -----> ratchet + mutation fixture
     |
     v
consumer dependency binding ------> canonical agent resolver
                                      |
                                      +--> user .agents/agents
                                      +--> project .agents/agents
                                      |
                                      v
                              canonical role-file path/version

scope/provider project -------- reads contract for fallback provenance
provider sync/materialization - remains outside this project
```

### Data Flow

1. A canonical skill identifies a named OAT role dependency.
2. The consumer binds the dependency's eligible canonical agent-root candidates
   without reusing another dependency's binding.
3. Candidates are evaluated in the documented tier order and are checked for
   the expected canonical role representation.
4. The selected role file is passed to the consumer's fallback instructions;
   missing or ambiguous candidates produce a fail-closed result.
5. The portability ratchet scans the same shipped consumer surface for bare
   agent reads and reports exact source-to-target evidence.
6. Provider sync/catalog visibility is evaluated separately by the
   scope/provider project; a canonical file's presence never implies native
   provider availability.

## Component Design

### Per-dependency root binding

**Purpose:** Provide a portable canonical root for one pack or role dependency.

**Responsibilities:**

- Keep the dependency's candidate list independent from other pack bindings.
- Make user/project tier order explicit and deterministic.
- Return canonical Markdown role instructions, not transformed provider views.
- Preserve enough source/version information for fallback provenance.

**Interfaces:**

```typescript
type AgentRootTier = 'user' | 'project';

type CanonicalAgentRoot = {
  tier: AgentRootTier;
  root: string;
  representation: 'canonical-markdown';
};

type AgentDependencyBinding = {
  dependency: string;
  candidates: CanonicalAgentRoot[];
};

type AgentResolution =
  | {
      status: 'resolved';
      dependency: string;
      tier: AgentRootTier;
      roleFile: string;
      representation: 'canonical-markdown';
    }
  | {
      status: 'unavailable' | 'ambiguous';
      dependency: string;
      candidates: string[];
      reason: string;
    };
```

**Dependencies:**

- Canonical pack manifest and installed-root conventions.
- Existing portable cross-skill binding behavior from PR #231.
- Consumer-specific fallback contracts.

**Design Decisions:**

- Start with canonical user/project tiers. Do not include provider-loaded tiers
  until format equivalence is proven.
- Bind the root per dependency even if the physical candidate paths happen to
  be identical.
- Treat a missing role file as an explicit resolution failure, not as a reason
  to fall through to an unrelated role or current-working-directory path.

### Portable-reference ratchet

**Purpose:** Prevent new non-portable skill-to-agent references.

**Responsibilities:**

- Derive the checked skill and agent surface from the pack manifest.
- Recognize executable bare `.agents/agents/` reads and equivalent path forms.
- Reuse the strongest existing matcher behavior where possible.
- Keep descriptive-only references separately classified with rationale.

**Interfaces:**

```typescript
type PortableReferenceFinding = {
  source: string;
  target: string;
  kind: 'skill' | 'agent';
  executable: boolean;
  rationale?: string;
};

type RatchetResult = {
  liveFindings: PortableReferenceFinding[];
  historicalFindings: PortableReferenceFinding[];
};
```

**Design Decisions:**

- Use the manifest-derived surface as the source of truth so new user-default
  assets enter the check automatically.
- Mutation-test the detector by injecting a bare agent read and asserting exact
  source-to-target output.
- Reconcile duplicate matcher logic rather than extending one copy and leaving
  another known to drift.

### Consumer migration

**Purpose:** Port the current live role-file consumers to the contract.

**Responsibilities:**

- Migrate the four executable sites identified by discovery.
- Classify the five descriptive/pointer sites during revalidation.
- Preserve fallback instructions and native-role rejection semantics.
- Record role-file source and version without claiming native equivalence.

**Design Decisions:**

- Do not change provider dispatch selection or generic-child policy here.
- If the dispatch layer later owns role-file delivery, treat that as a
  replacement design and retire the direct-read contract deliberately.

### Documentation and release layer

**Purpose:** Make the boundary durable in shipped documentation and versioning.

**Responsibilities:**

- Document canonical versus provider-native representations.
- Explain independent dependency binding and eligible tiers.
- Bump changed skill frontmatter once per PR and lockstep public packages when
  shipped assets change.
- Link the scope/provider project as the owner of materialization and restart
  behavior.

## Data Models

### Root resolution record

**Purpose:** The minimal inspectable result needed by a consumer and its tests.

**Schema:**

```typescript
interface RootResolutionRecord {
  dependency: string;
  requestedRole: string;
  candidateTiers: Array<'user' | 'project'>;
  selectedTier: 'user' | 'project' | null;
  selectedRoot: string | null;
  representation: 'canonical-markdown' | null;
  status: 'resolved' | 'unavailable' | 'ambiguous';
  reason: string | null;
}
```

**Validation Rules:**

- `resolved` requires a selected tier, root, canonical representation, and
  existing expected role file.
- `unavailable` or `ambiguous` requires a reason and candidate evidence.
- A record never reports provider catalog visibility; that is a separate state
  owned by scope/provider diagnostics.

**Storage:**

- **Location:** In the consuming command/skill's existing structured result or
  review artifact as appropriate.
- **Persistence:** Preserve only where the consumer already persists fallback
  provenance; this project does not create a new global state file.

## API Design

### Portable agent resolution interface

**Method:** Internal resolver contract
**Path:** N/A — local CLI/skill contract

**Request:**

```typescript
interface ResolveAgentRequest {
  dependency: string;
  role: string;
  allowedTiers: Array<'user' | 'project'>;
  expectedRepresentation: 'canonical-markdown';
}
```

**Response:** `RootResolutionRecord`

**Error Handling:**

- `unavailable`: no eligible canonical root contains the requested role.
- `ambiguous`: more than one eligible candidate violates the documented
  precedence or ownership contract.
- `invalid-dependency`: the consumer asks for a root it does not own.

**Authorization:** The resolver reads only OAT-managed canonical roots and does
not mutate provider directories or user configuration.

## Security Considerations

### Authentication

Not applicable; this is local path resolution.

### Authorization

Candidate roots must remain contained within the OAT-managed user/project roots.
User-owned provider directories are not write targets for this project.

### Data Protection

- **Encryption:** Not applicable.
- **PII Handling:** Do not include home-path secrets or unrelated user content
  in diagnostics beyond the existing redaction policy.
- **Input Validation:** Validate dependency names, role names, candidate-root
  ancestry, and canonical representation before selection.

### Threat Mitigation

- **Path traversal:** Reject role/dependency values that escape the managed
  root; never concatenate unchecked user input into a candidate path.
- **Wrong-root substitution:** Keep dependency bindings independent and fail
  closed when the expected canonical role is missing.
- **Provider confusion:** Label canonical instructions separately from provider
  materialization and native catalog visibility.

## Performance Considerations

### Scalability

The resolver operates over a small manifest-derived candidate set. It should
remain O(number of eligible tiers) per dependency; the ratchet runs in tests,
not on every user invocation.

### Caching

No new persistent cache is required. Any existing command-scoped inventory may
be reused only if its scope and dependency ownership remain explicit.

### Resource Limits

- **Memory:** Negligible manifest/role metadata only.
- **CPU:** Bounded by the number of managed assets and candidate tiers.
- **Network:** None.

## Error Handling

### Error Categories

- **User errors:** Missing user/project pack or role produces an actionable
  project-scope or pack-install explanation.
- **System errors:** Invalid or ambiguous roots fail closed with evidence.
- **External service errors:** Not applicable; provider catalog state is outside
  this project.

### Retry Logic

No automatic retry or provider restart. The caller may rerun after installation
or scope changes, while the scope/provider project explains catalog refresh
requirements.

### Logging

- **Info:** Selected canonical tier and role representation where the existing
  caller exposes resolution details.
- **Warn:** A deprecated/bare reference is found during development checks.
- **Error:** Resolution is unavailable or ambiguous, with redacted candidate
  evidence and a recovery pointer.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification           | Key Scenarios                                              |
| ---- | ---------------------- | ---------------------------------------------------------- |
| FR1  | unit + integration     | user-only role resolution, project fallback, missing role  |
| FR2  | design + contract      | canonical Markdown versus provider view, tier policy       |
| FR3  | unit + integration     | dependency A present/B missing and reverse                 |
| FR4  | unit                   | bare-path matcher, mutation failure, exact evidence        |
| FR5  | contract + integration | four executable sites, descriptive-site classification     |
| FR6  | integration            | native rejection followed by canonical fallback provenance |
| FR7  | release + contract     | docs, skill versions, package lockstep                     |
| NFR1 | unit + integration     | missing and ambiguous candidates fail closed               |
| NFR2 | regression             | existing portable cross-skill suite and candidate order    |
| NFR3 | integration + manual   | no provider mutation, boundary diagnostics                 |

### Unit Tests

- **Scope:** Candidate binding, path validation, representation checks, matcher
  forms, and dependency isolation.
- **Coverage Target:** All resolver branches and all live matcher forms; no
  numeric percentage target is substituted for branch coverage.
- **Key Test Cases:**
  - user-only and project-only canonical roots;
  - missing, ambiguous, traversal, and wrong-representation candidates;
  - independent dependency bindings;
  - bare `.agents/agents/` mutation fails with exact evidence.

### Integration Tests

- **Scope:** Pack-manifest-derived asset inventory, migrated canonical skills,
  and fallback provenance consumers.
- **Test Environment:** Isolated user/project roots with disposable canonical
  Markdown assets; no provider restart or external provider state.
- **Key Test Cases:**
  - user-scope workflows/research consumer resolution;
  - four executable fallback/pointer consumers;
  - new manifest asset automatically enters the ratchet;
  - provider-view presence does not alter canonical resolution.

### End-to-End Tests

- **Scope:** A minimal user-scope-only fallback scenario if the existing OAT
  fixture can run it without provider process control.
- **Test Scenarios:**
  - native role unavailable, canonical role file resolved, generic fallback
    records its provenance;
  - canonical role unavailable, fallback fails with an actionable cause.

## Deployment Strategy

### Build Process

Run the repository's required skill, type, test, build, version, release, and
docs gates for any shipped skill/asset change. The focused ratchet and consumer
tests must pass before the full suite.

### Deployment Steps

1. Revalidate discovery and this design against current `origin/main`.
2. Resolve open questions and convert this design into a concrete plan.
3. Implement contract, ratchet, consumer migrations, docs, and version bumps.
4. Run focused tests followed by the full definition-of-done gate sequence.
5. Verify no provider materialization or user-owned directory behavior changed.

### Rollback Plan

Revert the implementation PR as one versioned change. Existing project/user
candidate behavior must remain available, and no migration should require
rewriting user-owned provider directories.

### Configuration

- **Environment Variables:** None proposed.
- **Feature Flags:** None proposed; the contract should be deterministic once
  shipped.

### Monitoring

- **Metrics:** No new runtime metric required initially.
- **Alerts:** Focused contract failure and fail-closed diagnostics are the
  primary signals.
- **Dashboards:** Not applicable.

## Migration Plan

This is a source-contract migration, not a persistent data migration.

### Migration Steps

1. Inventory and classify all canonical skill-to-agent reads.
2. Implement and test the approved binding.
3. Port executable consumers and reconcile descriptive references.
4. Update docs and version metadata.

### Rollback Strategy

Revert the source/documentation/version changes. Since this project does not
rewrite provider views or canonical installation state, rollback is file-local.

### Data Validation

Validate the final manifest-derived consumer inventory, zero live bare agent
reads, expected user/project resolution, and exact fallback provenance.

## Open Questions

- **Tier eligibility:** Is user/project-only resolution the safe default, or can
  loaded provider siblings be proven canonical Markdown across providers?
- **Naming:** Is `${AGENT_PROVIDER_ROOT}` clear enough beside existing
  per-dependency skill-root names?
- **Isolation:** What exact binding shape preserves per-dependency isolation if
  both leaves share a physical root?
- **Long-term interface:** Should a later dispatch service eliminate direct
  skill-to-agent file reads?
- **Integration sequencing:** Does the scope/provider project consume this
  contract first, or do both projects land separate compatible slices with one
  shared test fixture?

## Implementation Phases

### Phase 1: Contract and ratchet

**Goal:** Decide and enforce the portable canonical agent-reference contract.

**Tasks:**

- Revalidate asset inventory and resolve tier/representation/isolation questions.
- Implement the manifest-derived agent-read ratchet and mutation test.
- Reconcile duplicate matcher logic and establish focused fixtures.

**Verification:** Contract tests fail on injected bare reads and pass for the
approved canonical forms, with no regression in existing cross-skill checks.

### Phase 2: Consumer migration and release

**Goal:** Port live consumers and ship the documented contract.

**Tasks:**

- Migrate the four executable role-file consumers.
- Classify or exempt descriptive references with recorded rationale.
- Update docs, skill frontmatter versions, lockstep package versions, and
  release artifacts.
- Verify the integration boundary with the scope/provider project.

**Verification:** User-scope-only canonical fallback tests pass, provenance is
preserved, and the full repository definition-of-done sequence passes.

## Dependencies

### External Dependencies

- None; this is local CLI/skill behavior.

### Internal Dependencies

- `BL-260829-unified-agent-provider-root` (Unified AGENT_PROVIDER_ROOT binding
  for portable skill and agent references).
- Merged PR #231's portable-reference ratchet and generated asset baseline.
- `tool-pack-scope-provider-truthfulness` for provider visibility and fallback
  integration boundaries.
- `BL-260724-support-provider-directory` (Support provider directory symlinks
  as full collection sync) for directory ownership semantics.

### Development Dependencies

- Existing manifest-derived contract-test fixtures.
- Isolated user/project asset fixtures.
- Repository lockstep version and docs-release gates.

## Risks and Mitigation

- **Provider format drift:** Medium likelihood / high impact. Revalidate
  provider representations and require canonical Markdown checks.
- **Root isolation regression:** Medium likelihood / high impact. Add explicit
  two-dependency tests and preserve per-dependency bindings.
- **Cross-project file collision:** Medium likelihood / medium impact. Keep
  materialization changes out of this project and coordinate shared fallback
  assertions before implementation.
- **False confidence from the current OAT repo:** Medium likelihood / high
  impact. Test a disposable user-scope-only repository without project agent
  files.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Backlog: `../../../repo/pjm/backlog/items/BL-260829-unified-agent-provider-root.md`
- Related project: `../tool-pack-scope-provider-truthfulness/`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Architecture Docs: `.oat/repo/knowledge/architecture.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
