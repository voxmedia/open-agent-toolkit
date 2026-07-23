---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-22
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: subagent-orchestration

## Overview

This project separates model-selection guidance from OAT dispatch mechanics
without renaming the existing dispatch skill. A new, self-contained
`subagent-orchestration` skill becomes the canonical guidance layer: it owns
the five task classes, durable selection principles, dated provider mappings,
and evidence-refresh policy. It remains user-invocable and agent-discoverable
so it can be used independently of OAT.

The existing `oat-dispatch-subagents` skill remains an internal utility and
continues to own capability probing, live-catalog intersection, launch routes,
liveness, acceptance and recovery, and dispatch records. Its required-loading
contract composes the generic principles, exactly one provider selection
reference, and the matching OAT mechanics reference. The imported drafts are
starting material only; current OAT safeguards and repository conventions take
precedence.

Both skills ship in the utility pack from canonical `.agents` sources. Claude
receives a generated skill link, while Cursor and Codex native-read canonical
skills and do not receive mirrored skill views. Utility subset selection uses a
directional dependency: selecting `oat-dispatch-subagents` automatically
includes `subagent-orchestration`, while the self-contained guidance skill may
be installed alone. Validation enforces that dependency, the
selection-versus-mechanics boundary, compatibility of additive dispatch
evidence, provider-integration synchronization, and the repository's release
contract.

## Architecture

### System Context

The split introduces a guidance layer above the existing OAT dispatch engine.
Direct users and non-OAT agents can consume the guidance layer alone.
OAT-managed callers continue to invoke `oat-dispatch-subagents`; that skill
loads the guidance needed to choose a floor-satisfying target before applying
provider-specific launch mechanics.

Canonical sources remain under `.agents`. Claude links, materialized agent
roles, synchronization metadata, and bundled CLI assets are generated outputs;
Cursor and Codex ordinary skills remain native-read. The utility-pack installer
is the dependency boundary: dispatch installation must expose guidance, while
guidance-only installation remains valid.

**Key Components:**

- **Generic guidance skill:** Durable task classification and routing
  principles, provider-specific dated matrices, and refresh evidence.
- **OAT dispatch skill:** Provider-neutral launch contract plus
  provider-specific control-surface mechanics and dispatch evidence.
- **Distribution layer:** Utility-pack inventory, bundled assets, and
  synchronized provider views.
- **Validation layer:** Structural, ownership-boundary, safeguard,
  compatibility, synchronization, and release checks.

### Component Diagram

```text
Direct user or non-OAT agent
              |
              v
  subagent-orchestration
  + durable principles
  + one provider selection reference
  + evidence/refresh policy
              ^
              |
OAT caller -> oat-dispatch-subagents
              + provider-neutral launch contract
              + one matching mechanics reference
              + dispatch record schema
              |
              v
    live catalog + authorized route
              |
              v
         child launch

.agents canonical skills
        |
        +--> Claude skill link + materialized agent synchronization
        |
        +--> Cursor/Codex native skill reads
        |
        +--> CLI utility-pack bundle
```

### Data Flow

1. A caller classifies a bounded task and supplies any task-class floor,
   authority, expected evidence, and escalation conditions.
2. `oat-dispatch-subagents` loads the generic model-selection principles.
3. The active provider selects exactly one dated guidance reference; the
   dispatch skill also loads exactly one matching mechanics reference.
4. Configured candidates are intersected with the launching surface's live
   catalog, project policy, and named ceiling.
5. The dispatch engine chooses an eligible authorized route, records each
   selection axis independently, and launches once.
6. Acceptance, continuation, outcome, and runtime identity remain separate.
   Post-acceptance failure never authorizes automatic replacement.
7. Canonical skill changes flow through provider synchronization and CLI
   bundling; validation rejects drift or incomplete release metadata.

## Component Design

### Generic `subagent-orchestration` Guidance

**Purpose:** Provide portable, evidence-aware model-selection guidance without
depending on OAT launch machinery.

**Responsibilities:**

