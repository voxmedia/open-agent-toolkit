---
title: Human-in-the-Loop Lifecycle (HiLL) Checkpoints
description: 'Checkpoint configuration and behavior for pauseable, human-in-the-loop lifecycle execution.'
---

# Human-in-the-Loop Lifecycle (HiLL) Checkpoints

OAT supports two checkpoint classes:

- Workflow phase checkpoints
- Plan phase checkpoints

## Workflow checkpoints (`state.md`)

Frontmatter keys:

- `oat_hill_checkpoints`
- `oat_hill_completed`

Example:

```yaml
oat_hill_checkpoints: ['discovery', 'spec', 'design']
oat_hill_completed: ['discovery']
```

## Plan phase checkpoints (`plan.md`)

Frontmatter key written after implementation confirmation:

- `oat_plan_hill_phases`

Semantics:

- Field absent: valid before the first `oat-project-implement` run confirms checkpoint selection. Planning may intentionally leave the field unset until that first execution starts.
- Empty list: checkpoint after every phase boundary, but only after implementation has confirmed the choice and written `oat_plan_hill_phases: []` into `plan.md`.
- Explicit list: checkpoint only after completing the named phases (`p01`, `p04`, etc).

On the first implementation run, `oat-project-implement` must summarize every plan phase, state the total phase count and final phase ID, and then ask an explicit three-option checkpoint question:

- Stop after each phase
- Stop after specific phases
- Stop only after the final phase is completed

It then writes the confirmed value into `plan.md`. If the field is later missing during a resumed implementation run, treat that as bookkeeping drift rather than as an implicit default.

Listed phases are where you stop **after completing them**, not before. `["p03"]` means "complete p03, then pause" — not "pause before starting p03." Setting the last phase ID (e.g., `["p03"]` when p03 is final) means "stop only at the end of implementation."

### Setting a default via `workflow.hillCheckpointDefault`

The first-run checkpoint prompt can be skipped entirely by setting the `workflow.hillCheckpointDefault` preference:

- `every` — automatically write `oat_plan_hill_phases: []` (pause after every phase) without prompting
- `final` — automatically write `oat_plan_hill_phases: ["<final-phase-id>"]` (pause only at the end) without prompting

When set, `oat-project-implement` reads the preference before the prompt and prints `HiLL checkpoints: <every|final> (from workflow.hillCheckpointDefault)`, skipping the interactive choice. When unset (default), the skill prompts as before.

This is a personal preference — typically set at user scope so it applies to every repo:

```bash
oat config set workflow.hillCheckpointDefault final --user
```

See [Workflow preferences in the Configuration guide](../../cli-utilities/configuration.md#workflow-preferences-workflow) for the full list of preference keys and surface guidance.

## Reference artifacts

- `.oat/templates/plan.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/state.md`
