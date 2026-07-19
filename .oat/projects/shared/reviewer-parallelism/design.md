---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: false
---

# Design: reviewer-parallelism model-class revision

## Overview

The first reviewer-parallelism implementation correctly separated advisory
reconnaissance from primary-reviewer judgment, but it treated every delegated
lane as one homogeneous economical `recon` wave. Dogfooding exposed the design
gap: deterministic parity checks, semantic contract analysis, release
interpretation, and lifecycle reconciliation all ran on the same fast model
class even though their ambiguity and failure cost differ.

This revision keeps every lane bounded, read-only, non-recursive, and advisory
while separating two independent axes:

1. **Role class** describes authority and output ownership (`recon` remains
   read-only and cannot emit final findings).
2. **Task class** establishes the minimum model capability required for that
   lane (`mechanical-recon`, `intelligent-recon`, `default-implementation`,
   `hard-reasoning`, or `consequential`).

The root reviewer reads the workflow artifacts and authoritative diff before
decomposition, assigns each lane a task class with a rationale, and asks the
generic dispatch contract to resolve an explicit provider target meeting that
floor. These class fields are required for reviewer-local reconnaissance but
remain optional for existing generic-dispatch callers. The root reviewer still
validates evidence, reconciles lanes, assigns severity, decides verification,
and writes the final review.

## Evidence and Problem Statement

The completed final review used four disjoint advisory lanes but selected
Composer 2.5 Fast for all four. That was appropriate for deterministic body
parity and inventory checks, but too weak as the only worker class for semantic
test completeness, documentation/contract interpretation, release reasoning,
and lifecycle consistency.

The earlier Phase 3 review provides the failure signal: an economical release
lane did not identify that `0.1.74` was already published, while the primary
reviewer's independent registry verification found the blocking collision. The
primary-ownership boundary protected correctness, but the homogeneous worker
selection reduced the value of parallelism.

The shared dispatch contract already says to use stronger workers when context,
ambiguity, or consequence requires them. The missing link is a required
artifact-informed task classification from the caller and durable dispatch
evidence showing the selected class floor per lane.

## Goals

- Make the primary reviewer classify each delegated lane from the actual review
  scope, artifacts, and failure consequences before model selection.
- Keep role/authority independent from task/model capability.
- Use fast economical workers for deterministic mechanical verification.
- Use intelligent-recon workers when knowing what counts as evidence or a
  candidate issue requires judgment.
- Use stronger reasoning workers only for bounded ambiguity or consequential
  advisory analysis; keep cross-lane and final judgment in the root reviewer.
- Allow different task classes in one review without pretending they are one
  homogeneous dispatch wave.
- Preserve provider neutrality in the canonical reviewer while allowing each
  provider reference and active user/repository instructions to supply current
  model examples.

## Non-Goals

- Building a runtime scheduler or model benchmark system.
- Guaranteeing a specific named model across providers or future catalogs.
- Letting workers assign severity, make final validation decisions, or write
  either review output sink.
- Delegating every review or every verification command.
- Adding an end-to-end nested-agent test harness.
- Replacing primary-reviewer verification with worker consensus.

## Architecture

### Components

- **Primary `oat-reviewer`:** Establishes scope, reads available
  discovery/spec/design/plan/implementation artifacts, decomposes independent
  lanes, assigns task classes, verifies reports, and owns the verdict.
- **Generic `oat-dispatch-subagents`:** Accepts optional task-class metadata in
  its generic request. `oat-reviewer` is the first caller that requires those
  fields. The skill resolves an eligible provider target at or above the class
  floor, records the selection, and launches the bounded worker without
  changing callers that omit the fields.
- **Provider reference:** Maps task classes to current provider-appropriate
  model families or selectors, subject to live catalog and active
  user/repository instructions.
- **Recon workers:** Gather or analyze evidence only within one declared lane
  and return the existing compact advisory schema.

### Decision Flow

```text
authoritative range + workflow artifacts
                |
                v
root reviewer understands requirements and changed surfaces
                |
                v
decompose only genuinely independent evidence lanes
                |
                v
classify each lane by ambiguity, silent-miss risk, and consequence
                |
                v
dispatch contract resolves explicit provider target at class floor
                |
                v
workers return advisory evidence; no severity or final findings
                |
                v
root reopens sources, reruns load-bearing checks, reconciles, and decides
```

## Task-Class Model

### Orthogonal Axes

Every reviewer-local lane retains `role.class: recon` because authority remains
read-only and advisory. Its generic dispatch request also requires these flat
fields:

```yaml
role:
  name: reviewer-recon-worker
  class: recon
task_class: intelligent-recon
classification_source: caller
classification_reason: >-
  Determining whether semantic tests uniquely pin safety boundaries requires
  interpreting contract intent; a silent miss would survive mechanical checks.
fallback:
  mode: caller-inline
  allow_below_task_class_floor: false
```

`task_class` is one of `mechanical-recon`, `intelligent-recon`,
`default-implementation`, `hard-reasoning`, or `consequential`.
`classification_source` is the literal `caller`, and
`classification_reason` is a non-empty string. These fields are generic
optional for compatibility and reviewer-required by the canonical reviewer
contract. Existing lifecycle and repository-audit callers require no migration
and retain their role-based behavior when the fields are absent.

