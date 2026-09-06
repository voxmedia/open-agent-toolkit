---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-09-06
oat_generated: false
---

# Discovery: wave-3-execution

## Initial Request

Execute Wave 3 ("Workflow durability and containment") of the operator-approved
2026-08-31 execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`) as a thin
wrapper OAT project via `oat-wave-execute`. Three lanes in two groups, each
governed entirely by its immutable external plan:

- `2026-08-30-require-repo-wide-call-site-sweeps.md` — require repo-wide
  call-site sweeps for cross-cutting options in the phase-implementer and
  implement contracts (`BL-260818-require-repo-wide-call-site`); group 1.
- `2026-08-30-journal-deterministic-smoke-worktrees-before-creation.md` —
  journal deterministic smoke worktrees before `git worktree add` so cleanup
  can reconcile reserved entries (`BL-260826-deterministic-smoke-tier-leaks`);
  group 1, with a dedicated ownership and deletion-safety review before
  integration.
- `2026-08-30-require-executable-backstops-for-contract-claims.md` — require
  executable backstops for standing contract claims in the skill-authoring
  and design contracts (`BL-260714-executable-backstops`); group 2, after
  group 1 provides current concrete examples.

The operator approved the six-wave composition and fully autonomous execution
(PR creation and merge by the root orchestrator once CI, Bugbot, and the final
gate are green) on 2026-09-05; W1 merged as PR #262 (closed as #263) and W2
merged as PR #267 (closed as #268).

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

- **Groups:** [p01, p02] then p03 ungrouped — write-disjoint within the group;
  p03 shares `create-oat-skill/SKILL.md` and `skills.test.ts` seams and the
  program orders it second. Concurrency ceiling 3 (operator decision).
- **Lockstep:** one fan-in bump (≥ 0.2.58 above fresh `origin/main`) with the
  manifest restamp in the same commit, retained through later fan-ins.
- **Review posture:** every lane gets a root-owned adversarial review with
  disposition-verification rounds that execute prose snippets verbatim and walk
  each failure sequence; the smoke lane additionally gets the program's
  dedicated deletion-safety review; final review over the integration diff,
  then the configured cross-family exit gate.
- **Conventions carried from W1–W2:** append-only Reviews ledger (gate rows are
  written by `oat gate review` and moved forward in place); one skill bump per
  PR; address-now sweeps bounded to the reviewer's own one-line fixes; lane
  briefs carry forced-turbo gate forms, the real package filter, scratch
  hygiene, and a two-round Codex cap; branch pushes to
  `origin/wave-3-execution-2026-09`.

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
