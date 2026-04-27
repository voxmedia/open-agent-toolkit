---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-24
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04'] # phases to pause AFTER completing (empty = every phase)
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [] # sequential by default — see Parallelism section
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: skill-cli-migration

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Migrate skills that hand-parse `state.md` frontmatter with `grep`/`awk` to query `oat --json project status` instead, with an inline `npx @open-agent-toolkit/cli` fallback so skills run in environments without `oat` on `$PATH`.

**Architecture:** No new components. Each in-scope canonical skill gets a small inline shell preamble that resolves `oat` (or falls back to `npx @open-agent-toolkit/cli`), fetches JSON once, and extracts fields with `jq`. Read paths only; write paths unchanged. `state.md` remains the source of truth on disk; the JSON view is derived.

**Tech Stack:** Bash, `jq`, Node (via `npx`), existing `@open-agent-toolkit/cli` command.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `refactor(p02-t01): oat-project-progress reads state via oat --json`.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (none required for quick mode)
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Phase-level analysis:

| Phase | Writes                                                                                                                                                                 | Depends on                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| p01   | `create-oat-skill/SKILL.md` (pattern doc), a new cli test file                                                                                                         | —                                            |
| p02   | `oat-project-progress/SKILL.md`, `oat-project-pr-progress/SKILL.md`                                                                                                    | p01 (canonical preamble doc must land first) |
| p03   | `oat-project-plan/SKILL.md`, `oat-project-pr-final/SKILL.md`, `oat-project-review-provide/SKILL.md`, `oat-project-reconcile/SKILL.md`, `oat-project-complete/SKILL.md` | p01                                          |
| p04   | lockstep package `package.json` files, all touched SKILL.md `version:` fields                                                                                          | p02, p03                                     |

p02 and p03 are file-disjoint: every in-scope SKILL.md belongs to exactly one phase and no two tasks write the same file. They could in principle be declared as a parallel group `[['p02', 'p03']]`.

**Decision: keep sequential.** Each task is a small, fast SKILL.md edit; worktree setup + merge cost outweighs per-phase wall-clock savings for ≤7 skill edits. Parallelism is available as a follow-up optimization if the same pattern migration is repeated at larger scale.

---

## Phase 1: Pattern documentation and CLI contract lock

### Task p01-t01: Document the canonical inline preamble pattern

**Files:**

- Modify: `.agents/skills/create-oat-skill/SKILL.md` — add a "Reading project state" section describing the preamble.

**Step 1: Draft the canonical snippet**

Add a section that documents the pattern exactly as skills will use it:

```bash
# Resolve oat CLI with npx fallback, then fetch project state once.
# NOTE: branch on command availability rather than building a quoted command
# string — `"$OAT_CMD"` with a space would be treated as a single executable
# name and the fallback would fail with "command not found".
if command -v oat >/dev/null 2>&1; then
  STATUS_JSON=$(oat --json project status 2>/dev/null || echo '{}')
else
  STATUS_JSON=$(npx @open-agent-toolkit/cli --json project status 2>/dev/null || echo '{}')
fi

# Extract individual fields from the JSON view (state.md is the source of truth on disk).
# No `// ""` defaults: YAML `null` surfaces as the literal string `null` to match
# the prior `grep | awk` behavior.
WORKFLOW_MODE=$(echo "$STATUS_JSON" | jq -r '.project.workflowMode')
PHASE=$(echo "$STATUS_JSON" | jq -r '.project.phase')
PHASE_STATUS=$(echo "$STATUS_JSON" | jq -r '.project.phaseStatus')
```

Document the contract:

- **Null sentinel behavior:** YAML `null` in `state.md` surfaces as the literal string `null` via both the prior `grep | awk` and the new `jq -r` (no `// ""` default). When `STATUS_JSON` is `{}` because `oat` failed, `jq -r` on missing keys also emits `null`, giving a single consistent sentinel across success and error paths. Do **not** add `// ""` defaults — that would break behavior parity.
- `jq` is the canonical parser; `node -e` is an acceptable fallback if `jq` is unavailable.
- Fetch JSON once per skill invocation, then extract fields locally.
- Do **not** use this pattern to write state — state writes stay in their existing skill sections.

**Step 2: Verify**

Run: `pnpm lint`
Expected: no errors; `create-oat-skill/SKILL.md` still valid.

**Step 3: Commit**

```bash
git add .agents/skills/create-oat-skill/SKILL.md
git commit -m "docs(p01-t01): document oat --json project status preamble pattern"
```

---

### Task p01-t02: Lock the JSON contract with a CLI test

**Files:**

