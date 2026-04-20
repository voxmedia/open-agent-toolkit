---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-17
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_parallel_groups: []
oat_plan_source: spec-driven
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: true
---

# Implementation Plan: Phase-Subagent Evolution of oat-project-implement

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Evolve `oat-project-implement` to dispatch each plan phase inside a fresh subagent (`oat-phase-implementer`), absorb `oat-project-subagent-implement` capabilities, and remove the deprecated skill. Parallelism is expressed as plan metadata, not a skill choice.

**Architecture:** Main orchestrator dispatches `oat-phase-implementer` per phase and `oat-reviewer` per review with a bounded fix loop between them. Parallel phases run in worktrees and merge back in plan order. Two-tier capability detection: native subagent dispatch (Tier 1) or inline fallback reading agent files (Tier 2).

**Tech Stack:** Markdown agent/skill definitions, OAT CLI (`pnpm run cli -- ...`), TypeScript + Commander (CLI command), Vitest (unit tests), shell scripts (integration tests), git worktrees, pnpm workspaces + Turborepo.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(agents): add oat-phase-implementer agent definition`

**Source:** Executed via Superpowers `subagent-driven-development` (not `oat-project-implement`) to avoid self-modification. See discovery.md decision #10.

---

## Phase p01: Foundation

Establish the canonical `oat-phase-implementer` agent file, sync its provider views, and capture the pre-change baseline. This phase creates the core new primitive that all subsequent phases build on.

### Task p01-t01: Verify baseline and create oat-phase-implementer agent

**Files:**

- Read only: `.agents/skills/oat-project-implement/SKILL.md`
- Read only: `.agents/skills/oat-project-subagent-implement/SKILL.md`
- Read only: `.agents/agents/oat-reviewer.md`
- Create: `.agents/agents/oat-phase-implementer.md`

- Verify git status is clean, capture current skill versions via `grep -h '^version:'`
- Confirm no active OAT project with `oat_execution_mode: subagent-driven` in `.oat/projects/`
- Create `.agents/agents/oat-phase-implementer.md` — canonical agent with YAML frontmatter (`name`, `version: 1.0.0`, `description`, `tools: Read,Write,Edit,Bash,Grep,Glob`, `color: cyan`). Body covers Role, Why This Matters, Inputs (Phase Scope block), Mode Contract (spec-driven / quick / import), Process for `implement` mode (read artifacts once, execute tasks, self-review between tasks, phase-wide review, return structured report) and `fix` mode (read review artifact, apply listed findings, return fix summary), Escalation Protocol, Critical Rules, and Success Criteria.
- Commit: `feat(agents): add oat-phase-implementer agent definition`

### Task p01-t02: Sync provider views

**Files:**

- Create (via sync): `.codex/agents/oat-phase-implementer.toml`

- Run `oat sync --scope all` (or `pnpm run cli -- sync --scope all`)
- Verify `.codex/agents/oat-phase-implementer.toml` was generated
- Commit: `chore(agents): sync provider views for oat-phase-implementer`

### Task p01-t03: Scaffold OAT project

**Files:**

- Create: `.oat/projects/shared/subagent-implement-refactor/` (scaffolded lifecycle files)

- Use `oat-project-new` or manual scaffold to create the discovery, spec, design, plan, implementation, and state files for tracking this project itself
- Commit: `chore(oat): scaffold subagent-implement-refactor project`

---

## Phase p02: Validator CLI

Build the `oat project validate-plan` CLI command and its test infrastructure. The skill delegates all parallelism metadata validation to this command, so it must be built before the skill edits.

### Task p02-t01: Add test fixtures for phase-subagent flow

**Files:**

- Create: `.agents/skills/oat-project-implement/tests/fixtures/sequential-project/plan.md`
- Create: `.agents/skills/oat-project-implement/tests/fixtures/parallel-project/plan.md`
- Create: `.agents/skills/oat-project-implement/tests/fixtures/invalid-unknown-phase/plan.md`
- Create: `.agents/skills/oat-project-implement/tests/fixtures/invalid-singleton-group/plan.md`

- Create four fixture directories, each containing a `plan.md` (project-directory shape, not flat file) so the `--project-path` CLI flag can be used against them
- sequential-project: `oat_plan_parallel_groups: []`, 3 phases, 2 tasks each
- parallel-project: `oat_plan_parallel_groups: [["p02","p03"]]`, disjoint file boundaries
- invalid-unknown-phase: `oat_plan_parallel_groups: [["p02","p99"]]`, no p99 in plan
- invalid-singleton-group: `oat_plan_parallel_groups: [["p02"]]`
- Commit: `test(oat-project-implement): add plan fixtures for validator`

### Task p02-t02: Create oat project validate-plan CLI command

**Files:**

- Create: `packages/cli/src/commands/project/validate-plan/validate-plan.ts`
- Create: `packages/cli/src/commands/project/validate-plan/index.ts`
- Modify: `packages/cli/src/commands/project/index.ts`

- Create pure validator logic in `validate-plan.ts`: `validateParallelGroups(groups, phaseIds)` and `extractPhaseIdsFromPlan(planContent)` — no I/O, no new YAML dependencies
- Create CLI wrapper in `index.ts`: Commander command `validate-plan` with `--project-path` option; reads `plan.md`, parses frontmatter using the existing CLI/control-plane utility, delegates to the pure validator, exits 0 on valid / non-zero with actionable errors on invalid
- Register the command in `packages/cli/src/commands/project/index.ts`
- Verify: `pnpm --filter @open-agent-toolkit/cli type-check` and build pass; manual smoke test against sequential and invalid-unknown-phase fixtures
- Commit: `feat(cli): add oat project validate-plan command`

### Task p02-t03: Unit tests for the plan validator

**Files:**

- Create: `packages/cli/src/commands/project/validate-plan/validate-plan.test.ts`

- Write Vitest tests for `validateParallelGroups`: undefined groups, empty array, valid single group, valid multiple groups, non-array top-level, unknown phase ID, singleton group, duplicate phase across groups, non-string phase ID inside group, non-array group
- Write tests for `extractPhaseIdsFromPlan`: extracts unique phase IDs in sorted order, empty for no-task plan
- Run: `pnpm --filter @open-agent-toolkit/cli test -- validate-plan`; all tests pass
- Commit: `test(cli): unit tests for validateParallelGroups`

---

## Phase p03: Skill Evolution

Evolve `oat-project-implement/SKILL.md` in targeted commits, one capability per commit. This is the core of the project — nine sequential tasks transforming the skill from inline task execution to phase-subagent orchestration.

### Task p03-t01: Capability detection and tier selection

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

- Replace `### Step 0.5: Execution Mode Redirect Guard` with `### Step 0.5: Capability Detection and Tier Selection`
- Two-tier detection (no fresh-session tier — skill runs autonomously): Tier 1 if subagents available; Tier 2 if not. Codex `authorization required` → single user prompt at skill start; approve → Tier 1, decline → Tier 2.
- Legacy state migration: silently ignore `oat_execution_mode: subagent-driven`; remove on next bookkeeping write.
- Report tier selection to user as `[0/N] Checking subagent availability…`
- Commit: `feat(oat-project-implement): add capability detection and tier selection`

