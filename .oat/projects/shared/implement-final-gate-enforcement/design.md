---
oat_status: complete
oat_ready_for: null
oat_last_updated: 2026-07-18
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: implement-final-gate-enforcement

## Overview

The implementation closeout workflow will treat the configured
`oat-project-implement` skill-exit gate as its own resumable lifecycle boundary.
Mandatory phase/final self-review, optional `oat_phase_review_gate`, final HiLL
approval, and the approval-aware post-implementation sequence keep their
existing responsibilities. After final implementation verification and
mandatory lifecycle review pass, the orchestrator resolves the configured
skill gate before it starts the approval-aware pre/post-implementation
sequence, requests final HiLL approval, marks implementation complete, or emits
the success summary.

The gate boundary will use durable project state to distinguish pending,
policy-allowed, and blocked outcomes. A successful/allowed disposition carries
configured-gate provenance and a freshness binding to the reviewed
implementation revision and gate run. Resume may reuse that result through the
expected gate/sequence/HiLL bookkeeping descendants, but any substantive
implementation change invalidates it and returns closeout to the gate. A
`null` gate resolution remains a valid no-gate terminal outcome, while
configured `block`, `prompt`, and `warn` policies retain their current retry and
receive-eligibility semantics.

This combines instruction ordering with executable contract coverage. The
implementation skill and closeout reference define the authoritative sequence;
lifecycle validation and post-implementation sequence tests enforce that gate
handling precedes completion; bundled workflow documentation explains the
three independent review mechanisms and the new resumable state.

## Architecture

### System Context

The enforcement remains lifecycle-orchestrator owned. Existing gate CLI
commands continue to resolve configuration, launch the independent review, and
produce the structured result envelope. The implementation skill owns when
those commands run, how their result is persisted, and which lifecycle
transition is legal next.

**Key Components:**

- **Implementation closeout orchestrator:** Orders final verification,
  mandatory lifecycle review, configured exit-gate handling, automated
  sequencing, final HiLL approval, completion state, and output.
- **Exit-gate state machine:** Persists the configured gate's status,
  disposition, reviewed implementation basis, run provenance, receive state,
  and freshness information in project state.
- **Workflow gate CLI:** Remains the source of truth for config resolution,
  command execution, structured envelope, retry policy inputs, and corroborated
  review handoff.
- **Project lifecycle router:** Routes unresolved, blocked, or stale
  implementation exit-gate state back to `oat-project-implement` before any
  normal post-implementation route.
- **Contract validation:** Structural skill tests, closeout sequence tests,
  frontmatter recognition tests, and bundled docs make ordering and resume
  semantics explicit.

### Component Diagram

```text
tasks complete
    |
    v
final verification + mandatory lifecycle final review
    |
    v
persist exit gate pending --> resolve configured gate
    |                              |
    | null                         | configured command
    v                              v
allowed/no_gate           validate envelope + receive eligibility
                                   |
                         +---------+----------+
                         |                    |
                      allowed              blocked
                         |                    |
                         v                    +--> persist + stop/resume
approval-aware pre-approval sequence
    |
    v
final HiLL approval
    |
    v
approval-aware post-approval sequence
    |
    v
complete state --> success output
```

### Data Flow

1. After final verification and mandatory lifecycle review pass, derive the
   current implementation basis and persist `pending` before launching an
   external gate.
2. Resolve `workflow.gates.skills.oat-project-implement`. A `null` result
   records an explicit allowed/no-gate disposition for this closeout
   generation.
3. For a configured result, execute the command unchanged, validate the
   structured envelope, and invoke review receive only for a corroborated,
   receive-eligible handoff.
4. Apply `onFailure` and `maxAttempts` exactly as configured. Persist allowed
   dispositions for success, warn-continuation, or explicit prompt-continuation;
   persist blocked state for unresolved or fail-closed outcomes.
5. Only an allowed and fresh disposition may enter the approval-aware
   pre/post-implementation sequence and final HiLL boundary.
6. Expected closeout-only descendants preserve the reviewed implementation
   basis. Any substantive implementation change marks the disposition stale
   and routes back to exit-gate handling.
7. Completion state and success output require both a completed closeout
   sequence and a fresh allowed exit-gate disposition.

