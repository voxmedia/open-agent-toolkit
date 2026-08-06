---
id: BL-260718-mandatory-skill-load-clause
title: Mandatory skill-load clause for lifecycle steps that name skills
status: open
priority: high
scope: task
scope_estimate: S
labels:
  - lifecycle-skills
  - workflow-integrity
  - dx
assignee: null
created: 2026-07-18T19:59:12.099Z
updated: 2026-08-06T17:29:00.000Z
associated_issues: []
external_plans: []
---

## Description

Lifecycle references that name another skill as an execution step (e.g. completion-and-closeout.md: 'dispatch oat-project-summary / oat-project-document / oat-project-pr-final') carry no mandatory-load clause, so a root orchestrator under end-of-run momentum executes the step's remembered OUTCOME instead of loading the skill and walking its step list. Contrast with oat-project-implement's Shared Subagent Dispatch Contract ('read and follow ... this explicit two-skill load is mandatory; do not rely on ambient skill discovery') and its Route Loading Contract, which forced correct behavior all session. Evidence (wave-skills-promotion closeout, 2026-07-18): the summary/document/pr steps were executed inline from memory, silently missing oat-project-summary Steps 2.5/6 (project log check/rollup - a feature merged mid-run, unknowable from memory), Step 7 (Key Decision promotion to ADRs), and oat-project-pr-final Steps 0.5 (review-artifact archival) and 4 (PR description artifact); all required post-hoc remediation. Same failure class as the founding wave-skills lesson: hand-re-derivation breaks conventions - skills must be loaded, not remembered.

## Acceptance Criteria

- `oat-project-implement`'s `references/completion-and-closeout.md` carries an explicit mandatory-load clause for the summary/document/pr steps: before executing each step, the orchestrator MUST read the named skill's SKILL.md and execute its step list (or dispatch a subagent carrying it) — "achieving the outcome from memory" is called out as non-compliant, mirroring the Shared Subagent Dispatch Contract's "do not rely on ambient skill discovery" language.
- A configured or autonomous closeout cannot reach terminal completion without a matching durable `oat_post_implement_sequence` snapshot whose required steps are complete; configured-plus-absent state routes back to `oat-project-implement`, with transition-level or smoke coverage proving snapshot creation and ordered child dispatch.
- An audit sweep covers every bundled lifecycle skill/reference that names another skill as an execution step (e.g. checkpoint auto-review naming `oat-project-review-provide`/`-receive`, quick-start chaining, `oat-project-next` routing) and applies the same clause or documents why it is not needed there.
- The clause pattern is documented once (e.g. in the skill-authoring conventions) so new lifecycle text names skills with the load requirement by default rather than by pointer alone.
- Skill frontmatter versions bumped for every changed skill in the same PR, with the lockstep public-package bump per repo release policy.

## Evidence Update — 2026-08-06

The `oat-project-retro` dogfood run reached implementation completion despite a
configured pre-approval summary/document/PR sequence having no persisted
`oat_post_implement_sequence` snapshot and no child dispatch provenance. Manual
recovery restored the outputs but not the required ordering. The exact internal
skip mechanism remains inconclusive, so coverage should reproduce the terminal
transition rather than assume a cause.