### Task p03-t02: Phase dispatch loop

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

- Replace per-task inline execution body with phase-level dispatch
- Tier 1: build Phase Scope block (project, phase, mode: implement, artifact_paths, commit_convention, workflow_mode), dispatch `oat-phase-implementer`, receive structured summary
- Tier 2: read `.agents/agents/oat-phase-implementer.md`, execute process inline, produce equivalent summary
- Implementer status handling: DONE → review; DONE_WITH_CONCERNS → correctness fix or note; NEEDS_CONTEXT → re-dispatch; BLOCKED → STOP
- Transient failure: retry once; second failure → treat as failed
- Commit: `feat(oat-project-implement): replace inline task loop with phase-subagent dispatch`

### Task p03-t03: Reviewer dispatch and bounded fix loop

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

- Add `### Per-Phase Review` section: dispatch `oat-reviewer` via same tier with Review Scope; parse verdict as pass (zero Critical/Important) or fail
- Add `### Bounded Fix Loop` section: read `oat_orchestration_retry_limit` (default 2, range 0–5), re-dispatch implementer in fix mode, re-review, repeat until pass or exhausted
- Terminal `failed` handling: sequential → STOP; parallel group → mark excluded, continue group
- Commit: `feat(oat-project-implement): add phase reviewer dispatch and fix loop`