## Component Design

### Implementation Closeout Contract

**Purpose:** Make the configured exit gate an unavoidable implementation
boundary before automated sequencing, final HiLL approval, completion, and
success output.

**Responsibilities:**

- Add exit-gate handling to the numbered authoritative closeout sequence rather
  than leaving it as a trailing appendix.
- Persist `pending` before gate launch and a terminal disposition before
  continuing or stopping.
- Keep lifecycle final review, optional phase review, and configured exit-gate
  provenance independent.
- Require a fresh allowed gate disposition before entering the automated
  sequence and again before completion/output.
- Permit the implementation skill to invoke the existing gate CLI explicitly.

**Interfaces:**

- `oat gate resolve oat-project-implement --json`
- Configured gate command executed unchanged with `PROJECT_PATH` exported.
- Existing structured gate envelope and `oat-project-review-receive` handoff.
- Project `state.md` exit-gate state described below.

**Dependencies:**

- Existing final verification and final lifecycle review contracts.
- Existing approval-aware `oat_post_implement_sequence`.
- Existing workflow gate configuration and command implementation.

**Design Decisions:**

- Gate configuration is re-resolved only when starting a new closeout
  generation; an in-flight persisted run remains authoritative for resume.
- A normal `final | code | passed` review row cannot satisfy this component.
- A manual independent review is insufficient unless its artifact carries the
  configured gate invocation and run provenance.

### Exit-Gate State and Freshness

**Purpose:** Provide restart-safe state for gate launch, policy disposition,
receive completion, and implementation-basis freshness.

**Responsibilities:**

- Store the state machine as a sibling of `oat_post_implement_sequence` in
  project state.
- Preserve the exact resolved policy inputs needed for deterministic resume.
- Bind configured review success to the implementation basis and gate run.
- Distinguish expected closeout-only descendants from substantive
  implementation changes.
- Record a concise human-readable audit event in `implementation.md` without
  making that prose the routing source of truth.

**Interfaces:**

- `state.md` frontmatter field `oat_implement_exit_gate`.
- Shared frontmatter recognized-field registry.
- Git revision and changed-path checks used by the closeout orchestrator.

**Dependencies:**

- Existing project-state frontmatter parsing.
- Git history for basis/freshness verification.
- Gate envelope run ID, status, artifact, and handoff metadata.

**Design Decisions:**

- Persist explicit `allowed/no_gate` state for null resolution rather than using
  absence, so resume can distinguish “not resolved” from “resolved with no
  configured gate.”
- Map success, warn-continuation, and explicit prompt-continuation to `allowed`
  with distinct dispositions.
- Map fail-closed, exhausted block, unresolved prompt, invalid envelope, and
  receive failures to `blocked` until remediation or explicit policy handling.

### Lifecycle Router

**Purpose:** Prevent a resumed project from escaping through normal
post-implementation routing while gate work is unresolved or stale.

**Responsibilities:**

- Check exit-gate state before summary, documentation, PR, revision-completion,
  or project-completion routes.
- Route `pending`, `blocked`, malformed, or stale state to
  `oat-project-implement`.
- Allow normal routing only when the gate disposition is allowed/fresh and the
  approval-aware sequence is complete.

**Interfaces:**

- Reads project `state.md`; performs no mutations.
- Announces the exact gate boundary and resume action.

**Dependencies:**

- Existing post-implementation router ordering.
- Exit-gate state and freshness contract.

**Design Decisions:**

- Exit-gate enforcement is a higher-priority router check than
  `oat_phase_status: complete` or `pr_open`.

### Contract Tests and Documentation

**Purpose:** Make lifecycle ordering and mechanism independence mechanically
reviewable.

**Responsibilities:**

- Add implementation to lifecycle exit-gate ordering validation.
- Assert that completion/output and automated sequencing cannot precede exit
  gate allowance.
- Cover disabled phase gate plus configured exit gate, null resolution,
  success, block, prompt, warn, interruption/resume, and stale-basis behavior.
- Register and test the new frontmatter field.
- Document ordering, persisted state, freshness, and review-mechanism
  independence in bundled workflow guidance.

**Dependencies:**

- Existing skill validation and post-implementation contract test suites.
- Existing docs and provider-sync/release validation.