The generic dispatch record adds:

```yaml
task_class: intelligent-recon
model_class_floor: intelligent-recon
classification_source: caller
classification_reason: Semantic contract interpretation has silent-miss risk.
floor_satisfaction: satisfied
```

`floor_satisfaction` is `satisfied` or `unsatisfied`. An unsatisfied floor
blocks launch and returns control to the caller; it never records a weaker
selection as success. These fields remain absent for legacy requests that do
not provide task-class metadata.

### Classification Rules

| Task class               | Use when                                                                      | Reviewer examples                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `mechanical-recon`       | Output is deterministic, cheaply checked, and a miss is visible               | File inventories, exact body parity, generated-view counts, running test/lint/format/build commands       |
| `intelligent-recon`      | Evidence must be interpreted or a miss could be silent                        | Semantic-test completeness, API/contract auditing, docs-to-behavior alignment, unfamiliar-code review     |
| `default-implementation` | A bounded lane must retain and reconcile dispersed context                    | Rare reviewer-local dossier work; prefer keeping this with the root unless scope is independently bounded |
| `hard-reasoning`         | Ambiguity, novelty, or architecture reasoning dominates                       | Competing interpretations of a cross-component invariant or subtle migration behavior                     |
| `consequential`          | Security, release safety, irreversible impact, or expensive failure dominates | Advisory security analysis or release-policy reasoning; root independently verifies every claim           |

When uncertain between classes, choose the stronger floor. File count alone
never justifies escalation.

### Mechanical Execution Versus Judgment

A mechanical worker may run registry queries, tests, lint, format checks,
builds, or parity scripts and return exact output. It does not decide whether a
result is acceptable when that decision depends on release policy, semantic
intent, or cross-artifact context.

For example:

- Fetching five npm versions is mechanical.
- Deciding whether those versions make the planned release publishable is
  intelligent or consequential, and the root reviewer must independently
  verify the conclusion.

### Provider Resolution

The canonical reviewer names task classes, not model products. The active
provider reference applies the class floor using:

1. active user and repository model-class instructions, when present;
2. current provider-reference examples;
3. the live nested-dispatch model catalog; and
4. the resolved dispatch policy and ceiling.

For the current Cursor environment, the intended examples are:

- mechanical recon: Composer 2.5 Fast class;
- intelligent recon: Cursor Grok 4.5 High Fast class;
- hard/consequential reasoning: GPT-5.6 Sol High or stronger, subject to the
  active ceiling.

These are dated examples, not canonical hard-coded requirements. If an exact
candidate is unavailable, select a newer eligible model meeting the same class
floor or route one class up; never silently degrade.

### Cursor Resolution Boundary

Outer lifecycle implementer/reviewer dispatch remains unchanged: managed
Cursor dispatch continues to resolve through
`oat project dispatch-ceiling resolve` and launches the exact
`providers.cursor.dispatchArgs.variant` returned by that resolver.

Reviewer-local reconnaissance is a different nested generic-dispatch surface.
It uses the native Task/Subagent call's explicit model enum with the
`generalPurpose` agent type because no materialized lifecycle `recon` role
exists. The generic dispatcher:

1. reads the nested native model enum;
2. intersects it with the provider reference, active user/repository
   model-class guidance, and the supplied policy/ceiling;
3. selects an exact model at or above `model_class_floor`;
4. passes that exact selector to the native call; and
5. records it as `model_selector` with
   `model_selector_granularity: exact-native-enum`.

It does not call the lifecycle resolver, reconstruct a lifecycle variant, or
parse bracket-form model pins. This keeps the revision instruction/schema-only
and avoids changes to the CLI resolver, dispatch matrix, materialized lifecycle
roles, or existing generic callers.

## Wave Formation

One review may have multiple dispatch waves. Lanes may share a homogeneous wave
record only when every existing dispatch axis, `task_class`, and
`model_class_floor` are identical. A recon-wave record repeats the shared
`task_class` and `model_class_floor` beside `shared_dispatch_record`; lane
entries do not redefine them.

Example final review:

```text
Wave A — mechanical-recon
  - canonical-to-provider body parity
  - generated nav/index drift
  - focused test/lint/format execution

Wave B — intelligent-recon
  - semantic contract coverage
  - docs-to-behavior alignment
  - lifecycle consistency

Root only / stronger bounded consult when justified
  - release publishability
  - security or irreversible-impact analysis
  - cross-lane synthesis and final severity
```

The one-level fan-out limit applies across all waves. Workers never spawn
workers.

## Root Reviewer Responsibilities

Before dispatch, the root reviewer must:

1. establish the authoritative range;
2. read the mode-required artifacts;
3. understand the requirement and design surfaces relevant to the range;
4. identify independent lanes;
5. classify each lane with a short rationale; and
6. decide whether coordination is cheaper than inline review.

After dispatch, the root reviewer must:

