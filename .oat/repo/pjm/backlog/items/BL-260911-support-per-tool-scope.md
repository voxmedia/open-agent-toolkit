---
id: BL-260911-support-per-tool-scope
title: Support per-tool scope migration in oat tools migrate
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - tools
  - cli
assignee: null
created: 2026-09-11T01:18:45.980Z
updated: 2026-09-11T01:18:45.980Z
associated_issues: []
external_plans: []
---

## Description

oat tools migrate moves a whole pack between project and user scope. Once a repo is bootstrapped, oat-docs-bootstrap has no ongoing use in that repo while oat-docs-analyze and oat-docs-apply still serve the team, so moving one skill out of the project (to user scope) is the natural cleanup; today the only route is oat tools remove <name> --scope project plus reinstalling the whole pack at user scope. Add a per-tool form (for example oat tools migrate <name> --from project --to user) with --dry-run, reusing the pack migration's safety checks. Priority below the docs improvements in BL-260911-make-docs-bootstrap-a-front.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}

## Acceptance Criteria

- `oat tools migrate <name> --from <scope> --to <scope> [--dry-run]` moves one installed tool between project and user scope with the same collision, symlink, and sync safety as the pack form.
- `oat tools list` reflects the new scope; `oat sync --scope project` after the move removes the project-scope projection.
- Documented in the CLI reference next to the pack form.
