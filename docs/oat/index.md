# OAT Documentation

This directory is the temporary documentation structure for OAT, organized so it can be moved into MkDocs with minimal reshaping.

## Navigation

- Quickstart: `docs/oat/quickstart.md`
- Workflow lifecycle: `docs/oat/workflow/lifecycle.md`
- HiL checkpoints: `docs/oat/workflow/hil-checkpoints.md`
- Reviews loop: `docs/oat/workflow/reviews.md`
- PR flow: `docs/oat/workflow/pr-flow.md`
- Skills map: `docs/oat/skills/index.md`
- Skills contracts: `docs/oat/skills/execution-contracts.md`
- Project artifacts: `docs/oat/projects/artifacts.md`
- Project state machine: `docs/oat/projects/state-machine.md`
- CLI provider interop overview: `docs/oat/cli/provider-interop/overview.md`
- Reference docs: `docs/oat/reference/file-locations.md`

## Source-of-truth hierarchy

1. Runtime behavior: `packages/cli/src/**`
2. Skill behavior contracts: `.agents/skills/*/SKILL.md`
3. OAT templates and scripts: `.oat/templates/**`, `.oat/scripts/**`
4. Internal product records: `.oat/internal-project-reference/**`

## Reference artifacts

- `.oat/projects/shared/provider-interop-cli/spec.md`
- `.oat/projects/shared/provider-interop-cli/design.md`
- `.oat/projects/shared/provider-interop-cli/plan.md`
- `.oat/projects/shared/provider-interop-cli/implementation.md`
