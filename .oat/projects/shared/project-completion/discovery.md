---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-27
oat_generated: false
---

# Discovery: project-completion

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Improve the OAT project completion flow with three interconnected changes:

1. **`summary.md`** — A new first-class project artifact that serves as institutional memory, generated at project closeout. More reflective and extensive than the PR description's summary section. Serves as the artifact posted back to Linear issues on closeout, and as the source for portfolio-level rollups across completed projects.

2. **Post-PR revision workflow** — Fix the "dead zone" after `oat-project-pr-final` where the project looks complete to agents but is still awaiting human review. Introduce a `pr_open` phase status and a `oat-project-revise` skill that enables clean re-entry for human feedback without starting a new project.

3. **Completion flow improvements** — Better guidance and state transitions across the final stretch of the project lifecycle (post-implementation through archive), including how summary, document, update-repo-reference, pr-final, revise, and complete interact.

4. **Automatic subagent review at phase checkpoints** — Configurable option to automatically trigger a subagent code review when a plan phase checkpoint completes, instead of requiring the user to manually invoke review-provide. Scopes the review to all phases since the last checkpoint (e.g., if checkpoints are p02 and p05, completing p02 triggers review for p01-p02, completing p05 triggers review for p03-p05). If it's the final phase, triggers `code final` review. Keeps sequential implementation but removes the manual review-triggering step.

## Clarifying Questions

### Question 1: Summary vs PR description distinction

**Q:** Should `summary.md` feed into the PR description, or are they independent artifacts?
**A:** They serve different audiences. `summary.md` is institutional memory (future you, future agents, portfolio rollups, Linear closeout). The PR description is reviewer-oriented (enough to review the PR). `pr-final` should draw from `summary.md` for its Summary section rather than synthesizing independently from raw artifacts.
**Decision:** Two distinct artifacts. PR description pulls from summary.md as a primary source but is thinner and more actionable.

### Question 2: Summary sections

**Q:** What sections should `summary.md` contain?
**A:** Based on brainstorming:

1. Overview — 2-3 sentences on what the project was and why
2. What was implemented — capability-level, narrative
3. Key decisions — design choices with rationale
4. Design deltas — where final result diverged from original design and why
5. Notable challenges — what was harder than expected, resolution
6. Tradeoffs made — explicit tradeoffs with reasoning
7. Integration notes — things other projects/developers need to know
8. Revision history — if revisions happened post-PR, what changed and why
9. Follow-up items — deferred work, known limitations, spawned backlog items with refs
10. Associated issues — which backlog items / Linear issues this project satisfied
    **Decision:** These 10 sections form the summary template. Several sections may be omitted if not applicable (e.g., revision history for projects with no revisions).

### Question 3: When should summary be generated?

**Q:** What triggers summary generation?
**A:** Multiple valid triggers:

- `oat-project-summary` can be run independently at any time after implementation has meaningful progress
- `oat-project-pr-final` triggers summary generation if not yet done (summary feeds the PR description)
- `oat-project-complete` generates summary if not yet done
- Summary is re-runnable — can be updated after revisions
  **Decision:** Summary is an independent, re-runnable skill. Both pr-final and complete invoke it if summary.md doesn't exist. After revisions, summary should be updated (not fully rewritten — update relevant sections).

### Question 4: How does summary know what's new on re-run?

**Q:** When summary is re-run after revisions, how does it know what changed?
**A:** Track in summary.md frontmatter what the summary has "seen":

- `oat_summary_last_task` — last task ID when summary was generated
- `oat_summary_revision_count` — how many revision phases existed at generation time
- `oat_summary_includes_revisions` — which revision phases are reflected
  On re-run, check for new tasks or revision phases since the tracked point and update relevant sections.
  **Decision:** Frontmatter-based tracking of summary state enables incremental updates.

### Question 5: Post-PR phase status

**Q:** What should the project state be after pr-final but before human approval?
**A:** A new phase status `pr_open` that signals "PR is open, human reviewing, revisions may come." This is NOT a blocker — `oat-project-complete` should still work from `pr_open`. The user may review inline (not on GitHub) and just want to close out directly.
**Decision:** `pr_open` is guidance, not a gate. Complete is permissive from any status.

