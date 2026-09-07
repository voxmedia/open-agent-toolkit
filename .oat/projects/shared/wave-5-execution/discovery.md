---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-09-07
oat_generated: false
---

# Discovery: wave-5-execution

## Initial Request

Execute Wave 5 ("Program-intake follow-ups") of the operator-approved
2026-08-31 execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`) as a thin
wrapper OAT project via `oat-wave-execute`. Eleven lanes in five groups, each
governed entirely by its immutable external plan:

- Group 1 (parallel): `2026-09-02-recover-committed-review-artifacts-after-post-selection-failures.md`
  (`BL-260902-recover-committed-review`);
  `2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md`
  (`BL-260902-keep-pjm-init-provider`);
  `2026-09-02-route-incomplete-quick-projects-to-quick-start.md`
  (`BL-260830-clarify-quick-mode-resume`).
- Group 2 (parallel, after group 1): `2026-09-02-retry-gate-project-log-finalization-across-index-locks.md`
  (`BL-260902-retry-gate-project-log`, after the gate plan);
  `2026-09-02-add-oat-config-unset-command.md`
  (`BL-260830-add-oat-config-unset-command`, after the instruction-sync plan);
  `2026-09-02-validate-skill-script-references-against-pack-manifests.md`
  (`BL-260902-validate-every-shipped-skill`).
- Group 3 (sequential): `2026-09-02-enforce-external-plan-readiness-contract.md`
  (`BL-260830-distinguish-external-plan`) then
  `2026-09-02-make-autonomous-project-recap-capability-aware.md`
  (`BL-260902-make-autonomous-project-recap`).
- Group 4 (sequential): `2026-09-02-defer-activeproject-clearing-on-archive-completions.md`
  (`BL-260902-defer-activeproject-clearing`) then
  `2026-09-04-make-terminal-project-status-agree-with-revision-plans.md`
  (`BL-260901-make-terminal-project-status`).
- Group 5: `2026-09-02-make-consolidated-project-retirement-semantic.md`
  (`BL-260902-make-consolidated-project`).

The operator approved the six-wave composition and fully autonomous execution
(PR creation and merge by the root orchestrator once CI, Bugbot, and the final
gate are green) on 2026-09-05, and on 2026-09-06 asked for the remaining waves
to start automatically once the Lite workflow PR #264 merged; W1–W4 merged as
PRs #262, #267, #269, #271 (closed as #263, #268, #270, #272); PR #264 merged
as `0f47bf700` (lockstep 0.2.62) and is this wave's base.

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

- **Groups:** [p01, p02, p03], [p04, p05, p06], then p07 → p08, p09 → p10, p11,
  as the program composed them (five seams — the gate module, the
  documentation config, the completion skill, the next skill, and the
  contract-test version pins — each touched by at most one lane at a time).
  Concurrency ceiling 3 (operator decision). One wrapper, not a split, per the
  operator's 2026-09-05 decision.
- **Lockstep:** one fan-in bump (≥ 0.2.63 above fresh `origin/main`) with the
  manifest restamp in the same commit, retained through later fan-ins. The
  restamp triggers wave 4's advisory; that is expected.
- **One bump per skill per PR:** a later lane that edits a skill an earlier
  lane already bumped in this PR does not bump it again.
- **Review posture:** every lane gets a root-owned adversarial review with
  disposition-verification rounds that execute prose snippets verbatim and
  probe the built CLI in a scratch project; final review over the integration
  diff, then the configured cross-family exit gate (foreground).
- **Conventions carried from W1–W4:** append-only Reviews ledger (gate rows are
  written by `oat gate review` and moved forward in place); address-now sweeps
  bounded to the reviewer's own one-line fixes; lane briefs carry forced-turbo
  gate forms, the real package filter, scratch hygiene, `mktemp -d` probe
  backups, project-scope sync, a two-round Codex cap, and pin location by
  version literal; wrapper authored from the program section and the recon;
  a docs or decision-record contradiction inside the integration diff's own
  rule is fixed in the wave; branch pushes to `origin/wave-5-execution-2026-09`.

## Constraints

- No force-push, no rewriting reviewed commits, no bypassing branch policy, no
  weakening tests or gates, no discarding unrelated work.
- Every lane that edits a canonical skill runs `pnpm run cli -- sync --scope project`
  afterwards and inspects the provider-view diff before committing;
  provider-view deletions are a STOP; `--scope all` is operator-only.
- Exactly one lockstep bump for the wave, owned by the fan-in.
- Draft PR #190 (head `63161897d`) is still open; each plan's
  `## Landing-event impact` row applies only if it merges before that lane
  starts.
- The Lite workflow (PR #264) is in the base: lanes whose plans cite files Lite
  changed re-anchor per the drift refresh; a Lite-mode branch is a consumer
  wherever a plan enumerates workflow modes.

## Success Criteria

- All eleven source plans' `## Done criteria` confirmed and recorded in
  `implementation.md`.
- Per-phase reviews, final review, and the configured implementation exit gate
  all `passed` with fresh evidence on the reviewed head.
- Integration DoD gates green after each fan-in and on the final branch; CI and
  Bugbot clean on the wave PR; PR merged; `wave-close wave-5` recorded.

## Out of Scope

- Any W6 plan; PR #190's content; backlog reprioritization; program
  recomposition beyond parking a lane on a tripped STOP.
