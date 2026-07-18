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
existing responsibilities. After those prerequisite operations and all
closeout mutations finish, the orchestrator resolves the configured skill gate
and records its disposition before it may mark implementation complete or emit
the success summary.

The gate boundary will use durable project state to distinguish pending,
policy-allowed, and blocked outcomes. A successful/allowed disposition carries
configured-gate provenance and a freshness binding to the reviewed repository
revision and gate run, allowing resume to reuse an unchanged valid result while
forcing a new gate run after later commits. A `null` gate resolution remains a
valid no-gate terminal outcome, while configured `block`, `prompt`, and `warn`
policies retain their current retry and receive-eligibility semantics.

This combines instruction ordering with executable contract coverage. The
implementation skill and closeout reference define the authoritative sequence;
lifecycle validation and post-implementation sequence tests enforce that gate
handling precedes completion; bundled workflow documentation explains the
three independent review mechanisms and the new resumable state.

## Architecture

Pending collaborative review.

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
