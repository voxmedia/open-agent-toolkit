---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-28
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_phase_review_gate: false
oat_plan_hill_phases: ['p02']
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: portable-skill-references

> This reviewed plan is ready for execution with `oat-project-implement`.

**Goal:** Make every executable cross-skill reference in the identified
user-default packs resolve from its installed scope, and enforce that contract
across all shipped Markdown surfaces.

**Approach:** Strengthen the existing bundled-docs ratchet first, then migrate
the idea, workflow, and brainstorm surfaces in reviewable commits. Finish with
provider-view refresh, lockstep package metadata, and the complete repository
release gates.

**Tech Stack:** Markdown skill contracts, TypeScript/Vitest contract tests,
pnpm/Turborepo release tooling.

**Commit Convention:** `{type}(pNN-tNN): {description}`

## Parallelism

`oat_plan_parallel_groups` remains empty. All Phase 1 tasks update the same
ratchet and progressively remove its legacy baseline, while Phase 2 must select
release versions from the complete Phase 1 diff and current `origin/main`.
Isolated worktrees would therefore create overlapping writes and could validate
stale baseline or version state; sequential execution is the safe and faster
merge path.

## Phase 1: Portable sibling resolution and enforcement

### Task p01-t01: Make the cross-skill ratchet recursive and syntax-robust

**Files:**

- Modify:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Steps:**

1. Refactor the bare cross-skill path collector so it recursively scans every
   authored Markdown file under skills shipped by user-default packs, excluding
   only materialized shared-doc copies already covered by the bundled-docs
   contract.
2. Add table-driven matcher coverage for backticked, plain-text, and Markdown
   link forms of `.agents/skills/<sibling>/SKILL.md`. Do not match portable
   `${SKILLS_ROOT}` references or a skill's self-reference.
3. Represent retained cases as an exact file-plus-target baseline with comments
   distinguishing executable legacy references from deliberately historical
   evidence. Make failures print the source file and sibling target.
4. Keep the current repository green at this task boundary by baselining only
   existing findings; add no wildcard, directory exclusion, or future-proof
   allowance.
5. Format:

   ```bash
   pnpm exec oxfmt --write packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
   ```

6. Verify:

   ```bash
   pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
   ```

7. Commit:

   ```bash
   git add packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
   git commit -m "test(p01-t01): harden packaged skill reference ratchet"
   ```

---

### Task p01-t02: Make idea-workflow sibling reads scope-portable

**Files:**

- Modify: `.agents/skills/oat-idea-ideate/SKILL.md`
- Modify: `.agents/skills/oat-idea-new/SKILL.md`
- Modify: `.agents/skills/oat-idea-summarize/SKILL.md`
- Modify:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Steps:**

1. Replace each executable bare sibling read with the loaded-scope-first
   `${SKILLS_ROOT}` resolution contract: loaded `SKILL_DIR` sibling root, then
   user scope, then project scope, with existence probes and an actionable stop
   when the target skill is absent.
2. Preserve the current downstream step boundaries and user interaction; this
   task changes path resolution, not the idea lifecycle.
3. Remove the remediated idea-skill entries from the ratchet baseline and add
   assertions that all three skills state the portable resolution and
   fail-closed missing-sibling behavior.
4. Increase each changed skill's frontmatter `version:` exactly once for this
   PR.
5. Format:

   ```bash
   pnpm exec oxfmt --write .agents/skills/oat-idea-ideate/SKILL.md .agents/skills/oat-idea-new/SKILL.md .agents/skills/oat-idea-summarize/SKILL.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
   ```

6. Verify:

   ```bash
   pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts
   ```

7. Commit:

   ```bash
   git add .agents/skills/oat-idea-ideate/SKILL.md .agents/skills/oat-idea-new/SKILL.md .agents/skills/oat-idea-summarize/SKILL.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
   git commit -m "fix(p01-t02): resolve idea skills from installed scope"
   ```

---

