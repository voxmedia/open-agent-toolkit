---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-01
oat_generated: true
oat_summary_last_task: p05-t06
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
oat_summary_learnings_fingerprint: f594cdc881fd019a0d9939bdbed32a46d812d4dd7df9a4c2915ee6f159e106a0
---

# Summary: wave-1-correctness

## Overview

Wave 1 of the backlog-and-roadmap review bundled seven confirmed correctness defects into one quick-mode project and one PR. The defects were in provider sync, tool-pack install scope, CLI messages, lifecycle skill contracts, exact-path commits, and the evidence-grade test recipe. Each backlog item's acceptance criteria were the requirement, and the run was autonomous with a High dispatch ceiling and no recap.

## What Was Implemented

Phases 1–4 ran as one parallel group in isolated worktrees and were merged `--no-ff` with no conflicts. Phase 5 then covered docs, generated views, the release bump and backlog close-out. All 28 tasks completed, including ten review-fix and revision tasks: after the PR opened, revision phase `p-rev1` fixed two Critical findings from the PR review (see Revision below).

- **Stale provider views after an agent delete or rename** (BL-261002-clean-up-stale-provider-views). A dangling agent link no longer aborts `oat sync`, `--dry-run` or `oat status` with "target escapes the sync scope". Sync now removes the stale `.claude/`, `.cursor/` and `.github/agents/` views. Canonical-derived Codex roles carry the scope owner (`project-config` or `user-config`), so full sync and pack removal both delete a removed agent's role file, its model and effort variants, and its `[agents.*]` tables. This holds even when the agent's frontmatter `name` differs from its filename.
- **Codex user values** (BL-261002-stop-oat-sync-from-changing). `oat sync` and `oat providers codex materialize` never rewrite an explicit `[features] multi_agent` or `[agents] max_depth`. They add only absent keys and report each added key, conflict and note, in both human and `--json` output.
- **Install scope** (BL-261002-honor-the-requested-scope). A pack install that resolves to no allowed scope exits 1: `tools install core --scope project` reports that core is user-scope only, with recovery code `scope-not-allowed`. The aggregate install skips core and reports `skippedPacks`. An explicit `--scope project|user` writes only that scope for single-pack, aggregate and `init --setup` installs, while no-flag and `--scope all` behave as before. `init --setup` never runs `gh`.
- **Misleading messages** (BL-261002-correct-misleading-init-status). This item corrected the `--no-hook` help and made the `packs:inventory` remedies runnable by adopters. Local-scope `project new` now reports `skipped_local_scope`, and `oat … | head` exits 0 quietly on `EPIPE`. `scripts/worktree/init.sh` and the generated AGENTS.md guidance block now use `oat sync --scope project`.
- **Skill contracts** (BL-261002-align-implement-complete). `oat-project-implement` drops the unread `--retry-limit` hint. `oat-project-complete` resolves its base branch from `git.defaultBranch`, then `origin/HEAD`, then `main`, for both the merge-base and `gh pr create`. `oat-project-pr-final` usage text now describes its default-filling, auto-push behavior.
- **Exact-path commits** (BL-261012-commit-paths-should-accept, re-verified as reproducing before work started). `oat internal commit-paths` commits tracked files under ignored directories, and untracked ignored paths are still refused. `.lintstagedrc.mjs` excludes `packages/cli/assets/**`, so the hook's re-stage no longer fails on tracked templates.
- **Isolated test HOME** (BL-261011-clean-up-the-isolated-home). `scripts/with-isolated-home.sh` removes the temporary HOME on success, failure, `INT` and `TERM`. `pnpm test:evidence` runs the forced turbo test through it, and AGENTS.md points both isolated-HOME recipes at it.
- **Integration.** Docs and READMEs now describe the shipped behavior. This repository's five canonical-derived `.codex/agents/*.toml` files gained the owner header. The five public packages were bumped to 0.3.39, and all seven items were archived with outcome summaries.

## Key Decisions

