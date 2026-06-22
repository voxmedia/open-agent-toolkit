---
oat_generated: true
oat_generated_at: 2026-06-22
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-frozen-cuprate-d30e/.oat/projects/shared/oat-init-scope-selection
---

# Code Review: final (independent v2 pass)

**Reviewed:** 2026-06-22
**Scope:** Final review of `oat init` guided-setup per-pack scope selection (opt-in gate)
**Files reviewed:** 12 source/test/asset files (of 32 changed; remainder are OAT tracking artifacts and docs prose)
**Commits:** 8be6fef3..HEAD (21 commits; 6 source/fix/release commits)

## Summary

The project replaces guided setup's hard-coded `scope: 'project'` with an opt-in `Customize per-pack scope? (y/N)` gate that routes to either the existing per-pack `Where should X install?` radio (yes) or additive per-pack defaults (no). The implementation is correct, the additive (never-remove) guarantee is structurally enforced and well-tested, non-interactive paths never prompt and never remove, and the release closeout (5-package lockstep bump + `public-package-versions.json`) is correct. Focused tests (111), CLI lint, type-check, and `pnpm release:validate` all pass. The single deferred Medium — the gate runs before pack selection rather than after, contrary to the discovery wording — is a defensible UX refinement, not a correctness defect, and I concur with accepting it as a tracked follow-up (`bl-1b29`).

## Findings

### Critical

None

### Important

None

### Minor

- **Gate ordering deviates from discovery wording (deferred Medium, re-confirmed)** (`packages/cli/src/commands/init/index.ts:658-663`)
  - Issue: `promptForScopeSelectionMode` is invoked at index.ts:658, before `dependencies.runToolPacks(guidedContext)` at index.ts:663. Pack selection (`selectManyWithAbort`) happens _inside_ `runInitTools`, so the gate is presented BEFORE pack selection. Discovery requires the gate "after pack selection" (`discovery.md:41,76`). Two user-facing consequences: (1) the gate is shown even when the user subsequently selects zero user-eligible packs (a wasted prompt — the `scopeSelection` value is then discarded because `resolvePackScopes` returns early at tools/index.ts:524 when `eligiblePacks.length === 0`); (2) the prompt cannot name the specific eligible packs it governs.
  - Disposition: **Accept / artifact-alignment.** The yes/no/default semantics, additive guarantee, and non-interactive safety are all correct, so this is a UX refinement rather than a correctness or safety defect — appropriately Medium, downgraded here to Minor for the final gate. The deviation is recorded in `implementation.md` "Deviations from Plan / Design" and tracked as backlog item `bl-1b29` ("Move guided setup scope gate after pack selection"), whose acceptance criteria also cover the no-eligible-pack skip path. No code change is required to pass the final gate; either close `bl-1b29` or annotate the discovery "after pack selection" wording as a known, accepted deviation.
  - Suggestion: When closing the follow-up, move the gate into the tools flow after `selectedPacks` is known (and skip it entirely when no user-eligible pack is selected), per `bl-1b29`.

