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

## Approval-Bound Prepared Record

Approval-bound records use `prepared_record_version: 1`. They extend the
complete Record below: every baseline request, selection, route, payload,
fallback, diagnostic, and invocation-evidence field remains required when it
applies. Preparation fills all launch controls but performs no launch.

```yaml
prepared_record_version: 1
operation: prepare
dispatch_state: prepared
approval_projection: <exact Canonical Approval Projection v1 object below>
approval_canonical_json: <RFC-8785-JSON-text>
approval_fingerprint: sha256:<64-lowercase-hex>
approved_at: null
approval_evidence: null
launch_acceptance: null
terminal_outcome: null
```

### Canonical Approval Projection v1

`approval_projection` is exactly the object shape below. Its object keys and
nested structure are immutable for `prepared_record_version: 1`; missing or
extra keys are invalid. The complete ordered `execution.waves` array and every
ordered wave-local `lanes` array are values in the projection, not paths to be
looked up elsewhere. Any future field or aggregation change requires a new
prepared-record version. Scalar values and example array lengths below are
illustrative; field names, nesting, value types, and each wave and lane element
shape are normative. Wave and lane arrays may vary in length only within their
approved caps.

```json
{
  "schema": "oat-dispatch-approval/v1",
  "prepared_record_version": 1,
  "run_id": "recon-run-2026-07-12-001",
  "prepared_at": "2026-07-12T00:00:00Z",
  "request": {
    "request_id": "dispatch-recon-001",
    "caller": "recon",
    "objective": "Gather bounded evidence",
    "action": "analysis",
    "expected_output": "versioned-dossiers",
    "verification_evidence": "artifact-digests",
    "escalate_when": ["approved scope is insufficient"]
  },
  "selection": {
    "provider": "codex",
    "dispatch_context": "nested-native",
    "dispatch_policy": "economy",
    "dispatch_ceiling": "high",
    "selected_route": "native",
    "selection_source": "native-default",
    "candidates_considered": ["exact-provider-model"],
    "selection_reason": "native-catalog",
    "role_name": "recon-worker",
    "role_class": "recon",
    "role_selector": "recon-worker",
    "model_selector": "exact-provider-model",
    "model_selector_granularity": "exact-native-model-choice",
    "effort_selector": "high",
    "reasoning_mode_selector": null,
    "service_tier_selector": "standard",
    "guidance_reference": "subagent-orchestration/references/provider-codex.md",
    "guidance_version": "2026-07-21",
    "guidance_verified_at": "2026-07-21",
    "guidance_status": "fresh"
  },
  "execution": {
    "waves": [
      {
        "wave_id": "gathering",
        "conditional": false,
        "task_class": "intelligent-recon",
        "model_class_floor": "intelligent-recon",
        "scope": "repo:packages/cli",
        "lanes": [
          {
            "lane_id": "commands",
            "scope": "packages/cli/src/commands"
          },
          {
            "lane_id": "engine",
            "scope": "packages/cli/src/engine"
          }
        ],
        "authority": "read-only",
        "authorization_scope": "this-recon-run",
        "writable_roots": ["packet/raw/dossiers/gathering"],
        "deadline_seconds": 300,
        "retry_limit": 1,
        "fallback": { "mode": "block" },
        "dispatch_mode": "background",
        "context_fork_controls": { "fork_turns": "all" },
        "concurrency": 2,
        "lane_cap": 4,
        "payload_digest": "sha256:0000000000000000000000000000000000000000000000000000000000000000"
      },
      {
        "wave_id": "contradiction-resolution",
        "conditional": true,
        "task_class": "hard-reasoning",
        "model_class_floor": "hard-reasoning",
        "scope": "packet:claims",
        "lanes": [
          {
            "lane_id": "reconcile",
            "scope": "packet/reviews"
          }
        ],
        "authority": "read-only",
        "authorization_scope": "this-recon-run",
        "writable_roots": ["packet/reviews/reconciliation"],
        "deadline_seconds": 300,
        "retry_limit": 0,
        "fallback": { "mode": "block" },
        "dispatch_mode": "background",
        "context_fork_controls": { "fork_turns": "all" },
        "concurrency": 1,
        "lane_cap": 1,
        "payload_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111"
      }
    ],
    "run_maximum_floor": "hard-reasoning",
    "pinned_target": {
      "provider": "codex",
      "dispatch_context": "nested-native",
      "selected_route": "native",
      "role_selector": "recon-worker",
      "model_selector": "exact-provider-model",
      "model_selector_granularity": "exact-native-model-choice",
      "effort_selector": "high",
      "reasoning_mode_selector": null,
      "service_tier_selector": "standard"
    }
  },
  "catalog_observation": {
    "id": "nested-native-2026-07-12-001",
    "source": "tool-schema",
    "dispatch_context": "nested-native",
    "observed_at": "2026-07-12T00:00:00Z",
    "relevant_catalog_fingerprint": "sha256:2222222222222222222222222222222222222222222222222222222222222222"
  }
}
```

The values in the complete Record and launch payload must exactly match their
counterparts in `approval_projection`; a mismatch is invalid rather than an
implicit override. `execution.waves` lists every planned and conditional wave
before selection. Each wave records its caller-classified task class, equal
model-class floor, conditionality, ordered lane identities and scopes, and all
wave-local execution controls. Compute `run_maximum_floor` using this increasing
order: `mechanical-recon`, `intelligent-recon`, `default-implementation`,
`hard-reasoning`, `consequential`. `pinned_target` is one exact target shared by
every prepared wave and must satisfy the maximum; per-wave selection or floor
weakening is invalid.