### Task p01-t03: Make workflow-dispatch sibling reads scope-portable

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Steps:**

1. Replace the mandatory reads of `oat-project-dispatch-subagents` and
   `oat-dispatch-subagents` with the same installed-scope resolver. Preserve
   ordering and the rule that both skill contracts must be loaded before any
   dispatch.
2. Fail closed before implementation or plan-review dispatch if either sibling
   contract cannot be resolved; do not fall back to ambient skill discovery.
3. Remove the two workflow-skill baseline entries and add focused contract
   assertions for loaded-scope derivation, fallback ordering, and missing-skill
   stop behavior.
4. Increase both changed skills' frontmatter `version:` exactly once for this
   PR.
5. Format:

   ```bash
   pnpm exec oxfmt --write .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-plan-writing/SKILL.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
   ```

6. Verify:

   ```bash
   pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
   ```

7. Commit:

   ```bash
   git add .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-plan-writing/SKILL.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
   git commit -m "fix(p01-t03): resolve dispatch skills from installed scope"
   ```

---

### Task p01-t04: Make brainstorm handoff references portable

**Files:**

- Modify: `.agents/skills/oat-brainstorm/SKILL.md`
- Modify: `.agents/skills/oat-brainstorm/references/destinations.md`
- Modify:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Steps:**

1. Rewrite the `Summarize idea directly` handoff in `destinations.md` to use
   the `${SKILLS_ROOT}` contract already owned by `oat-brainstorm/SKILL.md`,
   preserving its two-stage `oat-idea-new` then `oat-idea-summarize` sequence.
2. Ensure the owning `SKILL.md` explicitly says operational reference-file
   handoffs inherit that resolver and bump its frontmatter `version:` exactly
   once for this PR.
3. Remove the operational brainstorm finding from the baseline. Retain only
   exact historical-evidence entries, if any remain, with a reason beside each;
   the final repository assertion must have no executable legacy entries.
4. Add a bundled-copy assertion proving the portable destination text ships in
   the brainstorm pack rather than existing only in the canonical source.
5. Format:

   ```bash
   pnpm exec oxfmt --write .agents/skills/oat-brainstorm/SKILL.md .agents/skills/oat-brainstorm/references/destinations.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
   ```

6. Verify:

   ```bash
   pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/commands/init/tools/shared/project-start-preflight-contracts.test.ts
   ```

7. Commit:

   ```bash
   git add .agents/skills/oat-brainstorm/SKILL.md .agents/skills/oat-brainstorm/references/destinations.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
   git commit -m "fix(p01-t04): make brainstorm handoffs scope-portable"
   ```

## Phase 2: Release metadata and full validation

### Task p02-t01: Refresh packaged views and advance the lockstep release

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Move:
  `.oat/repo/pjm/backlog/items/BL-260827-make-packaged-skill-references.md`
  to
  `.oat/repo/pjm/backlog/archived/BL-260827-make-packaged-skill-references.md`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Modify: `.oat/repo/pjm/backlog/index.md`
- Modify only if produced by `oat sync --scope all`: managed provider-linked
  views corresponding to the six changed canonical skills

**Steps:**

1. Fetch `origin/main`, read the five public package versions at the fetched
   tip, and choose one stable patch version greater than both those versions
   and the branch's current versions. Do not assume the version recorded when
   this plan was drafted is still available.
2. Set all five public package `package.json` files to that exact version and
   update every entry in
   `packages/cli/assets/public-package-versions.json` to the same value.
3. Run `pnpm run cli -- sync --scope all`. Inspect the diff and include only
   provider-managed view changes caused by the six canonical skill edits; stop
   on unrelated generated drift.
4. Close the associated backlog item in the same shipping commit, then verify
   that the generated PJM state is coherent:

   ```bash
   pnpm run cli -- backlog archive BL-260827-make-packaged-skill-references --summary "Made packaged sibling-skill references scope-portable and added a recursive syntax-robust regression ratchet."
   pnpm run cli -- pjm doctor --json
   ```

   Inspect and stage the moved archived item plus `backlog/completed.md` and
   regenerated `backlog/index.md`; do not hand-edit the generated lifecycle
   changes.

