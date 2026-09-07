---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-09-06
oat_generated: false
---

# Discovery: wave-2-execution

## Initial Request

Execute Wave 2 ("Skill contract truthfulness") of the operator-approved
2026-08-31 execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`) as a thin
wrapper OAT project via `oat-wave-execute`. Five lanes in three groups, each
governed entirely by its immutable external plan:

- `2026-08-30-repair-bundled-skill-contract-drift.md` — repair four verified
  bundled-skill contract defects as one ordered release batch
  (`BL-260819-repair-verified-bundled-skill`); group 1, merges first because it
  establishes the corrected canonical prose baseline.
- `2026-08-30-harden-codex-skill-anaphora-guard.md` — bounded anaphora guard
  in the codex-skill contract test (`BL-260827-harden-the-codex-skill-below`);
  group 2.
- `2026-08-30-guard-docs-app-mirrors-of-skill-prose.md` — guard docs-app
  mirrors of contract-tested skill prose
  (`BL-260818-extend-guarded-prose-contract`); group 2.
- `2026-08-30-require-named-lifecycle-skills-to-be-loaded.md` — require
  lifecycle orchestrators to load every named execution skill, with a
  discovery sweep for unclassified directives
  (`BL-260718-mandatory-skill-load-clause`); group 2.
- `2026-09-02-document-patch-and-restore-for-lost-child-handles.md` —
  fail-closed patch-and-restore recovery for lost child handles, with a
  binary-safe capture script (`BL-260902-document-patch-and-restore`); group
  3, after the named-skill lane (shared `oat-project-implement` references and
  version pin).

The operator approved the six-wave composition and fully autonomous execution
(PR creation and merge by the root orchestrator once CI, Bugbot, and the final
gate are green) on 2026-09-05; W1 merged as PR #262 and closed as PR #263.

## Inherited Contract (from `oat-wave-execute`)

- The wrapper never restates, narrows, or overrides a source plan. Each phase's
  entire contract is its external plan; the wrapper adds ordering, worktree
  isolation, wrapper-level DoD gates, review mapping, and bookkeeping.
- Source-plan STOP conditions are honored verbatim; a tripped STOP parks the
  lane and never weakens or silently narrows the plan's requirements.
- Reviewed history is append-only: fix rounds land as new commits; no reviewed
  SHA is amended; the Reviews ledger keeps superseded events as their own rows.
- Every fix disposition stores a verification record (what / how / where).
- Integration DoD gates run after every fan-in before any bookkeeping edit.
- Configured cross-runtime gates are mandatory; `passed` is the only terminal
  gate-row state.
- Lockstep release files are owned by the wave fan-in (one bump before the
  first group's integration gates, retained afterward); lanes run lane-mode
  gates only. Skill `version:` bumps and their pins in
  `packages/cli/src/validation/skills.test.ts` stay with lanes; at most one
  lane per parallel group writes that file.

## Key Decisions

1. **Workflow mode: quick.** All five lanes are bounded skill/test/docs fixes
   with twice-reviewed external plans; the configured plan gate is sufficient
   pre-implementation rigor.
2. **Groups from the program, confirmed by recon:** p01 runs alone first
   (ungrouped; `validate-plan` rejects singleton groups); group 2 = p02, p03,
   p04 in parallel worktrees at the post-p01 tip, subject to the drift refresh
   confirming disjoint write surfaces (the named-lifecycle lane is the only
   group-2 writer of `validation/skills.test.ts` pins; the docs-mirrors lane
   bumps no skill); p05 runs alone after group 2.
3. **Verification modes:** lane mode per lane (focused tests, `pnpm check`,
   `pnpm type-check`, `pnpm run check:skill-bumps`, plus `pnpm lint`,
   `pnpm format`, and `pnpm oat:validate-skills` because every lane changes
   `.agents/skills`); the fan-in establishes the single lockstep bump above
   freshly fetched `origin/main` before p01's integration gates and retains it.
4. **Dispatch policy:** managed / `high` for implementers and reviewers;
   Codex read-only cross-model review in every lane (contract-test and
   lifecycle-prose surfaces; p05 is a recovery/containment surface).
5. **Conventions carried from W1:** successor readiness recorded and flipped in
   fan-in bookkeeping; address-now sweeps for Medium/Minor findings through the
   original implementer handle; lane-commit SHA mappings recorded at every
   rebase; follow-up ledger filed as backlog items before the final gate;
   local branch `wave-2-execution` pushes to `origin/wave-2-execution-2026-09`.
6. **Completion tail and recap:** deferred to program close.

## Constraints

- No force-push, no rewriting reviewed commits, no bypassing branch policy, no
  weakening tests or gates, no discarding unrelated work.
- Every lane runs `oat sync --scope all` after skill edits and inspects the
  provider-view diff before committing; provider-view deletions are a STOP.
- Exactly one lockstep bump for the wave, owned by the fan-in.
- Draft PR #190 rewrites `oat-project-implement` references that p04 and p05
  touch; if it merges before those lanes start, apply their landing-event rows.

## Success Criteria

- All five source plans' `## Done criteria` confirmed and recorded in
  `implementation.md`.
- Per-phase reviews, final review, and the configured implementation exit gate
  all `passed` with fresh evidence on the reviewed head.
- Integration DoD gates green after each fan-in and on the final branch; CI and
  Bugbot clean on the wave PR; PR merged; `wave-close wave-2` recorded.

## Out of Scope

- Any W3–W6 plan; PR #190's content; backlog reprioritization; program
  recomposition beyond parking a lane on a tripped STOP.