- Define root-versus-subagent ownership and bounded delegation requirements.
- Define the five task classes and escalation boundaries.
- Keep model, provider-native effort, reasoning mode, service tier, role,
  authority, and route as independent axes.
- Load one provider reference containing dated model mappings.
- Qualify newer candidates rather than automatically replacing incumbents.
- Require evidence and independent review for load-bearing or consequential
  conclusions.

**Interfaces:**

- The root skill is both user-invocable and agent-discoverable.
- `model-selection-principles.md` is the durable detailed contract.
- `provider-claude.md`, `provider-codex.md`, and `provider-cursor.md` are
  mutually exclusive active-provider selection references.
- `evidence-and-refresh.md` defines freshness states, review triggers,
  qualification criteria, and reverification records.

**Design Decisions:**

- Provider matrices remain separate because harness behavior and effort
  semantics are not interchangeable.
- Named models are dated examples subordinate to current instructions and the
  live launching-surface catalog.
- Cursor `-fast` aliases are service-tier selections, not capability upgrades.
- Claude routing retains the current Opus-first policy: Opus is the default
  Claude route for hard-reasoning and consequential work; Fable is reserved
  for exceptional escalation. Provider-native effort notes must remain
  separate from the task-class mapping.
- The Claude reference must preserve the root-versus-volume cost asymmetry:
  root-orchestrator calls are low-volume and coherence-critical, while bounded
  subagents carry most execution volume and should capture routine savings.
  Fable escalation therefore requires unresolved ambiguity, exceptional
  novelty or consequence, or a directly relevant Fable strength whose expected
  value justifies its incremental cost; a consequential label alone is not
  sufficient.
- The imported Claude draft's cyber-sensitive exception must be reframed:
  Opus-first is the general rule, and Fable's stronger cyber classifier is
  supporting operational evidence rather than an exception that switches the
  default. Preserve the caveat that stronger classifier behavior is not a
  capability weakness.
- The skill contains no OAT project state, lifecycle, launch, recovery, or
  record-writing policy.

### Internal `oat-dispatch-subagents` Mechanics

**Purpose:** Convert a bounded caller request and generic selection policy into
one authorized, evidenced launch.

**Responsibilities:**

- Probe capability and authorization state.
- Observe the exact launching surface's catalog and role selectors.
- Intersect candidates with policy, ceiling, task-class floor, and live
  selectors.
- Preserve native-first routing and distinguish native, policy-resolved, and
  explicitly authorized alternate routes.
- Record dispatch axes, launch acceptance, continuation, and outcome.
- Preserve fail-closed behavior and no-automatic-replacement safeguards.

**Interfaces:**

- Required loading composes the generic principles, one provider selection
  reference, and one matching mechanics reference.
- Provider mechanics references contain control surfaces, topology,
  liveness, native/CLI/SDK route rules, and catalog-mismatch handling.
- `record-schema.md` defines the request, record, and homogeneous-wave evidence
  shapes.

**Design Decisions:**

- The skill keeps its current name; a generic rename is a separate migration.
- Mechanics may discuss selectors and class floors, but it must not own named
  model families, dated task-class matrices, or provider recommendation
  ladders.
- If generic guidance is absent, class-constrained dispatch fails closed.
  Unconstrained legacy dispatch may use only current user/repository
  instructions intersected with the live catalog.
- Current Cursor outer-lifecycle and reviewer-local safeguards are preserved
  verbatim in meaning, including replacement eligibility only after an actual
  pre-start rejection.

### Consumer Migration

**Purpose:** Move every active selection consumer to the two-layer loading
contract so no caller mistakes mechanics-only references for model guidance.

**Responsibilities:**

- Inventory canonical instructions and validation code that reference
  `oat-dispatch-subagents/references` or otherwise describe the old
  single-reference contract.
- Update direct selection consumers to load generic principles, exactly one
  provider selection reference, and the matching mechanics reference.
