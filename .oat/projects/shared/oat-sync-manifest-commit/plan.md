---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-13
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: []
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: .superpowers/plans/2026-05-13-oat-sync-manifest-commit.md
oat_import_provider: claude
oat_generated: false
oat_template: false
---

# Implementation Plan: oat-sync-manifest-commit

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Stop `.oat/sync/manifest.json` from bleeding across OAT workflows by (a) committing sync output inside `oat-worktree-bootstrap-auto` and (b) adding a general inherited-git-state preflight to the three project entry skills.

**Architecture:** Two-layer fix — root-cause commit in the bootstrap script for the most common dirtying path, plus a host-agnostic preflight gate in the project entry skills as defense in depth. No CLI engine changes; the sync engine is already correct.

**Tech Stack:** Bash (bootstrap script), Markdown (SKILL.md frontmatter + body), JSON (package.json versions).

**Commit Convention:** `{type}({scope}): {description}` — e.g., `fix(p01-t02): commit sync output in bootstrap script`

## Planning Checklist

- [x] Confirmed HiLL checkpoints from `workflow.hillCheckpointDefault=final`
- [x] Set `oat_plan_hill_phases` in frontmatter (`["p03"]`)
- [ ] Evaluated phases for parallelism opportunities
- [ ] Set `oat_plan_parallel_groups` in frontmatter (kept `[]` — phases share lockstep version bumps that need ordering)

---

## Parallelism

Phases 1 and 2 edit disjoint skill directories, but Phase 3 (lockstep package version bumps) depends on knowing what changed in 1 and 2. Keeping sequential is simpler and the work is small.

---

## Phase 1: Bootstrap Root-Cause Fix

### Task p01-t01: Reorder `git_clean` check before all-scope sync in bootstrap.sh

**Files:**

- Modify: `.agents/skills/oat-worktree-bootstrap-auto/scripts/bootstrap.sh`

**Step 1: Write test (RED)**

No automated test harness exists for this bash script. Verification is behavioral. Set up a deliberately-dirtying scenario in a scratch worktree to confirm the current `git_clean` placement fails under strict policy when sync would create new entries.

**Step 2: Implement (GREEN)**

Reorder bootstrap.sh:

- Current order (around lines 153–160): `worktree:init` → `oat status` → `pnpm test` → `git_clean` → (mkdir providers) → `oat sync --scope all`.
- New order: `worktree:init` → `oat status` → `pnpm test` → (mkdir providers) → `git_clean` (measures inherited base + `worktree:init` output) → `oat sync --scope all` → post-sync commit (added in p01-t02).

Note: `worktree:init` itself runs `oat sync --scope project`. The `git_clean` check still runs after `worktree:init` because that's when the worktree is fully set up; the move is specifically to keep `git_clean` before the all-scope sync sweep.

**Step 3: Refactor**

None — minimal reordering.

**Step 4: Verify**

```bash
bash -n .agents/skills/oat-worktree-bootstrap-auto/scripts/bootstrap.sh
```

Expected: no syntax errors. Behavioral verification deferred to p01-t02 (the scratch-test scenario only stabilizes once the post-sync commit step exists).

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap-auto/scripts/bootstrap.sh
git commit -m "fix(p01-t01): run git_clean baseline before all-scope sync in bootstrap"
```

---

### Task p01-t02: Add post-sync commit block to bootstrap.sh

**Files:**

- Modify: `.agents/skills/oat-worktree-bootstrap-auto/scripts/bootstrap.sh`

**Step 1: Write test (RED)**

Continue the scratch-test scenario from p01-t01. Run the bootstrap and confirm `git status --porcelain` is non-empty when the bootstrap finishes — manifest dirty post-sync, no commit.

**Step 2: Implement (GREEN)**

After the existing `oat sync --scope all` block, add:

```bash
# Step 4.5: Commit sync output if any sync-managed path is dirty.
SYNC_PATHS=(.oat/sync/manifest.json .claude .cursor .codex)
SYNC_DIRTY=$(git status --porcelain -- "${SYNC_PATHS[@]}" 2>/dev/null)
if [[ -n "$SYNC_DIRTY" ]]; then
  git add -- "${SYNC_PATHS[@]}" 2>/dev/null || true
  if ! git diff --cached --quiet; then
    if git commit -m "chore: run sync" >/dev/null 2>&1; then
      CHECK_RESULTS["sync_commit"]="pass"
    else
      CHECK_RESULTS["sync_commit"]="fail"
      if [[ "$BASELINE_POLICY" == "strict" ]]; then
        HAS_ERROR=true
      else
        WARNINGS+=("sync_commit: commit failed")
      fi
    fi
  else
    CHECK_RESULTS["sync_commit"]="skip"
  fi
