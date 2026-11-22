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

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
