---
oat_generated: true
oat_generated_at: 2026-02-14
oat_pr_type: project
oat_pr_scope: followup
oat_project: .oat/projects/shared/provider-interop-cli
---

# PR: provider-interop follow-up cleanup

## Summary

Follow-up changes after the merged provider-interop PR to stabilize local provider sync behavior and complete the repository migration to `.agents/`.

This PR does three things:
- clarifies `oat sync` dry-run UX with explicit apply guidance,
- migrates active canonical assets/docs from `.agent` to `.agents`,
- removes tracked provider symlink views (`.claude/skills/*`, `.cursor/skills/*`) and ignores them so local paths are no longer committed.

## Goals / Non-Goals

### Goals
- Keep provider-managed symlink views local-only.
- Preserve canonical source of truth under `.agents/`.
- Improve operator clarity during `oat sync` dry-runs.

### Non-Goals
- No new provider feature scope.
- No behavioral redesign of sync planning/execution.

## What Changed

- CLI dry-run guidance
  - `packages/cli/src/commands/sync/dry-run.ts`
  - `packages/cli/src/commands/sync/index.test.ts`
  - Added explicit dry-run message and apply instructions (`oat sync --scope <scope> --apply`).

- Canonical path migration and docs alignment
  - Moved canonical assets from `.agent/{skills,agents}` to `.agents/{skills,agents}`.
  - Moved `new-agent-project.ts` into `.agents/skills/new-agent-project/scripts/`.
  - Updated active scripts/docs to `.agents` references (`AGENTS.md`, `README.md`, `.oat/scripts/*`, internal current-state docs).

- Git tracking cleanup for provider views
  - `.gitignore`: ignore `.claude/skills/**`, `.claude/commands/**`, `.cursor/skills/**`, `.cursor/commands/**`.
  - Removed tracked `.claude/skills/*` and `.cursor/skills/*` symlinks from git index.
  - Kept tracked rule files (e.g. `.cursor/rules/pr-description-rules.mdc`) intact.

## Verification

- `pnpm --filter=@oat/cli test src/commands/sync/index.test.ts`
- `pnpm --filter=@oat/cli type-check`
- `pnpm --filter=@oat/cli lint`

Result: passing.

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| final | code | passed | 2026-02-14 | reviews/final-re-review-2026-02-14.md |

## Git Context

- Branch: `provider-interop`
- Base: `main`
- Merge base: `725160bd68d06a963028940675534d7cc8b1f34a`
- Commits in range:
  - `8c53220` feat(cli): clarify sync dry-run output and apply guidance
  - `762c4f0` chore(oat): migrate canonical assets to .agents and update active docs
  - `d765940` chore: sync project skills
  - `1b1743e` chore: remove .agent directory
  - `cd8d862` chore: add CLAUDE.md to version control
  - `e0a99af` chore(git): ignore provider skill symlink views
- Diff shortstat: `62 files changed, 642 insertions(+), 177 deletions(-)`

## References

- Spec: [spec.md](https://github.com/tkstang/open-agent-toolkit/blob/provider-interop/.oat/projects/shared/provider-interop-cli/spec.md)
- Design: [design.md](https://github.com/tkstang/open-agent-toolkit/blob/provider-interop/.oat/projects/shared/provider-interop-cli/design.md)
- Plan: [plan.md](https://github.com/tkstang/open-agent-toolkit/blob/provider-interop/.oat/projects/shared/provider-interop-cli/plan.md)
- Implementation: [implementation.md](https://github.com/tkstang/open-agent-toolkit/blob/provider-interop/.oat/projects/shared/provider-interop-cli/implementation.md)
- Final review: [final-re-review-2026-02-14.md](https://github.com/tkstang/open-agent-toolkit/blob/provider-interop/.oat/projects/shared/provider-interop-cli/reviews/final-re-review-2026-02-14.md)
- CLI dry-run change: [dry-run.ts](https://github.com/tkstang/open-agent-toolkit/blob/provider-interop/packages/cli/src/commands/sync/dry-run.ts)
- Git ignore cleanup: [.gitignore](https://github.com/tkstang/open-agent-toolkit/blob/provider-interop/.gitignore)