else
  CHECK_RESULTS["sync_commit"]="skip"
fi
```

Place this between the `oat sync --scope all` invocation (line ~160 in the current file) and the Step 5 status-return block.

**Step 3: Refactor**

Tighten any variable naming for consistency with surrounding `CHECK_RESULTS` style.

**Step 4: Verify**

```bash
bash -n .agents/skills/oat-worktree-bootstrap-auto/scripts/bootstrap.sh
```

Expected: no syntax errors. Re-run the scratch-test scenario:

- After bootstrap completes, `git log -1 --oneline` shows a `chore: run sync` commit.
- `git status --porcelain` is empty.
- Structured YAML status emits `sync_commit: pass`.

Clean up scratch test: revert any temp commits and remove the scratch skill dir.

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap-auto/scripts/bootstrap.sh
git commit -m "fix(p01-t02): commit sync output inside bootstrap to keep worktree clean"
```

---

### Task p01-t03: Update bootstrap SKILL.md docs

**Files:**

- Modify: `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md`

**Step 1: Write test (RED)**

N/A — documentation alignment with script behavior.

**Step 2: Implement (GREEN)**

Update three sections of `SKILL.md`:

1. **Step 3 (Run Baseline Checks):** reorder the listed check sequence to reflect the new `bootstrap.sh` ordering. Clarify that `git_clean` measures the inherited base plus `worktree:init` output, before any all-scope sync sweep.
2. **Step 4 (Create Provider Directories):** append a sub-section documenting the post-sync commit step, naming the scoped paths (`.oat/sync/manifest.json`, `.claude`, `.cursor`, `.codex`), the `chore: run sync` message, and the orchestrator contract that this commit only touches sync-managed paths.
3. **Step 5 (Return Structured Status):** add `sync_commit: pass | fail | skip` to the YAML schema and status-determination logic. `fail` under strict → `error`; `fail` under allow-failing → warning.

**Step 3: Refactor**

`pnpm format:fix .agents/skills/oat-worktree-bootstrap-auto/SKILL.md`.

**Step 4: Verify**

```bash
pnpm format --check .agents/skills/oat-worktree-bootstrap-auto/SKILL.md
```

Expected: clean. Visually confirm the YAML status schema and the checks list are internally consistent.

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap-auto/SKILL.md
git commit -m "docs(p01-t03): document post-sync commit step in bootstrap skill"
```

---

### Task p01-t04: Bump `oat-worktree-bootstrap-auto` skill version

**Files:**

- Modify: `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md` (frontmatter only)

**Step 1: Write test (RED)**

N/A — version bump.

**Step 2: Implement (GREEN)**

Update frontmatter `version:` from `1.2.2` → `1.3.0`. Minor bump because the structured status block gains a new field — observable behavior change for orchestrators that parse it.

**Step 3: Refactor**

None.

**Step 4: Verify**

```bash
head -10 .agents/skills/oat-worktree-bootstrap-auto/SKILL.md
```

Expected: `version: 1.3.0`.

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap-auto/SKILL.md
git commit -m "chore(p01-t04): bump oat-worktree-bootstrap-auto to 1.3.0"
```

---

## Phase 2: Project Entry Skill Preflight

### Task p02-t01: Add Step 0 preflight to `oat-project-quick-start`

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`

**Step 1: Write test (RED)**

N/A — skill content edit. Manual verification at Step 4.

**Step 2: Implement (GREEN)**

Insert a new section before the existing `### Step 0: Resolve Active Project`:

```markdown
### Step 0 (Preflight): Inherited Git State

Before scaffolding, surface the working tree state so unrelated changes don't get carried into the project workflow's bookkeeping commits.

1. Run `git status --porcelain`. If empty, continue silently to the next step.
2. If non-empty, present the dirty list to the user.
3. If `.oat/sync/manifest.json` or paths under `.claude/`, `.cursor/`, `.codex/` appear in the list, note: "These are generated by `oat sync` (often by `pnpm run worktree:init` or `oat-worktree-bootstrap-auto`) and are typically safe to commit as `chore: run sync`."
4. Offer three choices via `AskUserQuestion`:
   - **Commit now** (recommended when only sync output is dirty) — stage and commit. For sync-only diffs, default the message to `chore: run sync`; otherwise ask the user for the commit message.
   - **Proceed anyway** — start the project workflow with the dirty state acknowledged.
   - **Abort** — exit the skill so the user can clean up manually.

> **Tool availability is not the same as interactivity.** If `AskUserQuestion` is unavailable but chat is available, present the three choices as a plain chat message and wait for the user's reply. Only fall back to "Proceed anyway" when `OAT_NON_INTERACTIVE=1` is set or there is no user-response channel at all.

Do not advance past this gate without an explicit choice.
```

Rename the existing "Step 0: Resolve Active Project" to "Step 0.5: Resolve Active Project" (or convert both to parenthetical scopes — match surrounding skill conventions). Update the `[1/6]` step indicators if numbering shifts.

Bump frontmatter `version:` `2.0.2` → `2.1.0`.

**Step 3: Refactor**

`pnpm format:fix .agents/skills/oat-project-quick-start/SKILL.md`.

**Step 4: Verify**

In a worktree with a deliberately-dirty `.oat/sync/manifest.json`, invoke `/oat-project-quick-start test-preflight`. Verify the preflight surfaces the dirty list, calls out the manifest as automation output, and offers the three-choice picker. Test each branch at least once.

Repeat with `OAT_NON_INTERACTIVE=1` set; verify the skill falls back to "Proceed anyway" silently.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-quick-start/SKILL.md
git commit -m "feat(p02-t01): add inherited-git-state preflight to oat-project-quick-start"
```

---

### Task p02-t02: Add Step 0 preflight to `oat-project-new` + widen allowed-tools

**Files:**

- Modify: `.agents/skills/oat-project-new/SKILL.md`

**Step 1: Write test (RED)**

N/A — skill content edit.

**Step 2: Implement (GREEN)**

Insert the same preflight block as p02-t01, before `### Step 0: Resolve Projects Root`. Adjust step indicators (`[1/3]` etc.) if numbering shifts.

Widen `allowed-tools` frontmatter from `Read, Write, Bash(pnpm:*), Glob, Grep, AskUserQuestion` to `Read, Write, Bash, Glob, Grep, AskUserQuestion`. The existing step body already calls `oat config get` and `oat project new`, and now needs `git status --porcelain` — the previous `Bash(pnpm:*)` restriction was inconsistent with the body even before this change.

Bump frontmatter `version:` `1.2.0` → `1.3.0`.

**Step 3: Refactor**

`pnpm format:fix .agents/skills/oat-project-new/SKILL.md`.

**Step 4: Verify**

Same scenario as p02-t01. Additionally confirm `oat config get` / `oat project new` calls in the existing body still work after the allowed-tools widening (no regression — was already inconsistent).

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-new/SKILL.md
git commit -m "feat(p02-t02): add git-state preflight + widen allowed-tools in oat-project-new"
```

---

### Task p02-t03: Add Step 0 preflight to `oat-project-import-plan`

**Files:**

- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`

**Step 1: Write test (RED)**

N/A — skill content edit.

**Step 2: Implement (GREEN)**

