---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-17
oat_phase: plan
oat_phase_status: complete
oat_plan_hil_phases: ["p04"]
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: .oat/repo/reference/external-plans/2026-02-17-oat-autonomous-worktree-orchestration.md
oat_import_provider: codex
oat_generated: false
---

# Implementation Plan: Autonomous Worktree + Subagent Orchestration

> Execute this plan using the `oat-project-implement` skill, task-by-task with phase checkpoints and review gates.

**Goal:** Add autonomous, OAT-oriented subagent orchestration for large multi-phase projects that preserves existing human-in-the-loop (HiL) checkpoints from project configuration/frontmatter.

**Architecture:** Three new skill contracts (`oat-worktree-bootstrap-auto`, `oat-subagent-orchestrate`, execution-mode selector) that extend existing worktree foundations with parallel fan-out/fan-in, autonomous review gates, and deterministic merge-back — all governed by project HiL checkpoint configuration.

**Tech Stack:** TypeScript ESM, pnpm workspaces, Turborepo, OAT skill/artifact system, git worktrees

**Commit Convention:** `feat({scope}): {description}` - e.g., `feat(p01-t01): draft autonomous worktree bootstrap skill contract`

## Planning Checklist

- [x] Confirmed HiL checkpoints with user
- [x] Set `oat_plan_hil_phases` in frontmatter

---

## Phase 1: Contract Design

### Task p01-t01: Draft autonomous worktree bootstrap skill contract

**Files:**
- Create: `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md`

**Step 1: Define acceptance criteria (RED)**

Define the contract acceptance criteria before writing:
- Skill is agent-invocable (non-interactive, no `AskUserQuestion`).
- Resolves worktree root via existing precedence (`--path`, env, `.oat/config.json`, discovered roots, fallback).
- Creates/reuses worktree and target branch deterministically.
- Runs baseline checks (`worktree:init`, `status`, tests, clean git status) with policy flags (strict / allow-failing-baseline).
- Logs baseline failure context to `implementation.md` when available; console-only otherwise.
- Status output is structured and machine-parseable.

Run: `test -f .agents/skills/oat-worktree-bootstrap-auto/SKILL.md && echo "File exists"`
Expected: File does not exist yet (RED)

**Step 2: Write contract (GREEN)**

Write `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md` covering:
- Purpose and intent (autonomous companion to `oat-worktree-bootstrap`)
- Input parameters (path, branch, baseline-policy)
- Resolution precedence for worktree root
- Baseline check behavior and policy flags
- Structured output format
- Error handling and fallback logging
- Separation from manual-safe `oat-worktree-bootstrap`

Run: Review contract covers all acceptance criteria
Expected: All criteria addressed

**Step 3: Refactor**

Ensure contract language is consistent with existing OAT skill conventions. Cross-reference `oat-worktree-bootstrap` to avoid overlap.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors (markdown-only change)

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap-auto/SKILL.md
git commit -m "feat(p01-t01): draft autonomous worktree bootstrap skill contract"
```

---

### Task p01-t02: Draft subagent orchestration skill contract

**Files:**
- Create: `.agents/skills/oat-subagent-orchestrate/SKILL.md`

**Step 1: Define acceptance criteria (RED)**

- Reads project plan and identifies parallelizable units (phase/task-level).
- Creates per-unit worktree/branch strategy.
- Dispatches subagents with scoped objectives and file boundaries.
- Runs autonomous review gate per unit before merge-back.
- Implements fix-iteration loop on review failure (configurable retry limit).
- Captures reviewer verdict + rationale in project artifacts.
- Performs fan-in reconciliation: merge/cherry-pick unit branches, run integration verification, classify conflicts.
- Updates `implementation.md` with orchestration run summary.
- Respects HiL checkpoints — fans out/in only between configured checkpoints.

Run: `test -f .agents/skills/oat-subagent-orchestrate/SKILL.md && echo "File exists"`
Expected: File does not exist yet (RED)

**Step 2: Write contract (GREEN)**

Write `.agents/skills/oat-subagent-orchestrate/SKILL.md` covering:
- Purpose and intent
- Orchestration lifecycle (plan read → parallelize → dispatch → review → merge → report)
- Parallelization eligibility rules
- Per-unit worktree/branch naming strategy
- Subagent dispatch contract (scoped objectives, file boundaries)
- Autonomous review gate contract (pass/fail criteria, retry policy)
- Fan-in reconciliation (merge strategy, conflict classification, deterministic ordering)
- HiL checkpoint pause/resume behavior
- Failure handling (unit failure isolation, escalation)
- Artifact updates (`implementation.md` orchestration sections)

Run: Review contract covers all acceptance criteria
Expected: All criteria addressed

**Step 3: Refactor**

Cross-reference with `oat-worktree-bootstrap-auto` contract for consistent terminology.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/SKILL.md
git commit -m "feat(p01-t02): draft subagent orchestration skill contract"
```

