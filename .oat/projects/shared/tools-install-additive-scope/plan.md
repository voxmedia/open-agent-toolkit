---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-06-19
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p01'] # final-phase checkpoint (from workflow.hillCheckpointDefault: final)
oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: tools-install-additive-scope

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Make `oat tools install` additive — installing a pack at one scope must never remove it from another. Removal happens only as an explicit, batch-confirmed action in the interactive flow.

**Architecture:** Rework scope handling in `packages/cli/src/commands/init/tools/index.ts` so `resolvePackScopes` produces a per-pack desired _end-state_ (defaulting to current placement) and a new reconciliation step diffs current vs desired into `adds`/`removes`. Removes are interactive-only and batch-confirmed; non-interactive paths are strictly additive. Auto-sync stays correct because `affectedScopes` only ever records changed scopes (manifests are per-scope).

**Tech Stack:** TypeScript (ESM), Node 22, vitest, commander-based CLI.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `fix(p01-t01): make non-interactive tools install additive`

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Fully sequential (`oat_plan_parallel_groups: []`). Tasks t01-t04 modify the
same file (`packages/cli/src/commands/init/tools/index.ts`) and the shared test
file (`commands/init/tools/index.test.ts`), and they have a strict dependency
chain: the end-state/reconciliation data model (t01) underpins the interactive
selector (t02), which produces the removals the confirmation gate (t03) guards,
and `affectedScopes` correctness (t04) depends on all prior changes. t05 is a
release closeout that must run last (after all source changes land). Disjoint
write boundaries do not exist here, so no parallel groups are declared.

---

## Phase 1: Additive scope management

### Task p01-t01: Additive end-state model + strictly-additive non-interactive paths

Introduce a desired _end-state_ + reconciliation diff, and make all
non-interactive install paths additive so they can never remove a scope. This
directly fixes the `--scope project` override that strips user.

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Write test (RED)**

Add tests (mocked dependencies, non-interactive context):

- `--scope project` with a pack currently at `user` → resolves end-state `both`;
  `removePackFromScope` is **not** called; `affectedScopes` includes `project`,
  not `user`.
- `--scope user` with a pack currently at `project` → end-state `both`; no
  removal.
- Default non-interactive set (no `--scope`) → existing placement preserved
  (regression guard for current behavior at lines ~506-519).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts`
Expected: New non-interactive additive tests fail (RED).

**Step 2: Implement (GREEN)**

- Add a reconciliation helper that diffs current `location` vs desired
  end-state per pack into `{ adds: ConcreteScope[]; removes: ConcreteScope[] }`.
- In `resolvePackScopes`, change the `--scope project|user` branches
  (~lines 483-495) to return the **union** of the requested scope with the
  pack's current placement (current `user` + `project` → `both`), never a
  narrower placement.
- Replace the reconciliation loop (~lines 757-780): drive `removePackFromScope`
  off the computed `removes` only, and guard so `removes` is always empty in
  non-interactive mode (assert/skip — never delete non-interactively).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts`
Expected: New tests pass (GREEN).

Update the existing move-semantics tests invalidated by this change:

- `index.test.ts` line ~598 `migrates user-eligible packs from project to user
scope by removing project canonical content` (asserts `removeDirectory` ×4) —
  convert to the additive/confirmed-removal flow (the destructive variant moves
  to t03) or retire.
- `index.test.ts` line ~621 `normalizes a both-scopes install to project by
removing user canonical content and agents` — same: now requires the t03
  confirmation path; convert or retire.
- Note: this non-interactive `--scope` change also invalidates a test in a file
  t01 does not edit (`commands/tools/install/index.test.ts` line ~227 — see
  t04). Expect that cross-file breakage; it is fixed in t04.

**Step 3: Refactor**

Extract the diff into a small pure function so it is unit-testable and reused by
later tasks. Keep handler thin per `packages/cli/AGENTS.md`.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "fix(p01-t01): make non-interactive tools install additive"
```

---

### Task p01-t02: Per-pack end-state selector (interactive)

Replace the binary "which packs at user scope" multiselect with a per-pack
single-select defaulting to current placement.

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Write test (RED)**

Add interactive tests (mock `selectWithAbort`):

- Pack currently at `user`, selection `both` → end-state `both`; project
  installed; user untouched (additive add).
- All packs left at their default (current placement) → zero adds, zero removes
  (no-op breeze-through).
- New (`not-installed`) pack → default offered is `resolvePackDefaultScope`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts`
Expected: New interactive selector tests fail (RED).

**Step 2: Implement (GREEN)**

- In `resolvePackScopes` interactive branch (~lines 522-541), for each selected
  user-eligible pack present `selectWithAbort` over `project / user / both`,
  default = current location (or `resolvePackDefaultScope` when `not-installed`).
- Remove the binary `buildUserScopeChoices` multiselect path (or repurpose its
  pre-check logic into the per-pack defaults).
- Return the desired end-state map consumed by t01's reconciliation.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts`
Expected: Tests pass (GREEN). Rework the existing interactive prompt test —
`index.test.ts` line ~398 asserts the `selectManyWithAbort` "Which packs should
install at user scope?" multiselect shape (with `checked` flags) that this task
removes — to assert the new per-pack `selectWithAbort` shape.

