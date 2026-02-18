# Unified Cleanup Plan: Project Hygiene + Artifact Triage

## Summary
Implement a single top-level cleanup command family with two subcommands:

1. `oat cleanup project` for pointer/state/lifecycle/dashboard hygiene.
2. `oat cleanup artifacts` for review/external-plan artifact hygiene with interactive Keep/Archive/Delete triage.

This consolidates backlog items:
- `.oat/repo/reference/backlog.md` (project cleanup command)
- `.oat/repo/reference/backlog.md` (artifact cleanup command)

## Implementation Status (2026-02-18)
- `oat cleanup project` implemented with dry-run/apply drift remediation.
- `oat cleanup artifacts` foundation implemented:
  - duplicate-chain prune planning
  - stale candidate discovery with reference guards
  - interactive Keep/Archive/Delete triage helpers
  - non-interactive safety gate and archive path/collision helpers
- Test coverage added for unit, integration, and idempotency scenarios.

## Locked Decisions
1. Command surface is top-level `oat cleanup ...`.
2. Mutating behavior defaults to dry-run first; mutation requires `--apply`.
3. Non-interactive optional stale-candidate deletion requires explicit force (`--all-candidates --yes`).
4. Reference guard scans active project artifacts plus `.oat/repo/reference/**`.
5. Missing `state.md` in a drifted project is auto-repaired from `.oat/templates/state.md` in apply mode.
6. Duplicate version-chain pruning keeps latest and deletes older versions by default.
7. Stale candidate triage in interactive mode offers Keep / Archive / Delete.
8. Archive destinations follow repo conventions:
   - `.oat/repo/reference/external-plans/*` -> `.oat/repo/archive/reference/external-plans/*`
   - `.oat/repo/reviews/*` -> `.oat/repo/archive/reviews/*`

## In Scope
1. New command group: `oat cleanup`.
2. New subcommands:
   - `oat cleanup project`
   - `oat cleanup artifacts`
3. Shared dry-run/apply execution model and deterministic summary output.
4. Interactive stale candidate triage with archive and delete actions.
5. Reference-aware guardrails for potentially in-use artifacts.
6. JSON output payloads for both subcommands.
7. Tests and docs updates for the new commands.

## Out of Scope
1. Archiving/deleting project directories in `cleanup project`.
2. Backlog/workflow policy changes beyond cleanup command behavior.
3. Changing existing script-to-CLI migration scope currently in progress.
4. New long-lived memory/state stores for cleanup history.

## Public API / Interface Changes

### Commands
1. `oat cleanup project [--apply]`
2. `oat cleanup artifacts [--apply] [--all-candidates] [--yes]`

### Behavioral contract
1. Default mode is dry-run.
2. `--apply` enables filesystem mutation.
3. `oat cleanup artifacts --all-candidates` in non-interactive mode requires `--yes`.
4. Referenced stale candidates are blocked from auto-delete in non-interactive mode.
5. Exit codes:
   - `0`: success
   - `1`: actionable user/precondition issue
   - `2`: runtime/system error

### JSON output contract
Both subcommands emit a stable structure:
1. `status`: `ok | drift | error`
2. `mode`: `dry-run | apply`
3. `summary`: counts (`scanned`, `issuesFound`, `planned`, `applied`, `skipped`, `blocked`)
4. `actions`: normalized action records with fields:
   - `type`: `delete | archive | create | update | clear | regenerate | skip | block`
   - `target`
   - `reason`
   - `phase`
   - `result`: `planned | applied | skipped | blocked`

## Implementation Plan

### 1) Command and Module Scaffolding
1. Add `cleanup` command registration under `packages/cli/src/commands/index.ts`.
2. Create module tree:
   - `packages/cli/src/commands/cleanup/index.ts`
   - `packages/cli/src/commands/cleanup/cleanup.types.ts`
   - `packages/cli/src/commands/cleanup/cleanup.utils.ts`
   - `packages/cli/src/commands/cleanup/project/project.ts`
   - `packages/cli/src/commands/cleanup/project/project.types.ts`
   - `packages/cli/src/commands/cleanup/project/project.utils.ts`
   - `packages/cli/src/commands/cleanup/artifacts/artifacts.ts`
   - `packages/cli/src/commands/cleanup/artifacts/artifacts.types.ts`
   - `packages/cli/src/commands/cleanup/artifacts/artifacts.utils.ts`