- Modify: `packages/cli/src/commands/project/status.test.ts` — add a test asserting the set of JSON fields that migrated skills depend on.

**Step 1: Write test (RED)**

Add a test that runs the status command against a fixture project and asserts the output JSON contains every field we're about to rely on:

```typescript
// Fields migrated skills read via jq. Any removal or rename must be a
// deliberate breaking change, not an accident.
const MIGRATED_FIELDS = [
  'project.name',
  'project.path',
  'project.phase',
  'project.phaseStatus',
  'project.workflowMode',
  'project.docsUpdated',
  'project.lastCommit',
  'project.prStatus',
  'project.prUrl',
] as const;
```

Assert each path is present (value may be `null`, key must exist) when `status: ok` is returned.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts`
Expected: new test fails (RED) only if a field is genuinely missing from output — otherwise GREEN immediately. Confirm by temporarily removing one field from `formatProjectStatusLines` / JSON payload and observing failure.

Path note: `pnpm --filter @open-agent-toolkit/cli exec` runs from `packages/cli/`, so the vitest path must be package-relative (`src/...`), not repo-root-relative (`packages/cli/src/...`).

**Step 2: Implement (GREEN)**

No source changes expected; every field is already emitted. If RED persists, extend `runProjectStatus` to emit the missing field(s) from `getProjectState`. Stop before adding new fields not currently needed.

**Step 3: Refactor**

Extract `MIGRATED_FIELDS` to a named constant in the test file so Phase 2/3 tasks can reference it from a comment when updating skills.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/status.test.ts && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: tests pass; type-check clean.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/status.test.ts
git commit -m "test(p01-t02): lock JSON contract for skill migration"
```

---

## Phase 2: Migrate pure-read skills

### Task p02-t01: Migrate `oat-project-progress` to oat --json

**Files:**

- Modify: `.agents/skills/oat-project-progress/SKILL.md`

**Step 1: Locate grep lines**

Current hand-parsing in the skill:

```bash
PHASE=$(grep "^oat_phase:" "$PROJECT_PATH/state.md" ... | awk '{print $2}')
PHASE_STATUS=$(grep "^oat_phase_status:" "$PROJECT_PATH/state.md" ... | awk '{print $2}')
WORKFLOW_MODE=$(grep "^oat_workflow_mode:" "$PROJECT_PATH/state.md" ... | awk '{print $2}')
```

**Step 2: Replace with the canonical preamble**

Insert the preamble (from p01-t01) once, before the first field is needed. Replace each `grep | awk` assignment with `jq -r '.project.<field>'` against `STATUS_JSON` (no `// ""` default — preserves null-sentinel parity). Keep variable names (`PHASE`, `PHASE_STATUS`, `WORKFLOW_MODE`) identical so downstream logic in the skill is untouched.

Leave **unrelated** grep calls (e.g., `grep` against `project-index.md` or `plan.md`) in place — out of scope.

**Step 3: Verify**

Run both probes from this worktree to confirm behavioral parity:

```bash
oat --json project status | jq -r '.project.phase, .project.phaseStatus, .project.workflowMode'
grep -E "^oat_phase:|^oat_phase_status:|^oat_workflow_mode:" .oat/projects/shared/skill-cli-migration/state.md
```

Expected: same values (order-wise: phase, phaseStatus, workflowMode).

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-progress/SKILL.md
git commit -m "refactor(p02-t01): oat-project-progress reads state via oat --json"
```

---

### Task p02-t02: Migrate `oat-project-pr-progress` to oat --json

**Files:**

- Modify: `.agents/skills/oat-project-pr-progress/SKILL.md`

**Step 1: Locate grep lines**

```bash
WORKFLOW_MODE=$(grep "^oat_workflow_mode:" "$PROJECT_PATH/state.md" ... | head -1 | awk '{print $2}')
```

**Step 2: Replace with the canonical preamble**

Insert the preamble once at the top of the shell block that needs `WORKFLOW_MODE`. Replace the grep line with `WORKFLOW_MODE=$(echo "$STATUS_JSON" | jq -r '.project.workflowMode')` (no `// ""` default).

**Step 3: Verify**

```bash
oat --json project status | jq -r '.project.workflowMode'
grep "^oat_workflow_mode:" .oat/projects/shared/skill-cli-migration/state.md | awk '{print $2}'
```

Expected: both output `quick`.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-pr-progress/SKILL.md
git commit -m "refactor(p02-t02): oat-project-pr-progress reads state via oat --json"
```

---

## Phase 3: Migrate mixed read/write skills (read path only)

### Task p03-t01: Migrate `oat-project-plan` read path

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`

**Step 1: Locate grep lines**