### Question 6: How does the revision skill work?

**Q:** What is the entry point for post-PR revisions?
**A:** `oat-project-revise` accepts feedback from multiple sources:

- Inline conversation (user describes changes needed)
- GitHub PR comments (delegates to `review-receive-remote`)
- A review artifact (delegates to `review-receive`)
  For inline feedback, it's simpler than review-receive — no severity classification, no triage ceremony. Just "here are the things I want changed" → tasks → implement.
  **Decision:** `oat-project-revise` is a unified re-entry point that routes to the right handler based on feedback source.

### Question 8: Automatic subagent review at checkpoints

**Q:** Should phase checkpoint completion automatically trigger a code review?
**A:** Yes, as a configurable option. When enabled, completing a plan phase checkpoint automatically spawns a subagent review scoped to all phases since the last reviewed checkpoint. This keeps sequential implementation (not switching to subagent-driven execution mode) but removes the manual step of invoking review-provide at every checkpoint. Configuration could live in oat config (global default), local config (per-repo override), or per-project (state.md or plan.md frontmatter override).
**Decision:** Add a configuration option for auto-review at checkpoints. The review scope is derived from checkpoint boundaries. Final phase checkpoint triggers `code final`. This is opt-in, not default behavior.

### Question 9: Should OAT manage Linear status transitions?

**Q:** When a project completes, should OAT move the Linear issue to Done?
**A:** No. The GitHub integration handles status transitions automatically: branch push → In Progress, PR → In Review, merge → Done. OAT's responsibility is posting the summary as a comment/update, not managing status.
**Decision:** OAT posts data to Linear (summary on closeout). Status lifecycle is GitHub integration's job.

## Solution Space

This project has a clear direction from extensive brainstorming. The solution involves three coordinated changes to existing skills plus two new skills/artifacts.

### Chosen Direction

**Approach:** Incremental extension of existing lifecycle skills with two new artifacts (summary.md, revision workflow)
**Rationale:** The existing skill architecture (declarative frontmatter, phase-based lifecycle, review-receive pattern) already has the right seams. We're adding a missing artifact and fixing a state gap, not redesigning the lifecycle.
**User validated:** Yes — confirmed through brainstorming session

## Key Decisions

1. **Summary.md is distinct from PR description:** Summary is institutional memory (deeper, more reflective). PR description is reviewer-oriented (thinner, actionable). PR description draws from summary.md as a source.

2. **`pr_open` is not a gate:** It's a status signal. `oat-project-complete` works from `pr_open`, `complete`, or `in_progress`. The user controls when to close out, not the state machine.

3. **Revision skill is a unified re-entry point:** `oat-project-revise` handles inline feedback directly and delegates to existing review-receive skills for structured feedback. It adds revision phases to plan.md and returns to `pr_open` after completion.

4. **Summary is re-runnable with incremental updates:** Frontmatter tracks what the summary has seen. Re-runs after revisions update relevant sections rather than full rewrites.

5. **No Linear status management from OAT:** GitHub integration owns status transitions. OAT posts summary content to Linear issues on closeout.

6. **Complete is permissive:** Completion gates (final review, docs sync, summary) remain as warnings, not hard blocks. The user can always force completion.

7. **Auto-review at checkpoints is opt-in:** Configurable at global, repo, or project level. When enabled, phase checkpoint completion spawns a subagent review covering all phases since the last checkpoint. Keeps sequential execution mode — this is about automating the review trigger, not changing how implementation runs.

## Constraints

- Must not break any existing project lifecycle workflow
- Must not require summary.md for projects that don't want it (existing projects should still complete normally)
- `pr_open` must be backward-compatible — agents reading older state.md files without this status should not break
- Summary generation must work from any state (mid-implementation, post-implementation, post-revision)
- The revision workflow must be compatible with both inline review (no GitHub PR) and GitHub PR review paths
- Skills must follow existing OAT skill conventions (frontmatter, progress indicators, mode assertion, allowed-tools)