Insert the same preflight block as p02-t01, before `### Step 0: Resolve Active Project`. Adjust the `[1/5]` … `[5/5]` indicators to `[1/6]` … `[6/6]` (or rename the preflight as a pre-step that doesn't increment the counter).

Bump frontmatter `version:` `1.2.1` → `1.3.0`.

**Step 3: Refactor**

`pnpm format:fix .agents/skills/oat-project-import-plan/SKILL.md`.

**Step 4: Verify**

Same scenario as p02-t01, invoked as `/oat-project-import-plan <some-plan.md>` against a known-good source.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-import-plan/SKILL.md
git commit -m "feat(p02-t03): add git-state preflight to oat-project-import-plan"
```

---

## Phase 3: Lockstep Release Validation

### Task p03-t01: Bump five public package versions

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Write test (RED)**

N/A — version bump.

**Step 2: Implement (GREEN)**

Read current `"version"` for each of the five packages. Bump each by the same minor increment (e.g., `0.0.1` → `0.1.0` if currently `0.0.x`; otherwise minor + 1 with patch reset to 0). All five must land at the same target version.

**Step 3: Refactor**

None.

**Step 4: Verify**

```bash
for pkg in packages/cli packages/control-plane packages/docs-config packages/docs-theme packages/docs-transforms; do
  node -e "console.log('$pkg:', require('./$pkg/package.json').version)"
done
```

Expected: all five report the same version.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "chore(p03-t01): lockstep version bump for sync-manifest-commit changes"
```

---

### Task p03-t02: Run pre-PR validation sweep

**Files:** none (validation only)

**Step 1: Write test (RED)**

N/A — gate.

**Step 2: Implement (GREEN)**

Run, in order:

```bash
pnpm --filter @open-agent-toolkit/cli test
pnpm release:validate
```

Both must exit 0. The CLI test sweep catches regressions in the sync engine and command surface that the touched skills could indirectly affect (e.g., `packages/cli/src/commands/sync`, helpers referenced by bootstrap docs). `pnpm release:validate` then gates the lockstep public-package release.

Resolve any findings before proceeding to PR. If either step fails, treat findings as additional tasks added to this phase (per the standard `oat-project-implement` fix-loop).

**Step 3: Refactor**

None.

**Step 4: Verify**

Both commands return exit 0 (re-run after any fix). Parity check against `references/imported-plan.md` "Validation" section — both commands listed there are now exercised.

**Step 5: Commit**

If validation produced no file changes, no commit. If it required follow-up edits, commit those with `chore(p03-t02): address release:validate findings`.

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                                            |
| ------ | -------- | ------- | ---------- | --------------------------------------------------- |
| p01    | code     | passed  | 2026-05-15 | reviews/p01-review-2026-05-15.md                    |
| p02    | code     | passed  | 2026-05-15 | reviews/p02-review-2026-05-15.md                    |
| p03    | code     | passed  | 2026-05-15 | reviews/p03-review-2026-05-15.md                    |
| final  | code     | pending | -          | -                                                   |
| plan   | artifact | passed  | 2026-05-14 | reviews/archived/artifact-plan-review-2026-05-14.md |
| spec   | artifact | pending | -          | -                                                   |
| design | artifact | pending | -          | -                                                   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Plan Summary

**Summary:**

- Phase 1: 4 tasks — bootstrap root-cause fix (reorder check, post-sync commit, docs, version bump)
- Phase 2: 3 tasks — inherited-git-state preflight added to three project entry skills (+ allowed-tools fix on `oat-project-new`)
- Phase 3: 2 tasks — lockstep public package version bumps and pre-PR validation sweep

**Total: 9 tasks**

Ready for implementation.

---

## References

- Imported Source: `references/imported-plan.md` (working-notes draft)
- Spec: optional in import mode — see imported source for problem framing
- Design: optional in import mode — see imported source for design rationale
- AskUserQuestion fallback pattern (existing): `.agents/skills/oat-project-quick-start/SKILL.md:223-227,277-298`
- Commit message precedent: repo commits `6324870e` ("chore: run sync"), `24453589` ("chore: add codex provider and re-sync")
- Sync engine entry point: `packages/cli/src/engine/execute-plan.ts:207`
- Bootstrap script: `.agents/skills/oat-worktree-bootstrap-auto/scripts/bootstrap.sh:153-169`
- Release policy: `AGENTS.md` "Publishable package guardrail"