5. Format:

   ```bash
   pnpm exec oxfmt --write packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
   ```

6. Verify the metadata shape before committing:

   ```bash
   pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts src/release/public-package-contract.test.ts
   pnpm format
   pnpm lint
   git diff --check
   ```

7. Commit the release-shaped delta before running the base-relative version
   gates, because those gates compare committed `HEAD` with the merge base:

   ```bash
   git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
   git add .oat/repo/pjm/backlog/archived/BL-260827-make-packaged-skill-references.md .oat/repo/pjm/backlog/completed.md .oat/repo/pjm/backlog/index.md
   git add -- <each exact provider-view path confirmed in the inspected sync diff>
   git commit -m "chore(p02-t01): release portable skill references"
   ```

   The backlog staging command is unconditional after a successful archive.
   Omit the third `git add` when sync produced no provider-view diff. Never
   stage a provider directory wholesale or add unrelated generated paths.

8. Run every CI gate in the repository's documented order, capturing and
   checking each command's own exit code rather than a pager's or filter's:

   ```bash
   portable_gate_log_dir="$(mktemp -d)"
   run_portable_gate() {
     portable_gate_label="$1"
     shift
     "$@" >"$portable_gate_log_dir/$portable_gate_label.log" 2>&1
     portable_gate_exit=$?
     printf '%s exit=%s\n' "$portable_gate_label" "$portable_gate_exit"
     if [ "$portable_gate_exit" -ne 0 ]; then
       tail -n 200 "$portable_gate_log_dir/$portable_gate_label.log"
       return "$portable_gate_exit"
     fi
   }

   run_portable_gate 01-check pnpm check
   run_portable_gate 02-type-check pnpm type-check
   run_portable_gate 03-test pnpm test
   run_portable_gate 04-build pnpm build
   run_portable_gate 05-skill-bumps pnpm run check:skill-bumps
   run_portable_gate 06-release-versions pnpm release:check-versions
   run_portable_gate 07-release-validate pnpm release:validate
   run_portable_gate 08-build-docs pnpm build:docs
   ```

9. Re-run the skill-only checks omitted from CI and the final diff check:

   ```bash
   run_portable_gate 09-lint pnpm lint
   run_portable_gate 10-format pnpm format
   run_portable_gate 11-diff-check git diff --check
   ```

   Record each gate's explicit exit code in `implementation.md`. Any post-commit
   correction follows the implementation recovery contract rather than being
   silently amended.

## Phase 3: Final review fixes

### Task p03-t01: (review) Harden the portable-reference ratchet

**Files:**

- Modify:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Steps:**

1. Add a shared assertion that proves loaded-scope, user-scope, and
   project-scope candidates occur in strictly increasing order for every idea
   and dispatch consumer.
2. Detect or normalize `./.agents/skills/...` and
   `../.agents/skills/...` repo-relative spellings, with table cases for both.
3. Replace the substring `references/docs` exclusion with an exact
   `references/docs/` path-segment check. Add a fixture proving a similarly
   named authored reference remains scanned.
4. Format and verify:

   ```bash
   pnpm exec oxfmt --write packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
   pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/validation/skills.test.ts
   git diff --check
   ```

5. Commit:

   ```bash
   git add packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
   git commit -m "fix(p03-t01): close portable reference ratchet gaps"
   ```

---

### Task p03-t02: (review) Reconcile the final lifecycle baseline

**Files:**

- Modify: `.oat/projects/shared/portable-skill-references/discovery.md`
- Modify: `.oat/projects/shared/portable-skill-references/plan.md`
- Modify: `.oat/projects/shared/portable-skill-references/implementation.md`
- Modify: `.oat/projects/shared/portable-skill-references/state.md`

**Steps:**