---

### Task p01-t03: Define execution-mode selector contract

**Files:**
- Create: `.agents/skills/oat-execution-mode-select/SKILL.md`

**Step 1: Define acceptance criteria (RED)**

- Integration point: end of planning flows, before first implement step.
- Prompts user with execution mode choices: `single-thread` (existing) vs `subagent-driven` (orchestrated).
- Persists choice in project state/frontmatter (`oat_execution_mode`).
- Routes next step based on mode: `single-thread` → `oat-project-implement`, `subagent-driven` → `oat-subagent-orchestrate`.
- Allows explicit override per run; persisted mode is default.

Run: `test -f .agents/skills/oat-execution-mode-select/SKILL.md && echo "File exists"`
Expected: File does not exist yet (RED)

**Step 2: Write contract (GREEN)**

Write the skill contract covering:
- Purpose and integration point in OAT lifecycle
- Mode options and their routing targets
- State persistence format (`oat_execution_mode` in `state.md` frontmatter)
- Override behavior
- Default fallback (`single-thread` for backward compatibility)

Run: Review contract covers all acceptance criteria
Expected: All criteria addressed

**Step 3: Refactor**

Ensure consistent naming with other OAT skill contracts.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-execution-mode-select/SKILL.md
git commit -m "feat(p01-t03): define execution-mode selector skill contract"
```

---

### Task p01-t04: Define orchestration policy flags and HiL mapping

**Files:**
- Modify: `.agents/skills/oat-subagent-orchestrate/SKILL.md` (add policy section)
- Modify: `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md` (add policy flags section)

**Step 1: Define acceptance criteria (RED)**

- Baseline strictness policy: `strict` (fail fast) vs `allow-failing-baseline` (continue with warning).
- Merge strategy policy: `merge` (default) vs `cherry-pick` (conflict isolation fallback).
- Retry policy: configurable retry limit for review-gate fix loops.
- HiL checkpoint mapping: existing `oat_plan_hil_phases` frontmatter drives orchestration pause/resume.
- Policy defaults documented for all flags.

Run: Review existing skill contracts for policy coverage
Expected: Policy sections incomplete or missing (RED)

**Step 2: Add policy definitions (GREEN)**

Update both skill contracts with:
- Policy flags table (name, type, default, description)
- HiL checkpoint mapping rules
- Interaction between policies (e.g., strict baseline + merge strategy)

Run: Review both contracts for complete policy coverage
Expected: All policy flags defined with defaults

**Step 3: Refactor**

Consolidate any duplicated policy documentation between the two contracts.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/SKILL.md .agents/skills/oat-worktree-bootstrap-auto/SKILL.md
git commit -m "feat(p01-t04): define orchestration policy flags and HiL mapping"
```

---

## Phase 2: Core Flow

### Task p02-t01: Implement autonomous worktree bootstrap logic

**Files:**
- Create: `.agents/skills/oat-worktree-bootstrap-auto/scripts/bootstrap.sh` (or `.ts`)
- Create: `.agents/skills/oat-worktree-bootstrap-auto/scripts/baseline-check.sh`
- TODO: determine test file path and testing approach for shell/skill scripts

**Step 1: Write test (RED)**

TODO: Define test strategy for autonomous worktree bootstrap. Options:
- Shell-based integration test exercising bootstrap in a temp git repo
- TypeScript unit test if implemented as `.ts`

Expected: Test fails (RED) — bootstrap logic not yet implemented

**Step 2: Implement (GREEN)**

Implement:
- Worktree root resolution (existing precedence chain)
- Deterministic worktree creation/reuse
- Baseline checks with policy flag support
- Structured status output (JSON or key-value)
- Failure logging to `implementation.md` or console fallback

Run: Execute bootstrap test
Expected: Test passes (GREEN)

**Step 3: Refactor**

