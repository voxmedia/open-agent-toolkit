# @open-agent-toolkit/control-plane

Read-only OAT control-plane library for parsing project artifacts into structured state.

## Purpose

`@open-agent-toolkit/control-plane` is the typed "read" layer behind OAT project inspection.

It is responsible for:

- parsing OAT project artifacts from disk
- aggregating task progress, artifact status, and review state
- recommending the next workflow skill from parsed project state
- returning stable typed objects for CLI and future UI consumers

The package is intentionally pure and read-only. It has no CLI, UI, or server dependencies beyond Node.js filesystem/path builtins and `yaml` for frontmatter parsing.

## Public API

```ts
import {
  getProjectState,
  listProjects,
  recommendSkill,
} from '@open-agent-toolkit/control-plane';
```

### `getProjectState(projectPath)`

Reads one OAT project directory and returns a full `ProjectState` snapshot, including:

- phase and lifecycle status
- task progress and current task
- artifact and review status
- blocker and HiLL metadata
- PR/docs timestamps and recommendation output

### `listProjects(projectsRoot)`

Reads all projects under a configured projects root and returns lightweight `ProjectSummary` records suitable for list or dashboard surfaces.

### `recommendSkill(projectState)`

Pure function that maps parsed project state to the next recommended OAT workflow skill.

## Current Consumers

- `packages/cli/src/commands/project/status.ts`
- `packages/cli/src/commands/project/list.ts`

The CLI also uses adjacent config-resolution code for `oat config dump`, but the control plane remains focused on project artifact parsing rather than config ownership.

## Development

```bash
pnpm --filter @open-agent-toolkit/control-plane test
pnpm --filter @open-agent-toolkit/control-plane lint
pnpm --filter @open-agent-toolkit/control-plane type-check
pnpm --filter @open-agent-toolkit/control-plane build
```