- Preserve mechanics-only references where a consumer is intentionally
  discussing launch controls, but ensure that any model-selection step also
  names the generic guidance source.
- Cover at least the canonical reviewer agent, project planning and
  implementation skills, Cursor Cloud orientation, dispatch adapters, and CLI
  skill validation. Generated Claude and Cursor views follow through sync.
- Exclude historical provenance tables and archived project artifacts from
  active-instruction migration while keeping their references intact.

**Interfaces:**

- Canonical `.agents` instructions are the source of truth.
- Repo-wide reference inventory is the acceptance input; provider sync
  propagates canonical edits.
- Validation rejects active selection instructions that still treat
  `oat-dispatch-subagents/references/provider-*.md` as a complete selection
  source.

**Design Decisions:**

- Consumer updates are part of this project, not a follow-up, because the
  ownership split would otherwise leave active callers with incomplete
  guidance.
- Tests distinguish selection-purpose references from valid mechanics-purpose
  references rather than banning every occurrence of the dispatch path.

### Distribution and Synchronization

**Purpose:** Ensure the two-layer contract is installed and published as one
usable utility capability.

**Responsibilities:**

- Add the generic guidance skill to the utility-pack inventory beside
  `oat-dispatch-subagents`.
- Expand custom utility selections so choosing `oat-dispatch-subagents`
  automatically includes `subagent-orchestration`; do not add the inverse
  dependency.
- Keep bundle inputs and installer/remove/update behavior consistent with the
  canonical inventory.
- Generate the Claude skill link from `.agents`; Cursor and Codex native-read
  canonical skills and must not gain mirrored ordinary-skill outputs.
- Update synchronization metadata after canonical changes.
- Apply one frontmatter version increase per changed canonical skill in the
  final PR diff.
- Advance all lockstep public package versions because bundled skill assets are
  shipped CLI functionality.

**Interfaces:**

- Utility-pack manifest and bundle consistency checks.
- `oat sync --scope all` for provider-linked views and sync metadata.
- Repository release validation for the five public packages and bundled
  version metadata.

### Validation Contracts

**Purpose:** Detect accidental duplication, missing dependencies, safeguard
regression, and incomplete distribution.

**Responsibilities:**

- Verify skill frontmatter, invocation posture, and required-loading paths.
- Verify both skills are present in the utility pack and bundle.
- Verify selection references own dated model matrices and evidence metadata.
- Verify mechanics references retain provider control surfaces and contain no
  named recommendation matrix.
- Pin critical launch, liveness, acceptance, and no-replacement language by
  semantic assertions rather than broad snapshot tests.
- Verify dispatch evidence additions remain optional for legacy callers.
- Verify generated provider views and bundled assets are synchronized.

**Design Decisions:**

- Existing tests that read provider guidance from
  `oat-dispatch-subagents` move their selection assertions to the generic
  skill while leaving mechanics assertions on the dispatch skill.
- Negative ownership checks target unambiguous named-model and matrix markers;
  they do not prohibit mechanics from referring to generic model selectors or
  task-class floors.

## Data Models

### Provider Guidance Metadata

**Purpose:** Make dated mappings reviewable and refreshable.

**Schema:**

```yaml
guidance_version: YYYY-MM-DD
last_verified: YYYY-MM-DD
review_after: YYYY-MM-DD
catalog_basis: optional description of observed harness evidence
```

**Validation Rules:**

- Dates are explicit and internally ordered.
- A current live catalog or instruction may override a mapping without
  silently rewriting durable guidance.
- Review-required or stale guidance invokes the evidence-and-refresh contract
  before a consequential dispatch depends on it.

**Storage:** Frontmatter in each canonical provider selection reference.

### Optional Dispatch Guidance Evidence

**Purpose:** Preserve how dated guidance and independent provider controls
influenced a launch while remaining compatible with legacy callers.

**Schema:**

```yaml
reasoning_mode_selector: null
service_tier_selector: standard
guidance_reference: subagent-orchestration/references/provider-codex.md
guidance_version: YYYY-MM-DD
guidance_verified_at: YYYY-MM-DD
guidance_status: fresh
```

