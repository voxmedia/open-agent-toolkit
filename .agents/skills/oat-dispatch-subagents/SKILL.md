---
name: oat-dispatch-subagents
version: 1.1.5
description: Use when an OAT skill or workflow needs provider-neutral selection, launch, recovery, or evidence for bounded subagent work without project lifecycle policy.
disable-model-invocation: true
user-invocable: false
allowed-tools: Read
---

# Dispatching OAT Subagents

Use this internal contract to delegate bounded work while keeping judgment in
the calling skill. It standardizes provider selection and launch evidence. It
does not decide what work should be delegated or synthesize worker results.

## Progress Indicators (User-Facing)

This skill is an internal dependency; the calling skill owns the user-facing
mode and decides whether a sub-banner is useful. When surfacing a distinct
dispatch wave, use:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ SUBAGENT DISPATCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not repeat the banner for every lane. Return a compact selection or blocking
summary for the caller to incorporate.

## Ownership Boundary

The calling skill owns:

- decomposition, lane boundaries, and output schemas;
- user-facing progress, authorization context, and decisions;
- verification of load-bearing worker claims;
- cross-lane synthesis, prioritization, and artifact writes.

This skill owns:

- capability and authorization probing;
- live catalog evidence and candidate intersection;
- model, effort, role, route, authority, and deadline selection;
- launch acceptance, continuation, recovery, and dispatch records.

Do not read OAT project state, interpret `pNN-tNN` identifiers, or add phase,
gate, commit, or worktree policy here. Project workflows must load
`oat-project-dispatch-subagents`, which adapts those concerns into this
contract.

## Required Loading

Read this file before every OAT-managed subagent dispatch. Resolve the active
provider first, then read exactly one provider reference:

- Claude: `references/provider-claude.md`
- Codex: `references/provider-codex.md`
- Cursor: `references/provider-cursor.md`

Do not merge provider references into one policy. For an unsupported provider,
apply this provider-neutral contract and fail closed when exact launch controls
cannot be established.

Read `references/record-schema.md` only when constructing or validating a
dispatch request, dispatch record, or homogeneous recon-wave record.

## Caller Request Contract

Require the caller to provide:

- a unique request ID and calling skill;
- bounded objective and scope;
- action and role name mapped to a baseline role class;
- expected output and verification evidence;
- authority, deadline, escalation conditions, and retry limit;
- fallback policy and authorization scope;
- route-selection source for any non-native route;
- optional resolved dispatch policy or named ceiling.

The caller may also provide `task_class`, `classification_source`, and
`classification_reason`. This task-class metadata is optional for existing
generic callers. When supplied, all three fields are required:

- `task_class`: `mechanical-recon`, `intelligent-recon`,
  `default-implementation`, `hard-reasoning`, or `consequential`;
- `classification_source`: the literal `caller`; and
- `classification_reason`: a non-empty artifact-informed rationale.

The caller owns classification. `oat-reviewer` requires these fields for every
reviewer-local reconnaissance lane; other callers that omit them retain
role-based selection behavior and records without class-floor fields.

Reject an over-broad request before selection. Every nontrivial request must
state the exact objective, scope, expected output, verification evidence, and
conditions that require escalation. Model routing never repairs poor
decomposition.

The optional policy and ceiling are already-resolved inputs. Do not infer where
they came from or resolve project state to obtain them.

## Capability and Authorization

Classify delegation before launch:

| State                       | Meaning                                                         | Action                                                                  |
| --------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `available`                 | The host exposes a usable launch surface now.                   | Continue to catalog observation and selection.                          |
| `authorization-required`    | A usable surface exists but needs user approval or scope grant. | Ask once, preserve the approved scope, then re-probe.                   |
| `unresolved-or-unsupported` | No exact usable surface can be established in this environment. | Use only a pre-approved alternate route or block; do not invent syntax. |

Authorization-required is not unavailability. Do not silently reduce coverage
or run expensive work inline merely because one approval question is needed.
The caller owns the user interaction; this skill returns the question and
required scope.

## Native-First Route Selection

Use these route tiers:

1. **Native same-runtime:** Always the preferred default when it can satisfy
   the resolved role, model, effort, authority, and isolation requirements. It
   needs no additional authorization.
2. **Policy-resolved CLI/programmatic or cross-runtime:** Permitted without a
   per-run prompt when configured dispatch policy selected the route. Project
   policy resolved by `oat-project-dispatch-subagents` and configured
   cross-family gates are standing, scope-bound authorization. Some harnesses
   require this tier—for example Cursor task subagents when native model
   availability cannot satisfy the resolved project target.
3. **Agent-improvised CLI/programmatic or cross-runtime:** Prohibited unless
   the user explicitly approves the named target and scope for the current
   run. Approval from a prior run, task, branch reset, or materially different
   scope does not carry forward.

