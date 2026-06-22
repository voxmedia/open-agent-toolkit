---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-06-22
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_plan_hill_phases: ['p01']
oat_auto_review_at_hill_checkpoints: true
oat_generated: false
oat_template: false
---

# Implementation Plan: oat-init-scope-selection

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Make `oat init` guided setup surface per-pack scope selection via an opt-in gate, instead of hard-coding `scope: 'project'` and bypassing the per-pack selector.

**Architecture:** Add a scope-selection mode to the tools-install path so a caller can request "apply per-pack defaults without prompting" independent of `context.interactive`. Guided setup (`commands/init/index.ts`) drops the forced `scope: 'project'` and instead presents a single `Customize per-pack scope? (y/N)` gate: yes → the existing per-pack `Where should X install?` radio loop; no (and non-interactive) → additive per-pack defaults with no prompts.

**Tech Stack:** TypeScript (ESM), Node 22, vitest, commander-based CLI.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add scope-selection mode to tools install`

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Fully sequential (`oat_plan_parallel_groups: []`). t02 (guided-setup gate) consumes
the scope-selection mechanism introduced in t01, and t03 is a release closeout
that must run after all source changes land. Tasks touch overlapping files
(`commands/init/tools/index.ts`, `commands/init/index.ts`) with a strict
dependency chain, so no parallel groups are declared.

---

## Phase 1: Opt-in scope selection in guided setup

### Task p01-t01: Scope-selection mode for the tools-install resolver

Introduce an explicit way to request per-pack default scopes without prompting,
even in an interactive session, so guided setup's "no" path can apply defaults
while the pack-selection prompt stays interactive.

**Files:**

- Modify: `packages/cli/src/app/command-context.ts` (the `CommandContext` type owner — add the optional scope-selection field here; include `command-context.test.ts` only if `buildCommandContext` default behavior changes)
- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Write test (RED)**

Add resolver tests (mocked dependencies, interactive context):

- New mode `defaults` (name TBD in impl — e.g. an optional `scopeSelection:
'interactive' | 'defaults'` arg threaded into `runInitTools`/`resolvePackScopes`):
  with `scopeSelection: 'defaults'` and `context.interactive: true`, each
  user-eligible pack resolves to its default end-state (current placement when
  installed, else `resolvePackDefaultScope`) and the per-pack `selectWithAbort`
  scope prompt is **not** called.
- Default mode (`interactive`, the existing behavior) still runs the per-pack
  radio — regression guard for `oat tools install`.
- Additive guarantee holds in `defaults` mode: a pack at `user` is not removed.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts`
Expected: New `defaults`-mode tests fail (RED).

**Step 2: Implement (GREEN)**

- Thread an explicit scope-selection signal that rides on `context` (a new
  field on `CommandContext` / the guided context object) — `runToolPacks`
  (= `runInitToolsWithDefaults`) takes only `context`, so there is no call-site
  arg seam. `runInitTools` reads the signal off context and passes it to
  `resolvePackScopes` (default `interactive` to preserve current `oat tools
install` behavior).
- In `resolvePackScopes`, when the signal is `defaults`, take the existing
  Path-B default resolution (current placement, else `resolvePackDefaultScope`)
  regardless of `context.interactive`, instead of the per-pack prompt loop.
- Keep the explicit `--scope project|user` additive-union path and the
  non-interactive path unchanged.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts`
Expected: Tests pass (GREEN).

**Step 3: Refactor**

Factor the default end-state resolution into a single helper reused by both the
non-interactive path and the new `defaults` mode. Keep the handler thin per
`packages/cli/AGENTS.md`.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "feat(p01-t01): add scope-selection mode to tools install resolver"
```

---

### Task p01-t02: Opt-in scope gate in `oat init` guided setup

Replace the forced `scope: 'project'` with a `Customize per-pack scope? (y/N)`
gate that routes to the per-pack radio (yes) or additive defaults (no).

**Files:**

- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/init/index.test.ts`

**Step 1: Write test (RED)**

Add guided-setup tests (mock the gate prompt + `runToolPacks`):

- Interactive + gate "yes" → tool packs installed via the interactive per-pack
  selector (`scopeSelection: 'interactive'`, scope not forced to `project`).
- Interactive + gate "no" → tool packs installed with `scopeSelection:
'defaults'`; no per-pack scope prompts; placement is additive per-pack default
  (not a blanket force to `project`).
- Non-interactive (`OAT_NON_INTERACTIVE`/`!context.interactive`) → no gate
  prompt; defaults applied.
- The forced `scope: 'project'` override is gone (no test asserts it).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/index.test.ts`
Expected: New gate tests fail (RED).

**Step 2: Implement (GREEN)**

- In `runGuidedSetupImpl` (~line 629), remove `{ ...context, scope: 'project' }`.
- When `context.interactive`, prompt the gate `Customize per-pack scope? (y/N)`
  (default No) via `selectWithAbort`.
- Set the scope-selection signal on the guided context object passed to
  `runToolPacks(guidedContext)` (the same context-borne signal t01 threads
  through `runInitTools` → `resolvePackScopes`; `runToolPacks` takes only
  `context`, so it is not a separate arg): `interactive` on yes, `defaults` on
  no. Non-interactive skips the gate and uses `defaults`.
- Ensure pack-selection interactivity is unaffected (the gate only controls
  scope resolution, not pack selection).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/index.test.ts`
Expected: Tests pass (GREEN); update any existing guided-setup test that asserted the forced `project` scope.

**Step 3: Refactor**

Keep the gate prompt construction in a small helper; route output through the
CLI logger (no direct `console.*`).

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Full CLI suite + lint + type-check pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/index.ts packages/cli/src/commands/init/index.test.ts
git commit -m "feat(p01-t02): opt-in per-pack scope gate in oat init guided setup"
```

---

### Task p01-t03: (release) Lockstep public-package version bump + release:validate

Repo guardrail (root `AGENTS.md`): changing shipped CLI functionality
(`commands/init`) requires bumping all five public packages together and running
`pnpm release:validate` as definition of done. Run last, after t01-t02.

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json` (hand-edited; tracks only the 4 docs-dep packages — `cli`, `docs-config`, `docs-theme`, `docs-transforms` — `control-plane` is intentionally absent)

**Step 1: Understand the requirement**

Lockstep public set: `cli`, `control-plane`, `docs-config`, `docs-theme`,
`docs-transforms`. All five versions move together (patch bump) from the current
published version.

**Step 2: Implement**

- Patch-bump all five public package versions in lockstep (the 5 package.json
  files, incl. `control-plane`).
- Hand-update the 4 version entries in `public-package-versions.json` (`cli`,
  `docs-config`, `docs-theme`, `docs-transforms`) to match the bump — this asset
  is hand-maintained (no regen script) and intentionally excludes
  `control-plane`.

**Step 3: Verify**

Run: `pnpm release:validate`
Expected: Passes for 5 public packages.

Also: `pnpm run cli -- project validate-plan --project-path .oat/projects/shared/oat-init-scope-selection`
Expected: Passes.

**Step 4: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p01-t03): lockstep public package version bump for oat init scope gate"
```

---

## Reviews

| Scope | Type     | Status  | Date       | Artifact                                            |
| ----- | -------- | ------- | ---------- | --------------------------------------------------- |
| p01   | code     | passed  | 2026-06-22 | reviews/archived/p01-review-2026-06-22-v2.md        |
| final | code     | pending | -          | -                                                   |
| plan  | artifact | passed  | 2026-06-22 | reviews/archived/artifact-plan-review-2026-06-22.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks — scope-selection resolver mode, opt-in guided-setup gate, lockstep release closeout
- Post-task verification hardening: docs index generation now uses the source CLI path to avoid rebundling shared CLI assets during concurrent Turbo verification.

**Total: 3 tasks**

Implementation tasks and verification hardening complete; awaiting final review.

---

## References

- Design: N/A (quick mode — straightforward fix)
- Spec: N/A (quick mode)
- Discovery: `discovery.md`