- **Stamp canonical Codex roles with the scope owner.** Canonical exports use the existing `project-config` or `user-config` owner value instead of a new value such as `canonical`. Older CLIs reject an unknown owner and would treat the file as unmanaged. Project-scope cleanup also covers `supported-catalogue` variants, following the Cursor extension's precedent. A manifest-schema alternative was deferred as unnecessary.
- **Skip dangling agent links in collision scans.** A link whose target is missing cannot define a role, so the Cursor collision scan skips it. An existing target outside the scope is still refused. Only `ENOENT` counts as dangling, so a link loop keeps the controlled exit-1 error.
- **Preserve explicit Codex multi-agent settings.** Sync never overrides an explicit `multi_agent` or `max_depth`; it adds absent keys and reports conflicts. `multi_agent = false` and `max_depth < 1` are conflicts, and `max_depth = 1` is a note because it disables only optional nested work. Sync still writes roles and tables rather than refusing the step, since `oat doctor` already reports the condition.
- **Explicit install scope writes only that scope.** An explicit `--scope` neither reconciles nor removes the other scope's placement. A pack with no allowed scope is refused rather than reported as installed. Core stays user-only; it was not extended to project scope.
- **Guided setup never calls gh.** Default-branch detection uses `origin/HEAD`, then `main`. No opt-in flag was added for remote detection.
- **Self-cleaning isolated HOME for evidence tests.** A repository wrapper script owns the temporary HOME, rather than each package's test harness.
- **Force-stage only HEAD-tracked exact paths.** `commit-paths` uses Git's force flag only for paths already tracked in `HEAD` and stages everything else normally, so the refusal of untracked ignored paths stays intact.

## Design Deltas

Quick mode produced no design.md. These deviations from the plan were accepted, with the implementation as source of truth:

- A dangling link whose name collides with a desired role is skipped, not refused as the p01-t01 plan text said. Main sync replaces it with a managed link, and nothing is written outside the repository (review p01 L2). The docs describe the shipped behavior.
- p04-t01 also changed `.lintstagedrc.mjs`, which was not in its planned file list. The real-hook probe showed the lint-staged re-stage failing on tracked templates. After that fix, the probe's literal criteria no longer applied, so a README variant proved the `*.md` task still runs. The probe commit message became `chore: probe <n>` because commitlint rejects `probe`.

## Notable Challenges

- **Exit-gate finding after the native reviews passed.** The cross-family implementation exit gate found that pack removal derived the removed Codex role from the Markdown filename. A removed agent whose frontmatter `name` differed therefore kept its role and tables. Fix p01-t05 ran the full owned-stale cleanup on removal syncs. While validating that commit, the root found a one-line regression: the user-scope "bundled roles unavailable" guard threw on removal syncs. Fix p01-t06 limited that guard to full user syncs again. Generation 2 of the gate passed with no findings.
- **Interrupted first attempts.** Three of the four parallel implementers found their own interrupted partial work and stopped BLOCKED at the clean-tree preflight. The root saved the diffs, restored clean trees, and continued each implementer through its accepted handle.
- **Silent hook failure.** At base, lint-staged 15.5.2 failed its re-stage on tracked files under an ignored directory but still exited 0. Only the real-hook probe revealed it.
- **Silent `oat` no-op.** A child session left an `oat` shell function with its CLI variable unset in the root shell. Later `oat` calls printed nothing and exited 0, so one project-log append and two validations were silently skipped until the final-review resolver noticed.

## Tradeoffs Made

- Codex roles left with no owner header by CLIs before 0.3.39 are not cleaned up, because nothing proves they are canonical-derived. The docs say so.
- Every canonical-derived Codex role gains one header line on its first sync after the upgrade. A team on mixed CLI versions may see that line churn until everyone upgrades.
- A partial sync now parses every present agent. A malformed unrelated agent therefore makes the removal sync fail without deleting anything; a full sync already failed on such a repository.
- The `EPIPE` handler always exits 0, even if the command had set a failing code, which is visible only under `set -o pipefail`. `ENOTCONN` is not treated as quiet.

## Integration Notes

- Until 0.3.39 is the installed `oat`, use the branch-built CLI (`node packages/cli/dist/index.js internal commit-paths`) for exact-path commits that touch tracked files under ignored directories. The PATH `oat` 0.3.37 predates the fix.
- Explicit `--scope` now means "only this scope" for `tools install` and `init --setup`. After an explicit-scope install, the summary names only the written scope.
- Use `pnpm test:evidence` or `bash scripts/with-isolated-home.sh <cmd>` instead of a bare `HOME=$(mktemp -d)`.

## Autonomous Execution Learnings

### Agent-instruction updates

- When a change touches exact-path commits, probe it against the repository's real lint-staged hook with an observable log, not a scratch hook. Rationale: lint-staged failed its re-stage while exiting 0, and only the real hook showed it. Source: oat-project:wave-1-correctness#2026-11-01-worked-well-real-hook-probe-caught-a-lint-staged-re-stage-failure-a-scratch-hook-would-have-hidden-1
- Have child sessions invoke the branch CLI by path instead of defining shell functions. In a long-lived shared shell, check `type oat` before relying on its output. Rationale: a leftover function silently turned later `oat` calls into no-ops. This was environment-limited and observed once. Source: oat-project:wave-1-correctness#2026-11-01-friction-a-child-session-left-an-oat-shell-function-that-silently-no-opped-later-oat-calls-1

### Workflow issues

