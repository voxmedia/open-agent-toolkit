---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-09-06
oat_generated: false
---

# Discovery: wave-4-execution

## Initial Request

Execute Wave 4 ("Delivered-project follow-ups") of the operator-approved
2026-08-31 execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`) as a thin
wrapper OAT project via `oat-wave-execute`. Three lanes in two groups, each
governed entirely by its immutable external plan:

- `2026-08-30-disable-configured-gates-per-project.md` — let one project
  disable configured lifecycle gates explicitly through a strict
  `oat_skill_gate_overrides` map in `state.md`, a project-aware
  `oat gate resolve`, a shared gate-posture setup contract, and distinct
  configured-but-disabled evidence in closeout, the next-step router, and
  progress (`BL-260712-per-project-override`); group 1.
- `2026-08-30-warn-on-non-sync-manifest-restamps.md` — surface every non-sync
  manifest `oatVersion` restamp (init, remove-skill, interactive status
  adoption) before `saveManifest` replaces producer evidence, and make a
  restamp-only sync apply say so (`BL-260826-warn-on-silent-oatversion`);
  group 1.
- `2026-08-30-emit-dispatch-stamp-with-resolver-json.md` — emit the canonical
  `dispatchStamp` beside `dispatchReport` from the dispatch-ceiling resolver
  and remove shim-oriented orchestrator guidance
  (`BL-260826-emit-the-dispatch-stamp-from`); group 2, after the gate-override
  lane because both write `review-skill-contracts.test.ts` and the
  `oat-project-implement` pins in `validation/skills.test.ts`.

The operator approved the six-wave composition and fully autonomous execution
(PR creation and merge by the root orchestrator once CI, Bugbot, and the final
gate are green) on 2026-09-05; W1 merged as PR #262 (closed as #263), W2 as
PR #267 (closed as #268), and W3 as PR #269 (closed as #270).

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
  p03 shares `review-skill-contracts.test.ts`, the `oat-project-implement`
  pins, and the `oat-project-implement` skill directory with p01, and the
  program orders it second. Concurrency ceiling 3 (operator decision).
- **Lockstep:** one fan-in bump (≥ 0.2.59 above fresh `origin/main`) with the
  manifest restamp in the same commit, retained through later fan-ins. The
  restamp is expected to trigger the advisory p02 introduces; that is the
  feature working, not drift.
- **One bump per skill per PR:** p01 bumps `oat-project-implement` in group 1;
  p03 edits a reference file under the same skill after the fan-in and does not
  bump it again.
- **Review posture:** every lane gets a root-owned adversarial review with
  disposition-verification rounds that execute prose snippets verbatim and walk
  each failure sequence; p01 additionally gets a weaker-anywhere review of the
  gate-resolution envelope and the router (a disabled gate must never read as
  passed, missing, or failed); final review over the integration diff, then
  the configured cross-family exit gate.
- **Conventions carried from W1–W3:** append-only Reviews ledger (gate rows are
  written by `oat gate review` and moved forward in place); address-now sweeps
  bounded to the reviewer's own one-line fixes; lane briefs carry forced-turbo
  gate forms, the real package filter, scratch hygiene, `mktemp -d` probe
  backups, project-scope sync, and a two-round Codex cap; the exit gate runs in
  the foreground; branch pushes to `origin/wave-4-execution-2026-09`.

## Constraints

- No force-push, no rewriting reviewed commits, no bypassing branch policy, no
  weakening tests or gates, no discarding unrelated work.
- Every lane that edits a canonical skill runs `pnpm run cli -- sync --scope project`
  afterwards and inspects the provider-view diff before committing;
  provider-view deletions are a STOP; `--scope all` is operator-only.
- Exactly one lockstep bump for the wave, owned by the fan-in.
- Draft PR #190 rewrites `oat-project-implement` references that p01's and
  p03's source plans cite; if it merges before a lane starts, apply that plan's
  landing-event row.

## Success Criteria

- All three source plans' `## Done criteria` confirmed and recorded in
  `implementation.md`.
- Per-phase reviews, final review, and the configured implementation exit gate
  all `passed` with fresh evidence on the reviewed head.
- Integration DoD gates green after each fan-in and on the final branch; CI and
  Bugbot clean on the wave PR; PR merged; `wave-close wave-4` recorded.

## Out of Scope

- Any W5–W6 plan; PR #190's content; backlog reprioritization; program
  recomposition beyond parking a lane on a tripped STOP.