Extract shared utilities if bootstrap shares logic with `oat-worktree-bootstrap`.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap-auto/
git commit -m "feat(p02-t01): implement autonomous worktree bootstrap logic"
```

---

### Task p02-t02: Implement fan-out subagent dispatch and result collection

**Files:**
- Create: `.agents/skills/oat-subagent-orchestrate/scripts/dispatch.sh` (or `.ts`)
- TODO: determine test file path

**Step 1: Write test (RED)**

TODO: Define test strategy for fan-out dispatch. Cover:
- Parallel unit identification from plan
- Per-unit worktree/branch creation
- Subagent dispatch with scoped objectives
- Result collection (success/failure/commit refs)

Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Implement:
- Plan parser: identify parallelizable units from plan structure
- Per-unit worktree/branch naming: `{project}-{task-id}` convention
- Subagent dispatch mechanism (Task tool invocation with scoped prompts)
- Result aggregation: collect completion status, commit refs, test outcomes, changed files

Run: Execute dispatch test
Expected: Test passes (GREEN)

**Step 3: Refactor**

Separate plan parsing from dispatch logic for testability.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/scripts/
git commit -m "feat(p02-t02): implement fan-out subagent dispatch and result collection"
```

---

### Task p02-t03: Implement autonomous review gate and fix-loop retry

**Files:**
- Create: `.agents/skills/oat-subagent-orchestrate/scripts/review-gate.sh` (or `.ts`)
- TODO: determine test file path

**Step 1: Write test (RED)**

TODO: Define test strategy for review gate. Cover:
- Review pass scenario → unit eligible for merge
- Review fail scenario → fix loop triggered
- Fix loop retry exhausted → unit marked failed/skipped
- Review verdict and rationale captured in artifacts

Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Implement:
- Review gate invocation per unit branch (implementer output → code/spec review)
- Pass/fail determination: tests passing + contract checks + no Critical/Important findings
- Fix iteration loop: re-run implementation fixes, then re-review, up to retry limit
- Verdict capture: reviewer role, verdict, key findings, retry count → artifact record
- Policy-driven disposition on exhausted retries (mark failed/skipped)

Run: Execute review gate test
Expected: Test passes (GREEN)

**Step 3: Refactor**

Ensure review gate aligns with existing `oat-project-review-provide` semantics.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/scripts/
git commit -m "feat(p02-t03): implement autonomous review gate and fix-loop retry"
```

---

### Task p02-t04: Implement fan-in merge/reconcile logic

**Files:**
- Create: `.agents/skills/oat-subagent-orchestrate/scripts/reconcile.sh` (or `.ts`)
- TODO: determine test file path

**Step 1: Write test (RED)**

TODO: Define test strategy for merge/reconcile. Cover:
- Clean merge of multiple unit branches in deterministic order
- Cherry-pick fallback on merge conflict
- Integration verification after merge
- Conflict classification and reporting

Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Implement:
- Deterministic merge ordering (by task ID)
- Default merge strategy with cherry-pick fallback
- Integration verification: run tests/lint/type-check after merge
- Conflict detection and classification (file-level, semantic)
- Escalation output for manual resolution

Run: Execute reconcile test
Expected: Test passes (GREEN)

**Step 3: Refactor**

Extract merge utilities for reuse across orchestration scenarios.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/scripts/
git commit -m "feat(p02-t04): implement fan-in merge/reconcile logic"
```

---

## Phase 3: OAT Integration

### Task p03-t01: Integrate orchestration logging in implementation.md

**Files:**
- Modify: `.agents/skills/oat-subagent-orchestrate/SKILL.md` (logging section)
- Modify: `.agents/skills/oat-subagent-orchestrate/scripts/dispatch.sh` (or `.ts`)
- Modify: `.oat/templates/implementation.md` (add orchestration sections template)

**Step 1: Define acceptance criteria (RED)**

- `implementation.md` receives structured orchestration sections:
  1. Run metadata (timestamp, branch/worktree map, policy mode)
  2. Per-unit outcomes (success/failure, commit refs, tests)
  3. Review interaction records (reviewer role, verdict, key findings, retry count)
  4. Merge/reconcile outcomes
  5. Outstanding conflicts or manual follow-ups
- Template updated with optional orchestration section

Run: Check `implementation.md` template for orchestration sections
Expected: Missing (RED)

**Step 2: Implement logging integration (GREEN)**