- When a host may restart a dispatched child, the phase scope should say whether stale in-boundary changes left by the same request id may be discarded. The root's backup step should copy untracked files with a loop rather than `xargs`. Rationale: three implementers stopped BLOCKED on their own interrupted attempts, costing a round trip each, and one partial test file was not backed up. Source: oat-project:wave-1-correctness#2026-11-01-friction-parallel-phase-implementers-stopped-blocked-on-their-own-interrupted-first-attempts-1

## Revision (p-rev1, after PR review)

An automated PR review (`warp-factories[bot]`) on https://github.com/voxmedia/open-agent-toolkit/pull/395 found two Critical defects in the widened Codex stale-role cleanup; the operator authorized a revision on 2026-11-01.

- `[agents.<name>]` tables are now removed only while their `config_file` still names the stale OAT-owned role file, so a table the user re-pointed at another file stays and only the leftover OAT file is removed (prev1-t01).
- Stale cleanup resolves real paths and never deletes a role file outside the sync scope, including through a symlinked `.codex/agents` directory (prev1-t02).
- `provider-sync/providers.md` documents both exceptions; the reproduction probe lives at `references/pr395-codex-cleanup-probe.sh` with pre-/post-fix results (prev1-t03).

Each fix has a regression test proven to fail on the pre-fix source, plus a CLI-level negative control (pre-fix build: table and external file deleted; post-fix build: both preserved; controls pass on both).

## Follow-up Items

- **Base-branch chain masked by config defaults** (p03 M2; the final review recommended filing it as a backlog item). `oat config get git.defaultBranch` prints `main` and exits 0 when unset, so the `origin/HEAD` step in `oat-project-pr-final`, `oat-project-pr-progress` and `oat-project-complete` never runs. The same item should cover `oat-project-pr-final` Step 3's `origin/main` merge-base and the hardcoded `gh pr create --base main` in `oat-docs-apply` and `oat-agent-instructions-apply`.
- **EPIPE exit code** (p02 L1, plus the `ENOTCONN` note): consider preserving a failing exit code under `pipefail`. Decide on `ENOTCONN` separately if it shows up in practice.
- **Duplicated `packs:inventory` remedy text** in `commands/status/index.ts` and `commands/doctor/index.ts` (p02 L2): candidate refactor.
- **Polish in `oat-project-complete` Step 11** (p03 R2-L1/L2): the resume note names only one skip route, and the `:?` guard does not stop an interactive line-by-line shell.
- **Wrapper and test polish** (p04 L2/L3): a `TERM` sent only to the wrapper PID waits for the child before cleanup (documented in the script header), and one lint-staged re-stage unit test needs a comment.
- **Root AGENTS.md** still recommends `oat sync --scope all` in its hand-written maintainer line (final L1). That line was outside the item, which named only the generated guidance block, and is left to maintainers.

## Explainer Outcome

- **project-recap:** skipped — operator chose to skip the project recap at kickoff (persisted intent `oat_project_recap: skip`, source `interactive`)

## Workflow Observations

- **2026-11-01 · friction · Parallel phase implementers stopped BLOCKED on their own interrupted first attempts** (project, gotcha) `oat-project:wave-1-correctness#2026-11-01-friction-parallel-phase-implementers-stopped-blocked-on-their-own-interrupted-first-attempts-1`
  autonomous-wave1-20261031-01 Observation: three of four concurrently dispatched Cursor phase implementers found partial uncommitted work for their own first task in their worktree (written minutes earlier, no live writer) and stopped BLOCKED at the clean-tree preflight.
- **2026-11-01 · friction · A child session left an oat shell function that silently no-opped later oat calls** (project, environment-limited) `oat-project:wave-1-correctness#2026-11-01-friction-a-child-session-left-an-oat-shell-function-that-silently-no-opped-later-oat-calls-1`
  autonomous-wave1-20261031-03 Observation: after the p05 implementer ran, the root shell had a function oat() { node "$CLI" "$@" } with CLI unset, so oat calls printed nothing and exited 0 (one project-log append and two validations were silently skipped).
- **2026-11-01 · worked-well · Real-hook probe caught a lint-staged re-stage failure a scratch hook would have hidden** (project, efficiency) `oat-project:wave-1-correctness#2026-11-01-worked-well-real-hook-probe-caught-a-lint-staged-re-stage-failure-a-scratch-hook-would-have-hidden-1`
  autonomous-wave1-20261031-02 Observation: the plan review required probing commit-paths against this repository's real lint-staged hook with an observable log; it showed lint-staged 15.5.2 failing its re-stage on tracked files under an ignored directory while exiting 0.

Synthesized recommendations for categorized learnings are in the Autonomous Execution Learnings section.
