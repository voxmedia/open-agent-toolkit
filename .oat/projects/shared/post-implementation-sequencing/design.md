---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
oat_template: false
---

# Design: post-implementation-sequencing

## Overview

The feature treats `workflow.postImplementSequence` as a compatibility union.
Legacy strings remain valid and normalize into one canonical
`{ preApproval, postApproval }` structure. Structured values are resolved
atomically across configuration layers, validated as ordered sequences of
`summary`, `document`, and `pr`, and exposed safely through the config CLI,
including JSON input for `oat config set`.

After final review passes, implementation snapshots the resolved sequence and
its progress into project state. It runs remaining pre-approval steps, then
pauses if the final plan phase has a HiLL checkpoint. Explicit approval is
recorded before any post-approval step runs. Completed steps are recorded
individually so failures resume at the failed step without repeating earlier
side effects.

If no final HiLL checkpoint is configured, approval is recorded as
`not_required`; pre- and post-approval sequences run consecutively after final
review. Routing must prioritize an incomplete sequence even if a pre-approval PR
has already changed the project's PR status.

## Architecture

_Pending collaborative review._

## Component Design

_Pending collaborative review._

## Data Models

_Pending collaborative review._

## API Design

_Pending collaborative review._

## Error Handling

_Pending collaborative review._

## Testing Strategy

_Pending collaborative review._

## References

- Discovery: `discovery.md`
- Backlog: `.oat/repo/pjm/backlog/items/BL-260709-split-post-implementation.md`
