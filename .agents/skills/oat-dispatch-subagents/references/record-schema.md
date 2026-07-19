# Dispatch Record Schema

Load this reference only when constructing or validating dispatch evidence.
Use neutral scope, action, role, and authority fields. Calling workflows may
add namespaced metadata without redefining these fields.

## Request

```yaml
request_id: dispatch-unique-id
caller: oat-repo-improve
scope: repo:packages/cli
objective: Audit CLI correctness hotspots
action: analysis
role:
  name: repo-audit-scout
  class: recon
provider: codex
dispatch_context: root-native
dispatch_policy: economy
dispatch_ceiling: high
authority: read-only
expected_output: structured-findings
verification_evidence: file-line-references
deadline_seconds: 300
retry_limit: 1
authorization_scope: this-audit-run
selection_source: native-default
fallback:
  mode: explicit-downgrade
  target: reduced-quick-audit
escalate_when:
  - evidence requires cross-package reconciliation
  - security impact is consequential
```

`dispatch_policy` and `dispatch_ceiling` are optional resolved inputs. The
general engine does not resolve their source.

Task-class metadata is also generic-optional. A class-constrained caller adds
all of these fields; `oat-reviewer` requires them for reviewer-local recon:

```yaml
task_class: intelligent-recon
classification_source: caller
classification_reason: >-
  Determining whether semantic tests pin safety boundaries requires
  interpretation, and a silent miss would survive mechanical checks.
fallback:
  mode: caller-inline
  allow_below_task_class_floor: false
```

`task_class` is one of `mechanical-recon`, `intelligent-recon`,
`default-implementation`, `hard-reasoning`, or `consequential`.
`classification_source` is the literal `caller`, and
`classification_reason` is non-empty. Legacy callers may omit all three and
retain the original role-based selection and fallback behavior. The legacy
`explicit-downgrade` example above is valid only for an unconstrained request
without task-class metadata or a declared class floor.

## Record

```yaml
request_id: dispatch-unique-id
caller: oat-repo-improve
scope: repo:packages/cli
objective: Audit CLI correctness hotspots
action: analysis
role_name: repo-audit-scout
role_class: recon
provider: codex
dispatch_context: root-native
dispatch_policy: economy
dispatch_ceiling: high
catalog_snapshot:
  id: root-native-1
  source: tool-schema
  observed_at: 2026-07-12T00:00:00Z
authority: read-only
role_selector: oat-recon-worker
model_selector: opaque-provider-selector
model_selector_granularity: opaque
effort_selector: economical
selection_source: native-default
candidates_considered:
  - opaque-provider-selector
selection_reason: native-catalog
selected_route: native
deadline_seconds: 300
retry_limit: 1
payload: {}
launch_status: accepted
child_outcome: completed
configured_invocation_evidence: []
runtime_confirmation: not-reported
diagnostics: []
continuation_events: []
```

For a class-constrained dispatch, the record also includes:

```yaml
task_class: intelligent-recon
model_class_floor: intelligent-recon
classification_source: caller
classification_reason: Semantic contract interpretation has silent-miss risk.
floor_satisfaction: satisfied
```

`model_class_floor` equals the requested `task_class`.
`floor_satisfaction` is `satisfied` or `unsatisfied`. An unsatisfied floor
blocks launch and records no weaker selection as success. These five fields
remain absent when a legacy request omits task-class metadata.

For a Cursor reviewer-local request whose advertised nested model choices do
not satisfy the class floor, record the blocked selection without inventing a
selector:

```yaml
role_selector: generalPurpose
model_selector: null
model_selector_granularity: exact-native-model-choice
floor_satisfaction: unsatisfied
fallback:
  mode: caller-inline
  allow_below_task_class_floor: false
launch_status: blocked-before-start
child_outcome: caller-inline-completed
```

`exact-native-model-choice` means an exact model choice advertised by the
current nested dispatcher. It does not imply a stable enum or authorize
reconstruction of a materialized lifecycle variant.

`role_selector` is the exact provider or harness agent-type selector, when that
surface exists. Preserve opaque selectors byte-for-byte.

Use the stable selection reasons `native-catalog`,
`native-catalog-unsatisfying`, `pre-start-rejection`, `inherit`, and
`gate-target`. Calling adapters may add a more specific diagnostic, but must
not replace or rename these shared values.

Use `selection_source: native-default` for the preferred same-runtime native
route, `policy-resolved` for a CLI/programmatic or cross-runtime route selected
by configured project/workflow/gate policy, and `explicit-user` for an
otherwise agent-proposed alternate route approved for the current run. For
`policy-resolved`, include the owning configuration in
`configured_invocation_evidence`. CLI or SDK availability alone is never a
selection source.

## Recon Wave

```yaml
wave_id: repo-audit-wave-1
scope: repo:packages/cli
shared_dispatch_record: dispatch-unique-id
task_class: intelligent-recon
model_class_floor: intelligent-recon
lanes:
  - lane_id: correctness
    scope: packages/cli/src
    launch_status: accepted
    child_outcome: completed
  - lane_id: security
    scope: packages/cli/src
    launch_status: accepted
    child_outcome: completed
```

The wave scope is the aggregate boundary. Lane scope may narrow it. Use one
shared record only when every dispatch axis listed in the main skill,
`task_class`, and `model_class_floor` are identical. Lane entries do not
redefine the shared class fields. Mixed classes require separate records and
waves.
