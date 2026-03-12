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

On the first implementation run, `oat-project-implement` presents a brief phase summary and asks a simple checkpoint question such as "every phase or specific checkpoints?" It then writes the confirmed value into `plan.md`. If the field is later missing during a resumed implementation run, treat that as bookkeeping drift rather than as an implicit default.

Listed phases are where you stop **after completing them**, not before. `["p03"]` means "complete p03, then pause" — not "pause before starting p03." Setting the last phase ID (e.g., `["p03"]` when p03 is final) means "stop only at the end of implementation."

## Reference artifacts

- `.oat/templates/plan.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/state.md`