Absent optional values in the projection are JSON `null`. Preserve caller order
for waves and lanes; for sets such as writable roots, require the caller to
provide a stable sorted array. Do not normalize opaque provider values.
Canonicalize the whole `approval_projection` as canonical JSON using RFC 8785,
encode that text as UTF-8, hash it with SHA-256, format lowercase hexadecimal,
and prefix the value with `sha256:`. `payload_digest` is the same construction
over that wave's complete redacted launch payload. The approval timestamp is
`approved_at`; `prepared_at` records when selection evidence was fixed.

`catalog_observation` identifies the original source, dispatch context, and
observation time. Its `relevant_catalog_fingerprint` covers the approved
target's selectability plus the role, model, effort, reasoning-mode, service-
tier, route, and launcher controls used to qualify it. Execution preserves the
original observation and separately records its fresh recheck. A new unrelated
candidate is not drift, but removal, renaming, changed semantics, or loss of
selectability for an approved control is relevant catalog drift and makes the
record stale.

### Legal State Transitions

- `prepared -> approved`: the caller explicitly approves the exact
  `approval_fingerprint`; set `approved_at` and immutable approval evidence.
- `prepared -> not-accepted`: the caller declines or cancels before approval.
- `prepared -> stale`: a bound axis or relevant catalog fact changes before
  approval is recorded.
- `approved -> accepted`: `operation: execute` verifies the unchanged
  fingerprint and current relevant catalog, invokes the exact payload once,
  and receives positive launcher acceptance.
- `approved -> not-accepted`: the exact launch is rejected before child start.
- `approved -> stale`: fingerprint validation, an approval-bound axis, or the
  relevant catalog comparison differs before launch.
- `accepted -> completed`: record exactly one terminal child outcome, including
  success, failure, timeout, interruption, `BLOCKED`, or contract refusal.

`completed`, `not-accepted`, and `stale` are terminal record states. There is
no transition from them back to `approved` or `accepted`; prepare a new record
and obtain a new approval. `accepted` is terminal for replacement eligibility
even before the child outcome changes the record to `completed`. An accepted
record must not become `not-accepted` or `stale`, and must never authorize a
replacement, alternate route, model substitution, provider substitution, or
second child. Only continuation through the already accepted handle is
permitted. A linked fresh same-target launch is forbidden, regardless of the
generic lifecycle recovery exception. Handle loss or inability to resume is a
terminal stop for this approval-bound record; generic recovery remains
unchanged for non-approval-bound dispatches.

### Execute Validation and Drift

`operation: execute` accepts only `dispatch_state: approved`. First recompute
the approval fingerprint from the stored projection to detect mutation. Then
re-observe the same live catalog and resolve the actual launch controls without
selecting alternatives. A changed model, effort, provider, route, role,
service tier, authority, deadline, retry limit, concurrency, lane cap,
reasoning mode, selector granularity, writable root, context control, fallback,
wave topology, scope, lane identity, payload digest, floor, pinned target, or
relevant catalog fact changes the record to `stale`. Refuse the launch and
return for reapproval through a newly prepared record.

### Legacy One-Step Compatibility

Legacy callers that omit `operation`, or set `operation: dispatch`, retain the
existing one-step selection-and-launch flow: selection and launch occur in the
same operation and produce the existing Legacy Record or Record shapes. A
legacy caller must not fabricate an `approval_fingerprint`, approval evidence,
or a prepared record merely to remain compatible. `prepared_record_version`
is required only for the approval-bound path; version `1` is the only supported
prepared-record version, and unknown versions fail closed before launch.

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

The whole record is additionally capped at 64 KiB, measured as the **published**
bytes — the pretty-printed JSON plus trailing newline that is actually written
to the journal, not compact `JSON.stringify` output. The two differ by roughly a
tenth on a nested record, so size against the published form. Per-field
projection limits above remain compact measurements, because they bound the
shape of a field rather than the size of a file. A realistically rich record
measures a few kilobytes, so these limits bind prompt bodies, transcripts, and
chunked logs rather than legitimate evidence.

Keys are classified against credential, token, prompt/message, transcript, and
role-content families after Unicode folding, and a spelling the normalizer
cannot fully account for is treated as sensitive rather than classified on a
partial token. Store references, identifiers, and digests; never role content, message bodies,
or credentials.

Absolute filesystem paths are handled by field class, because the journal is
committed and a home path in it is permanent:

- **Identity and control fields reject them.** `caller`, `scope`, every
  selector, `selected_route`, the `guidance_*` fields, `authority`,
  `authorization_scope`, `catalog_snapshot`, `candidates_considered` and
  `fallback` refuse a record containing an absolute path, including
  colon-prefixed forms such as `cwd:/Users/alice`. A path is never a legitimate
  identifier there, so ambiguity resolves to rejection. Pass a repository-relative
  path or a redacted form like `<user>/agents/<role>.md`.
- **Prose and nested evidence redact them best-effort.** `objective`,
  `expected_output`, `verification_evidence`, `classification_reason`,
  `escalate_when`, and the bounded container fields replace a detected path with
  `<redacted-path>`. This is deliberately conservative rather than complete: it
  skips candidates inside an `http`/`https` URL and candidates ending in `/`, so
  a URL route (`?next=/dashboard`) and a regex literal (`/foo/bar/`) survive
  intact. Colon-prefixed forms also survive. Corrupting a legitimate value is
  worse than leaving a path in prose, so do not rely on this to sanitize
  caller-authored text — redact before submitting.

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
