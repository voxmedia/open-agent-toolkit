# OAT Workflow Guide (Dogfood)

This is the end-to-end “how to use OAT” guide for this repo: the happy path, how resume works, and the review/PR loop.

For a snapshot of what exists right now, see `.oat/internal-project-reference/current-state.md`.

For a deep technical explanation of how the system works, see `.oat/internal-project-reference/dogfood-workflow-implementation.md`.

## Concepts (What OAT Is Tracking)

- **Knowledge base** (`.oat/knowledge/repo/*.md`): repo mapping used by later phases.
- **Projects root** (`.oat/projects-root` or `$OAT_PROJECTS_ROOT`): directory containing project folders.
- **Active project pointer** (`.oat/active-project`, gitignored): path to the currently active project directory.
- **Project artifacts** (in `{PROJECT_PATH}/`): `state.md`, `discovery.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`.
- **Plan tasks**: stable IDs like `p01-t03` used in the plan, implementation log, and commit scopes.
- **Reviews**: tracked in `plan.md`’s `## Reviews` table, with artifacts in `{PROJECT_PATH}/reviews/`.

## Quickstart (Happy Path)

1. Generate repo knowledge:
   - `oat-project-index`
2. Start a project (or set the active project when prompted):
   - `oat-project-new` (recommended) then `oat-project-discover`
3. Continue the workflow:
   - `oat-project-spec` -> `oat-project-design` -> `oat-project-plan` -> `oat-project-implement`
4. Final review loop:
   - `oat-project-review-provide code final`
   - `oat-project-review-receive`
   - `oat-project-implement` (executes any new "(review)" fix tasks)
   - Repeat until the `final` review row is `passed`
5. PR description:
   - `oat-project-pr-final`
   - Optional: `oat-project-pr-progress pNN` for phase milestones
6. Mark lifecycle complete (optional):
   - `oat-project-complete`

## Resume / Restart (How OAT Continues Work)

OAT is designed to resume safely across sessions. The intended sources of truth are:

- **Active project:** `.oat/active-project`
- **Phase routing:** `{PROJECT_PATH}/state.md` frontmatter
- **Task routing (implementation):** `{PROJECT_PATH}/implementation.md` frontmatter (`oat_current_task_id`) plus the progress table/log
- **Review routing:** `{PROJECT_PATH}/plan.md` `## Reviews` table

If `.oat/active-project` is missing or invalid, most skills will prompt for `{project-name}` and rewrite it.

### Common restart pitfalls

- **Projects-root mismatch:** if `.oat/projects-root` points somewhere different than where the project actually lives, the pointer may become invalid. Fix by:
  - running the `oat-project-open` skill and selecting the correct project, or
  - updating `.oat/projects-root` and then re-opening the project.
- **Stale knowledge:** if the knowledge base is stale (age/diff), refresh with the `oat-project-index` skill.

## Review Loop (Request → Receive → Fix → Re-Review)

The review loop is plan-driven. The canonical state is the `plan.md` `## Reviews` table.

### Status semantics (v1)

- `fixes_added`: review findings were converted into plan tasks
- `fixes_completed`: all review-generated tasks were implemented, awaiting re-review
- `passed`: a re-review completed with no Critical/Important findings remaining

### Workflow

1. Run the review:
   - `oat-project-review-provide code pNN` (phase), `oat-project-review-provide code final` (final), or artifact reviews like `oat-project-review-provide artifact spec`
2. Convert findings into tasks:
   - `oat-project-review-receive` adds new tasks to `plan.md` (usually prefixed `(review) …`)
   - It updates the Reviews row to `fixes_added` when tasks are created
3. Implement fixes:
   - `oat-project-implement` executes the new tasks and updates `implementation.md`
   - When all fix tasks are done:
     - update the Reviews row to `fixes_completed`
     - ensure `plan.md` rollups (`## Implementation Complete`) and `implementation.md` “Next” guidance are updated so summaries don’t go stale
4. Re-review:
   - Run `oat-project-review-provide …` again
   - Then `oat-project-review-receive` to reach `passed`

## PR Flow

### Progress PR (phase boundary)

Use when you want a PR description for a specific plan phase:
- `oat-project-pr-progress pNN`

### Project PR (final)

Use when the project is complete and the final review is `passed`:
- `oat-project-pr-final`

**Tip:** PR quality is best when `{PROJECT_PATH}/implementation.md` has a filled “Final Summary (for PR/docs)” section that reflects what was actually done (including any review fixes and design deltas).

## Progress Indicators (UX)

OAT skills are expected to provide user-facing reassurance, especially after user confirmations:
- prominent separator banners: `OAT ▸ …`
- a few step indicators for multi-step operations (2–5 lines)
- “starting…” / “done” updates for long-running operations (tests, builds, big diffs, subagents)

## Where to Log Workflow Friction

When dogfooding reveals confusing behavior or UX gaps, log it in:
- `.oat/internal-project-reference/temp/workflow-user-feedback.md`
