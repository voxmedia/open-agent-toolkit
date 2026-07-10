---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
oat_template: false
---

# Design: gate-review-provenance-target-safety

## Overview

This project hardens `oat gate review` at the two identity boundaries that a workflow gate must know without inference: the review subject and the configured invocation that performed the review. The CLI will preserve provider-neutral target selection, then construct a small immutable invocation record from the selected exec target. That record will be injected into the reviewer prompt, stamped into artifact frontmatter, parsed and corroborated after execution, and returned in the gate JSON envelope. Separately, an explicitly declared project will be carried with a resolution source and corroborated against the artifact's `oat_project` value before a gate can pass.

The implementation extends the existing gate path instead of replacing it. Current exact-scope producer resolution and final/range family-union avoidance stay in place; aggregation output gains an explicit aggregated-stamps source and focused range coverage. The exec-target extension is deliberately local and minimal, containing only invocation model and reasoning effort plus derived source semantics. It does not introduce the broader dispatch-machine route, policy, defaults, or runtime-confirmation schema.

Only after these safety contracts are verified will shared planning guidance detect a deliberately configured review target and offer project-level phase-review enablement. The prompt writes the existing `oat_phase_review_gate` shape for all phases, selected phases, or disabled, while reusable lifecycle commands continue to declare `--project` and omit provider/model `--target` pins.

## Architecture

### System Context

`oat gate review` remains the orchestration boundary. It resolves the review subject, producer identity, and provider-neutral exec target before launching a reviewer. The hardened path adds explicit records at that boundary rather than asking the reviewer to infer either identity from ambient state.

**Key components:**

- **Exec-target configuration:** Stores minimal configured invocation metadata alongside the existing runtime and command definition.
- **Gate invocation assembler:** Resolves project source and selected target, creates a unique run correlation ID, and assembles exact prompt metadata.
- **Review artifact parser and corroborator:** Parses typed frontmatter, correlates the artifact to the run, and compares project and invocation fields with the gate-owned records.
- **Producer identity resolver:** Preserves exact-scope resolution and represents final/range aggregation explicitly.
- **Planning integration:** Detects a deliberately configured review target and writes the existing phase-review gate frontmatter after user choice.

### Component Diagram

```text
layered gate config ----> exec-target resolver ----> configured invocation record
                                  |                              |
project argument/config --> project resolver                     |
           |                      |                              |
producer dispatch stamps --> producer resolver                   |
           |                      |                              |
           +----------------------+------------------------------+
                                  v
                       gate prompt + unique run ID
                                  |
                         target-neutral dispatch
                                  |
                                  v
                         produced review artifact
                                  |
                                  v
                 typed parse + run/project/invocation checks
                                  |
                    +-------------+-------------+
                    |                           |
             valid verdict + JSON      fail-closed diagnostic JSON
```

### Data Flow

1. Resolve the project as `{ path, source }`, distinguishing an explicit declaration from active-project or single-candidate ambient fallback.
2. Resolve producer identity from an explicit flag, an exact dispatch stamp, aggregated in-scope stamps, or unknown; retain the union of families to avoid.
3. Select an exec target without adding a provider/model pin to lifecycle commands, then derive one immutable configured invocation record containing run ID, target ID, runtime, model, reasoning effort, and source.
4. Inject the project record and configured invocation record into the review prompt with exact artifact keys and explicit unknown/provider-default values.
5. Execute the target, locate the resulting artifact using run correlation, and parse frontmatter through the existing YAML-aware review verdict path.
6. For a declared project, compare both the artifact's containing project and `oat_project` with the normalized declared path. Compare artifact invocation fields with the gate-owned configured record independently.
7. Return the same configured invocation, project-resolution, producer-diversity, and corroboration metadata in JSON. Any required-field or corroboration failure exits nonzero and cannot be reported as a passed review verdict.
8. After the safety work is available, planning workflows use a canonical read-only gate-target probe to decide whether to offer phase-review enablement; the user choice writes the already-consumed `oat_phase_review_gate` plan shape.

## Component Design

_Pending collaborative validation._

## Data Models

_Pending collaborative validation._

## API Design

_Pending collaborative validation._

## Error Handling

_Pending collaborative validation._

## Testing Strategy

_Pending collaborative validation._