## Data Models

### Implement Exit Gate State

**Purpose:** Represent one resumable configured exit-gate generation without
reusing lifecycle-review or phase-review state.

**Schema:**

```yaml
oat_implement_exit_gate:
  status: pending # pending | allowed | blocked | stale
  resolution: configured # configured | no_gate
  disposition: null # null | passed | warned | prompt_approved | no_gate
  config_fingerprint: '<stable hash of resolved gate declaration>'
  resolved_command: null # required before launch when resolution: configured
  resolved_description: null # required before launch when resolution: configured
  on_failure: block # block | prompt | warn | null
  max_attempts: 2
  attempts_completed: 0
  reviewed_head: null # commit reviewed by the configured gate
  implementation_fingerprint: null # implementation basis used for freshness
  launch_state: not_started # not_started | intent_persisted | accepted | result_persisted | not_accepted
  launch_attempt_id: null
  launch_started_at: null
  launch_result_receipt: null
  gate_run_marker: null
  gate_run_id: null
  envelope_status: null # ok | blocked | review_failed | other terminal status
  artifact: null
  handoff: null
  receive_state: not_started # not_started | intent_persisted | completed | reconciliation_required
  receive_correlation: null
  receive_source_artifact: null
  receive_archived_artifact: null
  receive_event_identity: null
  receive_pre_head: null
  receive_commit: null
  receive_eligible: false
  receive_completed: false
  failure: null
  updated_at: '2026-07-18T00:00:00Z'
```

**Validation Rules:**

- `pending` is persisted with the exact resolved command, description, policy,
  config fingerprint, reviewed HEAD, and implementation fingerprint before
  configured command execution. It must not carry an allowed disposition.
- Launch intent (`launch_attempt_id`, start time, expected receipt, and
  `gate_run_marker`) is committed before execution. `launch_state: accepted`
  identifies an in-flight launch that must be reconciled rather than duplicated;
  `result_persisted` binds the returned envelope to that launch.
- `allowed/configured` requires an allowed policy disposition, the reviewed
  HEAD, implementation fingerprint, configured-gate run provenance, and a
  durable receive when the validated envelope is receive-eligible.
- `allowed/no_gate` requires `disposition: no_gate` and null run/artifact
  provenance.
- `blocked` preserves launch, envelope, receive, failure, and retry evidence. It
  cannot cross into automated sequencing. Configured `prompt`/`warn` policy may
  produce an allowed disposition only for a validated, receive-eligible
  `blocked` envelope after its eligible receive is durably completed;
  operational, validation, correlation, malformed, launch, and receive failures
  remain blocked regardless of policy.
- `stale` preserves the prior provenance for audit but cannot satisfy closeout.
- Receive intent and correlation are committed before review-receive.
  `receive_completed` may become true only after a corroborated handoff with
  `receiveEligible: true` is durably processed. An interruption after receive
  side effects uses the archived artifact, review event identity, pre-receive
  HEAD, and receive commit to reconcile without duplicate receive.
- Ambiguous launch or receive evidence sets `receive_state:
reconciliation_required` or an equivalent blocked failure; it never
  authorizes relaunch, re-receive, or completion.
- Missing state means “not yet resolved,” never “no gate configured.”
- A final lifecycle review artifact lacking `oat_review_invocation: gate` and
  the matching `oat_gate_run_id` cannot populate configured-gate fields.

**Storage:**

- **Location:** `state.md` frontmatter as `oat_implement_exit_gate`.
- **Persistence:** Commit every transition before crossing the corresponding
  launch, stop, sequence, or completion boundary.

### Freshness Model

The configured gate records both the exact `reviewed_head` and a deterministic
fingerprint of the implementation review basis. Expected gate artifacts,
project tracking, project-log entries, summary/documentation/PR sequence
outputs, HiLL bookkeeping, and completion bookkeeping are closeout-only
descendants. They do not silently change the reviewed implementation basis.

Any implementation, test, skill, template, config, or other gate-reviewed
source change after `reviewed_head` changes the fingerprint and transitions the
state to `stale`. New review-fix or revision tasks therefore require a new final
lifecycle review and a new configured exit-gate generation. The exact
closeout-only path/commit classification is fail-closed: an unrecognized change
is substantive and invalidates the gate.