```bash
WORKFLOW_MODE=$(grep "^oat_workflow_mode:" ... | head -1 | awk '{print $2}')
```

This skill also **writes** `state.md` elsewhere (phase advance, plan-source metadata). **Do not touch writes.**

**Step 2: Replace read path only**

Insert preamble once at the top of the bash block that reads workflow mode. Replace the grep line. Leave every subsequent `write`/frontmatter-update section untouched.

**Step 3: Verify**

Run the same probe parity check as p02-t01 and confirm the skill's bash block still runs to completion without syntax errors by copying the block into a shell and executing it against this worktree's project.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-plan/SKILL.md
git commit -m "refactor(p03-t01): oat-project-plan reads state via oat --json (read path only)"
```

---

### Task p03-t02: Migrate `oat-project-pr-final` read path

**Files:**

- Modify: `.agents/skills/oat-project-pr-final/SKILL.md`

**Step 1: Locate grep lines**

```bash
DOCS_UPDATED=$(grep "^oat_docs_updated:" "$STATE_FILE" ... | awk '{print $2}' || true)
```

**Step 2: Replace read path only**

Preamble once; replace the grep with `jq -r '.project.docsUpdated'` (no `// ""` default — preserves null-sentinel parity). Do not touch write paths (`oat_pr_status`, `oat_pr_url`, etc. are still written via existing flow).

**Step 3: Verify**

```bash
oat --json project status | jq -r '.project.docsUpdated'
grep "^oat_docs_updated:" .oat/projects/shared/skill-cli-migration/state.md | awk '{print $2}'
```

Expected: both output `null`.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-pr-final/SKILL.md
git commit -m "refactor(p03-t02): oat-project-pr-final reads state via oat --json (read path only)"
```

---

### Task p03-t03: Migrate `oat-project-review-provide` read path

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`

**Step 1: Locate grep lines**

Four `state.md` grep lines across this skill (highest-count migration target). Identify each and its surrounding context before editing.

**Step 2: Replace read path only**

Insert the preamble **once** at the top of the relevant bash block. If the four grep lines appear in multiple bash blocks, keep one preamble per block (do not introduce cross-block state). Replace each grep with its `jq -r` equivalent, mapping field-for-field:

| grep field          | jq path                 |
| ------------------- | ----------------------- |
| `oat_phase`         | `.project.phase`        |
| `oat_phase_status`  | `.project.phaseStatus`  |
| `oat_workflow_mode` | `.project.workflowMode` |
| `oat_last_commit`   | `.project.lastCommit`   |

**Step 3: Verify**

Parity check for every field migrated (JSON vs grep) against this worktree.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md
git commit -m "refactor(p03-t03): oat-project-review-provide reads state via oat --json (read path only)"
```

---

### Task p03-t04: Migrate `oat-project-reconcile` read path

**Files:**

- Modify: `.agents/skills/oat-project-reconcile/SKILL.md`

**Step 1: Locate grep lines**

```bash
LAST_SHA=$(grep "^oat_last_commit:" "$ACTIVE_PROJECT_PATH/state.md" ... | awk '{print $2}')
```

Plus one more state.md grep identified in the scan. Enumerate both.

**Step 2: Replace read path only**

Preamble once; replace grep lines with `jq`. Do not touch reconcile-side writes.

**Step 3: Verify**

Parity probe for each migrated field.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-reconcile/SKILL.md
git commit -m "refactor(p03-t04): oat-project-reconcile reads state via oat --json (read path only)"
```

---

### Task p03-t05: Migrate `oat-project-complete` read path

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`

**Step 1: Locate grep lines**

Identify every `grep/awk` read of `state.md` in this skill. Do not conflate with reads of `plan.md` or `implementation.md` — those are out of scope.

**Step 2: Replace read path only**

Preamble once; replace grep reads of `state.md`. Do not touch `oat_project_completed`, `oat_phase`, or `oat_phase_status` write paths.

**Step 3: Verify**

Parity probe for each migrated field.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md
git commit -m "refactor(p03-t05): oat-project-complete reads state via oat --json (read path only)"
```

---

## Phase 4: Validation and version bumps

### Task p04-t01: Live smoke-test every migrated skill preamble

**Files:**

- Modify: `.oat/projects/shared/skill-cli-migration/implementation.md` — record the per-skill verification checklist.

**Step 1: Extract the preamble block from each migrated skill**

For every SKILL.md touched in p02/p03, copy the preamble + jq extraction block and run it in a fresh shell against this worktree's project. Confirm:

- Exit code is 0 when `oat` resolves and state is valid.
- Every extracted variable matches the corresponding `grep | awk` output against `state.md`.
- Null-sentinel parity holds when a field is `null` in JSON (e.g. `lastCommit`, `docsUpdated`): both `jq -r` and the prior `grep | awk` emit the literal string `null`.

**Step 2: Record results**

Append a short checklist to `.oat/projects/shared/skill-cli-migration/implementation.md` under the phase-4 section listing each skill verified.

**Step 3: Commit**

```bash
git add .oat/projects/shared/skill-cli-migration/implementation.md
git commit -m "chore(p04-t01): verify migrated skill preambles against live project"
```

---

### Task p04-t02: Verify `npx @open-agent-toolkit/cli` fallback branch

**Files:**

- Modify: `.oat/projects/shared/skill-cli-migration/implementation.md` — record the fallback-branch verification result.

**Step 1: Execute the canonical fallback with `oat` removed from `$PATH`**

Run the exact `if command -v oat ... else npx @open-agent-toolkit/cli ...` branch from p01-t01, not a substitute command. This is the only task that exercises the fallback path end-to-end:

```bash
env PATH="/usr/bin:/bin" bash -lc '
  if command -v oat >/dev/null 2>&1; then
    echo "Unexpected: oat resolved despite trimmed PATH" >&2
    exit 1
  fi
  STATUS_JSON=$(npx @open-agent-toolkit/cli --json project status 2>/dev/null || echo "{}")
  echo "$STATUS_JSON" | jq -r ".project.workflowMode"
'
```

Expected stdout: `quick`. Exit code 0.

**Step 2: Record the verification**

Append a line to `.oat/projects/shared/skill-cli-migration/implementation.md` under the phase-4 section stating the fallback branch was exercised and produced the expected output.

**Step 3: Commit**

```bash
git add .oat/projects/shared/skill-cli-migration/implementation.md
git commit -m "chore(p04-t02): verify npx fallback branch for oat --json"
```

---

### Task p04-t03: Apply lockstep package version bump and run release validation

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` — lockstep public package version bump (per AGENTS.md).
- Modify: `version:` frontmatter on every touched SKILL.md (from p01, p02, p03) — one bump per file in the final PR diff.

**Step 1: Bump skill versions**

For each SKILL.md edited in p01/p02/p03, increment `version:` by one patch level (e.g. `1.2.2` → `1.2.3`). Exactly one bump per touched skill.

**Step 2: Bump public package versions**

Increment all five public packages by one patch level in lockstep.

**Step 3: Run release validation**

Run: `pnpm release:validate`
Expected: exit 0, no validation errors.

**Step 4: Run full local checks**

Run: `pnpm lint && pnpm format && pnpm type-check && pnpm test`
Expected: all pass.

**Step 5: Commit**

```bash
git add .agents/skills packages/*/package.json
git commit -m "chore(p04-t03): lockstep version bump for skill-cli-migration"
```

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                            |
| ------ | -------- | --------------- | ---------- | --------------------------------------------------- |
| p01    | code     | passed          | 2026-04-27 | reviews/p01-code-review-2026-04-27.md               |
| p02    | code     | passed          | 2026-04-27 | reviews/p02-code-review-2026-04-27.md               |
| p03    | code     | passed          | 2026-04-27 | reviews/p03-code-review-2026-04-27.md               |
| p04    | code     | passed          | 2026-04-27 | reviews/p04-code-review-2026-04-27.md               |
| final  | code     | received        | 2026-04-27 | reviews/final-review-2026-04-27.md                  |
| spec   | artifact | n/a             | -          | quick mode (no spec artifact)                       |
| design | artifact | n/a             | -          | quick mode (no design artifact)                     |
| plan   | artifact | fixes_completed | 2026-04-24 | reviews/archived/artifact-plan-review-2026-04-24.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — document preamble, lock CLI JSON contract with a test
- Phase 2: 2 tasks — migrate pure-read skills (`oat-project-progress`, `oat-project-pr-progress`)
- Phase 3: 5 tasks — migrate read path of mixed skills (`oat-project-plan`, `oat-project-pr-final`, `oat-project-review-provide`, `oat-project-reconcile`, `oat-project-complete`)
- Phase 4: 3 tasks — live smoke-test, npx fallback verification, lockstep version bump + release:validate

**Total: 12 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- CLI entry point: `packages/cli/src/commands/project/status.ts` (already emits `--json` via the global `--json` flag)
- Control-plane project state: `packages/control-plane/src/project.ts`
- Skill authoring conventions: `.agents/skills/create-oat-skill/SKILL.md`
- Lockstep public packages policy: `AGENTS.md` → "Package Management"