Availability of a provider CLI, SDK, API, or other programmatic surface is
capability evidence, not route authorization. The engine must distinguish a
policy-resolved alternate route from one proposed by the agent. If neither
configured policy nor current explicit approval authorizes the alternate
route, use an eligible native route or block.

Do not re-prompt for each task or gate when the caller provides a complete
policy-resolved route and scope. Record `selection_source: policy-resolved`
with the owning configuration evidence. Use
`selection_source: explicit-user` for a current-run operator grant and
`selection_source: native-default` for the preferred native route.

## Dispatch Axes

Keep these controls independent in selection and evidence:

- dispatch context: root native, nested native, provider CLI/programmatic,
  workflow, gate, or blocked;
- role or agent definition;
- model selector and selector granularity;
- effort or reasoning selector, when exposed;
- inheritance source and context-fork controls;
- authority, writable roots, deadline, and retry limit;
- route and fallback policy.

A materialized role may package defaults, but its record must preserve each
configured axis separately.

## Deliberate Dispatch Mode

Choose foreground or background deliberately from expected duration and the
host interaction model. Multi-minute implementers, fix loops, and reviewers
must survive ordinary session interaction and therefore run in background when
the host supports a durable awaited handle. Reserve foreground dispatch for
short checks whose interruption risk is negligible. Record the selected mode
and reason with the launch payload.

Background does not mean fire-and-forget. Retain and await the accepted handle,
apply the Acceptance and Recovery contract below, and surface useful progress.
In headless gate contexts, fire-and-forget background dispatch is forbidden:
use the gate's inline or synchronously awaited route contract instead.

For a silent background child, provider transcript filesystem metadata at the
documented runtime path can provide observable liveness evidence. Check only
metadata such as mtime and size. This evidence shows observable activity; it
is never a health verdict and never authorizes replacement, timeout extension,
or a second launch.

## Baseline Role Classes

Specific role names are extensible, but map every dispatch to one class:

| Class          | Default contract                                                                                                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recon`        | Read-only, bounded evidence collection. Meet any supplied `task_class` / `model_class_floor` at or above the floor; select an explicit economical target only when no task-class floor was supplied. Never silently inherit a root model. |
| `dossier-lead` | Reconcile dispersed evidence within one declared scope. May coordinate bounded recon only when nesting is supported and approved.                                                                                                         |
| `generator`    | Produce a self-contained artifact within caller-declared authority.                                                                                                                                                                       |
| `worker`       | Execute bounded work with explicit authority, outputs, and verification.                                                                                                                                                                  |
| `reviewer`     | Perform independent or inherited review exactly as caller policy specifies.                                                                                                                                                               |
| `coordinator`  | Coordinate a caller-defined topology without taking over caller synthesis or user dialogue.                                                                                                                                               |

Use stronger workers when context, ambiguity, or consequence requires them,
not merely because many files exist. Keep coherence-critical synthesis and
cross-scope judgment in the root caller.

## Task Classes and Model Floors

Role class and task class are independent. Role class controls authority and
output ownership; task class is the minimum model-capability floor for one
bounded objective. A `role.class: recon` worker remains read-only and advisory
at every task class.

Classify by deterministic verifiability, silent-miss risk, dispersed context,
ambiguity, and consequence, in that order. File count alone never justifies
escalation:

| Task class               | Minimum capability contract                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `mechanical-recon`       | Deterministic inventories, parity checks, or test/lint/format/build execution whose misses are visible. |
| `intelligent-recon`      | Interpretation, unfamiliar-code auditing, or policy/semantic evidence where a miss could be silent.     |
| `default-implementation` | Retain and reconcile dispersed context inside one independently bounded scope.                          |
| `hard-reasoning`         | Ambiguity, novelty, architecture analysis, or competing interpretations dominate.                       |
| `consequential`          | Security, release safety, irreversible impact, adversarial analysis, or expensive failure dominates.    |

Mechanical workers may execute checks and return exact output. Interpretation
and policy judgment require a stronger class or stay with the root caller. When
uncertain between classes, use the stronger floor.

For unconstrained legacy recon with no `task_class` supplied, select an
explicit economical target rather than silently inheriting the root model.
Class-constrained recon must select a target at or above the supplied
`model_class_floor`; otherwise set `floor_satisfaction: unsatisfied` and return
the lane through `caller-inline`. An economical target is not a universal
baseline for the `recon` role.

Resolve current class examples through active user and repository instructions
first, then the active-provider reference and live catalog, all constrained by
the supplied policy and ceiling. Provider-reference model names are dated
examples, not canonical requirements. Select an exact eligible target at or
above the requested floor; never silently downgrade.

## Catalog Evidence

A catalog snapshot belongs to one dispatch context. A root native catalog does
not establish a nested coordinator's catalog, and a provider CLI account
catalog does not establish native eligibility.

Before explicit selection:

1. Observe selectors exposed to the dispatcher that will launch the child.
2. Observe role or agent-type selectors when exposed before selection.
3. Record catalog source, context, and observation time.
4. Intersect configured candidates allowed by policy and ceiling with that
   catalog, preserving exact provider strings.
5. Keep volatile observations out of durable configuration unless the user
   explicitly changes the owning configuration.

Do not launch a diagnostic child solely to obtain a catalog the provider
cannot expose before selection. Record the visibility timing instead.

## Full-Information Selection

For every dispatch:

1. Validate the caller request and capability state.
2. Resolve provider, context, role class, optional task class and model-class
   floor, policy, ceiling, and candidates.
3. Observe the launching dispatcher's relevant catalogs.
4. Compute the exact native intersection at or above the supplied task-class
   floor, when present.
5. Prefer an eligible native route. Otherwise select one policy-resolved or
   explicitly authorized inherited, provider-CLI/programmatic, workflow, gate,
   or blocked route before launch.
6. Build the complete redacted payload.
7. Record route, selection source, selection reason, candidates, catalog
   source, authority, and deadline.
8. Launch once.
9. Record launch acceptance separately from child outcome and runtime identity.

```mermaid
flowchart TD
  A[Validate bounded request] --> B[Observe dispatcher catalogs]
  B --> C[Intersect policy candidates with live selectors]
  C --> D{Satisfactory native target?}
  D -->|Yes| E[Build exact native payload]
  D -->|No| F{Deliberate inheritance allowed?}
  F -->|Yes| G[Build inherited payload]
  F -->|No| H{Exact alternate route selected pre-start?}
  H -->|Yes| I[Build external payload]
  H -->|No| J[Block]
  E --> K[Record then launch once]
  G --> K
  I --> K
  K --> L{Accepted?}
  L -->|No| M[Record pre-start rejection]
  L -->|Yes| N[Record outcome; no replacement]