### Task p03-t04: Plan metadata validation

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

- Add `### Step 2.1: Validate Parallelism Metadata` — delegates entirely to `oat project validate-plan --project-path "${PROJECT_PATH}"`; reacts to exit code: 0 → continue; non-zero → STOP with validator's stderr output
- Add `### Step 2.2: Build Execution Schedule` — singleton entries for sequential phases, multi-phase entries for groups, in plan order
- Commit: `feat(oat-project-implement): add parallelism metadata validation + schedule build`

### Task p03-t05: Parallel group orchestration

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

- Add `### Parallel Group Execution` section:
  - Tier 2 degradation: entire group runs sequential inline, no worktrees
  - Tier 1: bootstrap worktrees via `oat-worktree-bootstrap-auto`; any failure degrades whole group
  - Concurrent dispatch: per-worktree per-phase loop (implementer → reviewer → fix-loop)
  - Fan-in in plan order: merge → cherry-pick fallback → inline conflict-resolution subagent via Task tool (subagent returns RESOLVED / UNRESOLVABLE / VERIFICATION_FAILED)
  - Post-merge integration verification; worktree cleanup on pass, preserve on excluded
- Commit: `feat(oat-project-implement): add parallel group orchestration`

### Task p03-t06: Per-phase artifact updates

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

- Add `### Artifact Updates After Each Phase (or Group)` section:
  - `implementation.md`: append phase outcome row inside orchestration-runs markers (phase-level table, not task-level)
  - `plan.md` review table: pass / fixes / excluded lifecycle per phase
  - `state.md`: update `oat_current_task`, `oat_last_commit`, `oat_project_state_updated`; remove `oat_execution_mode` if present
  - Bookkeeping commit: `chore(oat): bookkeeping after pNN {pass|fail}`; HiLL checkpoint check follows
- Commit: `feat(oat-project-implement): unify per-phase artifact updates`

### Task p03-t07: Resumption detection

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

- Add `### Step 1.5: Resumption Detection` section:
  - Read implementation.md orchestration-run entries, cross-check against plan phase list
  - Cross-check `oat_current_task` in state.md and git log bookkeeping commits
  - In-flight detection: implementer committed but no review verdict → re-dispatch reviewer
  - Un-cleaned worktrees: prompt user to resume or clean up
  - First invocation (no prior entries): skip
- Commit: `feat(oat-project-implement): add resumption detection`

### Task p03-t08: Version bump to 2.0.0

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md` (frontmatter only)

- Bump `version: 1.3.0` → `version: 2.0.0` (major bump — breaking change to execution model)
- Update `description` to reflect phase-subagent dispatch
- Add `argument-hint: '[--retry-limit <N>] [--dry-run]'`
- Ensure `Task` is in `allowed-tools`
- Commit: `feat(oat-project-implement): bump version to 2.0.0`

### Task p03-t09: Dry-run mode

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

- Add `### Dry-Run Mode` section near top of Process:
  - When `--dry-run`: run Steps 0–2 fully (resolve, capability check, read plan, validate, schedule), skip all dispatches/merges/writes
  - Output execution plan: tier, schedule entries, worktrees that would be created, "No commits, no artifact writes."
  - Exit without modifying any files
- Commit: `feat(oat-project-implement): add --dry-run mode`

---

## Phase p04: Templates and Sibling Skills

Update the plan and implementation templates to carry the new fields and simplified structure. Update `oat-project-plan` to support parallel-group authoring.

### Task p04-t01: plan.md template — add oat_plan_parallel_groups

**Files:**

- Modify: `.oat/templates/plan.md`

- Add `oat_plan_parallel_groups: []` frontmatter field after `oat_plan_hill_phases`, with inline comment
- Add `## Parallelism` documentation section after Planning Checklist explaining the semantics and when to declare groups
- Update planning checklist to include "Evaluated phases for parallelism opportunities" and "Set `oat_plan_parallel_groups` in frontmatter"
- Update plan header to reference `oat-project-implement` as the single execution skill
- Commit: `feat(templates): add oat_plan_parallel_groups to plan template`

### Task p04-t02: implementation.md template — simplified orchestration-runs block

**Files:**

- Modify: `.oat/templates/implementation.md`

