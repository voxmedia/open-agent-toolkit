---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-09-07
oat_generated: false
---

# Discovery: wave-6-execution

## Initial Request

Execute Wave 6 ("Truthfulness residue") of the operator-approved 2026-08-31
execution program
(`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`) as a thin
wrapper OAT project via `oat-wave-execute`. Five lanes in two groups, each
governed entirely by its external plan (including its dated wave-6 refresh
entry):

- Group 1 (parallel): `2026-09-03-populate-provider-reachability-evidence.md`
  (`BL-260903-populate-provider-reachability`);
  `2026-09-03-validate-review-ledger-paths-before-final-pr.md`
  (`BL-260903-pr-final-archives-reviews`);
  `2026-09-03-preserve-proto-named-config-keys.md`
  (`BL-260903-preserve-proto-named-config`).
- Group 2 (parallel, after the group-1 fan-in):
  `2026-09-04-honor-metadata-version-for-skills.md`
  (`BL-260904-honor-metadata-version`, after the pr-final lane releases
  `validation/skills.test.ts`);
  `2026-09-04-diagnose-canonical-skills-missing-from-provider-views.md`
  (`BL-260904-diagnose-canonical-skills`, after the reachability lane releases
  `info-tool.ts`).

The operator approved the six-wave composition and fully autonomous execution
(PR creation and merge by the root orchestrator once CI, Bugbot, and the final
gate are green) on 2026-09-05; W1–W5 merged as PRs #262, #267, #269, #271, #275
(closed as #263, #268, #270, #272, #276); the Lite workflow merged as #264. This
wave's base is `origin/main` after the wave-5 close PR #276 (lockstep 0.2.63).
This is the last wave of the program.

## Inherited Contract (from `oat-wave-execute`)

- The wrapper never restates, narrows, or overrides a source plan. Each phase's
  entire contract is its external plan; the wrapper adds ordering, worktree
  isolation, wrapper-level DoD gates, review mapping, and bookkeeping.
- Source-plan STOP conditions are honored verbatim; a tripped STOP parks the
  lane and never weakens or silently narrows the plan's requirements; a
  load-bearing current-state claim that does not reproduce on the built CLI is
  reported before any code changes (wave 5 parked a lane on one).
- Reviewed history is append-only: fix rounds land as new commits; no reviewed
  SHA is amended; the Reviews ledger keeps superseded events as their own rows.
- Every fix disposition stores a verification record (what / how / where).
- Integration DoD gates run after every fan-in before any bookkeeping edit.
- Configured cross-runtime gates are mandatory; `passed` is the only terminal
  gate-row state; the exit gate runs in the foreground with no other agents
  active.
- Lockstep release files are owned by the wave fan-in (one bump before the
  first group's integration gates, retained afterward); lanes run lane-mode
  gates only. Skill `version:` bumps and their pins stay with lanes; a lane
  that bumps a skill sweeps the old literal repo-wide (plain and escaped) and
  runs `pnpm test:smoke`.

## Key Decisions

- **Groups:** [p01, p02, p03] then [p04, p05], as the program composed them
  (two ordered seams — `validation/skills.test.ts` p02 → p04 and
  `info-tool.ts` p01 → p05 — each touched by at most one lane at a time;
  every within-group write intersection is empty per the recon). Concurrency
  ceiling 3 (operator decision).
- **Refreshes in the plans:** the wave-boundary refresh (anchors, the p02
  version premise, the p03 caller inventory with the W5 `oat config unset`
  consumer, the p04 pin and decision premises plus the `oat-*` validator
  coverage amendment, seam ownership) was applied to the five plan files as
  dated entries before dispatch (`DR-260907-pre-dispatch-refreshes-live`,
  commit `ceeac1149`); the wrapper stays single-contract.
- **Lockstep:** one fan-in bump (0.2.63 → 0.2.64 above fresh `origin/main`)
  with the manifest restamp in the same commit, retained through the group-2
  fan-in.
- **One bump per skill per PR:** no two W6 lanes bump the same skill (p02:
  `oat-project-pr-final`; p04: `create-agnostic-skill`, `create-oat-skill`).
- **Review posture:** every lane gets a root-owned adversarial review with
  disposition-verification rounds that execute prose snippets verbatim and
  probe the built CLI in a scratch project; a root final review whose brief
  enumerates the sibling dependency rows and every cross-package premise; then
  the configured cross-family exit gate (foreground, nothing else running).
- **Conventions carried from W1–W5:** append-only Reviews ledger (gate rows
  are written by `oat gate review` and moved forward in place); address-now
  sweeps bounded to the reviewer's own one-line fixes; lane briefs carry
  forced-turbo gate forms, the real package filter, scratch hygiene,
  `mktemp -d` probe backups, project-scope sync, a two-round Codex cap, pin
  location by version literal, SHAs pasted from `git rev-parse`; a docs or
  decision-record contradiction inside the integration diff's own rule is
  fixed in the wave; a reviewer's "do not weaken — file and pin" ruling
  governs a fix round; branch pushes to `origin/wave-6-execution-2026-09`.

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
- Filesystem-case tests run under a mocked directory probe or a case-sensitive
  image (the wave-5 CI lesson).

## Success Criteria

- All five source plans' `## Done criteria` confirmed and recorded in
  `implementation.md`.
- Per-phase reviews, final review, and the configured implementation exit gate
  all `passed` with fresh evidence on the reviewed head.
- Integration DoD gates green after each fan-in and on the final branch; CI and
  Bugbot clean on the wave PR; PR merged; `wave-close wave-6` recorded and the
  program marked complete.

## Out of Scope

- PR #190's content; backlog reprioritization; program recomposition beyond
  parking a lane on a tripped STOP; the parked wave-5 p09 plan
  (`BL-260907-make-the-completion-seal`).
