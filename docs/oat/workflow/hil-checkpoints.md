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
oat_hill_checkpoints: ["discovery", "spec", "design"]
oat_hill_completed: ["discovery"]
```

## Plan phase checkpoints (`plan.md`)

Frontmatter key:

- `oat_plan_hill_phases`

Semantics:
- Empty list: checkpoint every phase boundary.
- Explicit list: checkpoint only named phases (`p01`, `p04`, etc).

## Reference artifacts

- `.oat/templates/plan.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/state.md`
