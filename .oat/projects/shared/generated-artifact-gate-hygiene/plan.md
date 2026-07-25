---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-25
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: [] # phases to pause AFTER completing (empty = every phase)
oat_plan_parallel_groups: [] # fully sequential
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: generated-artifact-gate-hygiene

**Goal:** Every artifact an OAT workflow generates has a step that commits it, so OAT's own output stops tripping OAT's own clean-state gates.

**Commit Convention:** `{type}({scope}): {description}`

**Formatting:** `pnpm exec oxfmt --write <paths>` before verification in any task that writes a formatter-eligible file.

## Scope note (deliberately narrowed)

An earlier version of this plan ran to 14 tasks across 6 phases, including a new `oat project preflight` CLI command with a full sync-ownership classifier. That was cut. The classifier existed to decide edge cases — extension-generated outputs, copied-directory descendants, first-sync baselines, rename endpoints, sync deletions — that should simply prompt. Since the only case that actually recurs in practice is a modified `.oat/sync/manifest.json`, and the answer there is always "commit it," that case is handled in prose and everything else keeps the existing prompt.

Three prior plan reviews are retained under `reviews/` as the record of how the scope was arrived at, including two findings that materially changed the work: the project-start preflights are not byte-identical, and the gate CLI has the same log-ownership bug as the implementation workflow.

**Deferred:** general sync-ownership classification for non-manifest dirt. Not filed as required work; the prompt is an acceptable outcome for those cases.

---

## Phase 1: Project-Log Commit Ownership

The reported bug. The root appends to the tracked `project-log.md` while a dispatched child owns the worktree, and nothing ever commits the file, so the dirt is permanent rather than transient.

### Task p01-t01: Move log appends out of child-owned windows

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

`review-skill-contracts.test.ts:302-320` asserts `/accepted subagent dispatch[\s\S]*?oat project log append/i` — the exact instruction this task removes — so it is declared here rather than left to break later.

**Step 1:** In `## Project Log Append Points`, replace the bullet requiring an append after every accepted subagent dispatch. State the invariant: never append while a dispatched child owns the worktree, because the append dirties the tree the child's preflight and per-task commit checks require to be clean. Keep the acceptance-time record in the generic dispatch record; write the project-log entry after the child's report returns, batched with the phase-outcome entry, preserving the run-anchor reference.

**Step 2:** Apply the same rule to review orchestration. A reviewer returns, the root appends, and a fix child is then dispatched into that dirty tree (`references/phase-execution.md:146-187`) — the same bug in a path previously assumed safe. Defer review-orchestration entries to a terminal phase outcome.

**Step 3:** Update the `review-skill-contracts.test.ts` append-point assertions to pin the deferred contract, still requiring the generic acceptance record and the `$PROJECT_PATH/implementation.md#<run-anchor>` evidence. Do not simply delete them.

**Step 4:** Bump the skill's frontmatter `version:`.

**Verify:**

```bash
! grep -q "After every accepted subagent dispatch" .agents/skills/oat-project-implement/SKILL.md && echo "removed"
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts
```

**Commit:** `fix(p01-t01): move project-log appends out of child-owned windows`

---

### Task p01-t02: Commit the log with phase bookkeeping

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/phase-execution.md`
- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`

**Step 1:** Three bookkeeping commit blocks stage exactly three tracking artifacts — the Step 7 phase-boundary commit, and the closeout-preparation and mark-complete commits. Add the project log to each, staged only when it exists. Update the "commit the three tracking artifacts" and "Only commit the three project artifacts listed above" prose to name it as a conditional fourth path. Preserve every `git add -A` prohibition and the gitignored-dashboard note.

**Step 2:** Success-path staging alone is insufficient: STOP/park returns, validation failure, invalid-run abort, and retry exhaustion all bypass the phase boundary. State one invariant — any step that appends to the project log owns committing it before returning, parking, or stopping, once no child owns the head.

**Verify:**

```bash
grep -c "project-log.md" .agents/skills/oat-project-implement/references/phase-execution.md .agents/skills/oat-project-implement/references/completion-and-closeout.md
grep -rn "git add -A" .agents/skills/oat-project-implement/references/
```

Second command is read-and-judge: confirm each `git add -A` remains a prohibition.

**Commit:** `fix(p01-t02): commit project log with phase bookkeeping`

---

### Task p01-t03: Commit the gate's own log append

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

`finalizeReviewGateProjectLog` appends a structural entry and returns without committing it. Observed four times during this project's own planning.

**Step 1 (RED):** Extend the gate tests — after the append, exactly `project-log.md` is committed and nothing else; the commit is scoped to the repo root the append used; no commit when logging is disabled; no empty commit when already clean; a git failure degrades to the existing warning path without changing the gate's exit status; the commit happens after the reviewer child exits.

**Step 2 (GREEN):** Follow a successful append with a scoped commit of the log path only, reusing the non-throwing `execFileSync` pattern from `packages/cli/src/commands/project/new/scaffold.ts`. Never `git add -A`.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate && pnpm lint && pnpm type-check`

**Commit:** `fix(p01-t03): commit the gate's own project-log append`

---

### Task p01-t04: Regression tests

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
- Create: `packages/cli/src/commands/init/tools/shared/project-log-staging-behavior.test.ts`

Expected green in task order; confirm each binds by temporarily reverting the corresponding change.

