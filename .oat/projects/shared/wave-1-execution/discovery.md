---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-09-05
oat_generated: false
---

# Discovery: wave-1-execution

## Initial Request

Execute Wave 1 ("CLI resolution and asset correctness") of the operator-approved
2026-08-31 execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`) as a thin
wrapper OAT project via `oat-wave-execute`. The wave has four lanes in two
groups, each governed entirely by its immutable external plan:

- `2026-08-30-use-configured-docs-index-paths.md` — resolve docs index
  generation from configuration instead of the invoking directory
  (`BL-260718-fix-oat-docs-generate-index`); group 1.
- `2026-08-30-validate-assets-bundle-structure.md` — fail closed on a partial
  or malformed bundled-assets root (`BL-260827-fail-closed-on-partial-or`);
  group 1.
- `2026-08-30-make-assets-errors-override-aware.md` — override-aware asset
  error remedies (`BL-260827-override-aware-remedy-text`); group 2, ordered
  successor of the structural validator, `BLOCKED` until that lane merges into
  the wave branch and its readiness check passes.
- `2026-09-02-add-exclusions-to-docs-index-generation.md` — exclusion
  mechanism for docs index generation (`BL-260902-add-an-exclusion-mechanism`);
  group 2, ordered successor of the docs-index path lane, `BLOCKED` until that
  lane merges and its step 1 passes.

The operator approved the six-wave composition on 2026-09-05 ("let it rip,
reset to origin/main and proceed") and authorized autonomous execution through
merge: the root orchestrator creates the wave PR and merges it once CI, the
Bugbot review, and the final gate are green, then proceeds to the next wave.

## Inherited Contract (from `oat-wave-execute`)

- The wrapper never restates, narrows, or overrides a source plan. Each phase's
  entire contract is its external plan; the wrapper adds ordering, worktree
  isolation, wrapper-level DoD gates, review mapping, and bookkeeping.
- Source-plan STOP conditions are honored verbatim; a tripped STOP parks the
  lane (recorded in `state.md` `oat_blockers` and `implementation.md`) and
  never weakens or silently narrows the plan's requirements.
- Reviewed history is append-only: fix rounds land as new commits; no reviewed
  SHA is amended.
- Every fix disposition stores a verification record (what / how / where).
- Integration DoD gates run after every fan-in before any bookkeeping edit.
- Configured cross-runtime gates are mandatory and run exactly as configured;
  `passed` is the only terminal gate-row state.
- Lockstep release files (the five public package manifests,
  `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`) are
  owned by the wave fan-in step; no lane edits them (program rule, 2026-09-04).

## Key Decisions

1. **Workflow mode: quick.** All four lanes are bounded CLI fixes with complete,
   twice-reviewed external plans; the configured plan gate is sufficient
   pre-implementation rigor. No lightweight design artifact.
2. **Groups:** group 1 = docs-index paths (p01) and asset-bundle structure
   (p02) in separate worktrees at the same base, subject to the drift refresh
   confirming disjoint write surfaces. Group 2 = the two ordered successors
   (p03 asset errors, p04 docs-index exclusions), each dispatched only after its
   predecessor has merged into the wave branch and its own readiness check has
   passed against that exact tree; they run in parallel with each other because
   their surfaces (`packages/cli/src/fs/assets*` vs the docs index generator and
   config) are disjoint.
3. **Verification modes:** lanes run lane mode (focused tests, `pnpm check`,
   `pnpm type-check`, `pnpm run check:skill-bumps`, plus lint/format/validate
   when `.agents/skills` changes). The fan-in establishes the single lockstep
   bump above freshly fetched `origin/main` before group 1's integration gates
   and retains it; final-wave mode re-checks above main before the PR.
4. **Dispatch policy:** managed / `high` for implementers and reviewers
   (operator routing preference). Cross-model review on every lane: p01/p04
   touch config resolution and file-writing safety; p02/p03 touch fail-closed
   asset validation.
5. **Completion tail:** under autonomous execution the `oat project archive` /
   S3 / active-pointer-clear tail is deferred to program close and recorded in
   the program ledger as `completion tail: deferred to program close`; per-wave
   recap deferred likewise.
6. **Remote branch name:** `origin/wave-1-execution` still holds the merged
   2026-08 program's branch, so this wave's integration branch pushes to
   `origin/wave-1-execution-2026-09` (logged as a rule-1 deviation; the local
   branch keeps the canonical name).

## Constraints

- No force-push, no rewriting reviewed commits, no bypassing branch policy, no
  weakening tests or gates, no discarding unrelated work.
- Lanes that change `.agents/skills` (p01 may touch `oat-docs-bootstrap`
  narration) run `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills`.
- Exactly one lockstep bump for the wave, owned by the fan-in.
- Do not absorb draft PR #190 (ReviewPlan) work; re-check its landing rows if
  it merges mid-wave.

## Success Criteria

- All four source plans' `## Done criteria` confirmed and recorded in
  `implementation.md`; the two successors flipped `BLOCKED` → `READY` with the
  evidence the program's group-2 gate requires before dispatch.
- Per-phase reviews, final review, and the configured implementation exit gate
  all `passed` with fresh evidence on the reviewed head.
- Integration DoD gates green after each fan-in and on the final branch; CI and
  Bugbot clean on the wave PR; PR merged; `wave-close wave-1` recorded.

## Out of Scope

- Any W2–W6 plan; the truthfulness residue; PR #190's content.
- Backlog reprioritization; new plans; program recomposition (beyond parking a
  lane on a tripped STOP).