## Success Criteria

- `summary.md` is generated as a first-class project artifact with the defined section structure
- `summary.md` is re-runnable and tracks what it has seen via frontmatter
- `pr-final` uses summary.md as a source for its Summary section
- `oat-project-complete` generates summary if not done, uses it as archive cover page
- After pr-final, state.md reflects `pr_open` status with clear next-step guidance (revise or complete)
- `oat-project-revise` cleanly re-enters implementation for inline feedback without triggering new project creation
- `oat-project-revise` creates revision phases in plan.md and returns to `pr_open` on completion
- `oat-project-complete` works from any phase status without blocking on `pr_open`
- Agents in new sessions reading state.md correctly understand the project is "awaiting human review / open for revisions" rather than "done, start a new project"
- Auto-review at checkpoints can be enabled via configuration and correctly scopes reviews to phases since the last checkpoint
- Final phase checkpoint with auto-review triggers `code final` review

## Out of Scope

- Linear integration (handled by separate `remote-project-management` project)
- Backlog promotion skill (`oat-pjm-promote-to-project`) — related but separate
- Deferred work capture skill (`oat-pjm-capture-deferred`) — related but separate
- Changes to `oat-project-document` or `oat-pjm-update-repo-reference` skills — these continue to work as-is
- Portfolio rollup skill that reads summary.md across projects — future work

## Deferred Ideas

- **Portfolio rollup from summaries** — A skill that reads `summary.md` from recent completed projects to synthesize a status report. Valuable but depends on having completed projects with summaries first.
- **Summary as Linear project update** — Beyond posting to individual issues, summary content could feed into Linear project-level updates with health/progress. Depends on Linear integration project.
- **Auto-generation of decision-record entries from summary** — Summary's "key decisions" section overlaps with the repo decision record. Could auto-promote decisions to the decision record during update-repo-reference.
- **Summary diff view** — Show what changed between summary versions when re-run after revisions.

## Open Questions

- **Revision phase naming:** Should revision phases use `p-rev1`, `p-rev2` naming or extend the existing phase numbering (e.g., if last phase was p03, revision becomes p04)?
- **Summary template location:** Should the summary template live in `.oat/templates/summary.md` alongside other templates?
- **Complete flow ordering:** Exact ordering of summary generation, document, update-repo-reference, and archive within `oat-project-complete`. Currently complete generates PR description then archives — where does summary fit relative to those?
- **Auto-review config location:** Where does the auto-review setting live? Options: `oat config` (global default), `.oat/config.local.json` (per-repo), `state.md` or `plan.md` frontmatter (per-project). Could support cascading (project overrides repo overrides global).
- **Auto-review + review-receive flow:** After auto-review completes, should it automatically invoke review-receive to process findings, or pause for the user to run it manually? Automatic would be more seamless but removes a human decision point.

## Assumptions

- Projects that were completed before this change (without summary.md) will not be retroactively updated
- The `pr_open` status will be understood by agents that read state.md next-milestone guidance text, even without explicit code changes in the agent
- Inline revision feedback (not from GitHub) will be conversational — the user describes what they want changed, the agent creates tasks

## Risks

- **State complexity:** Adding `pr_open` and revision loops increases the number of possible state transitions. Risk of edge cases where state gets inconsistent.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep `pr_open` as guidance only, not a gate. Complete always works. Revision always returns to `pr_open`.

- **Summary bloat:** Summary.md could become too long for large projects with many revisions, reducing its value as a quick-read artifact.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep sections concise. Revision history is additive but brief. Cap revision detail at 2-3 sentences per round.

- **Skill interaction complexity:** Five skills need coordinated changes (implement, pr-final, complete, plus two new). Risk of inconsistent behavior across skills.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Design the state transitions clearly in spec. Test the full lifecycle flow end-to-end.

## Next Steps

Spec-driven mode: continue to `oat-project-spec` (after HiLL approval if configured).
