# HiL Checkpoints

OAT supports two checkpoint classes:

- Workflow phase checkpoints
- Plan phase checkpoints

## Workflow checkpoints (`state.md`)

Frontmatter keys:

- `oat_hil_checkpoints`
- `oat_hil_completed`

Example:

```yaml
oat_hil_checkpoints: ["discovery", "spec", "design"]
oat_hil_completed: ["discovery"]
```

## Plan phase checkpoints (`plan.md`)

Frontmatter key:

- `oat_plan_hil_phases`

Semantics:
- Empty list: checkpoint every phase boundary.
- Explicit list: checkpoint only named phases (`p01`, `p04`, etc).

## Reference artifacts

- `.oat/templates/plan.md`
- `.oat/projects/shared/provider-interop-cli/plan.md`
- `.oat/projects/shared/provider-interop-cli/state.md`