- Replace orchestration-runs block interior with phase-level format: Run header (number, timestamp, branch, tier, policy, phase counts), Phase Outcomes table (Phase / Implementer / Review / Fix Iterations / Disposition), Parallel Groups list, Outstanding Items
- Preserve `<!-- orchestration-runs-start -->` and `<!-- orchestration-runs-end -->` markers exactly
- Add descriptive comment block above the markers explaining the format
- Commit: `feat(templates): simplify orchestration-runs block`

### Task p04-t03: state.md template — remove oat_execution_mode

**Files:**

- Modify: `.oat/templates/state.md`

- Remove `oat_execution_mode` field and any documentation around it
- Optionally add commented-out `oat_orchestration_retry_limit` hint
- Commit: `chore(templates): remove oat_execution_mode from state template`

### Task p04-t04: oat-project-plan — parallel-group authoring step

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`

- Add optional `### Step N: Propose Parallel Groups` near end-of-plan: evaluate adjacent phases for disjoint file boundaries; propose to user if found; update frontmatter on confirm; skip silently if no obvious candidates
- Never silently infer parallelism — always ask user
- Update end-of-plan handoff to reference only `oat-project-implement`
- Bump skill version (minor bump)
- Commit: `feat(oat-project-plan): add optional parallel-group authoring step`

---

## Phase p05: Runtime Cleanup

Remove the `oat-project-subagent-implement` redirect from the control-plane router, remove the skill from the CLI bundle and manifest, and deprecate the `set-mode` command.

### Task p05-t01: Remove control-plane router redirect

**Files:**

- Modify: `packages/control-plane/src/recommender/router.ts`
- Modify: `packages/control-plane/src/recommender/router.test.ts`

- Remove the conditional that redirects `oat-project-implement` → `oat-project-subagent-implement` when `executionMode === 'subagent-driven'`; router returns `skill` unconditionally
- Update test assertion to expect `oat-project-implement` regardless of `executionMode`; delete any test whose sole purpose was verifying the redirect
- Verify: `pnpm --filter @open-agent-toolkit/control-plane test -- router` passes
- Commit: `refactor(control-plane): remove oat-project-subagent-implement redirect`

### Task p05-t02: Remove from CLI bundle assets

**Files:**

- Modify: `packages/cli/scripts/bundle-assets.sh`

- Delete the `oat-project-subagent-implement` line from the bundled-skills list
- Verify: `bash packages/cli/scripts/bundle-assets.sh` exits 0
- Commit: `chore(cli): remove oat-project-subagent-implement from bundled assets`

### Task p05-t03: Remove from CLI skill manifest

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

- Remove the `oat-project-subagent-implement` manifest entry
- Update the test to not assert the removed skill's presence
- Verify: `pnpm --filter @open-agent-toolkit/cli test -- init` passes
- Commit: `chore(cli): remove oat-project-subagent-implement from skill manifest`

### Task p05-t04: Deprecate set-mode command

**Files:**

- Modify: `packages/cli/src/commands/project/set-mode/index.ts`
- Modify (if present): set-mode test file

- Replace action body with deprecation notice (stderr) + `process.exit(0)`; remove all state.md modification logic
- Update or remove related tests to match deprecation contract
- Smoke test: `pnpm run cli -- project set-mode subagent-driven` prints notice, exits 0, no state.md changes
- Commit: `refactor(cli): deprecate 'oat project set-mode' to a no-op`

---

## Phase p06: Removal and Docs

Delete `oat-project-subagent-implement` entirely and remove all remaining references from markdown files.

### Task p06-t01: Delete oat-project-subagent-implement skill

**Files:**

- Delete: `.agents/skills/oat-project-subagent-implement/` (entire directory)
- Update (via sync): `.codex/` provider views

- `rm -rf .agents/skills/oat-project-subagent-implement/`
- Run `oat sync --scope all` to propagate deletion to provider views
- Verify: `find .agents .codex .claude .cursor -name "oat-project-subagent-implement*"` returns no results (or only docs references addressed by next task)
- Commit: `chore(skills): remove deprecated oat-project-subagent-implement`

### Task p06-t02: Remove lingering references from docs

**Files:**

- Modify: `AGENTS.md`
- Modify: any file under `apps/oat-docs/docs/` referencing the deleted skill

