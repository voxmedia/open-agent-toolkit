---
oat_status: complete
oat_ready_for: null
oat_last_updated: 2026-07-12
oat_generated: false
oat_template: false
---

# Lightweight Design: Dispatch Subagent Abstraction

## Overview

Split subagent dispatch into a reusable engine and a project lifecycle adapter.
The engine standardizes how any OAT skill probes capability, resolves provider
catalogs, selects model/effort/route/authority, launches a child, and records
evidence. It remains independent of active projects, task IDs, commits, phase
state, and gate semantics.

The project adapter translates OAT project lifecycle context into a generic
dispatch request. It resolves project policy and ceilings through OAT CLI state
interfaces, applies lifecycle role rules, and delegates selection/launch to the
engine. This inversion lets analytical workflows such as `oat-repo-improve`
use economical read-only reconnaissance without loading project ceremony.

Both skills are internal dependencies. Calling workflows own user-facing mode
banners, lifecycle sequencing, artifact writes, and final judgment. The helper
skills expose compact progress/selection summaries but do not print nested OAT
workflow banners on every dispatch.

## Architecture

```text
OAT analytical or workflow caller
  ├─ defines objective, scope, role, authority, output contract, fallback
  ├─ retains synthesis, user decisions, and artifact ownership
  └─ loads oat-dispatch-subagents
       ├─ resolves provider + live catalog + policy inputs
       ├─ selects exact route/model/effort/role
       ├─ loads exactly one provider reference
       ├─ launches once and records acceptance/outcome
       └─ supports generic recon/generation/review/worker roles

OAT project lifecycle caller
  └─ loads oat-project-dispatch-subagents
       ├─ resolves project state, phase/task scope, policy, gates, write roots
       ├─ maps lifecycle role to a generic dispatch request
       └─ invokes oat-dispatch-subagents
```

Dependency direction is one-way:

```text
oat-project-dispatch-subagents → oat-dispatch-subagents
```

The general engine never calls or reads the project adapter.

## Component Design

### General Dispatch Contract

**Location:** `.agents/skills/oat-dispatch-subagents/SKILL.md`

**Purpose:** Define provider-neutral dispatch axes, capability/authorization
states, catalog evidence, full-information selection, generic role policies,
launch acceptance, recovery, and required records.

**Responsibilities:**

- Require callers to provide bounded objective, scope, expected output,
  verification evidence, escalation conditions, authority, deadline, and
  fallback policy.
- Distinguish capability states: `available`, `authorization-required`, and
  `unresolved-or-unsupported`.
- Ask once when authorization is required and preserve the caller's approval
  scope.
- Resolve provider, dispatch context, role, policy/ceiling inputs, and all
  eligible candidates.
- Observe the launching dispatcher's live catalogs and preserve exact selector
  strings.
- Select and record a native, inherited, provider-CLI, gate, or blocked route
  before launch.
- Separate launch acceptance, child outcome, and runtime confirmation.
- Prohibit silent replacement after accepted launch.
- Support per-wave evidence only for homogeneous read-only recon lanes.

**Non-responsibilities:** Project lookup, phase/task ordering, commits,
worktrees, project gates, artifact mutation, and caller result synthesis.

### Provider References

**Locations:**

- `references/claude.md`
- `references/codex.md`
- `references/cursor.md`

Resolve the active provider first, then load exactly one reference. Each file
describes native controls, topology, exact selection mechanics, CLI/external
routes when applicable, and provider-specific evidence boundaries. Provider
files must not redefine generic selection or recovery policy.

Active harness instructions take precedence over bundled model examples. The
engine preserves task-shape intent: economical workers for bounded recon,
stronger dossier leads only when context or interpretation requires them, and
root/frontier context for coherence-critical synthesis.

### Generic Role Policy

The engine supports extensible role names with required baseline classes:

- `recon` — read-only bounded evidence collection; explicit economical target;
  never silently inherit an expensive root model.
- `dossier-lead` — one declared scope that reconciles dispersed evidence and
  may coordinate bounded recon when the host supports nesting.
- `generator` — self-contained generation with authority declared by caller.
- `worker` — bounded execution with explicit authority and output contract.
- `reviewer` — independent or inherited review according to caller policy.
- `coordinator` — coordination-only role; caller defines child topology.

Callers may provide a more specific role label, but every dispatch maps to one
baseline class so default authority and inheritance rules remain auditable.

### Dispatch Wave Record

A single record may represent multiple lanes only when provider, context,
catalog snapshot, selected route, role class, model, effort, authority,
deadline, and fallback are identical. The record contains a lane manifest and
lane-specific acceptance/outcome entries. Any differing axis creates a
separate record.

### Project Lifecycle Adapter

**Location:** `.agents/skills/oat-project-dispatch-subagents/SKILL.md`

**Purpose:** Resolve project lifecycle context and map it into the general
dispatch contract.

**Responsibilities:**

- Resolve project path and lifecycle fields through `oat project status`, not
  ad-hoc YAML parsing.
- Resolve project/phase dispatch policy and named ceiling.
- Define policy for phase coordinators, task workers, fix workers, planning and
  implementation self-review, phase gates, and lifecycle gates.
- Validate task/phase scope such as `pNN-tNN` and bounded file/write authority.
- Add project identifiers, phase/task IDs, commit/worktree expectations, gate
  independence, and project-specific diagnostics to the generic request.
- Invoke the general engine and preserve its selection/launch evidence.
- Add lifecycle outcome bookkeeping without rewriting the generic record.

**Non-responsibilities:** Provider catalog mechanics, generic candidate
intersection, native/CLI selection, generic launch acceptance, or generic
recovery.

