---
id: BL-261002-correct-misleading-init-status
title: Correct misleading init, status, and doctor messages and stop scripts
  from defaulting to user-scope sync
status: open
priority: low
scope: task
scope_estimate: S
labels:
  - cli
  - ux
  - sync
  - docs-overhaul-followup
assignee: null
created: 2026-10-02T18:41:02.822Z
updated: 2026-10-02T18:41:02.822Z
associated_issues: []
external_plans: []
---

## Description

Messages, help text and bundled guidance that mislead users:

- **D1.** `oat init --no-hook` help says "Skip", but the flag removes an
  installed hook (`commands/init/index.ts:553-558` vs `:1392`). Reproduced
  (`Removed optional pre-commit hook.`).
- **D2.** `oat status` and `oat doctor` tell adopters to run `pnpm build` for
  `packs:inventory` (`commands/status/index.ts:230`, `commands/doctor/index.ts:1209`),
  which only works inside the OAT source repository. Read in source.
- **D5.** Piping `oat` output into `head` crashes with an EPIPE error.
  Reproduced.
- **D6.** `scripts/worktree/init.sh:468` runs a bare `oat sync` (scope `all`),
  which also writes under the home directory. Read in source.
- **D7.** The optional AGENTS.md tool-guidance block recommends
  `oat sync --scope all`, which writes under each reader's home directory.
  Reproduced.
- Also observed (fact sheet E4): `oat project new` for a local-scope project
  prints `Scaffold commit: skipped (--no-commit)` although `--no-commit` was
  not passed.

Why it matters: each is small, but together they teach adopters wrong
commands (a build step they cannot run, a sync that writes into every reader's
home directory) and hide what a flag does.

Evidence: `.oat/projects/shared/docs-improvement-overhaul/references/fact-sheet-writes-and-removal.md` (B4, E4, F7; untracked in
the project when this item was filed). Related, not a duplicate:
BL-260830-cli-flag-help-p2-p3-cleanup (general residual CLI audit).

Source: product defect list `.oat/projects/shared/docs-improvement-overhaul/references/product-defects-found.md` (docs-improvement-overhaul project, 2026-10-02), entry D1, D2, D5, D6, D7.

## Acceptance Criteria

- `oat init --no-hook` help says it removes an installed OAT hook.
- `oat status` and `oat doctor` give adopters a remedy they can run outside
  the OAT source repository (or omit the build advice there).
- `oat … | head` exits quietly without an EPIPE stack trace; a test pipes
  output into a closed reader.
- `scripts/worktree/init.sh` and the AGENTS.md guidance block use
  `oat sync --scope project`, and `scripts/worktree/init.test.mjs` pins it.
- The local-scope scaffold message names the real reason no commit was made.
- The matching notes on the docs branch `docs-overhaul-readme-visual` (`reference/troubleshooting.md` for
  `packs:inventory`, `reference/what-oat-writes.md:203` for the guidance block)
  are updated once fixed.