- Add orchestration section template to `implementation.md` template
- Update dispatch/reconcile scripts to append structured sections
- Ensure logging is append-only (never overwrites existing content)

Run: Verify template and logging produce valid markdown
Expected: Sections present and well-formed

**Step 3: Refactor**

Ensure orchestration log entries are parseable by downstream tools.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/ .oat/templates/implementation.md
git commit -m "feat(p03-t01): integrate orchestration logging in implementation.md"
```

---

### Task p03-t02: Integrate execution-mode persistence in project state

**Files:**
- Modify: `.oat/templates/state.md` (add `oat_execution_mode` frontmatter)
- Create/Modify: `.agents/skills/oat-execution-mode-select/scripts/` (selector implementation)

**Step 1: Define acceptance criteria (RED)**

- `state.md` frontmatter includes `oat_execution_mode: single-thread|subagent-driven`
- Default is `single-thread` when unset
- Selector skill updates frontmatter on user choice
- Downstream skills read `oat_execution_mode` to route behavior

Run: Check `state.md` template for `oat_execution_mode`
Expected: Missing (RED)

**Step 2: Implement state persistence (GREEN)**

- Add `oat_execution_mode` to `state.md` template with default `single-thread`
- Implement selector script that reads current mode and presents choice
- Write selected mode back to `state.md` frontmatter
- Optionally persist orchestration policy options alongside mode

Run: Verify mode is persisted and readable
Expected: Mode persisted correctly

**Step 3: Refactor**

Ensure frontmatter updates use consistent YAML serialization.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .oat/templates/state.md .agents/skills/oat-execution-mode-select/
git commit -m "feat(p03-t02): integrate execution-mode persistence in project state"
```

---

### Task p03-t03: Ensure compatibility with existing review skills and final gate

**Files:**
- Modify: `.agents/skills/oat-subagent-orchestrate/SKILL.md` (review compatibility notes)
- TODO: identify existing review skill files to cross-reference

**Step 1: Define acceptance criteria (RED)**

- Autonomous review gate does not bypass existing `oat-project-review-provide`/`oat-project-review-receive` semantics
- Review rows/status transitions in `plan.md` remain canonical
- Orchestration notes augment (not replace) review lifecycle
- `final` review gate in `plan.md` still applies after orchestration completes

Run: Cross-reference autonomous review gate with existing review skills
Expected: Potential gaps identified (RED)

**Step 2: Add compatibility constraints (GREEN)**

- Document how autonomous review gate relates to manual review skills
- Ensure autonomous reviews update `plan.md` review table rows
- Confirm final gate semantics are preserved post-orchestration

Run: Review compatibility documentation
Expected: No conflicts between autonomous and manual review flows

**Step 3: Refactor**

Simplify any redundant review documentation.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/
git commit -m "feat(p03-t03): ensure review skill compatibility with orchestration"
```

---

### Task p03-t04: Document usage patterns for multi-phase projects

**Files:**
- Create: `.agents/skills/oat-subagent-orchestrate/examples/` (usage examples)
- Modify: `.agents/skills/oat-subagent-orchestrate/SKILL.md` (usage section)

**Step 1: Define acceptance criteria (RED)**

- At least 2 documented usage patterns:
  1. Simple parallel: two independent phases run in parallel
  2. Mixed with HiL: parallel phases pause at configured checkpoint
- Each pattern includes: plan excerpt, expected orchestration flow, artifact output

Run: Check for usage documentation
Expected: Missing (RED)

**Step 2: Write usage documentation (GREEN)**

- Add usage patterns section to skill contract
- Create example plan excerpts showing parallel-safe markup
- Document expected orchestration flow for each pattern
- Show expected artifact output (implementation.md sections)

Run: Review documentation for completeness
Expected: Both patterns fully documented

**Step 3: Refactor**

Ensure examples are minimal and self-contained.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/
git commit -m "docs(p03-t04): document orchestration usage patterns"
```

---

## Phase 4: Validation

### Task p04-t01: Dry-run orchestration on sample multi-phase plan

**Files:**
- Create: test fixtures / sample plan for dry-run

**Step 1: Define test scenario (RED)**

Create a sample multi-phase plan with:
- 2 parallel-safe phases (no dependencies between them)
- 1 sequential phase (depends on both parallel phases)
- At least 2 tasks per phase

Run: Attempt dry-run orchestration
Expected: Orchestration not yet wired — fails (RED)