### Caller Integration Contract

Analytical callers such as `oat-repo-improve` own what fans out and what stays
central. For repo audit, workers return compact findings using the caller's
existing finding schema; the caller verifies load-bearing claims, deduplicates,
prioritizes, obtains user selection, and writes plans. The dispatch engine does
not interpret findings.

## Data Models

### Generic Dispatch Request

```yaml
request_id: dispatch-unique-id
caller: oat-repo-improve
scope: repo:packages/cli
objective: Audit CLI correctness and security hotspots
action: analysis
role:
  name: repo-audit-scout
  class: recon
provider: codex
dispatch_context: root-native
dispatch_policy: high
dispatch_ceiling: high
authority: read-only
expected_output: structured-findings
verification_evidence: file-line-references
deadline_seconds: 300
authorization_scope: this-audit-run
fallback:
  mode: explicit-downgrade
  target: reduced-quick-audit
escalate_when:
  - evidence requires cross-package reconciliation
  - security impact is consequential
```

Policy and ceiling are optional resolved inputs. The general engine does not
know where they came from.

### Generic Dispatch Record

```yaml
request_id: dispatch-unique-id
scope: repo:packages/cli
action: analysis
role_name: repo-audit-scout
role_class: recon
provider: codex
dispatch_context: root-native
dispatch_policy: high
dispatch_ceiling: high
catalog_snapshot:
  source: tool-schema
  observed_at: 2026-07-12T00:00:00Z
authority: read-only
role_selector: generic-worker
model_selector: opaque-provider-selector
model_selector_granularity: opaque
effort_selector: high
selection_source: explicit-call
candidates_considered:
  - opaque-provider-selector
selection_reason: native-catalog
selected_route: native
deadline_seconds: 300
launch_status: accepted
child_outcome: completed
runtime_confirmation: not-reported
diagnostics: []
continuation_events: []
```

### Recon Wave Extension

```yaml
wave_id: repo-audit-wave-1
shared_dispatch_record: dispatch-unique-id
lanes:
  - lane_id: correctness
    scope: packages/cli
    launch_status: accepted
    child_outcome: completed
  - lane_id: security
    scope: packages/cli
    launch_status: accepted
    child_outcome: completed
```

### Project Adapter Input

```yaml
project_path: .oat/projects/shared/example
project_mode: quick
project_phase: implement
scope: p01-t02
lifecycle_role: task-worker
file_boundary:
  - packages/cli/src/example.ts
verification:
  - pnpm --filter @open-agent-toolkit/cli test
```

The adapter resolves this context and produces a generic dispatch request plus
project metadata. It does not bypass the general selection engine.

## Error Handling

- **Delegation authorization unresolved:** Stop before launch or caller side
  effects. Ask once using the active host's interaction surface.
- **Catalog unavailable before selection:** Record visibility timing. Do not
  launch a diagnostic child solely to discover its runtime identity.
- **No satisfactory native target:** Evaluate allowed inheritance or a
  preselected CLI/gate route; otherwise block.
- **Pre-start payload rejection:** Record rejection and allow a new selection
  only within caller retry policy.
- **Failure after accepted launch:** Record outcome; do not automatically
  replace the route. Continue the same child only through its valid handle.
- **Project-state resolution failure:** Project adapter blocks before invoking
  the general engine and reports the missing/invalid lifecycle context.
- **Mixed recon wave axes:** Split the wave into separate dispatch records.
- **Caller contract missing:** Reject requests without bounded scope,
  authority, expected output, or escalation conditions.

## Testing Strategy

### Static Skill Validation

- Run `pnpm oat:validate-skills` and fix frontmatter, required OAT sections,
  path, version, and description findings.
- Confirm each new `SKILL.md` is below 500 lines.
- Confirm descriptions are single-line `Use when…` triggers under 500 chars.
- Confirm both skills are internal (`disable-model-invocation: true`,
  `user-invocable: false`).

### Architecture Boundary Checks

- Search the general skill for project-state reads, `pNN-tNN` assumptions,
  project commit/worktree semantics, and lifecycle gate policy; expect none.
- Confirm the project adapter explicitly loads the general skill before every
  lifecycle dispatch.
- Confirm the project adapter does not duplicate provider reference content or
  generic selection/recovery rules.
- Confirm provider references are loaded one at a time after provider
  resolution.

### Contract Scenarios

1. General read-only recon with one native worker.
2. Homogeneous six-lane recon wave using one shared selection record.
3. Mixed-authority wave splitting into separate records.
4. Authorization-required dispatch with one run-scoped approval question.
5. Unsupported provider failing closed without inferred mechanics.
6. Pre-start rejection permitting a recorded retry.
7. Accepted child timeout remaining terminal for automatic replacement.
8. Project task worker resolving state through CLI and invoking the engine.
9. Project gate requiring independent target and blocking when unavailable.

### Cross-Worktree Review

- Claude reviews the concrete files in this worktree.
- Record and resolve all Critical/Important findings.
- Provide the reviewed commit hash to the fixture agent.
- Compare adopted skill and reference file hashes across worktrees.

### Distribution and Release Verification

- Run `oat sync --scope all` after canonical files exist.
- If approved for distribution, register both skills in bundled assets and the
  utility pack.
- Run targeted skill tests plus `pnpm release:validate` before completion.

## Next Boundary

After this design is accepted, author the two skills directly and track actual
work in the session. Do not draft an execution plan or invoke
`oat-project-implement`. Backfill plan and implementation artifacts after the
skills and review are complete.