- **`defaults`-mode dead-branch comment slightly stale** (`packages/cli/src/commands/init/tools/index.ts:557-573`)
  - Issue: The block comment above the `if (!context.interactive)` branch (lines 557-564) still reads as the combined "Defaults-mode/non-interactive resolution" path, but after fix `7ba521e1` the `defaults` mode is handled earlier (lines 529-537) and this branch now only covers the non-interactive case. The logic is correct; only the comment lags.
  - Suggestion: Trim the comment to describe the non-interactive path only, since `defaults` mode no longer falls through here.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md` (quick mode — no `spec.md`/`design.md`, correctly N/A). Verified against actual source: `packages/cli/src/app/command-context.ts`, `packages/cli/src/commands/init/index.ts`, `packages/cli/src/commands/init/tools/index.ts`, `tools/shared/skill-manifest.ts`, and the three test files; plus the package.json bumps and `public-package-versions.json`.

### Requirements Coverage

| Requirement                                                              | Status      | Notes                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Interactive `--setup` presents `Customize per-pack scope? (y/N)` gate | implemented | `promptForScopeSelectionMode` (index.ts:567-593); test `index.test.ts:1359/1377` pins the exact prompt string and call count. Caveat: shown before, not after, pack selection (see Minor finding).                    |
| 2. Gate "no" applies additive per-pack defaults (no force, no removals)  | implemented | `scopeSelection: 'defaults'` → `resolvePackDefaultEndState` preserves current placement else `resolvePackDefaultScope` (tools/index.ts:529-537, 598-612). Not a blanket project force. Test `tools/index.ts:460-507`. |
| 3. Gate "yes" reuses per-pack `Where should X install?` radio            | implemented | `scopeSelection: 'interactive'` falls through to the existing per-pack `selectWithAbort` loop (tools/index.ts:575-590). Test `index.test.ts:1359` asserts `scopeSelection: 'interactive'`; resolver tests at 529-552. |
| 4. Non-interactive guided setup applies defaults with no gate prompt     | implemented | `promptForScopeSelectionMode` returns `'defaults'` when `!context.interactive` (index.ts:571-573); test `index.test.ts:1770` asserts `selectWithAbort` never called. Local-path prompt also skipped (index.ts:679).   |
| 5. Additive guarantee preserved (no scope removal during guided setup)   | implemented | `defaults` end-states never narrow placement → zero `removes` from `reconcilePackScope`; non-interactive removal guard throws if a removal is ever staged (tools/index.ts:911-920). Tests assert no remove\* calls.   |
| 6. Release guardrail: 5-package lockstep bump + release:validate         | implemented | All five public packages 0.1.29→0.1.30; `public-package-versions.json` updated for the 4 docs-dep packages (control-plane intentionally absent). `pnpm release:validate` passes for 5 packages.                       |

### Extra Work (not in declared requirements)

- **Verification-hardening (`469a0dea`):** Added a `cli:source` root script (tsx without `bundle-assets.sh`) and routed OAT-repo docs index generation through it, plus a focused scaffold-test timeout. In-scope and sound: it prevents docs prebuild from rebundling shared CLI assets while CLI tests read them under concurrent Turbo runs. The `isOatRepo` scaffold branch and the documented commands (`apps/oat-docs/AGENTS.md`, docs prose) are updated consistently; the non-OAT scaffold branch still emits `oat docs generate-index`.
- **Bundle-consistency timeout (`9d5425ae`):** Gave the git/bundle-shelling test a realistic 15s timeout. Mechanical and low-risk; does not weaken assertions.
- These are defensible verification stabilizations, not scope creep, and are recorded in `implementation.md` deviations.

## Design Alignment

Not applicable for architecture/data-model/API design artifacts (quick mode — no `design.md`). Implementation-level alignment with the plan's stated architecture (scope-selection mode threaded on `CommandContext` → `runInitTools` → `resolvePackScopes`; single default-resolution helper `resolvePackDefaultEndState` reused by defaults-mode, non-interactive, and the interactive selector) is satisfied. `packages/cli/AGENTS.md` conventions hold: no `console.*` (all output via `context.logger`), no `../`/`src/`/`@/*` imports, thin handler with logic in helpers.

## Fix-Commit Soundness

- `7ba521e1` (noninteractive-safe): Reorders `resolvePackScopes` so `defaults` mode resolves _before_ the `--scope` additive-union path, and gates the union path on `scopeSelection !== 'interactive'`. This correctly makes guided `scopeSelection` take precedence over a concrete global `--scope project`, closing the original p01-review Critical/Important. It also guards the guided local-path `selectManyWithAbort` behind `context.interactive`. Sound and in-scope; not a sign of fragility.
- `9d5425ae` / `469a0dea`: Test-timeout and build-scheduling stabilizations as above — sound.

## Verification Commands

Run these to verify the implementation:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/index.test.ts src/commands/init/guided-setup.test.ts src/commands/init/tools/index.test.ts
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm release:validate
```

Reviewer results (all passing): focused suite 111/111; lint 0 warnings/0 errors; type-check clean; release:validate passed for 5 public packages.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks. Both findings are Minor and non-blocking; the gate-ordering item is already tracked as backlog `bl-1b29` and may be received as an explicit deferral rather than an in-project fix task.
