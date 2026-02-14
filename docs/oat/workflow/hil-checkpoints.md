# HiL Checkpoints

OAT supports two checkpoint styles:

- Workflow checkpoints between lifecycle stages
- Plan phase checkpoints during implementation

## Workflow checkpoints

Tracked in project `state.md` frontmatter:
- `oat_hil_checkpoints`
- `oat_hil_completed`

## Plan phase checkpoints

Tracked in `plan.md` frontmatter:
- `oat_plan_hil_phases`

Behavior:
- Empty list means stop at every phase boundary
- A list means stop only at specified phase ids
