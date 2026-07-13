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
shared record only when every dispatch axis listed in the main skill is
identical.
