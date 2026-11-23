---
oat_generated: false
purpose: project-observations
oat_last_updated: 2026-11-21
---

# Project Log: freestyle-projects

Append-only evidence of what broke, surprised, or worked: write entries only with `oat project log append` (see its `--help`), never edit a prior entry, and never record secret values.
Contract, entry grammar and roll-up: https://voxmedia.github.io/open-agent-toolkit/workflows/projects/execution/project-log

## Entries

### 2026-11-21 · structural · oat-project-goal · m01

Activated m01 (p01, p02, p03, p04); freestyle-projects-activate-m01

### 2026-11-21 · structural · oat-project-implement · p01

p01 accepted: review freestyle-projects-p01-review-1 passed (0 critical, 0 high, 0 medium, 2 low folded as bookkeeping); fix loops 0; recovery attempts 1/10 (help snapshot). freestyle-projects-p01-outcome

### 2026-11-21 · project · friction · Adding a --mode choice breaks the project new help snapshot

**Category:** gotcha
**Source:** freestyle-projects-learning-p01-01
**Origin:** oat-project-implement
**Recorded:** 2026-11-21T20:55:52Z

Observation: adding freestyle to WORKFLOW_MODES changed the inline snapshot in packages/cli/src/commands/help-snapshots.test.ts, found only by the forced full suite. Impact: one recovery attempt in p01. Recommendation: run help-snapshots.test.ts whenever a task changes CLI option choices. freestyle-projects-learning-p01-01

### 2026-11-21 · project · friction · commitlint rejects commit headers over 100 characters

**Category:** gotcha
**Source:** freestyle-projects-learning-p01-02
**Origin:** oat-project-implement
**Recorded:** 2026-11-21T20:55:52Z

Observation: p01-t03's first commit-paths attempt was refused by commitlint for a header over 100 characters. Impact: one retry, no history change. Recommendation: keep task commit headers under 100 characters. freestyle-projects-learning-p01-02

### 2026-11-21 · structural · oat-project-implement · p02

p02 accepted: review round 1 freestyle-projects-p02-review-1 (0 critical, 0 high, 1 medium, 6 low), M1 and L1-L4 fixed in p02-t07; round 2 freestyle-projects-p02-review-2 passed with 3 low deferred to p04; fix loops 1; recovery attempts 3/10. freestyle-projects-p02-outcome

### 2026-11-21 · project · friction · Docs skill-catalog gate fails any phase that adds a skill

**Category:** gotcha
**Source:** freestyle-projects-learning-p02-01
**Origin:** oat-project-implement
**Recorded:** 2026-11-21T23:00:42Z

Observation: apps/oat-docs/scripts/skill-mapping.ts requires a skill-docs.json entry and a guide anchor with an example scenario for every eligible skill, so pnpm check and test:evidence failed in p02 until the guide landed. Impact: p02 blocked before its head; the anchor was brought forward from the docs phase. Recommendation: land a new skill's skill-docs.json entry and guide anchor with the skill, and plan docs phases around that. freestyle-projects-learning-p02-01

### 2026-11-21 · project · friction · Scripted-user subagent runs as skill evidence

**Category:** efficiency
**Source:** freestyle-projects-learning-p02-02
**Origin:** oat-project-implement
**Recorded:** 2026-11-21T23:00:42Z

Observation: Outcome 6 (shaping with a brainstorm detour, fresh resume, reshape) was exercised by three nested Opus subagents given scripted user answers in a scratch repo; the runs surfaced two real prose defects (recoveries 2 and 3) and the reviewer judged them credible. Impact: interactive-skill evidence without a live user. Recommendation: reuse scripted-user nested runs for interactive skill exit evidence, keeping transcripts in gitignored analysis/. Uncertainty: a scripted user tests the paths the script chooses, not unexpected answers. freestyle-projects-learning-p02-02

### 2026-11-21 · structural · oat-project-implement · p03

p03 accepted: review freestyle-projects-p03-review-1 passed (0 critical, 0 high, 0 medium, 4 low), all four fixed in p03-t04; fix loops 1; recovery attempts 0/10. freestyle-projects-p03-outcome

### 2026-11-21 · project · worked-well · Real-corpus parse diff proves a log grammar change is compatible

**Category:** efficiency
**Source:** freestyle-projects-learning-p03-01
**Origin:** oat-project-implement
**Recorded:** 2026-11-21T23:48:43Z

Observation: before rebuilding, p03 captured log check --json over 57 local archived project logs with the base build and diffed it after the grammar change; output was byte-identical. Impact: cheap evidence against real, untracked artifacts that committed fixtures cannot cover. Recommendation: capture the base build's output over the local corpus before changing a parser of project artifacts, then diff after. freestyle-projects-learning-p03-01

### 2026-11-22 · structural · oat-project-implement · p04

p04 accepted: review round 3 freestyle-projects-p04-review-3 passed (0 critical, 0 high, 0 medium, 1 low, fixed by root in p04-t08) after round 1 (0/0/3/5, fixed in p04-t06) and round 2 (0/0/1/3, fixed in p04-t07); fix loops 3; recovery attempts 1/10. Forced test:evidence exited 1 twice on host-load timeouts in suites p04 does not touch; an idle-host forced run is still owed. freestyle-projects-p04-outcome

