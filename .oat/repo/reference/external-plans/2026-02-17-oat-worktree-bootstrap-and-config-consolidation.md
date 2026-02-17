# OAT Worktree Bootstrap + Config Consolidation (Phase A) Plan

## Summary
Implement a dedicated OAT worktree skill that creates/bootstraps isolated workspaces with deterministic root selection and strict baseline verification.

In the same effort, introduce `.oat/config.json` as the canonical home for new non-sync repo-level settings, starting with `worktrees.root`, to avoid adding new one-off pointer files.

## Locked Decisions
1. Add `oat-worktree-bootstrap` as an explicit, side-effectful skill (`disable-model-invocation: true`).
2. Baseline readiness must include:
   - `pnpm run worktree:init`
   - `pnpm run cli -- status --scope project`
   - `pnpm test`
   - clean `git status --porcelain`
3. If baseline tests fail:
   - show details
   - ask user whether to abort or proceed
   - if proceeding, append a timestamped baseline-failure note to project `implementation.md`.
4. Do not add `.oat/worktrees-root`.
5. Add `.oat/config.json` now for new non-sync settings; store `worktrees.root` there.
6. Keep existing files unchanged for now:
   - `.oat/active-project`
   - `.oat/active-idea`
   - `.oat/projects-root`
   - `.oat/sync/config.json`

## In Scope
1. New skill authoring under `.agents/skills/oat-worktree-bootstrap/`.
2. Root-resolution policy for local/sibling/global worktree locations.
3. Worktree creation/reuse logic and safety checks.
4. Strict baseline verification gate before reporting "ready".
5. Introduce `.oat/config.json` with `worktrees.root` schema.
6. Documentation updates for skill discovery and file-location conventions.
7. Backlog/decision record updates for phased consolidation follow-up.

## Out of Scope
1. CLI command changes for project state/config management.
2. Full migration of existing pointer files into JSON config.
3. Migration of sync config from `.oat/sync/config.json` into `.oat/config.json`.
4. Worktree cleanup/teardown automation.

## Public Interface / Contract Changes
1. New skill:
   - `.agents/skills/oat-worktree-bootstrap/SKILL.md`
2. New optional config file:
   - `.oat/config.json`
3. New config key:
   - `worktrees.root` (string; absolute or repo-relative path)

## Root Resolution Contract
Resolve worktree root in this order:
1. `--path <root>`
2. `OAT_WORKTREES_ROOT`
3. `.oat/config.json` -> `worktrees.root`
4. Existing discovered roots:
   - `.worktrees`
   - `worktrees`
   - `../<repo>-worktrees`
5. Default fallback:
   - `../<repo>-worktrees`

Notes:
- Relative values are resolved from repo root.
- Global roots are supported by explicit config/env/path (for example, `~/.oat/worktrees/<repo>`).

## Baseline Verification Contract
After entering target worktree, run in order:
1. `pnpm run worktree:init`
2. `pnpm run cli -- status --scope project`
3. `pnpm test`
4. `git status --porcelain`

Failure handling:
- If steps 1, 2, or 4 fail: stop and report exact failure.
- If step 3 fails: show failing summary and ask `abort` vs `proceed`.
- If user proceeds after step 3 failure: append baseline-failure note to active project `implementation.md`.

## Implementation Plan

### 1) Add Worktree Skill
1. Create `.agents/skills/oat-worktree-bootstrap/SKILL.md`.
2. Include OAT progress banner conventions.
3. Include argument contract (`branch-name`, `--base`, `--path`, `--existing`).
4. Enforce deterministic creation/reuse behavior.
5. Include active-project pointer validation and recovery route (`oat-project-clear-active` / `oat-project-open`).

### 2) Add Reference Material
1. Add `.agents/skills/oat-worktree-bootstrap/references/worktree-conventions.md`.
2. Include root examples (local/sibling/global), failure remediation, and baseline attribution rationale.

### 3) Introduce `.oat/config.json` (Phase A)
1. Add `.oat/config.json` with schema version and `worktrees.root`.
2. Document that this file is for new non-sync settings.
3. Keep existing pointer/sync files authoritative for their current domains.

### 4) Docs and Registry
1. Update `docs/oat/skills/index.md` to include the new skill.
2. Update `docs/oat/reference/file-locations.md` for `.oat/config.json`.
3. Update `docs/oat/reference/oat-directory-structure.md` for new config surface and phased model.
4. Ensure README workflow path references worktree skill where appropriate.

### 5) Backlog and ADR Follow-through
1. Keep/expand worktree-skill backlog item with this plan link.
2. Add explicit phased backlog item for broader `.oat/config.json` consolidation.
3. Record the phased consolidation decision in decision record.

## Test Cases and Scenarios

### Skill Validation
1. `pnpm oat:validate-skills` passes.

### Worktree Scenarios
1. Create new worktree under local `.worktrees`.
2. Create new worktree under default sibling `../<repo>-worktrees`.
3. Create new worktree under global path via config/env override.
4. Reuse existing branch/worktree path.
5. `--existing` mode from a pre-created worktree.

### Baseline Gate Scenarios
1. All checks pass -> report ready.
2. `pnpm test` fails -> prompt for abort/proceed.
3. Proceed after failing baseline -> note appended to `implementation.md`.

### Config Scenarios
1. Missing `.oat/config.json` -> use existing roots/fallback.
2. Relative `worktrees.root` resolves correctly from repo root.
3. Env var override wins over `.oat/config.json`.

## Acceptance Criteria
1. User can invoke one skill to create/bootstrap worktree with consistent setup.
2. Skill enforces baseline verification and makes attribution explicit.
3. New settings use `.oat/config.json` instead of adding another pointer file.
4. Existing OAT pointer/sync contracts remain backward compatible.
5. Backlog and decision record clearly document phased config consolidation.

## Assumptions and Defaults
1. Default sibling layout is `../<repo>-worktrees`.
2. Full tests are required for baseline confidence but can be user-overridden with explicit acknowledgment.
3. `.oat/config.json` introduction is phase A only; larger migrations remain planned follow-up work.