**Contract assertions** (via the existing `readImplementSkill` helper): no append-after-accepted-dispatch instruction; the child-owned-window invariant is stated; review-orchestration entries defer to a terminal outcome; the acceptance-time dispatch record survives; all three bookkeeping blocks stage the log conditionally; the terminal-path invariant is present; the phase implementer's clean-worktree requirement remains unconditional.

**Behavioral test:** extract the Step 7 staging command from `phase-execution.md` and execute it rather than restating it, using the `mkdtempSync` + real-git pattern already in `post-implement-sequence-contracts.test.ts`. Scenarios: append dirties the tree; the extracted sequence leaves it clean; staging only the original three artifacts leaves it dirty (the actual guard); a project with no log commits cleanly; a STOP/park append followed by the terminal commit owner is clean at resume; a reviewer-return-then-fix-dispatch is clean when the fix child starts.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared && pnpm lint && pnpm type-check`

**Commit:** `test(p01-t04): pin project-log write-timing and staging contracts`

---

## Phase 2: Sync-Manifest Preflight and Release

### Task p02-t01: Auto-commit manifest-only dirt in project-start preflights

**Files:**

- Modify: `.agents/skills/oat-project-new/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`

**Step 1:** In each Step 0 preflight, add one branch ahead of the existing prompt: if `git status --porcelain` lists exactly `.oat/sync/manifest.json` and nothing else, stage and commit that single path as `chore: run sync`, report it in one line, and continue without asking. Any other dirty path, in any combination, falls through to the existing three-choice prompt unchanged.

Keep the wording equivalent across the three skills, but do not require byte-identity — only `oat-project-quick-start` carries an autonomy branch, and it records gate `QS-01`, which must not appear in the other two.

**Step 2:** Bump each skill's frontmatter `version:`.

**Verify:**

```bash
grep -c "chore: run sync" .agents/skills/oat-project-new/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-import-plan/SKILL.md
! grep -q "QS-01" .agents/skills/oat-project-new/SKILL.md && ! grep -q "QS-01" .agents/skills/oat-project-import-plan/SKILL.md && echo "no gate-ID bleed"
```

**Commit:** `feat(p02-t01): auto-commit manifest-only dirt in project-start preflight`

---

### Task p02-t02: Version contracts, lockstep bump, and release validation

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`
- Modify: `.oat/sync/manifest.json`, `packages/cli/assets/public-package-versions.json`

`validation/skills.test.ts` hardcodes the exact skill versions this PR bumps (for example `2.3.3` at lines 1329 and 4453, `2.1.8` at 1338, 1691, 1908, 2337) and also asserts the attempted-review append inside the pre-fix-loop handoff, which `p01-t01` defers. Both must be updated here or `pnpm test` cannot pass.

**Step 1:** Update `validation/skills.test.ts` for the new skill versions and the deferred-logging contract.

**Step 2:** Bump all five public packages to the same new version. Repo policy requires lockstep because bundled `.agents/skills` assets changed.

**Step 3:** Regenerate **after** the bump, so the manifest is not stamped with a stale `oatVersion`:

```bash
pnpm run cli -- sync --scope all
pnpm build
```

Run `pnpm run cli` invocations serially; concurrent runs race in the shared `packages/cli/assets/` staging directory.

**Step 4:** Format `.oat/sync/manifest.json`. Do not run the formatter on `packages/cli/assets/public-package-versions.json` — `.oxfmtrc.jsonc:18-25` ignores that path and its generator owns its formatting.

**Step 5:** `pnpm release:validate && pnpm lint && pnpm type-check && pnpm test`

**Step 6:** Commit, then confirm `git status --porcelain` is empty. Residual diff means a generated artifact still lacks a commit owner — the defect this PR closes.

**Commit:** `chore(p02-t02): update version contracts and regenerate release artifacts`

---

## Reviews

| Scope | Type     | Status          | Date       | Artifact                                             |
| ----- | -------- | --------------- | ---------- | ---------------------------------------------------- |
| plan  | artifact | fixes_completed | 2026-07-25 | `reviews/artifact-plan-review-2026-07-25T004055Z.md` |
| plan  | artifact | fixes_completed | 2026-07-25 | `reviews/artifact-plan-review-2026-07-25T023301Z.md` |
| plan  | artifact | fixes_completed | 2026-07-25 | `reviews/artifact-plan-review-2026-07-25T192500Z.md` |
| p01   | code     | pending         | -          | -                                                    |
| p02   | code     | pending         | -          | -                                                    |
| final | code     | pending         | -          | -                                                    |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

`passed` requires no unresolved Critical, Important, or Medium findings.

Review findings that survived the scope cut: the deferred review-orchestration append (`p01-t01`), the gate CLI commit owner (`p01-t03`), the undeclared `review-skill-contracts.test.ts` (`p01-t01`) and `validation/skills.test.ts` (`p02-t02`), the release ordering and generated-versions declaration (`p02-t02`), and the correction that the project-start preflights are not byte-identical (`p02-t01`). Findings that died with the classifier — extension ownership, deletion provenance, rename endpoints, unmerged states, directory-copy descendants — are moot; those paths now prompt.

---

## Implementation Complete

- Phase 1: 4 tasks - project-log write timing and commit ownership across the implementation workflow and the gate CLI, with contract and behavioral regression tests
- Phase 2: 2 tasks - manifest-only preflight auto-commit, version contracts, and release validation

**Total: 6 tasks**

---

## References

- Discovery: `discovery.md`
- Plan artifact reviews: `reviews/`
