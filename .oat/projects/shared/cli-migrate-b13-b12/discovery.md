---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-16
oat_generated: false
---

# Discovery: cli-migrate-b13-b12

## Initial Request

Migrate two internal OAT scripts into the typed CLI with this order:
1) B13 first: `.oat/scripts/validate-oat-skills.ts` to CLI.
2) B12 next: `.oat/scripts/new-oat-project.ts` to CLI.

## Key Decisions

1. **Execution order:** Deliver B13 before B12 to capture the smallest, highest-leverage win first.
2. **Behavior parity:** Preserve existing script behavior (outputs, validation rules, non-destructive project scaffolding, exit semantics) while moving logic into `packages/cli`.
3. **CLI UX direction:** Target command shapes that align with backlog intent:
   - `oat validate skills`
   - `oat project new <name>`
4. **Migration safety:** Keep changes scoped to the two migrations; defer broader script-directory cleanup to B16.

## Constraints

- No implementation code changes during quick-start setup; produce discovery + plan artifacts only.
- Follow existing CLI architecture and import conventions in `packages/cli`.
- Keep plan tasks atomic, test-backed, and commit-scoped.

## Success Criteria

- Quick workflow metadata is set (`state.md` indicates `oat_workflow_mode: quick`).
- Plan is complete and runnable with stable task IDs and explicit verification commands.
- Plan sequences B13 first and B12 second with clear file-level touchpoints.

## Out of Scope

- Migrating other scripts (`generate-oat-state.sh`, `generate-thin-index.sh`) in this project.
- Removing `.oat/scripts/` entirely (B16).
- Full spec/design artifact authoring.

## Assumptions

- Existing CLI command framework and tests are the canonical integration path.
- Updating relevant skill docs and package scripts is part of migration completion.
- Historical/archive docs can be deferred unless they directly affect active workflows.

## Next Steps

Execute `oat-project-implement` starting at `p01-t01`.