**Step 3: Refactor**

Reuse `formatInstalledLocation` for option labels; keep the option list
construction in a helper.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "feat(p01-t02): per-pack end-state scope selector"
```

---

### Task p01-t03: Batch removal confirmation gate

When the interactive end-states imply removals, show one change summary and
gate on a single confirmation before deleting anything.

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Write test (RED)**

Add interactive tests:

- Pack currently at `both`, selection `project` (drops user), confirm `Apply` →
  `removePackFromScope(userRoot)` called once; summary listed the removal;
  `affectedScopes` includes `user`.
- Same setup, decline `Apply` → `removePackFromScope` **not** called; zero
  filesystem changes; nothing installed.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts`
Expected: Confirmation-gate tests fail (RED).

**Step 2: Implement (GREEN)**

- After resolving end-states, collect all `removes`. If non-empty and
  interactive, render a batch summary (`+ pack@scope` / `- pack@scope`) and gate
  on a single `selectWithAbort` yes/no.
- On decline → return early, mutate nothing (no installs, no removals).
- On confirm → apply `adds` then confirmed `removes`; record changed scopes in
  `affectedScopes`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts`
Expected: Tests pass (GREEN).

**Step 3: Refactor**

Format the summary via a pure helper for snapshot-friendly testing.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "feat(p01-t03): batch-confirm scope removals in interactive install"
```

---

### Task p01-t04: Auto-sync scoping regression guard (test-only)

Pin the no-prune guarantee: an additive install must auto-sync only the scopes
it actually changed. The production behavior is produced by t01-t03; this task
is expected to be **test-only** (no production change unless `affectedScopes`
turns out to be wrong), and it fixes the obsolete cross-file test.

**Files:**

- Modify: `packages/cli/src/commands/tools/install/index.test.ts`
- Modify: `packages/cli/src/commands/init/tools/index.ts` (only if `affectedScopes` needs a correction)

**Step 1: Write test (RED)**

- Rewrite the obsolete move-semantics test `commands/tools/install/index.test.ts`
  line ~227 `auto-syncs both the removed scope and target scope for pack
migrations` (currently asserts `syncScopes === ['project', 'user']` for
  `--scope user` over a project pack). Under the additive model that case is
  `both` with no removal, so it should assert a single additive scope and no
  `removePackFromScope` call. (Rename away from "migrations".)
- Add: additive project install over a pack at `user` → `autoSync` (or the
  `affectedScopes` metadata via `consumeInitToolsRunMetadata`) is invoked with
  `{project}` only; `user` absent → the user manifest/scope is never re-synced
  or pruned.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/install/index.test.ts`
Expected: Rewritten/added assertions reflect additive behavior (RED if `affectedScopes` is wrong).

**Step 2: Implement (GREEN)**

- Expect no production change — t01-t03 already make `affectedScopes` record
  exactly the scopes that received an add or a confirmed remove. Adjust
  `index.ts` only if a test surfaces an `affectedScopes` defect.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/install/index.test.ts`
Expected: Tests pass (GREEN).

**Step 3: Refactor**

Remove any now-dead code paths from the old move semantics.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Full CLI suite + lint + type-check pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/tools/install/index.test.ts
git commit -m "test(p01-t04): pin additive auto-sync scoping guarantee"
```

---

### Task p01-t05: (release) Lockstep public-package version bump + release:validate

Repo guardrail (root `AGENTS.md`): a change to shipped CLI functionality
(`packages/cli/src/commands/init/tools/index.ts`) requires bumping all five
public packages together in the same PR, and `pnpm release:validate` is the
definition of done for publishable-package changes. Run this as the final
closeout once t01-t04 are complete.

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Understand the requirement**

The lockstep public set is `packages/cli`, `packages/control-plane`,
`packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms`. All
five versions move together (patch bump for this bug fix) even though only the
CLI package changed source.

**Step 2: Implement**

- Bump the `version` field of all five public packages in lockstep (patch).
- Update any generated lockfile/version artifacts the bump touches.

**Step 3: Verify**

Run: `pnpm release:validate`
Expected: Passes (publishable-package definition of done).

Also confirm consistency:
Run: `pnpm run cli -- project validate-plan --project-path .oat/projects/shared/tools-install-additive-scope`
Expected: Passes.

**Step 4: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
git commit -m "chore(p01-t05): lockstep public package version bump for additive tools install"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope  | Type     | Status | Date       | Artifact                                            |
| ------ | -------- | ------ | ---------- | --------------------------------------------------- |
| p01    | code     | passed | 2026-06-20 | reviews/archived/final-review-2026-06-20.md         |
| final  | code     | passed | 2026-06-20 | reviews/archived/final-review-2026-06-20.md         |
| design | artifact | passed | 2026-06-19 | design.md (lightweight, collaborative)              |
| plan   | artifact | passed | 2026-06-20 | reviews/archived/artifact-plan-review-2026-06-20.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks — additive scope resolution, per-pack end-state selector, batch-confirm removals, auto-sync scoping guard, lockstep release closeout

**Total: 5 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: N/A (quick mode)
- Discovery: `discovery.md`
