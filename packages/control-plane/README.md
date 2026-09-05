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
  WORKFLOW_MODES,
} from '@open-agent-toolkit/control-plane';
```

`WORKFLOW_MODES` is the ordered runtime list of supported modes:
`spec-driven`, `quick`, `import`, and `lite`. The exported `WorkflowMode` type
is derived from this constant.

### `getProjectState(projectPath)`

Reads one OAT project directory and returns a full `ProjectState` snapshot, including:

- phase and lifecycle status
- task progress and current task
- artifact and review status
- blocker and HiLL metadata
- PR/docs timestamps and recommendation output

Review ledger entries in `ProjectState.reviews` expose the stable five-column
event identity (`scope`, `type`, `status`, `date`, and `artifact`) plus optional
provenance:

- `reviewedHead`: validated full 40-character commit SHA at the head of the
  reviewed range
- `invocation`: invocation kind recorded by the review writer
- `gateTarget`: configured target for gate-originated review lineage

Legacy five-column review rows remain supported. Missing, empty, placeholder,
or invalid provenance is omitted from the parsed object.

### `listProjects(projectsRoot)`

Reads all projects under a configured projects root and returns lightweight `ProjectSummary` records suitable for list or dashboard surfaces.

`ProjectSummary.scope` is an additive optional field (`shared`, `local`, or
`synced`). The CLI's cross-scope list surface returns `ProjectListRow[]`, a
discriminated union:

- `materialized` rows carry normal lifecycle state.
- `recorded-absent` and `remote` rows use `null` lifecycle fields and an
  explicit pull recommendation instead of inventing project state.
- `recorded-terminal` rows represent legacy or authoritative completion. They
  carry `lifecycle: 'complete'`, a `terminalState`, a nullable `archiveSnapshot`,
  and no pull recommendation; their checkout may still be present when a
  completed ref supersedes stale local state.
- `terminal-invalid` rows represent differing active and completed ref SHAs.
  They carry the conflicting refs and SHAs, use `checkout: 'invalid'`, and
  return a repair diagnosis rather than workflow guidance.

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