### 2026-11-22 · project · friction · Forced test:evidence times out under heavy host load

**Category:** environment-limited
**Source:** freestyle-projects-learning-p04-01
**Origin:** oat-project-implement
**Recorded:** 2026-11-22T02:23:16Z

Observation: at load averages of 20 to 69, two forced test:evidence runs at the same commit failed different cli tests (gate-hardening, docs/literals, exact-path-commit), all timeouts or timing assertions, while the same files passed alone under an isolated HOME. Impact: a forced run on a busy host cannot tell a regression from contention, and rerunning until green would hide real failures. Recommendation: when failures move between runs and the phase touches none of the failing suites, run the failing files alone, record both results and the load, and leave the forced run owed to an idle host or CI instead of calling it a pass. Uncertainty: the threshold load was not measured.

### 2026-11-22 · project · friction · A mode stop must precede every write on every project-resolution path

**Category:** gotcha
**Source:** freestyle-projects-learning-p04-02
**Origin:** oat-project-implement
**Recorded:** 2026-11-22T02:23:16Z

Observation: p04 needed three review rounds to place the freestyle stops in six lifecycle skills: first after writing steps, then after the activeProject pointer write for a project the user names when asked, and in import-plan for a Step 0.5 name. Impact: each round found a path where a freestyle project could still be written or converted. Recommendation: when adding a mode guard to a skill, list every way the skill resolves a project (active, a flag, a name given when it asks), find the first write on each path including oat config set activeProject, and assert the order in an ordering test before review.

### 2026-11-22 · project · friction · zsh does not word-split a command held in a variable

**Category:** gotcha
**Source:** freestyle-projects-learning-p04-03
**Origin:** oat-project-implement
**Recorded:** 2026-11-22T02:23:17Z

Observation: C="node packages/cli/dist/index.js"; $C internal commit-paths ... exits 127 in zsh because zsh does not split unquoted parameter expansions. Impact: scripted bookkeeping commits fail before running. Recommendation: wrap the branch build in a shell function, oatb(){ node packages/cli/dist/index.js "$@"; }, instead of a string variable.

### 2026-11-22 · structural · oat-project-implement · m01

m01 exit review (manual GPT 6.2 Astra high, substitute for the project-disabled implement exit gate) passed in round 6 at c14f3517e after 5 fix rounds (p04-t09..p04-t14); R4-3 deferred; exit carrier project_disabled, fresh; m01 implementing -> reviewing; next oat-project-review-provide code m01: p01, p02, p03, p04; freestyle-projects-m01-exit-review

### 2026-11-22 · structural · oat-project-implement · p04

p04 re-accepted after the m01 integrated review round 1 fixes: p04-t15 (I-1), p04-t16 (I-2 Resume half), p04-t18 (I-4), p04-t20 (I-6) through the original handle; p04-t17 and p04-t19 cancelled and I-2 Create half, I-3, I-5 deferred by the operator. Gates passed; pnpm test needed one no-edit rerun after two SIGTERM-timing failures in tools/smoke/runner/cleanup.test.mjs, which the range does not touch. release:check-versions fails: origin/main reached 0.3.54, equal to the branch. Exit and integrated re-reviews pending. freestyle-projects-p04-outcome-m01-integrated-1

### 2026-11-22 · structural · oat-project-implement · p04

