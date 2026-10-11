---
title: PR Flow
description: 'PR generation inputs, outputs, artifact expectations, and frontmatter handling.'
---

# PR Flow

Two PR paths:

- `oat-project-pr-progress`: progress PR for one phase or partial scope
- `oat-project-pr-final`: final project PR into `main`

In a goal project both skills register deliveries instead: a progress PR is a
milestone delivery, and pr-final registers terminal deliveries rather than a
separate final PR.

## Inputs

Expected artifacts:

- Required (all modes): `plan.md`
- Required (spec-driven mode): `spec.md`, `design.md`
- Optional (quick/import): `spec.md`, `design.md`
- Not expected (lite): `discovery.md`, `spec.md`, or `design.md`
- Not expected (brief): `discovery.md`, `spec.md`, or `design.md`; the Project Brief in `plan.md` and the per-phase journal in `implementation.md` are the sources
- Not expected (goal): as brief; the Project Brief with its `## Milestones` table, the journal, and the goal state in `state.md` are the sources
- Recommended (quick mode): `discovery.md`
- Recommended (import mode): `references/imported-plan.md`
- Recommended: `implementation.md` final summary
- Recommended: `summary.md` — pr-final treats it as the primary source for the PR Summary section and automatically refreshes it first when missing or stale
- Lite source row: `oat-project-pr-final` uses the plan's Summary, Decisions, and Validation Criteria plus the `implementation.md` Final Summary; it does not create `summary.md` unless lite closeout explicitly opts in
- Brief source row: `summary.md` is required as in quick; its sources are the brief's Goal, Outcomes, Approach, and Decisions, the journal's accepted phases and Outcomes audit, and the review rows. Progress PRs scope a phase or `pNN-pMM` run from the journal's `**Base:**`/`**Head:**` anchors rather than a commit-message search
- Goal source row: a progress PR is a milestone delivery. Its scope is the milestone's ordered phase set, or a registered delivery's frozen scope; its Git range runs from the set's first anchored base to its last anchored head and discloses other milestones' phases inside it. The PR is created only after `oat project delivery check` reports `status: ok` and a `registering` entry is committed to `oat_deliveries`. pr-final registers terminal deliveries for uncovered accepted phases instead of opening a separate final PR
- Required gate for final PR: review table final row should be `passed` (goal: pr-final does not read the final row; each delivery it registers needs a passed, fresh integrated review and an allowed, fresh exit carrier instead)

## Output

Local artifact path:

- `.oat/projects/<scope>/<project>/pr/*.md`

GitHub PR body policy:

- Keep YAML frontmatter in local artifact
- Strip frontmatter from submitted PR body

## Synced project links

For a synced project, PR creation follows a six-step order:

1. write and format the local PR artifact;
2. run `oat project push` so the project ref contains the latest artifacts;
3. run `oat project links --format markdown` to generate the delimited links
   block from that exact ref commit;
4. include the block in the submitted PR body;
5. persist `oat_pr_status` and `oat_pr_url` in `state.md`; and
6. push again so subsequent artifact writes can refresh the open PR body.

The generated block links only `discovery.md`, `design.md`, and `summary.md`
when present. The URLs are pinned to the project ref's exact commit SHA rather
than a moving branch name. `plan.md`, `state.md`, `implementation.md`, and
`reviews/` are intentionally excluded because they contain agent-facing
execution detail rather than the reviewer-oriented project narrative. See
[Reviewing OAT PRs](../reviews/reviewing-oat-prs.md).

## Post-PR state

After `oat-project-pr-final` creates the PR, `state.md` transitions to `oat_phase_status: pr_open`. This signals "awaiting human review" rather than "done."

`pr_open` is the routing/review posture. Actual PR existence is tracked separately in:

- `oat_pr_status` — lifecycle state for the PR itself (`ready`, `open`, etc.)
- `oat_pr_url` — the tracked PR URL when a PR exists

From `pr_open`:

- **Feedback received:** run `oat-project-revise` to create revision tasks and re-enter implementation
- **Ready for completion:** run `oat-project-complete` to finalize and archive the project. If `oat_pr_status: open` is already tracked, completion skips asking whether to open a PR again and can show the tracked `oat_pr_url` in its summary.

Both completion orderings are supported:

- **Complete before merge:** run `oat-project-complete` while the PR is open,
  then merge.
- **Merge before completion:** merge the PR first, then run
  `oat-project-complete`.

An open PR is not a completion blocker. When completion archives project
artifacts, the archive-aware flow regenerates and synchronizes the open PR body
so its artifact links remain valid. Synced completion makes
`refs/oat/completed/<project>` authoritative at the verified source SHA. A
same-SHA `refs/oat/projects/<project>` ref may remain only as an inert alias;
the completed ref keeps the SHA-pinned links resolvable after the nested
checkout and tracked record are removed.

## Reference artifacts

- `.agents/skills/oat-project-pr-progress/SKILL.md`
- `.agents/skills/oat-project-pr-final/SKILL.md`
- `.oat/projects/<scope>/<project>/pr/`
