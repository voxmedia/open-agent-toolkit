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

## End-of-run synthesis (pending — do not skip at project completion)

Summarize the overall verdict, adopted adjustments, and entries graduated to the repo ledger or backlog. Roll up durable observations into tracked surfaces before archiving this project log.
