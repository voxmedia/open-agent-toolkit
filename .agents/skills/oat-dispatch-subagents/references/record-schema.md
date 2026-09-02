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
service_tier: standard
reasoning_mode: null
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

`reasoning_mode` and `service_tier` are normalized caller-intent fields. During
selection, map `reasoning_mode` to the resolved
`reasoning_mode_selector` record field and `service_tier` to the resolved
`service_tier_selector` record field. The selector fields are launch evidence,
not blind copies of request values: they must contain the exact
provider-native controls actually selected, or `null` when no independent
control was selected or exposed.

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

## Legacy Record

This baseline Record remains valid without optional model-guidance evidence:

```yaml
request_id: dispatch-legacy-id
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
  id: root-native-legacy-1
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
reasoning_mode_selector: null
service_tier_selector: standard
guidance_reference: subagent-orchestration/references/provider-codex.md
guidance_version: 2026-07-21
guidance_verified_at: 2026-07-21
guidance_status: fresh
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
surface exists. Preserve opaque selectors byte-for-byte, within the
256-character identifier bound described under
[Size and Content Bounds](#size-and-content-bounds).

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
redefine the shared class fields. In particular, `reasoning_mode_selector`,
`service_tier_selector`, `guidance_reference`, `guidance_version`,
`guidance_verified_at`, and `guidance_status` must be identically present or
absent across lanes and, when present, have identical values. Mixed classes or
different model-guidance controls require separate records and waves.

## Optional Model-Guidance Evidence

The following fields are optional for legacy callers and required when the
launch surface exposes the corresponding control or when dated provider
mapping influenced selection:

```yaml
reasoning_mode_selector: null # e.g. pro, when independent of effort
service_tier_selector: standard # e.g. standard, fast, priority
guidance_reference: subagent-orchestration/references/provider-codex.md
guidance_version: 2026-07-21
guidance_verified_at: 2026-07-21
guidance_status: fresh # fresh | review-required | stale
```

Keep `model_selector`, `effort_selector`, `reasoning_mode_selector`, and
`service_tier_selector` separate even when a provider encodes several axes in
one opaque alias. Preserve that exact alias in `model_selector` and also record
the interpreted service tier when known.

A service tier never changes `model_class_floor` or `floor_satisfaction`.
Unknown tier semantics must be recorded as a diagnostic and may block a
consequential route.

## Size and Content Bounds

A dispatch record is evidence, not a document. Validation enforces these bounds
and fails closed; know them before authoring a record rather than discovering
them at a durable write.

Caller-authored text, by kind:

- 256 characters — identifiers, names, selectors, routes, and statuses.
- 512 characters — a single explanatory field such as `classification_reason`
  or one `escalate_when` entry.
- 1024 characters — the longest free-form fields: `objective`,
  `expected_output`, and `verification_evidence`.

Six container fields carry short references and identifiers, never narrative
text: `payload`, `candidates_considered`, `configured_invocation_evidence`,
`continuation_events`, `diagnostics`, and `escalate_when`. Each is validated as
a closed JSON projection bounded on four independent axes, so no one axis can
be traded against another:

- nesting depth at most 4 levels;
- each string at most 512 characters;
- at most 512 values per field, which closes chunking one body into many short
  strings; and
- at most 16 KiB serialized per field.

The whole record is additionally capped at 64 KiB. A realistically rich record
measures a few kilobytes, so these limits bind prompt bodies, transcripts, and
chunked logs rather than legitimate evidence.

Keys are classified against credential, token, prompt/message, transcript, and
role-content families after Unicode folding, and a spelling the normalizer
cannot fully account for is treated as sensitive rather than classified on a
partial token. Store references, identifiers, digests, and paths; never role
content, message bodies, or credentials.

Optional runtime observation is metadata-only and subject to the same
identifier bound, which admits letters, digits, `.`, `_`, and `-` only, so no
observation value can carry a path or a URL. Its `match` and `comparedAxes` are
always derived from the record's configured invocation rather than supplied by
the caller, and `matching` covers only the axes listed in `comparedAxes`.
It records what a provider reported about its own child and never restates the
request. An axis the provider did not report is simply absent from the
observation; an absent or unparseable observation is `not-reported` as a whole;
and `not-exposed` is reserved vocabulary for an axis a provider genuinely has
no selectable control for, with no producer today. None of the three is ever
filled in from `model_selector`, `effort_selector`, `service_tier_selector`, or
`role_selector`.
