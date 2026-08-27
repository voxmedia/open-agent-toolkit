---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-08-26
oat_generated: false
---

# Discovery: wave-1-execution

## Initial Request

Execute Wave 1 ("Test and CI containment") of the operator-approved
2026-08-19 execution program
(`.oat/repo/reference/external-plans/2026-08-19-execution-program.md`) as a
thin wrapper OAT project via `oat-wave-execute`. The wave has two lanes, each
governed entirely by its immutable external plan:

- `2026-08-19-bound-smoke-cleanup-signal-wait.md` — bound the smoke cleanup
  SIGTERM harness wait (`BL-260818-bound-the-smoke-cleanup`).
- `2026-08-19-detect-behind-main-package-versions.md` — reject publishable
  package versions overtaken by current `origin/main`
  (`BL-260817-detect-branch-behind-published`).

The operator approved the four-wave composition and authorized session-scoped
autonomous execution (OAT autonomy signals for this process tree only), PR
creation, and merge by the root orchestrator once required gates pass.

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
- Configured cross-runtime gates (`workflow.gates.skills.*`) are mandatory and
  run exactly as configured; `passed` is the only terminal gate-row state.

## Key Decisions

1. **Workflow mode: quick.** Both lanes are S-sized defect fixes with complete
   external plans; one bundled pre-implementation artifact review (the
   configured plan gate) is sufficient rigor. No lightweight design artifact:
   the external plans carry the design.
2. **Parallel group:** the two lanes run as one parallel worktree group only if
   the wave-boundary drift refresh confirms disjoint write surfaces
   (`tools/smoke/runner` vs `tools/release` + `packages/cli/src/release`). The
   recon record in `plan.md` is non-authoritative grouping evidence.
3. **Merge order:** smoke-cleanup lane (p01) first so the bounded signal
   harness protects the release-guard lane's integration test run; then the
   package-version guard (p02); then the complete integration gate.
4. **Dispatch policy:** managed / `high` (Claude: `opus`) for implementers and
   reviewers, per the operator's routing instruction (Opus 5 for
   implementation and independent review; Sonnet 5 only for bounded read-only
   recon).
5. **Completion tail:** under autonomous execution the `oat project archive` /
   S3 / active-pointer-clear tail is deferred to program close and recorded in
   the program ledger as `completion tail: deferred to program close`.

## Constraints

- No force-push, no rewriting reviewed commits, no bypassing branch policy, no
  weakening tests or gates, no discarding unrelated work.
- Both lanes must run `pnpm lint` and `pnpm format` in addition to the
  repository definition of done because p01 touches `tools/smoke`.
- Neither lane changes shipped package versions; no lockstep public-package
  bump is expected in this wave (`release:check-versions` must still pass).
- Do not absorb ReviewPlan work, plugin discovery, or unrelated features.

## Success Criteria

- Both source plans' `## Done criteria` confirmed and recorded in
  `implementation.md`.
- Per-phase reviews, final review, and the configured implementation exit gate
  all `passed` with fresh evidence on the reviewed head.
- Full definition of done green on `wave-1-execution` (check, type-check,
  test, build, check:skill-bumps, release:check-versions, release:validate,
  build:docs) plus `pnpm lint` and `pnpm format`.
- Wave PR merged to `main`; program ledger W1 row closed with PR, merge SHA,
  and completion record.

## Out of Scope

- The other three program waves (W2–W4) — each is its own wrapper project.
- Production smoke cleanup semantics, npm registry queries, or changes to the
  public lockstep package set (explicitly out of scope in the source plans).

## Open Questions

None blocking; drift-refresh findings are recorded in `plan.md`.

## Risks

- **Drift since plan authoring (`6f443c08`):** low likelihood (planning PR
  only touched `.oat/`), low impact; mitigated by the wave-boundary drift
  refresh and each lane's in-worktree re-check.
- **Gate timeouts:** medium likelihood for wave-scoped reviews; mitigated by
  background gate dispatch with a completion watcher and `runId` artifact
  recovery before any rerun.

## Next Steps

Quick mode → straight to `plan.md` (wrapper plan from the `oat-wave-execute`
template), then the configured plan gate, then `oat-project-implement`.
