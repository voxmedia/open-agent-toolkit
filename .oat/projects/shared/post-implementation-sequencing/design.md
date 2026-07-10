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

### Configuration Model and Resolver

**Purpose:** Provide one validated configuration contract while preserving
legacy input.

**Responsibilities:**

- Define `summary | document | pr` as the structured step vocabulary.
- Accept legacy strings or an object containing both ordered arrays.
- Reject duplicate or unknown steps and malformed or partial objects.
- Normalize legacy values to a canonical two-array shape.
- Treat the object as an atomic leaf during layered resolution.
- Let `oat config set` accept either a legacy string or JSON object.
- Preserve objects in JSON output and serialize them as compact JSON in plain
  output.

### Final-Closeout Orchestrator

**Purpose:** Own the final-review, sequence, and approval ordering.

**Responsibilities:**

- Preserve all non-final checkpoint behavior.
- Defer only the final checkpoint and its auto-review branch.
- Complete final verification and final review before sequence execution.
- Snapshot the normalized sequence before running it.
- Dispatch steps in configured order:
  - `summary` → `oat-project-summary`
  - `document` → `oat-project-document`
  - `pr` → `oat-project-pr-final`
- Avoid redundant summary generation when `pr-final` sees that the snapshotted
  sequence already completed `summary`.
- Persist progress after every successful step and before and after approval.

### Sequence State Manager

**Purpose:** Make the boundary restart-safe.

**Responsibilities:**

- Store the immutable sequence snapshot for the current closeout.
- Track completed pre- and post-approval steps.
- Track approval as `pending`, `approved`, or `not_required`.
- Record the failed boundary and step without marking it completed.
- Resume from the first uncompleted step rather than re-reading configuration.
- Clear or finalize transient sequence state only after the whole sequence
  succeeds.

### Project Routing Integration

**Purpose:** Keep closeout resumable when child skills mutate lifecycle state.

**Responsibilities:**

- Route an incomplete sequence back to `oat-project-implement` before normal
  `pr_open` routing.
- Allow a pre-approval PR to exist while final approval remains pending.
- Return to normal revise or complete routing only after approval and configured
  post-approval work finish.
- Leave individual summary, document, and PR behavior unchanged except for
  sequence-aware summary reuse and routing.

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