```

## Homogeneous Recon Waves

A homogeneous wave may share one record only when `task_class` and
`model_class_floor` match in addition to every existing dispatch axis.
Multiple read-only recon lanes may share one selection record only when all of
these axes are identical: provider, dispatch context, catalog snapshot,
selected route, role class, role selector, model, effort, authority, deadline,
retry limit, fallback, `task_class`, and `model_class_floor`. Include a lane
manifest with lane-specific scope, acceptance, and outcome. A recon-wave record
repeats the shared `task_class` and `model_class_floor` beside
`shared_dispatch_record`; lane entries do not redefine them.

If any axis differs or either class field does not match, create separate
records and waves. The record-level scope is the aggregate wave boundary; each
lane may narrow that boundary.

## Class-Constrained Fallback

For a request with task-class metadata, record `model_class_floor` equal to
`task_class` and set `floor_satisfaction` to `satisfied` or `unsatisfied`.
An unsatisfied floor blocks launch and returns control to the caller; it never
records a weaker selection as success.

Reviewer-local requests use:

```yaml
fallback:
  mode: caller-inline
  allow_below_task_class_floor: false
```

Below-floor selection is prohibited. The legacy `explicit-downgrade` fallback
remains available only to unconstrained callers without task-class metadata or
a declared class floor.

## Acceptance and Recovery

- An accepted launch is terminal for automatic replacement eligibility.
- Completion, failure, timeout, interruption, `BLOCKED`, and contract refusal
  are post-acceptance outcomes; none makes another route eligible.
- A wrapper failure or payload rejection before child start is a pre-start
  rejection. A new recorded selection is allowed only within caller retry
  policy.
- Continuing the same accepted child through its valid handle is allowed.
  Record continuation separately and preserve selectors and route.
- A caller may cancel accepted handles only after it proves that the enclosing
  run itself is invalid under caller-owned containment or integrity policy.
  Record `invalid-run-abort` and the invalidating evidence. Cancellation never
  makes another route eligible and never authorizes replacement, fallback, or
  a successful child outcome.
- Operator-authorized recovery is a new explicit action, never automatic
  fallback.
- Runtime identity is optional corroboration. Missing runtime identity does not
  invalidate launcher-owned configured invocation evidence.

## Return Contract

Return the structured record plus the child output or blocking diagnostic to
the caller. Do not write caller artifacts, reinterpret results, or make user
decisions. The caller verifies claims before depending on them.

Use the schema in `references/record-schema.md`. Existing parseable dispatch
stamps may remain for compatibility, but they do not replace the structured
record.
