---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-09-08
oat_generated: false
---

# Discovery: wave-7-execution

## Initial Request

Execute Wave 7 ("Post-program corrective lanes") of the 2026-08-31 execution
program (`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`)
as a thin wrapper OAT project via `oat-wave-execute`. Twenty lanes, each
governed entirely by its external plan under
`.oat/repo/reference/external-plans/2026-09-08-*.md`, selected and ordered by
`2026-09-08-backlog-review-wave-7-plan-index.md`:

- p01 read stdin in `finalize-synced-archive.mjs`; p02 `oat config unset` and
  `adopt`; p03 the bare-`__proto__` Markdown guard; p04 the idempotent
  completion seal (unparks wave-5 p09); p05 hardened normalized config maps;
  p06 the packed-asset directory guard; p07 the oat-doctor example; p08 the
  wrong-typed `documentation.root` warning; p09 the resolved symlink target;
  p10 stray fences in lifecycle skills; p11 the docs-index follow-ups; p12
  persisted native-skill adoption in `oat status`; p13 the skill version
  validators; p14 the sync apply failure summary; p15 converged copy-strategy
  projections; p16 dispatch baselines after journaling; p17 the readiness
  contract and wave-program ledger vocabulary; p18 skill and script tests
  inside the CI gates; p19 the skill-authoring facts; p20 plan writes on the
  caller's model.

The operator approved the wave-7 composition and its execution on 2026-09-08
("approve", after PR #284 presented the map), under the same autonomous rules
as W1–W6 (PR creation and merge by the root orchestrator once CI, Bugbot, and
the final gate are green). The program itself closed on 2026-09-08 (W6 merged
as PR #278; 30 of 31 plans done, p09 parked); the bundled-skill migration
(PR #280, CLI 0.2.65) and remote project management (PR #273) are the
baseline. This wave's base is `origin/main` after PR #284
(`684bd3be32e65fc8db0646f336ab4335c317ba2c`, lockstep 0.2.66).

## Inherited Contract (from `oat-wave-execute`)

- The wrapper never restates, narrows, or overrides a source plan. Each phase's
  entire contract is its external plan; the wrapper adds ordering, worktree
  isolation, wrapper-level DoD gates, review mapping, and bookkeeping.
- Source-plan STOP conditions are honored verbatim; a tripped STOP parks the
  lane and never weakens or silently narrows the plan's requirements; a
  load-bearing current-state claim that does not reproduce on the built CLI is
  reported before any code changes.
- Reviewed history is append-only: fix rounds land as new commits; no reviewed
  SHA is amended; the Reviews ledger keeps superseded events as their own rows.
- Every fix disposition stores a verification record (what / how / where).
- Integration DoD gates run after every fan-in before any bookkeeping edit.
- Configured cross-runtime gates are mandatory; `passed` is the only terminal
  gate-row state; the exit gate runs in the foreground with no other agents
  active.
- Lockstep release files are owned by the wave fan-in (one bump before the
  first group's integration gates, retained afterward); lanes run lane-mode
  gates only. Skill `metadata.version` bumps and their pins stay with lanes; a
  lane that bumps a skill sweeps the old literal repo-wide (plain and escaped)
  and runs `pnpm test:smoke` and `pnpm test:skills`.

## Key Decisions

- **Groups:** [p01, p02, p03], [p04, p05, p06], [p07, p08, p09], [p10, p11,
  p12], [p13, p14, p15], [p16, p17, p18], then p19 and p20 ungrouped in plan
  order. The program's eight-group map is batched to the operator's
  concurrency ceiling of 3 without changing any stated ordering: one
  `validation/skills.test.ts` writer per group (p01, p04, p07, p10, p13, p16,
  p19, p20), the config chain p02 → p05 → p08 → p11 across groups 1–4, the
  skill-bump pairs p01 → p04 (`oat-project-complete`), p10 → p19
  (`create-agnostic-skill`), p10 → p20 (`oat-repo-improve`), the docs and
  contract seams p06 → p09 (`configuration.md`), p17 → p20
  (`skills-bundled-docs-contract.test.ts`, `wave-workflows.md`), and the
  `AGENTS.md` writers p13, p18, p19 in three different steps. Every within-group
  write intersection is empty by mechanical check.
- **Drift:** zero code drift between the plans' inspected head (`a59461402`)
  and the wave base; no plan refresh entries were needed and no recon subagent
  was dispatched (the root ran every plan's drift command; recorded as a
  deviation from the skill's recon step).
- **Lockstep:** one fan-in bump (0.2.66 → 0.2.67 above fresh `origin/main`)
  with the manifest restamp in the same commit, retained through every later
  fan-in.
- **One bump per skill per PR:** three skills are edited by two ordered lanes
  (`oat-project-complete` p01 → p04; `create-agnostic-skill` p10 → p19;
  `oat-repo-improve` p10 → p20); the later lane adopts the landed value.
- **Parked p09 patch:** preserved on the local branch `wave-5/p09` (no worktree
  remains); the p04 brief points the lane at the branch.
- **Review posture:** every lane gets a root-owned adversarial review with
  disposition-verification rounds that execute prose snippets verbatim and
  probe the built CLI in a scratch project; a root final review whose brief
  enumerates the sibling dependency rows and every cross-package premise; then
  the configured cross-family exit gate (foreground, nothing else running).
- **Conventions carried from W1–W6:** append-only Reviews ledger (gate rows are
  written by `oat gate review` and moved forward in place); address-now sweeps
  bounded to the reviewer's own one-line fixes; lane briefs carry forced-turbo
  gate forms, the real package filter, scratch hygiene, `mktemp -d` probe
  backups, project-scope sync, a two-round Codex cap, pin location by version
  literal, SHAs pasted from `git rev-parse`; a docs or decision-record
  contradiction inside the integration diff's own rule is fixed in the wave; a
  reviewer's "do not weaken — file and pin" ruling governs a fix round; the
  plan gate is capped at three reruns; branch pushes to
  `origin/wave-7-execution-2026-09`.

## Constraints

- No force-push, no rewriting reviewed commits, no bypassing branch policy, no
  weakening tests or gates, no discarding unrelated work.
- Every lane that edits a canonical skill runs `pnpm run cli -- sync --scope project`
  afterwards and inspects the provider-view diff before committing;
  provider-view deletions are a STOP; `--scope all` is operator-only.
- Exactly one lockstep bump for the wave, owned by the fan-in.
- Draft PR #190 is still open; each plan's `## Landing-event impact` row
  applies only if it merges before that lane starts.
- Filesystem-case tests run under a mocked directory probe or a case-sensitive
  image (the wave-5 CI lesson).
- The two high-priority triage items (recon intent restoration, recap
  simplification) and dispatch issue #266 are outside this wave by decision.

## Success Criteria

- All twenty source plans' `## Done criteria` confirmed and recorded in
  `implementation.md`.
- Per-phase reviews, final review, and the configured implementation exit gate
  all `passed` with fresh evidence on the reviewed head.
- Integration DoD gates green after each fan-in and on the final branch; CI and
  Bugbot clean on the wave PR; PR merged; `wave-close wave-7` recorded, the
  completion tail run across all seven wrappers at the program checkpoint the
  operator already answered.

## Out of Scope

- PR #190's content; backlog reprioritization; program recomposition beyond
  parking a lane on a tripped STOP; the recon-intent and recap-simplification
  projects; dispatch issue #266; the alias-retirement step 2
  (`BL-260908-remove-the-top-level-skill`).