### 2) `cleanup project` Flow
1. Resolve repo root from current `cwd`.
2. Scan project roots under shared/local scopes.
3. Detect and remediate (dry-run planned, apply mutates):
   - invalid `.oat/active-project` pointer -> clear pointer
   - missing `state.md` when lifecycle artifacts exist -> recreate from template
   - completed project missing `oat_lifecycle: complete` -> upsert lifecycle field
4. Regenerate dashboard after apply mutations.
5. Emit deterministic action summary.

### 3) `cleanup artifacts` Flow

#### Phase A: Duplicate-chain prune
1. Identify chains like `foo.md`, `foo-v2.md`, `foo-v3.md`.
2. Keep latest version; mark older files as prune candidates.
3. Apply mode deletes older versions by default.

#### Phase B: Stale-candidate triage
1. Build remaining candidate set in:
   - `.oat/repo/reviews/`
   - `.oat/repo/reference/external-plans/`
2. Compute reference guard hits from:
   - active project artifacts (when active project exists)
   - `.oat/repo/reference/**/*.md`
3. Interactive apply flow:
   - prompt multi-select for archive set
   - prompt multi-select for delete set from remaining candidates
   - explicit confirmation for referenced selections
4. Non-interactive apply flow:
   - without `--all-candidates --yes`: skip optional stale deletions with guidance
   - with `--all-candidates --yes`: delete unreferenced stale candidates; referenced remain blocked

### 4) Archive Mechanics
1. Move selected stale artifacts to archive roots:
   - external plans -> `.oat/repo/archive/reference/external-plans/`
   - reviews -> `.oat/repo/archive/reviews/`
2. Create archive directories if missing.
3. Resolve name collisions with timestamp suffix (`-YYYYMMDD-HHMMSS`).
4. Record archive actions in cleanup summary output.

### 5) Shared Utility Contracts
1. Duplicate-chain parser and latest-version resolver.
2. Reference scanner utility for markdown references.
3. Action normalization utility shared by both subcommands.
4. Non-interactive safety gate utility for required confirmation flags.

## Test Cases and Scenarios

### Unit tests
1. Duplicate chain parsing and latest-version selection.
2. Archive destination routing by source directory.
3. Collision-safe archive naming.
4. Reference scanner detects hits in active project and repo reference docs.
5. Lifecycle completion heuristic from `plan.md` final review row.
6. `state.md` template rendering and fallback behavior.

### Command tests
1. Command registration includes `cleanup` and both subcommands.
2. Help snapshots include new command surfaces.
3. `cleanup project`:
   - dry-run plans all drift fixes
   - apply clears invalid active pointer
   - apply recreates missing state.md from template
   - apply normalizes lifecycle metadata
4. `cleanup artifacts`:
   - dry-run reports duplicate prune and stale candidates
   - apply prunes duplicate chains
   - interactive apply supports archive + delete selections
   - non-interactive apply requires `--yes` for `--all-candidates`
   - referenced stale candidates are blocked/skipped in non-interactive mode
5. JSON output shape remains stable for automation.

### Integration/e2e
1. Seed fixture with mixed duplicate chains and stale artifacts across reviews/external-plans.
2. Verify reference-guard behavior under active project + repo references.
3. Verify idempotency (second apply run yields no additional changes).

## Parallelization Lanes

### Lane A: Command scaffolding + shared contracts
1. Build command tree + base types/utils.
2. Wire registration and help tests.

### Lane B: Project hygiene implementation
1. Implement `cleanup project` checks/fixes.
2. Add focused tests.

### Lane C: Artifact triage implementation
1. Implement duplicate prune and stale triage (archive/delete/keep).
2. Add focused tests.

### Convergence
1. Integration tests and help snapshots.
2. Docs + backlog references updates.
3. Final consistency pass (JSON schema + exit semantics).

## Acceptance Criteria
1. `oat cleanup project` can safely detect and remediate project-state drift with dry-run/apply behavior.
2. `oat cleanup artifacts` auto-prunes duplicate chains to latest version.
3. Users can interactively Keep/Archive/Delete stale artifacts in one flow.
4. Archive moves follow repo archive path conventions.
5. Non-interactive mutation paths are safe and explicit.
6. Command outputs are deterministic and audit-friendly.

## Assumptions and Defaults
1. Repo archive convention is `.oat/repo/archive/**`.
2. Duplicate chain prune remains delete-by-default for older versions.
3. Archive option is provided for stale candidates (non-duplicate) in interactive mode.
4. Reference safety prioritizes avoiding accidental deletion over aggressive cleanup.
