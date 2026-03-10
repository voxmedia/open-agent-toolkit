---
title: Human-in-the-Loop Lifecycle (HiLL) Checkpoints
description: ""
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

Frontmatter key:

- `oat_plan_hill_phases`

Semantics:

- Empty list: checkpoint after every phase boundary.
- Explicit list: checkpoint only after completing the named phases (`p01`, `p04`, etc).

Listed phases are where you stop **after completing them**, not before. `["p03"]` means "complete p03, then pause" — not "pause before starting p03." Setting the last phase ID (e.g., `["p03"]` when p03 is final) means "stop only at the end of implementation."

## Reference artifacts

- `.oat/templates/plan.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/state.md`