### State Transitions

```text
absent/stale --new closeout generation--> pending
pending --resolve null------------------> allowed/no_gate
pending --persist launch intent--------> pending/intent_persisted
intent_persisted --launch accepted-----> pending/accepted
accepted --persist correlated result---> pending/result_persisted
result_persisted --persist receive intent--> pending/receive-intent
receive-intent --durable receive of ok----> allowed/passed
receive-intent --durable receive of blocked + warn--> allowed/warned
receive-intent --durable receive of blocked + prompt approval--> allowed/prompt_approved
pending/in-flight --operational or ambiguous outcome--> blocked
blocked --remediation/new basis--------> stale --> pending
allowed --substantive change-----------> stale
allowed --closeout-only descendants----> allowed
```

## Error Handling

### Outcome Categories

- **No configured gate:** Persist `allowed/no_gate` and continue.
- **Structured `ok`:** Validate handoff and receive eligibility; invoke receive
  when authorized, then persist `allowed/passed`.
- **Structured `blocked`:** Invoke receive only when eligible, then apply the
  configured `block`, `prompt`, or `warn` policy.
- **Operational/validation failure:** Invalid or contradictory envelopes,
  failed correlation, missing handoff, launch failures, unavailable runtimes,
  and receive failures remain fail-closed. Do not receive an ineligible
  artifact or mark the gate allowed.
- **Stale implementation basis:** Preserve prior provenance as stale and start a
  new generation only after the mandatory final lifecycle review is current for
  the new basis.

### Retry and Policy Handling

- `block` remediates and reruns up to configured `maxAttempts`; infrastructure
  or launch failures are escalation-biased and do not consume remediation
  attempts.
- `prompt` persists the unresolved boundary and waits. Explicit user
  continuation records `allowed/prompt_approved`; defer or no response remains
  blocked/pending.
- `warn` records validated blocking findings and continues only after the
  receive-eligible `blocked` envelope is durably received and
  `allowed/warned` is persisted. It never converts an operational, validation,
  correlation, malformed, launch, or receive failure into an allowed outcome.
- An interruption resumes the persisted generation. It never launches a
  duplicate while a valid completed outcome exists.

### Audit Logging

- Record each state transition, attempt, envelope disposition, receive result,
  stale-basis decision, and stop/resume action concisely in implementation
  tracking.
- Preserve PR #156 project-log append behavior when enabled, including
  gate-owned project-log mutations.
- Logs and review rows remain audit evidence; project state is the routing
  source of truth.

## Testing Strategy

### Structural Lifecycle Validation

- Add `oat-project-implement` to the shared exit-gate ordering matrix.
- Assert that final verification/review precedes gate handling; gate allowance
  precedes automated sequencing and final HiLL; completion and success output
  come last.
- Assert that the implementation skill declares gate CLI capability and its
  success criteria require configured-gate disposition.

### Post-Implementation Contract Tests

- Phase gate absent or disabled while the final configured gate remains active.
- No configured final gate (`null`) records explicit no-gate allowance.
- Configured success plus `block`, `prompt`, and `warn` outcomes.
- Corroborated receive-eligible handoff versus invalid, contradictory, or
  ineligible envelopes.
- Interruption at pending and blocked boundaries.
- Unchanged valid resume without duplicate gate execution.
- Substantive post-review HEAD changes mark state stale and require current
  final review plus a new gate generation.
- Automated sequence, final HiLL, completion state, and success output cannot
  start while the gate is unresolved.
- PR #156 project-log mutations remain compatible.

### State and Router Tests

- Recognize and preserve `oat_implement_exit_gate` in shared frontmatter
  handling.
- Cover representative pending, allowed, blocked, stale, and legacy-absent
  fixtures.
- Ensure `oat-project-next` prioritizes unresolved or stale gate state over
  `complete` and `pr_open`.

### Documentation and Release Verification

- Validate the canonical skill and synchronized provider views.
- Run targeted contract tests first, then repository format, lint, type-check,
  full tests, build, and `pnpm release:validate`.
- Verify the changed skill version increments exactly once and all five public
  package versions move in lockstep.

## References

- Discovery: `discovery.md`
- Workflow gates: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Project lifecycle: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