Merged origin/main 78b88baba (#427, Zod 4 CLI schemas) as 1cc893ed8 with no conflicts; bumped the five public packages to 0.3.55 in 61f62885d. Gate run at 61f62885d (load 84 at start): check, type-check, build, check:skill-bumps, release:check-versions, release:validate, build:docs, docs-index freshness, lint, format and the isolated skill-prose vitest exit 0. pnpm test exit 1: cli only, 5 timeout or timing cases in gate-hardening.integration, docs/literals and exact-path-commit (the suites named in learning freestyle-projects-learning-p04-01); those three files alone under an isolated HOME at load 18 passed 72/72, and test:smoke, test:skills and test:scripts (skipped by the && chain) exit 0. A forced idle-host run is still owed. freestyle-projects-m01-merge-main-78b88baba

### 2026-11-22 · structural · oat-project-implement · m01

m01 exit re-review (manual GPT 6.2 Astra high) after the integrated-review fixes passed in round 8 at eece9b5fc after 1 fix round (p04-t21, R7-1 regression of p04-t15); exit carrier project_disabled refreshed to fresh; m01 implementing -> reviewing; next oat-project-review-provide code m01: p01, p02, p03, p04 (integrated cycle 2 of 3); freestyle-projects-m01-exit-rereview-2

### 2026-11-22 · structural · oat-project-review-receive · m01

m01 integrated review cycle 2 received (2 of 3): J-1 High, J-2 Medium, J-3 and J-4 Low; fixes p04-t22..p04-t25; J-2 case B deferred; operator: fix with no further review rounds; m01 reviewing -> implementing; freestyle-projects-m01-integrated-receive-2

### 2026-11-22 · structural · oat-project-implement · m01

p04 re-accepted after m01 integrated cycle 2 fixes p04-t22..p04-t25 (J-1, J-2A, J-3, J-4); fix loops 1; exit re-review waived by the operator, root-verified; exit carrier fresh; m01 implementing -> reviewing; freestyle-projects-p04-outcome-m01-integrated-2

### 2026-11-22 · structural · oat-project-review-receive · m01

m01 integrated review cycle 3 (confirm only) received: J-1, J-2A, J-3, J-4 confirmed; K-1 new-hardening Medium deferred by the operator; recorded passed at 32919c56a (3 of 3 cycles); freestyle-projects-m01-integrated-cycle3-receive

### 2026-11-22 · structural · oat-project-pr-progress · d01

Registered d01 for m01 (p01, p02, p03, p04) at https://github.com/voxmedia/open-agent-toolkit/pull/429; freestyle-projects-register-d01

### 2026-11-22 · structural · oat-project-goal · m01

Re-alignment after m01 delivered (d01, PR #429 merged at 1e0b473c6); freestyle-projects-realign-m01

### 2026-11-22 · project · friction · Delivery freshness after review

**Category:** gotcha
**Source:** freestyle-projects-learning-m01-01
**Origin:** oat-project-goal
**Recorded:** 2026-11-22T18:36:01Z

Observation: after the integrated review passed, every non-tracking commit (self-review test fixes, a Bugbot fix, a CI test fix) and even rewriting ## Reviews artifact cells to archived paths marked d01 stale, and a waiver binds the last refreshed head, not the local HEAD.
Impact: three extra waiver/refresh/commit rounds and one soft reset before merge.
Recommendation: land PR-review fixes in one batch, then push, refresh, waive and commit the state.md bookkeeping in that order; never rewrite ## Reviews cells of a registered delivery.

### 2026-11-22 · project · friction · Skill tests extract bash blocks by position

**Category:** gotcha
**Source:** freestyle-projects-learning-m01-02
**Origin:** oat-project-goal
**Recorded:** 2026-11-22T18:36:01Z

Observation: oat-project-complete's resume tests take Step 1's first bash block as the archive entry; p04 inserted the freestyle mode read before it, and five tests failed in CI (pnpm test:skills) on every push while the skill-prose vitest run used for verification passed.
Impact: CI was red from the PR's first push; diagnosis came only at landing.
Recommendation: when a change adds or moves a bash block in a skill, run pnpm test:skills as well as the skill-prose vitest suite before review.

### 2026-11-22 · project · feedback · Small review deferrals are dropped, not filed

**Category:** decision
**Source:** freestyle-projects-learning-m01-03
**Origin:** oat-project-goal
**Recorded:** 2026-11-22T18:36:01Z

Observation: m01 accumulated about ten deferred review findings (edge cases across scopes) that the operator dropped at landing; eight exit rounds and three integrated cycles were spent largely on cross-scope edge cases.
Impact: review rounds and backlog growth with little user value.
Recommendation: in m02, fix a small finding in the round it is raised or drop it; brief reviewers to apply a complexity lens and not to raise unlikely edge cases; file follow-ups only for work that is worthwhile on its own.

### 2026-11-23 · structural · oat-project-goal · m02

Activated m02 (p05, p07, p10, p08); freestyle-projects-activate-m02

### 2026-11-23 · structural · oat-project-implement · p05

**Subject:** p05

p05 accepted: review passed (0 critical, 0 high, 0 medium, 1 low bookkeeping, fixed at receive); 0 fix loops. The p05-t05 scratch pair caught new --link-to switching the parent checkout's active project, fixed as p05-t04. freestyle-projects-p05-outcome

### 2026-11-23 · structural · oat-project-implement · p07

**Subject:** p07

p07 accepted: review passed (0 critical, 0 high, 1 medium, 3 low); M1 and L1 fixed root-inline in p07-t06, L2 dismissed as new-hardening, L3 already corrected; 0 fix loops, no re-review. freestyle-projects-p07-outcome

### 2026-11-23 · structural · oat-project-implement · p10

**Subject:** p10

p10 accepted: review passed (0 critical, 0 high, 0 medium, 2 low); L1 and L2 fixed root-inline in p10-t06; 0 fix loops, no re-review. freestyle-projects-p10-outcome

### 2026-11-23 · project · friction · Scripted commit-paths calls must check the exit code

**Category:** gotcha
**Source:** freestyle-projects-learning-m02-01
**Origin:** oat-project-implement
**Recorded:** 2026-11-23T04:26:37Z

Observation: at the p10 review fix the root ran commit-paths piped to tail inside a multi-step script; commitlint refused the 104-character header, the script recorded HEAD (the previous bookkeeping commit) as the fix commit, and the next steps committed a record and the phase bookkeeping on that wrong SHA. freestyle-projects-learning-m02-01
Impact: two journal lines named the wrong commit and needed an appended correction and a head re-advance (f9edb6c1b, f4be7d8a9).
Recommendation: run each commit-paths call on its own or under set -e without a trailing pipe, and keep commit headers under 100 characters (commitlint header-max-length).

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
