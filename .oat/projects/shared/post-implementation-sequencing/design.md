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

### System Context

The change spans three connected surfaces:

- **Configuration contract:** Accept and validate either a legacy string or
  structured sequence. The layered resolver treats the entire structured value
  as one atomic preference, so local/shared/user arrays are never merged
  accidentally. Plain CLI output preserves strings and emits compact JSON for
  objects; JSON output preserves the actual object.
- **Final-closeout orchestrator:** `oat-project-implement` keeps every non-final
  checkpoint unchanged but defers the final checkpoint branch. Final
  verification and review run first, including automatic final review when
  checkpoint auto-review is enabled.
- **Durable progress and routing:** A sequence snapshot in project state records
  the resolved arrays, completed steps, and approval status. While that snapshot
  is incomplete, project routing returns to implementation even if PR creation
  has already set `oat_pr_status: open`.

### Component Diagram and Data Flow

```text
configured string/object
        │
        ▼
validate → atomic layered resolution
        │
        ▼
final phase completes ── non-final checkpoints remain unchanged
        │
        ▼
final verification → final review passes
        │
        ▼
snapshot canonical sequence in state
        │
        ▼
run remaining preApproval steps, recording each success
        │
        ├─ final HiLL configured → pause → record explicit approval
        └─ no final HiLL         → record approval as not_required
        │
        ▼
run remaining postApproval steps, recording each success
        │
        ▼
normal PR/completion routing
```

A failed step remains incomplete, records the failed boundary and next action,
and stops. Resumption uses the persisted snapshot rather than re-resolving
potentially changed configuration.

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