- reopen authoritative sources rather than trust worker summaries;
- rerun load-bearing positive and negative checks;
- reconcile overlap, contradictions, and gaps across model classes;
- determine whether candidate observations are findings;
- assign severity and fix guidance;
- own artifact or structured-output writing; and
- report dispatch classes and lane purposes in the review artifact.

The root reviewer must not use stronger workers as a substitute for reading the
artifacts or forming its own review strategy.

## Failure and Fallback

- If the requested class floor cannot be explicitly satisfied, set
  `floor_satisfaction: unsatisfied`, do not launch a weaker worker, and return
  the lane to the caller.
- A mechanical lane may fall back inline without changing review coverage.
- An intelligent/hard/consequential lane falls back to the root reviewer or a
  pre-authorized stronger route; it never falls back to a cheaper class.
- Reviewer-local requests use `fallback.mode: caller-inline` and
  `allow_below_task_class_floor: false`. The record-schema example's legacy
  `explicit-downgrade` mode remains valid only for callers without a declared
  class floor; it is invalid for class-constrained reviewer lanes.
- A worker failure, timeout, empty response, or malformed response remains a
  post-acceptance outcome and does not authorize automatic replacement.
- Classifying one lane more strongly does not escalate unrelated lanes.

## Documentation and Distribution

The review workflow documentation should explain class-aware lane selection
with provider-neutral examples and preserve the distinction between advisory
workers and root judgment. It should not promise that every provider exposes
every class or named model.

Provider synchronization must regenerate all materialized reviewer roles after
the canonical contract changes. At design review time, upstream and npm had
already published lockstep public package `0.2.1`. Implementation must re-read
the five upstream manifests and npm immediately before its release commit, then
choose the next shared unpublished patch greater than upstream (`0.2.2` only
if it remains unused).

The canonical reviewer version remains `1.1.8` because the repository requires
one version bump per changed agent in the final PR diff, not one bump per edit.
Changing `oat-dispatch-subagents/SKILL.md` requires its single PR-scoped version
bump above current upstream `1.1.4`, currently `1.1.5`.

## Testing Strategy

Testing stays intentionally lean and semantic.

### Contract Assertions

Extend the existing reviewer semantic test to assert:

- artifacts and authoritative scope are read before decomposition;
- each lane receives an explicit task class and classification rationale;
- role class and task class remain separate;
- mechanical, intelligent, and stronger-class boundaries are described;
- mixed task classes cannot share one homogeneous wave record;
- unsatisfied class floors never silently downgrade;
- task-class fields are required for reviewer-local recon and optional for
  existing generic callers;
- Cursor nested recon uses an exact native model selector while lifecycle
  roles continue to use resolver-returned variants;
- primary-reviewer synthesis, severity, and final-output ownership remain
  unchanged.

Add the three already-deferred targeted assertions for:

- no hard-coded provider model names in the canonical reviewer;
- one capability check per review; and
- worker prohibition on writing review artifacts, `StructuredFindings`, or
  either output sink.

### Existing Validation

Reuse:

- the focused reviewer/canonical/provider contract suite;
- exact generated-body parity for all provider roles;
- provider sync dry-run;
- scoped formatting and diff hygiene; and
- release validation required by the shipped public-package surface.

### Dogfood Verification

Run one broad review with at least:

- one mechanical lane;
- one intelligent lane; and
- root-owned consequential synthesis.

Inspect dispatch evidence to confirm the lanes used different task classes and
provider targets. This is a manual acceptance check, not a nondeterministic
automated nested-agent test.

## Risks and Mitigations

- **Over-escalation increases cost:** Classify from silent-miss risk and
  ambiguity, not file count; keep deterministic work mechanical.
- **Under-classification repeats the dogfood failure:** Require a rationale and
  prohibit downgrade below the declared floor.
- **Named examples become stale:** Keep names in provider guidance, honor active
  instructions and live catalogs, and define canonical behavior by class.
- **Root abdicates judgment:** Keep severity, validation decisions, synthesis,
  and outputs root-only; require independent re-verification.
- **Mixed waves obscure dispatch evidence:** Split records whenever task class
  differs.
- **Testing becomes brittle:** Assert semantic boundaries and recorded axes, not
  exact model names or live provider behavior.

## Revision Implementation Shape

After this design passes artifact review, amend the existing plan with one
sequential revision phase:

1. update generic dispatch request/record semantics and provider guidance;
2. update the canonical reviewer and lean semantic assertions;
3. update user-facing review documentation;
4. regenerate provider views, select the next shared unpublished package
   version from current upstream/npm evidence, and validate that release; and
5. run a mixed-class dogfood review followed by a new final review.

The prior final review remains historical evidence for the pre-revision scope.
The project is complete only after the revision phase and superseding final
review pass.

## References

- Discovery: `discovery.md`
- Existing implementation plan: `plan.md`
- Existing implementation record: `implementation.md`
- Final pre-revision review:
  `reviews/archived/final-review-2026-07-18T234708Z.md`
- Canonical reviewer: `.agents/agents/oat-reviewer.md`
- Generic dispatch contract:
  `.agents/skills/oat-dispatch-subagents/SKILL.md`
