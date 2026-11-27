---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-27
oat_generated: true
oat_summary_revision_count: 2
oat_summary_includes_revisions: [p-rev1, p-rev2]
oat_summary_learnings_fingerprint: e1d56f5a8a88dd9bbf66ee669895ad39f65f64de3c7438e81e44fc5eb3df23b4
oat_summary_phase_fingerprint: 7056741bb27c7b0302b8b3b8aa035de081f785228d34b4e7b198e2113af966e0
---

# Freestyle Projects

OAT now offers freestyle projects for orchestrators who need durable records across sessions and lanes. The operator and orchestrator define how the project runs in `shape.md`. Shared, local, and synced scopes determine where those records live and who can read them.

## What shipped

| Milestone | Delivery                                                        | Result                                                                                                                                                 |
| --------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| m01       | [#429](https://github.com/voxmedia/open-agent-toolkit/pull/429) | Freestyle mode recognition, project scaffolding, shaping and resume, project log and journal support, and documentation.                               |
| m02       | [#430](https://github.com/voxmedia/open-agent-toolkit/pull/430) | Orchestrator branch ownership, linked projects, the lane ledger, filed reports, and project decisions and memories.                                    |
| m03       | [#431](https://github.com/voxmedia/open-agent-toolkit/pull/431) | Exact-path lane and log updates, retry-safe appends, and guidance for adopting plans and writing lane briefs.                                          |
| m04       | [#433](https://github.com/voxmedia/open-agent-toolkit/pull/433) | Clear publication and privacy guidance, portable lane paths, verbatim report-file handoff, and freestyle completion, documentation, and retro support. |
| m05       | [#434](https://github.com/voxmedia/open-agent-toolkit/pull/434) | The `completed` disposition for verification and advisory lanes whose final dispatch has closed.                                                       |

## Key decisions

- Project shape. Record the project's agreements once in `shape.md` and revisit them when the way the project works changes. Adopt the content and required gates of an existing plan while choosing bookkeeping appropriate to the project.
- Record ownership. Keep one writer for orchestrator records. Store reports verbatim, record their delivered heads, and reconcile open dispatches and live PR state before resuming.
- Closeout. Let the project decide when its done criteria are met. Keep project completion, lane completion, and publication as separate actions.

## Verification

OAT confirmed all five registered deliveries reached their merged endpoint with fresh evidence. The terminal audit mapped all 14 current outcomes to evidence from 16 accepted phases. The journal records scratch shared, local, and synced walkthroughs, linked-project and lane recovery exercises, and focused regression controls. PR #434 passed CI, the release dry run, and Bugbot. The final product delta also passed the full local repository gate sequence, with focused tests run separately on the CI-pinned Node version.

## Scope changes

The operator retired p06, the ancestry-warning phase, and p09, the extra evidence-fields phase, during approved milestone re-alignments. The current brief has no undelivered outcome. Legacy ledger diagnostics remain contingent on a reproducible failure.

The terminal review recorded a wording gap in the bundled report template. For verification or advisory work with no authored commit, record the inspected SHA and list any PR or authored commits only when present.

## Explainer Outcome

- Skipped by operator choice.

## Workflow Observations

- **2026-11-27 · feedback · Settled verification and advisory lanes** (project, decision) `oat-project:freestyle-projects#2026-11-27-feedback-settled-verification-and-advisory-lanes-1`
  Factory Platform filed and accepted its Slack app scope verification and outage review reports, and both lanes remained Active.
- **2026-11-24 · friction · Source-checked feedback verdicts still need an independent check** (project, gotcha) `oat-project:freestyle-projects#2026-11-24-friction-source-checked-feedback-verdicts-still-need-an-independent-check-1`
  my source-checked verdicts on the run feedback contained two wrong load-bearing claims (W1: project new does not fail on a dirty .gitignore in the default layout; O2: the GitHub publication-safety helper takes visibility as input and fetches nothing).
- **2026-11-24 · feedback · Freestyle prose contradicted the CLI and itself** (project, documentation-gap) `oat-project:freestyle-projects#2026-11-24-feedback-freestyle-prose-contradicted-the-cli-and-itself-1`
  the second real freestyle run (mvp-followups) hit three places where the skill or project AGENTS.md said something the CLI or the kickoff contradicted: no commits or pushes before shaping while project new commits and pushes; one topic at a time while the kickoff allows batched defaults; analysis folders described as an oat init choice that non-interactive init never offers.
- **2026-11-23 · feedback · Review table rows are events** (project, decision) `oat-project:freestyle-projects#2026-11-23-feedback-review-table-rows-are-events-1`
  an amendment-fix commit rewrote the manual 987d479b plan artifact row in ## Reviews instead of appending; Bugbot caught it on PR #430 and the row was restored after delivery registration.
- **2026-11-23 · friction · Pre-merge refresh writes uncommittable bookkeeping** (project, gotcha) `oat-project:freestyle-projects#2026-11-23-friction-pre-merge-refresh-writes-uncommittable-bookkeeping-1`
  the delivery refresh required immediately before merge rewrote observed_head and reflowed state.md flow sequences; committing it would have moved the PR head after the final green sweep.
  Uncertainty: whether refresh should skip writing when only observed_head on an open member changed.
- **2026-11-23 · friction · Scripted commit-paths calls must check the exit code** (project, gotcha) `oat-project:freestyle-projects#2026-11-23-friction-scripted-commit-paths-calls-must-check-the-exit-code-1`
  at the p10 review fix the root ran commit-paths piped to tail inside a multi-step script; commitlint refused the 104-character header, the script recorded HEAD (the previous bookkeeping commit) as the fix commit, and the next steps committed a record and the phase bookkeeping on that wrong SHA.
- **2026-11-23 · worked-well · Complexity-lens review briefs** (project, efficiency) `oat-project:freestyle-projects#2026-11-23-worked-well-complexity-lens-review-briefs-1`
  with reviewers briefed to apply a complexity lens and skip unlikely edge cases, and with small findings fixed in the round they were raised, m02 needed three integrated cycles and no exit rounds, against eight exit rounds and three cycles for m01, and left no deferred findings.
- **2026-11-22 · feedback · Small review deferrals are dropped, not filed** (project, decision) `oat-project:freestyle-projects#2026-11-22-feedback-small-review-deferrals-are-dropped-not-filed-1`
  m01 accumulated about ten deferred review findings (edge cases across scopes) that the operator dropped at landing; eight exit rounds and three integrated cycles were spent largely on cross-scope edge cases.
- **2026-11-22 · friction · A mode stop must precede every write on every project-resolution path** (project, gotcha) `oat-project:freestyle-projects#2026-11-22-friction-a-mode-stop-must-precede-every-write-on-every-project-resolution-path-1`
  p04 needed three review rounds to place the freestyle stops in six lifecycle skills: first after writing steps, then after the activeProject pointer write for a project the user names when asked, and in import-plan for a Step 0.5 name.
- **2026-11-22 · friction · Delivery freshness after review** (project, gotcha) `oat-project:freestyle-projects#2026-11-22-friction-delivery-freshness-after-review-1`
  after the integrated review passed, every non-tracking commit (self-review test fixes, a Bugbot fix, a CI test fix) and even rewriting ## Reviews artifact cells to archived paths marked d01 stale, and a waiver binds the last refreshed head, not the local HEAD.
- **2026-11-22 · friction · Skill tests extract bash blocks by position** (project, gotcha) `oat-project:freestyle-projects#2026-11-22-friction-skill-tests-extract-bash-blocks-by-position-1`
  oat-project-complete's resume tests take Step 1's first bash block as the archive entry; p04 inserted the freestyle mode read before it, and five tests failed in CI (pnpm test:skills) on every push while the skill-prose vitest run used for verification passed.
- **2026-11-22 · friction · zsh does not word-split a command held in a variable** (project, gotcha) `oat-project:freestyle-projects#2026-11-22-friction-zsh-does-not-word-split-a-command-held-in-a-variable-1`
  C="node packages/cli/dist/index.js"; $C internal commit-paths ...

_6 more judgment entries are omitted by the digest bound (12 entries, 60 lines); the archived project log keeps every entry._

Synthesized recommendations for categorized learnings are in the Autonomous Execution Learnings section.