**Step 2: Execute dry-run (GREEN)**

- Run orchestrator against sample plan in dry-run mode
- Verify: unit identification, worktree creation, dispatch, result collection
- Confirm no actual code changes — dry-run only

Run: `pnpm test` (integration test covering dry-run)
Expected: Dry-run completes successfully

**Step 3: Refactor**

Clean up test fixtures.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm test`
Expected: All pass

**Step 5: Commit**

```bash
git add {test fixtures}
git commit -m "test(p04-t01): dry-run orchestration on sample multi-phase plan"
```

---

### Task p04-t02: Execute parallel-safe phases in worktrees and reconcile

**Files:**
- Uses test fixtures from p04-t01

**Step 1: Write test (RED)**

Test scenario: two parallel units succeed and merge cleanly.
- Both units produce non-conflicting file changes
- Both units pass review gate
- Merge-back produces clean integration

Run: Execute parallel integration test
Expected: Fails (RED) — not yet integrated

**Step 2: Execute and validate (GREEN)**

- Run orchestrator with actual worktree creation
- Verify both units execute in separate worktrees
- Verify both pass review gate
- Verify merge-back is clean and deterministic
- Verify `implementation.md` contains orchestration summary

Run: Integration test
Expected: Both units merge cleanly, artifacts updated

**Step 3: Refactor**

Improve test isolation and cleanup.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm test`
Expected: All pass

**Step 5: Commit**

```bash
git add {test files}
git commit -m "test(p04-t02): validate parallel worktree execution and reconciliation"
```

---

### Task p04-t03: Validate autonomous review gate blocks failed units

**Files:**
- Uses test fixtures from p04-t01

**Step 1: Write test (RED)**

Test scenarios:
1. Mixed result: one unit fails review, one succeeds — successful unit merges, failed unit excluded
2. Review gate fail + fix loop: unit fails review, fix loop retries, then excluded if still failing

Run: Execute review gate validation test
Expected: Fails (RED)

**Step 2: Execute and validate (GREEN)**

- Configure test to produce one failing unit (e.g., introduces lint error)
- Verify review gate catches failure
- Verify fix loop triggers (if applicable)
- Verify failed unit is excluded from merge
- Verify successful unit still merges
- Verify failure is reported in artifacts

Run: Integration test
Expected: Failed unit blocked, successful unit merged

**Step 3: Refactor**

Clean up test scenarios.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm test`
Expected: All pass

**Step 5: Commit**

```bash
git add {test files}
git commit -m "test(p04-t03): validate review gate blocks failed units from merge"
```

---

### Task p04-t04: Validate HiL checkpoint behavior

**Files:**
- Uses test fixtures, modified with HiL checkpoint configuration

**Step 1: Write test (RED)**

Test scenario: mid-plan HiL checkpoint
- `p02` and `p03` are parallel-safe
- `p04` is a HiL checkpoint
- Orchestrator should fan out `p02`/`p03`, reconcile, then pause at `p04`

Run: Execute HiL checkpoint test
Expected: Fails (RED)

**Step 2: Execute and validate (GREEN)**

- Configure plan with `oat_plan_hil_phases: [p04]`
- Run orchestrator
- Verify `p02` and `p03` run in parallel
- Verify orchestrator pauses before `p04`
- Verify state reflects pause at HiL checkpoint

Run: Integration test
Expected: Orchestrator pauses at checkpoint

**Step 3: Refactor**

Ensure checkpoint pause is graceful and resumable.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm test`
Expected: All pass

**Step 5: Commit**

```bash
git add {test files}
git commit -m "test(p04-t04): validate HiL checkpoint pause/resume behavior"
```

---

### Task p04-t05: Validate execution-mode selector and routing

**Files:**
- Uses existing project scaffolding

**Step 1: Write test (RED)**

Test scenario:
- User selects `subagent-driven` mode
- Mode is persisted to `state.md` frontmatter
- Subsequent execution routes to orchestrator (not `oat-project-implement`)

Run: Execute selector validation test
Expected: Fails (RED)

**Step 2: Execute and validate (GREEN)**

- Invoke execution-mode selector with `subagent-driven` choice
- Verify `state.md` contains `oat_execution_mode: subagent-driven`
- Verify next-step routing points to `oat-subagent-orchestrate`
- Reset to `single-thread` and verify routing to `oat-project-implement`

Run: Integration test
Expected: Mode persisted and routing correct