- `grep -r "oat-project-subagent-implement" --include="*.md" .` (exclude `.superpowers/` and `.oat/projects/`)
- Remove or replace each reference with `oat-project-implement`
- Verify: `grep` returns no results outside excluded paths
- Commit: `docs: remove oat-project-subagent-implement references`

---

## Phase p07: Shell Tests and Release

Add the integration shell test, bump all five public packages in lockstep, run release:validate, run the full test suite, fix any review findings, and prepare for the PR.

### Task p07-t01: Shell test for plan validation

**Files:**

- Create: `.agents/skills/oat-project-implement/tests/test-plan-validation.sh`

- Create shell test that invokes `oat project validate-plan` against all four fixture directories and asserts exit codes: sequential and parallel → 0; invalid-unknown-phase and invalid-singleton-group → non-zero
- `chmod +x` the script
- Run: `bash .agents/skills/oat-project-implement/tests/test-plan-validation.sh`; 4/4 assertions pass
- Commit: `test(oat-project-implement): add plan validation test script`

### Task p07-t02: Bump public packages lockstep

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

- All five public packages must bump to the same next version (patch bump per OAT convention for feature work)
- Agents/skills/templates changes count as shipped CLI functionality per AGENTS.md
- Verify all five show the same version: `grep '"version"' packages/*/package.json`
- Commit: `chore(release): bump public packages for phase-subagent evolution`

### Task p07-t03: Bump touched skill versions and sync bundled versions

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md` (already bumped to 2.0.0 in p03)
- Modify: `.agents/skills/oat-project-plan/SKILL.md` (minor bump)
- Modify: any other touched skill frontmatter versions
- Modify: `packages/cli/src/commands/init/tools/shared/public-package-versions.json` (if present)

- Verify all touched skills have bumped versions: `git diff main -- .agents/skills/ | grep '^+version:'`
- Sync bundled version JSON if present
- Commit: `chore(skills): bump versions for skills touched by doc cleanup` / `chore(release): sync bundled public-package-versions.json`

### Task p07-t04: Release validation and full test suite

**Files:** (fixes only if validation fails)

- Run `pnpm release:validate`; fix any flagged issues (skill version not bumped, package mismatch, sync drift)
- Run `pnpm build` → no errors
- Run `pnpm lint` → no errors
- Run `pnpm type-check` → no errors
- Run `pnpm test` → all tests pass
- Run `bash .agents/skills/oat-project-implement/tests/test-plan-validation.sh` → 4/4 pass
- Commit any fixes: `fix(cli): ...` as appropriate

### Task p07-t05: Final review and PR preparation

**Files:** (review and reconciliation only)

- Review complete diff: `git diff main --stat`
- Verify no dangling `oat-project-subagent-implement` references outside excluded paths
- Verify all five public packages at same version
- Verify `pnpm release:validate` passes (final confirmation)
- Address any code-review findings via fix commits
- Revert any unintended changes
- PR is ready when: release:validate passes, all tests pass, no dangling references

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                                                                    |
| ------ | -------- | ------- | ---------- | --------------------------------------------------------------------------- |
| p01    | code     | passed  | 2026-04-17 | `.oat/repo/reviews/ad-hoc-review-2026-04-17-subagent-implement-analysis.md` |
| p02    | code     | passed  | 2026-04-17 | _(inline via Superpowers review gate)_                                      |
| p03    | code     | passed  | 2026-04-17 | _(inline via Superpowers review gate)_                                      |
| p04    | code     | passed  | 2026-04-17 | _(inline via Superpowers review gate)_                                      |
| p05    | code     | passed  | 2026-04-17 | _(inline via Superpowers review gate)_                                      |
| p06    | code     | passed  | 2026-04-17 | _(inline via Superpowers review gate)_                                      |
| p07    | code     | passed  | 2026-04-17 | _(inline via Superpowers review gate)_                                      |
| p-rev1 | code     | pending | 2026-04-20 | _(inline revision feedback — PR-scope fixes pending)_                       |
| final  | code     | passed  | 2026-04-19 | `reviews/archived/final-review-2026-04-19.md`                               |
| spec   | artifact | passed  | 2026-04-17 | _(backfill — artifact created post-implementation)_                         |
| design | artifact | passed  | 2026-04-17 | _(backfill — artifact created post-implementation)_                         |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Phase p-rev1: Revision 1

Source: inline feedback (2026-04-20)

### Task prev1-t01: (revision) Make Codex review dispatch explicitly no-fork and artifact-driven

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/assets/docs/workflows/projects/implementation-execution.md`

