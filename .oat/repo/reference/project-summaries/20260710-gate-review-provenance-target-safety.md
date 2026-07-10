---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: true
oat_summary_last_task: p04-t31
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: gate-review-provenance-target-safety

## Overview

This quick-mode project made workflow gate reviews explicit about both the
configured execution target and the project being reviewed, then extended that
same identity discipline through review provenance, phase-gate setup, and
managed subagent dispatch. It also repaired a prerequisite Codex dispatch
regression so configured policy can produce an immediately usable exact target
without depending on provider restart behavior.

## What Was Implemented

- Gate exec targets now declare provider-neutral invocation metadata. `oat gate
review` carries one immutable run/target/runtime/model/effort/source record
  into the provider prompt, review artifact, gate verdict, and JSON result.
- Gate reviews can declare their project explicitly with `--project`. The gate
  correlates run ID, containing project, artifact `oat_project`, and invocation
  metadata before verdict parsing; a mismatch fails closed instead of producing
  a false-green review.
- Final and contiguous-range review gates aggregate relevant producer stamps,
  preserve exact-scope compatibility, and use the union of known producer
  families for reviewer diversity.
- Plan, quick-start, import-plan, and spec-driven planning now probe for a
  qualifying configured review target and offer opt-in all-phase or selected
  `oat_phase_review_gate` setup without conflating that choice with HiLL.
- Managed dispatch now uses ordered provider candidate ladders with named
  project or phase ceilings. A task resolves one exact eligible candidate below
  that maximum: a materialized Codex role, a Claude model argument, or an opaque
  Cursor model string.
- Codex has a committed 26-role implementer/reviewer catalogue for Luna, Terra,
  and Sol (including Sol `max`). `oat sync` materializes every configured custom
  candidate in the configuration owner's scope and preserves ownership during
  cleanup.
- Phase implementation is split into a coordinator that owns order and
  integration and serial exact task workers that own one bounded task and its
  commit. Missing or above-ceiling managed targets fail closed.

## Key Decisions

- **Lifecycle gate commands stay target-neutral by default.** Reusable lifecycle
  commands declare the project but do not pin a provider/model target; the gate
  dispatcher selects an eligible independent configured target.
- **Configured gate provenance is separate from reviewer identity.** Invocation
  model and effort come only from the selected exec-target configuration; an
  observed or self-reported model cannot overwrite that record.
- **Declared gate projects require artifact corroboration.** A gate only passes
  when the generated artifact, containing project, and run identity agree with
  the caller's declared project.
- **Dispatch matrix remains source of provider targets.** Reusable ordered
  ladders are configuration-owned, while project and phase settings name only
  the maximum tier available to a task.
- **Codex targets are materialized from canonical agents.** A supported
  catalogue is committed before provider-session discovery; additional custom
  targets materialize in user or project scope, with a pinned child fallback
  when a role cannot be selected.

## Notable Challenges

- The initial managed Codex path accepted a policy that could not compile a
  model-plus-effort dispatch target. The project made adapter compilation the
  readiness boundary and added a finite registered catalogue so artifact review
  cannot outrun role availability.
- Multiple final-review rounds exposed artifact-correlation, realpath,
  ownership-header, dispatch-pair, and workflow-resumption edge cases. Each was
  converted into bounded p04 tasks and independently re-reviewed; the final
  adaptive-dispatch review and the approved Claude Fable gate both reported zero
  findings.

## Tradeoffs Made

- The project deliberately added only local invocation metadata and candidate
  ladder structure. The broader dispatch-machine schema and formatter remain a
  separate backlog concern.
- Provider roles are materialized as a usability optimization, not a runtime
  correctness dependency. Exact target controls or a pinned child are required
  when a managed role is unavailable.
- Cursor model values remain opaque configuration strings. OAT passes the
  configured value through without deriving capabilities from its text.

## Follow-up Items

- `BL-260709-add-dispatch-machine-schema`: generalize the deferred dispatch
  machine schema and formatter.
- `BL-260707-consolidate-dispatch-matrix`: consolidate matrix normalization and
  traversal after the shipped compatibility path has settled.
- `BL-260707-cache-cursor-model-catalog` and
  `BL-260708-verify-cursor-gpt-5-6-subagent`: complete Cursor catalog caching
  and validate actual Cursor GPT-5.6 subagent model strings.

## Associated Issues

- `BL-260707-record-gate-review-model`
- `BL-260707-declare-gate-review-target`
- `BL-260707-support-producer-identity`
- `BL-260707-ask-to-enable-phase-review`
