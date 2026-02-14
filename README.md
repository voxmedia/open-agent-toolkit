# Open Agent Toolkit (OAT)

Open Agent Toolkit is a workflow and tooling system for structured agent-driven development.

This repository currently includes:
- OAT workflow skills in `.agents/skills`
- OAT project artifacts in `.oat/projects/...`
- The provider interop CLI in `packages/cli`

## Quickstart

```bash
pnpm install
pnpm run cli -- --help
pnpm run cli -- sync --scope all --apply
```

## Documentation

- OAT overview: `docs/oat/index.md`
- OAT quickstart: `docs/oat/quickstart.md`
- Workflow lifecycle: `docs/oat/workflow/lifecycle.md`
- HiL checkpoints: `docs/oat/workflow/hil-checkpoints.md`
- Reviews flow: `docs/oat/workflow/reviews.md`
- PR flow: `docs/oat/workflow/pr-flow.md`
- Skills map: `docs/oat/skills/index.md`
- Skills execution contracts: `docs/oat/skills/execution-contracts.md`
- Project artifacts: `docs/oat/projects/artifacts.md`
- Project state machine: `docs/oat/projects/state-machine.md`
- CLI provider interop overview: `docs/oat/cli/provider-interop/overview.md`
- CLI commands: `docs/oat/cli/provider-interop/commands.md`
- Provider behavior: `docs/oat/cli/provider-interop/providers.md`
- Manifest and drift: `docs/oat/cli/provider-interop/manifest-and-drift.md`
- Hooks and safety: `docs/oat/cli/provider-interop/hooks-and-safety.md`
- Reference locations: `docs/oat/reference/file-locations.md`
- Commit conventions: `docs/oat/reference/commit-conventions.md`
- Troubleshooting: `docs/oat/reference/troubleshooting.md`