**Step 1:** Update Codex Tier 1 review-dispatch guidance so `oat-reviewer` receives a self-contained Review Scope packet and does **not** rely on forked full-thread context. State explicitly that Codex pinned-role dispatch must use fresh context / `fork_context: false`, because the reviewer is expected to reconstruct context from git state and OAT artifacts.

**Step 2: Verify**
Run: `rg -n "fork_context|fresh context|Review Scope|artifact-driven|Codex" .agents/skills/oat-project-implement/SKILL.md packages/cli/assets/docs/workflows/projects/implementation-execution.md`
Expected: Codex guidance explicitly prefers self-contained review packets and does not imply full-thread forked context for `oat-reviewer`.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md packages/cli/assets/docs/workflows/projects/implementation-execution.md
git commit -m "fix(oat-project-implement): make codex review dispatch no-fork"
```

### Task prev1-t02: (revision) Add Codex reviewer timeout fallback guidance

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/assets/docs/workflows/projects/implementation-execution.md`

**Step 1:** Add concrete reviewer return-path handling for Codex Tier 1 dispatch: wait once, poll once more if needed, then send a concise "return now with current findings" instruction before falling back inline if the reviewer still does not conclude cleanly.

**Step 2: Verify**
Run: `rg -n "wait_agent|return now|current findings|fallback inline|timeout" .agents/skills/oat-project-implement/SKILL.md packages/cli/assets/docs/workflows/projects/implementation-execution.md`
Expected: The reviewer dispatch flow documents a bounded timeout / nudge / fallback sequence for Codex-hosted review subagents.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md packages/cli/assets/docs/workflows/projects/implementation-execution.md
git commit -m "fix(oat-project-implement): add codex reviewer timeout fallback"
```

### Task prev1-t03: (revision) Tighten plan verification command guidance for scoped test execution

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.oat/templates/plan.md`

**Step 1:** Update planning guidance so verification commands prefer the exact runner invocation that scopes to the intended target, rather than package-level shortcuts that may execute the full suite. Call out that task-level verification should be validated against actual tool behavior when a file- or test-scoped command is claimed.

**Step 2: Verify**
Run: `rg -n "verification command|scoped|targeted|full suite|exact runner" .agents/skills/oat-project-plan/SKILL.md .oat/templates/plan.md`
Expected: Plan-authoring guidance requires exact, behaviorally correct verification commands for scoped tests.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-plan/SKILL.md .oat/templates/plan.md
git commit -m "fix(oat-project-plan): tighten scoped verification guidance"
```

---

## Implementation Complete

**Summary:**

- Phase p01: 3 tasks — oat-phase-implementer agent creation, provider sync, project scaffold
- Phase p02: 3 tasks — plan fixtures, validate-plan CLI command + registration, unit tests
- Phase p03: 9 tasks — skill evolution (capability detection, phase dispatch, reviewer/fix-loop, metadata validation, parallel orchestration, artifact updates, resumption, version bump to 2.0.0, dry-run mode)
- Phase p04: 4 tasks — plan/implementation/state template updates, oat-project-plan parallel authoring
- Phase p05: 4 tasks — control-plane router cleanup, bundle asset removal, manifest cleanup, set-mode deprecation
- Phase p06: 2 tasks — skill deletion, doc reference cleanup
- Phase p07: 5 tasks — shell test, package lockstep bump, skill version bumps, release:validate + full suite, final review fixes
- Phase p-rev1: 3 tasks — Codex no-fork review dispatch, reviewer timeout fallback, scoped verification guidance

**Total: 33 tasks across 8 phases**

Executed via Superpowers `subagent-driven-development` to avoid self-modification of the skill under active development. See discovery.md decision #10 for rationale.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Superpowers plan (source of truth): `.superpowers/plans/2026-04-17-oat-project-implement-phase-subagent.md`
- Superpowers spec: `.superpowers/specs/2026-04-17-oat-project-implement-phase-subagent.md`