**Step 3: Refactor**

Ensure selector is idempotent.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm test`
Expected: All pass

**Step 5: Commit**

```bash
git add {test files}
git commit -m "test(p04-t05): validate execution-mode selector persistence and routing"
```

---

### Task p04-t06: (review) Fix integration-fail rollback in reconcile.sh

**Files:**
- Modify: `.agents/skills/oat-subagent-orchestrate/scripts/reconcile.sh`
- Modify: `.agents/skills/oat-subagent-orchestrate/tests/test-reconcile.sh`

**Step 1: Understand the issue**

Review finding (Critical): The rollback path after failed integration checks does not actually undo the merge commit. `git revert --no-commit HEAD` needs mainline selection for merge commits, then `git reset HEAD` + `git checkout -- .` discards the revert anyway. Result: output reports `reverted: 1` while failing unit changes remain in HEAD.
Location: `reconcile.sh:144-146`

**Step 2: Implement fix**

Replace the rollback logic with a hard reset to pre-merge SHA (save before merge attempt). Before each `git merge`, capture `PRE_MERGE_SHA=$(git rev-parse HEAD)`. On integration failure, run `git reset --hard "$PRE_MERGE_SHA"` to cleanly undo the merge.

**Step 3: Add failing-integration test**

Add a test scenario to `test-reconcile.sh` that:
- Creates a unit branch with changes that cause integration check (pnpm shim) to fail
- Runs reconcile and asserts that the merged files/commit are absent from HEAD afterward
- Asserts `reverted: 1` in output AND the tree matches pre-merge state

**Step 4: Verify**

Run: `bash .agents/skills/oat-subagent-orchestrate/tests/test-reconcile.sh`
Expected: All assertions pass including new rollback test

**Step 5: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/scripts/reconcile.sh .agents/skills/oat-subagent-orchestrate/tests/test-reconcile.sh
git commit -m "fix(p04-t06): fix integration-fail rollback to use hard reset"
```

---

### Task p04-t07: (review) Implement fix-loop retry in review-gate.sh

**Files:**
- Modify: `.agents/skills/oat-subagent-orchestrate/scripts/review-gate.sh`
- Modify: `.agents/skills/oat-subagent-orchestrate/tests/test-review-gate.sh`

**Step 1: Understand the issue**

Review finding (Important): review-gate.sh hardcodes `RETRY_COUNT=0` and only emits a hint (`dispatch_fix`) rather than executing re-invocation retries up to the retry limit.
Location: `review-gate.sh:64, 171-173`

**Step 2: Implement fix**

- Accept `--retry-count <N>` as input (current attempt number, default 0).
- When checks fail and `retry_count < retry_limit`, output `action: retry` with `next_retry_count: <N+1>` so the orchestrator re-invokes.
- When `retry_count >= retry_limit`, emit `action: dispatch_fix` (terminal failure).
- Update the structured output to include `retry_count` and `retry_limit` fields.

**Step 3: Add retry test**

Add test scenarios to `test-review-gate.sh`:
- Retry under limit: assert `action: retry` and correct `next_retry_count`
- Retry at limit: assert `action: dispatch_fix`

**Step 4: Verify**

Run: `bash .agents/skills/oat-subagent-orchestrate/tests/test-review-gate.sh`
Expected: All assertions pass including retry scenarios

**Step 5: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/scripts/review-gate.sh .agents/skills/oat-subagent-orchestrate/tests/test-review-gate.sh
git commit -m "fix(p04-t07): implement fix-loop retry logic in review gate"
```

---

### Task p04-t08: (review) Fix dispatch manifest YAML task list structure

**Files:**
- Modify: `.agents/skills/oat-subagent-orchestrate/scripts/dispatch.sh`
- Modify: `.agents/skills/oat-subagent-orchestrate/tests/test-dry-run.sh`

**Step 1: Understand the issue**

Review finding (Important): Each phase unit initializes `tasks: []` (empty inline array) but then appends list entries as if `tasks` were an open sequence. This produces invalid YAML for machine parsing.
Location: `dispatch.sh:71, 88`

**Step 2: Implement fix**

When a phase has tasks, emit `tasks:` (block sequence header) followed by `  - task_id: "pNN-tNN"` items. When a phase has no tasks (shouldn't happen but for safety), emit `tasks: []`. Remove the conflicting `tasks: []` initialization before the loop.

**Step 3: Add manifest structure test**

Add a test in `test-dry-run.sh` that validates the manifest YAML structure:
- `tasks:` header appears without `[]` when tasks are present
- Each task item is indented as a list entry under its phase

**Step 4: Verify**

Run: `bash .agents/skills/oat-subagent-orchestrate/tests/test-dry-run.sh`
Expected: All assertions pass including new structure checks

**Step 5: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/scripts/dispatch.sh .agents/skills/oat-subagent-orchestrate/tests/test-dry-run.sh
git commit -m "fix(p04-t08): fix dispatch manifest YAML task list structure"
```