**Validation Rules:**

- Existing request and record shapes remain valid when these fields are absent.
- Model, effort, reasoning mode, and service tier remain independent.
- Service tier never changes the task-class floor or floor-satisfaction result.
- Unknown service-tier semantics are diagnostic and may block a consequential
  route.

**Storage:** Structured dispatch request/record evidence owned by the calling
workflow.

## Error Handling

### Missing or Invalid Guidance

- Missing generic guidance blocks class-constrained dispatch before launch.
- Missing, malformed, or stale provider metadata cannot be treated as fresh.
- Unconstrained legacy dispatch may proceed only from current instructions and
  live-catalog evidence; it cannot reconstruct the missing dated matrix.

### Catalog or Route Mismatch

- A missing selector produces a catalog-mismatch diagnostic with observation
  scope and candidate evidence.
- An unavailable native target does not authorize an improvised CLI, SDK, or
  cross-runtime route.
- A launch accepted by the provider is never replaced automatically after
  timeout, interruption, refusal, `BLOCKED`, or task failure.

### Distribution Drift

- Missing utility-pack or bundle entries fail focused consistency checks.
- Provider-view or sync-manifest drift is corrected through the repository sync
  command, not by hand-editing generated views.
- Version or release-contract failures block project completion.

## Testing Strategy

### Skill Contract Tests

- Validate the generic skill's name, version, compatibility statement,
  user-invocable posture, and provider-reference loading contract.
- Validate the dispatch skill's internal posture and progressive loading of
  principles, one selection reference, and one mechanics reference.
- Validate structural matrix invariants: all five task classes, independent
  effort notes, and correctly ordered freshness metadata.
- Validate the durable Opus-first policy and exceptional Fable disposition
  without freezing every dated incumbent name or row value.
- If exact dated mappings need fixture coverage, keep them in one
  refresh-owned fixture whose update obligation is documented by the guidance
  refresh workflow.
- Validate freshness metadata and evidence-refresh triggers.

### Ownership-Boundary Tests

- Assert that named provider families and dated recommendation matrices live
  in generic selection references.
- Assert that OAT provider references retain surface controls, topology,
  liveness, route selection, and catalog-mismatch behavior.
- Assert that mechanics references do not reintroduce named recommendation
  matrices.
- Pin the Cursor pre-start-rejection and no-post-acceptance-replacement
  safeguards.

### Compatibility Tests

- Validate legacy dispatch requests and records without guidance-evidence
  fields.
- Validate enriched records with reasoning mode, service tier, guidance
  reference, version, verification date, and freshness state.
- Validate that an unknown service tier cannot satisfy a higher class floor.

### Distribution and Integration Tests

- Verify the utility pack installs, updates, and removes both skills from the
  canonical inventory.
- Verify subset selection auto-includes guidance when dispatch is selected and
  still permits a guidance-only installation.
- Verify bundle consistency includes both canonical skill trees.
- Regenerate provider integrations and assert no synchronization drift or
  unexpected Cursor/Codex skill mirrors.
- Run focused CLI skill validation, formatting, type checking, and relevant
  tests.
- Run the repository's publishable-package release validation after the
  lockstep version update.

## References

- Discovery: `discovery.md`
- Imported handoff: `references/prior-project/handoff.md`
- Imported global-file record:
  `references/prior-project/global-file-updates.md`
- Imported guidance draft:
  `references/prior-project/skills/subagent-orchestration/`
- Imported dispatch draft:
  `references/prior-project/skills/oat-subagent-dispatch/`
- Downstream coordination: after canonical guidance ships, refresh the
  operator's non-sync-managed vault matrix and global-file record so they do
  not continue to describe the rejected Fable-first policy. Private-repository
  copies remain the responsibility of their existing sync process.
- Workflow bookkeeping: quick-mode lightweight design keeps
  `oat_ready_for: null`; implementation readiness is established only by the
  reviewed, completed plan.
