---
oat_status: in_progress
oat_ready_for: null
oat_last_updated: 2026-07-18
oat_generated: false
oat_template: true
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
approval-aware pre/post sequence
    |
    v
final HiLL approval
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

Pending collaborative review.

## Data Models

Pending collaborative review.

## Error Handling

Pending collaborative review.

## Testing Strategy

Pending collaborative review.

## References

- Discovery: `discovery.md`
- Workflow gates: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Project lifecycle: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
