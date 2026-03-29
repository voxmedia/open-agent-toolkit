---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-29
oat_generated: true
oat_template: false
oat_summary_last_task: p03-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: oat-project-next

## Overview

The OAT project lifecycle has 15+ skills spanning discovery through completion, and users had to memorize which skill to invoke at each transition. The `oat-project-progress` skill helped by recommending the next step, but users still had to manually invoke it. This project added a single-command router that reads project state and invokes the correct next skill automatically, plus fixed `oat-project-pr-final` to auto-create PRs without a confirmation prompt.

## What Was Implemented

**oat-project-next skill** (`.agents/skills/oat-project-next/SKILL.md`): A stateful lifecycle router with six steps:

1. **State Reader** — Resolves the active project, reads `state.md` frontmatter and per-phase artifact frontmatter. Handles two no-project error branches (no projects exist vs projects exist but none active).

2. **Boundary Detector** — Four-tier classification of artifact state: complete with target (Tier 1), complete without target (Tier 1b), substantive content (Tier 2), or template/empty (Tier 3). Uses `oat_template` frontmatter as primary signal with `{placeholder}` pattern fallback.

3. **Phase Router** — Three routing tables (spec-driven, quick, import) mapping (phase, status, boundary tier) to target skill. HiLL gate override applied before table lookup. Execution mode awareness routes to `oat-project-subagent-implement` when configured.

4. **Review Safety Check** — Dual-signal detection scanning `reviews/` directory and cross-referencing plan.md Reviews table. Intercepts routing to send unprocessed reviews to `oat-project-review-receive` before advancing.

5. **Post-Implementation Router** — Six-step priority-ordered decision tree for the post-implementation chain: incomplete revisions → unprocessed reviews → final code review status → summary → PR → complete. Requires `passed` status on the final review row before advancing to summary.

6. **Dispatcher** — Announces routing decision (project, current state, target skill, reason) with optional blocker warnings, then invokes the target skill.

**oat-project-pr-final fix**: Removed the "Do you want to open a PR now?" confirmation prompt. PR creation is now automatic after generating the description. Version bumped 1.2.0 → 1.3.0.

**Bundle/manifest updates**: Added `oat-project-next` to `bundle-assets.sh` and `skill-manifest.ts` for bundle consistency.

## Key Decisions

1. **Complement, don't replace progress**: `oat-project-next` and `oat-project-progress` coexist. Progress is read-only diagnostic; next is action-oriented dispatch. They share state-reading logic conceptually but serve different purposes.

2. **Three-tier boundary detection avoids double-tap**: Unlike progress (which always routes to the current phase when `in_progress`), next advances to the next phase when the artifact has substantive content (Tier 2). This prevents the scenario where a user finishes a phase, calls next, and gets routed back to "any more feedback?" instead of advancing.

3. **Review safety check at every transition**: Before any phase advance, the router checks for unprocessed review artifacts. This prevents review feedback from being lost in the cracks — a critical safety rail for the lifecycle.

4. **Expanded "processed" statuses beyond spec**: The spec defined only `passed` as processed. The design expanded this to include `fixes_added` and `fixes_completed` because re-invoking review-receive on already-actioned reviews would be redundant. `deferred` was removed since it's not part of the canonical Reviews table status flow.

5. **Canonical skill registration only**: Skill authored in `.agents/skills/` only. Provider-linked views (`.claude/skills/`, `.cursor/skills/`) are symlinks managed by `oat sync`, not manual copies.

## Design Deltas

| Aspect                        | Planned                  | Actual                         | Reason                                              |
| ----------------------------- | ------------------------ | ------------------------------ | --------------------------------------------------- |
| Task commits                  | Separate commit per task | p01-t01..t05 combined into one | All sections of same file; splitting was artificial |
| Phase 2 tasks                 | Separate from Phase 1    | Included in Phase 1 write      | Same file; content was written in one pass          |
| Sync tasks (p02-t03, p03-t02) | Active re-sync step      | No-op                          | Symlinks auto-reflect changes to canonical files    |

## Follow-up Items

- **Configurable post-implementation chain order** — Deferred from discovery. Could let users skip summary or reorder steps, but adds complexity for minimal value now.
- **"next --dry-run" mode** — Deferred. Essentially what `oat-project-progress` already does.
- **Shared state-evaluation module** — Deferred. Progress and next could share a common state reader if both skills stabilize and the patterns converge.
