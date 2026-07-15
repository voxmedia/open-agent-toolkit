# Roadmap

This file records prioritized direction and lives under `pjm/` (the operational
layer). To reduce cross-worktree conflicts, prefer adding or moving single
bullet lines over rewriting whole sections, and reference backlog records by ID
(`BL-YYMMDD-slug`) rather than restating their detail here.

## Now (Active / Committed)

<!-- Add active work here. Format:
- **BL-YYMMDD-slug: {title}** — brief description. Project: {name} (if linked)
-->

- **BL-260708-verify-cursor-gpt-5-6-subagent: Verify Cursor GPT-5.6 subagent model slugs** — Re-run structured controls after a Cursor client rollout exposes Task in headless mode or support confirms the private requests; review by 2026-08-08. Current recommended candidates remain configured but unvalidated.
- **BL-260711-add-root-owned-dispatch-broker: Add root-owned dispatch broker for exact OAT subagent launches** — Preserve phase coordination and exact target provenance without nested provider initialization or broad coordinator permissions.
- **BL-260711-add-activity-aware-gate: Add activity-aware gate timeouts** — Distinguish healthy long-running reviews from silent hangs and preserve correlated artifacts on timeout.

## Next (Planned)

<!-- Add planned work here. Format:
- **BL-YYMMDD-slug: {title}** — brief description. Project: {name} (if linked)
-->

- **BL-260708-enable-oat-reviewer-subagent: Enable oat-reviewer subagent orchestration for faster broad reviews** — Delegate bounded reconnaissance while retaining primary-reviewer judgment.
- **BL-260711-skip-re-review-for-bookkeeping: Skip re-review for bookkeeping-only review findings** — Avoid redundant reviewer dispatch after narrowly classified, deterministically validated bookkeeping fixes across direct/subagent and gate-originated review flows.
- **BL-260712-per-project-override: Per-project override to disable configured external gates** — Skip configured gates for one project without mutating shared user configuration.

## Later (Directional Intent)

<!-- Add directional work here. Format:
- **BL-YYMMDD-slug: {title}** — brief description. Project: {name} (if linked)
-->

- **BL-260706-front-load-recurring-gate: Front-load recurring gate-finding classes into implementer briefs** — Reduce repeated review/fix loops by carrying stable gate expectations into implementation prompts.
