---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-22
oat_generated: true
oat_summary_last_task: p-rev1-t02
oat_summary_revision_count: 1
oat_summary_includes_revisions: ['p-rev1']
---

# Summary: oat-project-split

## Overview

This project shipped a codified escape hatch for broad OAT discoveries and brainstorms that should become multiple coordinated projects instead of one oversized implementation. It turns a parent conversation into a durable coordination artifact, creates focused child projects, and preserves enough shared context for the children to proceed independently.

## What Was Implemented

- Added the standalone `oat-project-split` workflow skill and registered it with the workflow tool surface.
- Added split primitives and CLI support for `oat project split evaluate-signals`, `validate-plan`, and `run`.
- Added coordination parent support with `oat_kind: coordination`, `oat_phase: decomposition`, no executable phase artifacts, an integration sketch, child registry metadata, and persisted `references/split-plan.json` for resume.
- Added child scaffolding and seeding with seven focused discovery sections, parent/sibling links, dependency metadata, and inherited-context revalidation requirements.
- Integrated split detection and handoff into `oat-project-discover` and `oat-brainstorm` for declared, mid-stream detected, and convergence-time split paths.
- Updated project list, project status, and repo dashboard behavior so completed coordination parents are hidden by default and shown as inert decompositions when included.
- Dogfooded declared, detected, convergence, and resume paths; documented the remaining non-blocking operator polish follow-ups.
- Added user-facing documentation for project splitting and refreshed repo reference state.

## Key Decisions

- Use user-facing “split” language while keeping `decomposition` as the internal parent phase name.
- Keep the coordination parent in place under `.oat/projects/<scope>/` instead of archiving or relocating it.
- Treat child projects as flat siblings, not nested directories under the parent.
- Persist `SplitPlanDocument` at `references/split-plan.json` before child writes so resume does not reconstruct intent from partial state.
- Make declared non-interactive splits proceed, while detected non-interactive splits record the recommendation and fail fast.
- Activate exactly one child by dependency/value order and leave siblings parked for explicit follow-up.

## Notable Challenges

- Review cycles tightened the plan around command-boundary behavior, state validation ownership, durable resume data, and active-child path activation.
- Final review identified stale dogfood notes after behavior had been fixed; `p-rev1` clarified those notes without changing runtime behavior.
- Repeated CLI invocations exposed a transient asset-copy race when `pnpm run cli` commands run in parallel; serial reruns passed.

## Integration Notes

- Coordination parents must not contain `spec.md`, `design.md`, `plan.md`, or `implementation.md`; validators and parent-writing code enforce that invariant.
- Child discoveries start with inherited context marked stale-prone. Downstream workflows should revalidate before moving beyond discovery/design.
- Default project lists intentionally hide completed coordination parents. Use `oat project list --include-coordination` when inspecting decomposition records.
- `oat state refresh` groups terminal coordination parents under the dashboard decompositions section.

## Revision History

- `p-rev1` completed final-review polish by annotating declared dogfood evidence for two historical observations that had since been fixed: coordination parent list display and coordination parent state-body prose.

## Follow-up Items

- `validate-plan` currently behaves as a pre-run validation command and rejects persisted split plans after their parent/children already exist. A future `--for-resume` or `--allow-existing` mode would reduce operator friction.
- Active detected-parent conversion works, but the CLI could log the conversion intent more clearly before running the existing-parent path.

## Associated Issues

- `bl-3a4a` — Codified sub-project split escape hatch.