1. Populate `implementation.md`'s final summary with shipped behavior, key
   surfaces, verification, recovery/deviation evidence, and outstanding
   non-blocking observations.
2. Replace stale `0/5`, "initialized", and "not started" lifecycle prose with
   the verified task/phase state, without prematurely marking the pending final
   re-review as passed.
3. Record gates 01-11 and their explicit exit-zero results, including the
   permitted no-edit test rerun, in `implementation.md`.
4. Retarget durable backlog references from `backlog/items/` to the archived
   item while preserving the historical move command in p02-t01.
5. Format and verify:

   ```bash
   pnpm exec oxfmt --write .oat/projects/shared/portable-skill-references/discovery.md .oat/projects/shared/portable-skill-references/plan.md .oat/projects/shared/portable-skill-references/implementation.md .oat/projects/shared/portable-skill-references/state.md
   pnpm run cli -- project status --project-path .oat/projects/shared/portable-skill-references --json
   git diff --check
   ```

6. Commit:

   ```bash
   git add .oat/projects/shared/portable-skill-references/discovery.md .oat/projects/shared/portable-skill-references/plan.md .oat/projects/shared/portable-skill-references/implementation.md .oat/projects/shared/portable-skill-references/state.md
   git commit -m "docs(p03-t02): reconcile final closeout artifacts"
   ```

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                              | Reviewed Head                            | Invocation | Gate Target |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------- | ---------------------------------------- | ---------- | ----------- |
| p01    | code     | passed          | 2026-08-28 | `reviews/p01-review-2026-08-28T015302Z.md`            | dba46295a0d02c1bd1bca179a954bf902a2ae1c6 | auto       | -           |
| p02    | code     | passed          | 2026-08-28 | `reviews/p02-review-2026-08-28T021707Z.md`            | 9d5be6432d30bb31b6bf3fed01ed152c936640c0 | auto       | -           |
| p03    | code     | received        | 2026-08-28 | `reviews/p03-review-2026-08-28T024853Z.md`            | 00c641d332a82bd1ccfc4268f90965d517e7ec52 | auto       | -           |
| final  | code     | fixes_added     | 2026-08-28 | `reviews/archived/final-review-2026-08-28T022049Z.md` | d3c76770f9bb75860486e678bf5281fa8a84b6f4 | auto       | -           |
| spec   | artifact | pending         | -          | -                                                     | -                                        | -          | -           |
| design | artifact | pending         | -          | -                                                     | -                                        | -          | -           |
| plan   | artifact | passed          | 2026-08-27 | `reviews/artifact-plan-review-2026-08-27T214843Z.md`  | -                                        | -          | -           |
| plan   | artifact | fixes_completed | 2026-08-27 | `reviews/artifact-plan-review-2026-08-27T220007Z.md`  | -                                        | -          | -           |
| plan   | artifact | fixes_completed | 2026-08-27 | `reviews/artifact-plan-review-2026-08-27T220505Z.md`  | -                                        | -          | -           |

**Status values:** `pending` -> `received` -> `fixes_added` ->
`fixes_completed` -> `passed`

## Implementation Closeout

**Summary:**

- Phase 1: 4 tasks - portable resolution contracts and robust ratchet coverage
- Phase 2: 1 task - provider views, lockstep release metadata, and full gates
- Phase 3: 2 tasks - final ratchet hardening and lifecycle reconciliation

**Total: 7 tasks**

All seven planned task scopes have implementation output. Root validation must
still reconcile the Phase 3 task statuses and commit hashes, and project
completion requires a passing final re-review. Until then, the final review
remains `fixes_added` and the project remains in progress.

## References

- Discovery: `discovery.md`
- Backlog:
  `.oat/repo/pjm/backlog/archived/BL-260827-make-packaged-skill-references.md`
- Source project:
  `.oat/projects/shared/user-scope-tool-packs/implementation.md`
- Existing portability contract:
  `.agents/skills/oat-brainstorm/SKILL.md`
- Existing ratchet:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
