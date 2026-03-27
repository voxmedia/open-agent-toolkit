---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-27
oat_generated: true
oat_summary_last_task: p06-t05
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: project-completion

## Overview

This project extended the OAT project lifecycle to address three gaps: no institutional memory artifact after project completion, a "dead zone" after PR creation where agents misinterpret project state, and manual review triggering at every plan phase checkpoint. The work was motivated by real workflow friction — agents starting new projects instead of accepting revisions on open PRs, and users repeatedly invoking review-provide at predictable boundaries.

## What Was Implemented

**Summary artifact (`oat-project-summary`):** A new skill generates `summary.md` from project lifecycle artifacts (discovery, design, plan, implementation) as institutional memory. The summary uses frontmatter tracking fields (`oat_summary_last_task`, `oat_summary_revision_count`, `oat_summary_includes_revisions`) to support incremental updates after revisions without full rewrites. Sections that don't apply to a project are omitted entirely, targeting under 200 lines. A template at `.oat/templates/summary.md` provides the 10-section structure.

**Post-PR revision workflow:** Two interconnected changes eliminate the dead zone. First, `oat-project-pr-final` now sets `oat_phase_status: pr_open` (a new valid status value) with next-milestone guidance pointing to both `oat-project-revise` and `oat-project-complete`. Second, a new `oat-project-revise` skill provides unified re-entry for post-PR feedback — inline feedback creates `p-revN` revision phases with `prevN-tNN` task IDs (no severity triage), while GitHub PR and review artifact feedback delegate to the existing review-receive skills with their structured triage model. The revise skill manages the `pr_open` ↔ `in_progress` state transitions.

**Auto-review at checkpoints:** The `oat-project-implement` skill gained opt-in auto-review via `autoReviewAtCheckpoints` in `.oat/config.json` (or `oat_auto_review_at_checkpoints` in plan.md frontmatter). When enabled, completing a plan phase checkpoint spawns a subagent review scoped to phases since the last passed checkpoint. The review artifact carries `oat_review_invocation: auto`, which triggers auto-disposition mode in `oat-project-review-receive` — minors are auto-converted to fix tasks (not deferred), with no user prompts.

**Skill updates:** `oat-project-complete` accepts any phase status permissively (pr_open, complete, in_progress). Both `pr-final` and `complete` check for `summary.md` and generate it if missing. The implement skill's post-completion guidance now routes to summary → document → pr-final instead of directly to PR/complete.

**CLI runtime:** State generation routing handles `pr_open` → routes to `oat-project-revise`. Config schema and get/set support `autoReviewAtCheckpoints`. Skill manifest includes both new skills and the summary template.

**Documentation:** Lifecycle, state machine, directory structure reference, artifacts, PR flow, and reviews docs all updated. Doctor skill manifest includes new skills and the config key.

## Key Decisions

- **`pr_open` is guidance, not a gate:** `oat-project-complete` works from any phase status. The user controls when to close out, not the state machine.
- **Inline feedback skips severity triage:** When the user describes changes directly, all items become tasks. Severity classification adds friction without value for direct requests.
- **Delegated feedback uses existing review-receive conventions:** GitHub PR and review artifact feedback go through structured triage with `(review)` task prefix, not the `(revision)` format. What revise adds is state management and framing, not a new task model.
- **Auto-review config: two layers, not three:** Dropped the `config.local.json` layer (would require CLI runtime changes). `config.json` (global) + plan.md frontmatter (per-project) provides sufficient control.
- **Implement owns summary re-generation:** After revision phase completion, the implement skill triggers `oat-project-summary` — not the revise skill. This avoids double invocation since implement knows when tasks are actually done.

## Design Deltas

- Auto-review config simplified from 3 cascading layers to 2 (dropped `config.local.json` — the partition-based config system would require new CLI plumbing for same-key cascading).
- Skill manifest (`skill-manifest.ts`) and `install-workflows.test.ts` required updates not in the original plan — discovered during p04-t01 when bundle-consistency tests caught the new skills.

## Follow-up Items

- Portfolio rollup skill that reads `summary.md` across completed projects for status synthesis.
- Summary as Linear project update — posting summary content to Linear issues on project closeout (depends on `remote-project-management` project).
- Auto-generation of decision-record entries from summary's "Key Decisions" section during `oat-pjm-update-repo-reference`.