---

### Task p04-t09: (review) Fix mode selector portability and anchor fallback

**Files:**
- Modify: `.agents/skills/oat-execution-mode-select/scripts/select-mode.sh`
- Modify: `.agents/skills/oat-subagent-orchestrate/tests/test-mode-selector.sh`

**Step 1: Understand the issue**

Review finding (Medium x2):
1. `sed -i ''` is BSD-only and fails on GNU/Linux.
2. Mode insertion after `^oat_workflow_origin:` silently no-ops if the anchor line is absent; script still reports `persisted: true`.

Location: `select-mode.sh:76, 79, 95`

**Step 2: Implement fix**

1. Replace `sed -i '' ...` with a portable temp-file approach: write to `"$file.tmp"`, then `mv "$file.tmp" "$file"`.
2. After insertion, verify the target line exists in the file. If anchor was missing, insert before closing `---` delimiter as fallback. Report `persisted: false (anchor missing)` if fallback was needed.

**Step 3: Add test for missing anchor**

Add a test scenario to `test-mode-selector.sh` with a state.md that lacks `oat_workflow_origin:`. Assert that mode is still persisted (via fallback) and output reflects the fallback.

**Step 4: Verify**

Run: `bash .agents/skills/oat-subagent-orchestrate/tests/test-mode-selector.sh`
Expected: All assertions pass including new portability/fallback scenarios

**Step 5: Commit**

```bash
git add .agents/skills/oat-execution-mode-select/scripts/select-mode.sh .agents/skills/oat-subagent-orchestrate/tests/test-mode-selector.sh
git commit -m "fix(p04-t09): fix mode selector portability and anchor fallback"
```

---

### Task p04-t10: (review) Add rollback and manifest parsing test coverage

**Files:**
- Modify: `.agents/skills/oat-subagent-orchestrate/tests/test-reconcile.sh`
- Modify: `.agents/skills/oat-subagent-orchestrate/tests/test-dry-run.sh`

**Step 1: Understand the issue**

Review finding (Minor): Tests miss the highest-risk failure modes — rollback integrity and manifest parseability are untested.

Note: p04-t06 adds a failing-integration rollback test and p04-t08 adds manifest structure tests. This task adds any remaining coverage gaps not addressed by those tasks.

**Step 2: Implement fix**

- In `test-reconcile.sh`: add a test that verifies file content is restored after rollback (not just commit count).
- In `test-dry-run.sh`: add assertions that validate manifest delimiter markers (`--- dispatch_manifest ---` open/close) are present and properly structured.

**Step 3: Verify**

Run: `bash .agents/skills/oat-subagent-orchestrate/tests/test-dry-run.sh && bash .agents/skills/oat-subagent-orchestrate/tests/test-reconcile.sh`
Expected: All assertions pass

**Step 4: Commit**

```bash
git add .agents/skills/oat-subagent-orchestrate/tests/test-reconcile.sh .agents/skills/oat-subagent-orchestrate/tests/test-dry-run.sh
git commit -m "test(p04-t10): add rollback integrity and manifest parsing assertions"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| final | code | received | 2026-02-17 | reviews/final-review-2026-02-17-v2.md |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**
- Phase 1: 4 tasks - Contract design for autonomous bootstrap, orchestration, execution-mode selector, and policy flags
- Phase 2: 4 tasks - Core flow implementation (bootstrap, dispatch, review gate, merge/reconcile)
- Phase 3: 4 tasks - OAT integration (logging, state persistence, review compatibility, documentation)
- Phase 4: 10 tasks - Validation (dry-run, parallel execution, review gate, HiL checkpoints, mode selector) + review fixes (rollback, retry, manifest, portability, test coverage)

**Total: 22 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (optional in import mode)
- Spec: `spec.md` (optional in import mode)
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md`
