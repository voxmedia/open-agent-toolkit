---
oat_generated: true
oat_generated_at: 2026-03-10
oat_review_scope: final
oat_review_type: code
oat_project: /Users/thomas.stang/Code/open-agent-toolkit/.worktrees/open-agent-toolkit/migrate-mkdocs/.oat/projects/shared/migrate-mkdocs
---

# Code Review: final

**Reviewed:** 2026-03-10
**Scope:** Final code review for `migrate-mkdocs` (`260b734cd8b9d7dea46e557e8febb9d9ae89639d..HEAD`)
**Files reviewed:** 83
**Commits:** 29 commits (`260b734cd8b9d7dea46e557e8febb9d9ae89639d..HEAD`)

## Summary

The migrated `apps/oat-docs` app itself is in good shape: static export succeeds, `/api/search` is emitted as a static route, and the new `.md` link-rewrite transform is covered by passing tests. I found two remaining parity issues in the reusable `oat docs init --framework fumadocs` path, so the branch is not yet fully aligned with the migration goal of turning the Fumadocs setup into the new working scaffold.

## Findings

### Critical

None

### Important

1. **Live Fumadocs scaffold still emits the pre-fix OAT command wiring**
   - **Files:** `packages/cli/assets/templates/docs-app-fuma/package.json.template:7-35`, `packages/cli/src/fs/assets.ts:6-27`, `apps/oat-docs/package.json:7-38`, `packages/cli/src/commands/docs/init/integration.test.ts:123-128`
   - `oat docs init` reads its runtime templates from `packages/cli/assets/templates`, and that Fumadocs package template still generates `predev`/`prebuild` with `npx oat docs generate-index` while omitting `@oat/cli` from `devDependencies`. The migrated app had to change those scripts to `pnpm exec oat docs generate-index` and add `@oat/cli` to make the build work inside this workspace, so a freshly scaffolded Fumadocs app will currently recreate the broken pre-fix setup instead of the working one shipped in `apps/oat-docs`. The existing integration test only checks that the scripts contain `oat docs generate-index`, so this regression is not covered.

### Important

None

### Medium

1. **`docs init` does not record the Fumadocs config path in `.oat/config.json`**
   - **Files:** `packages/cli/src/commands/docs/init/scaffold.ts:186-195`, `.oat/config.json:9-14` (committed `HEAD`), `apps/oat-docs/docs/reference/oat-directory-structure.md:94-100`, `packages/cli/src/commands/docs/init/integration.test.ts:126-128`
   - `buildDocumentationConfig()` records `root`, `tooling`, and `index` for Fumadocs, but omits `documentation.config`. That leaves new `oat docs init --framework fumadocs` repos with less metadata than both this migrated branch and the documented config contract expect: the committed repo config now points `documentation.config` at `apps/oat-docs/next.config.js`, and the docs say `documentation.*` fields are set automatically by `oat docs init`. This does not break the already-migrated app because the branch fixed `.oat/config.json` manually, but it means the scaffold still fails parity with the migration target and the omission is currently untested.

### Minor

None

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, `state.md`, branch diff for `260b734cd8b9d7dea46e557e8febb9d9ae89639d..HEAD`

**Deferred Findings Ledger (final scope):**
- Deferred Critical count: 0
- Deferred Important count: 0
- Deferred Medium count: 0
- Deferred Minor count: 0
- None

| Requirement / Success Criterion | Status | Notes |
|---------------------------------|--------|-------|
| Fumadocs migration of `apps/oat-docs` | implemented | The MkDocs app is replaced with the Next.js/Fumadocs app and the migrated docs content is present. |
| Static export build succeeds | implemented | `pnpm --filter oat-docs build` passed and generated 40 static HTML paths plus a static `/api/search` route. |
| Search works in static export pipeline | implemented | The build emits `/api/search`, and the app layout is wired for static search. |
| Docs link rewriting from `.md` paths | implemented | `pnpm --filter @oat/docs-transforms test` passed, including the new `remark-links` coverage. |
| Scaffold parity with the migrated app | partial | The checked-in reusable Fumadocs scaffold still lags the working app's package/config behavior. |
| Pure Node.js build pipeline for the migrated app | implemented | The migrated app builds through the workspace Node.js toolchain without MkDocs/Python runtime files. |

### Extra Work (not in requirements)

None identified beyond the parity polish already included in the branch.

## Verification Commands

Executed during review:

```bash
git -C /Users/thomas.stang/Code/open-agent-toolkit/.worktrees/open-agent-toolkit/migrate-mkdocs diff --name-only 260b734cd8b9d7dea46e557e8febb9d9ae89639d..HEAD
git -C /Users/thomas.stang/Code/open-agent-toolkit/.worktrees/open-agent-toolkit/migrate-mkdocs log --oneline 260b734cd8b9d7dea46e557e8febb9d9ae89639d..HEAD
pnpm --filter oat-docs build
pnpm --filter @oat/docs-transforms test
pnpm --filter @oat/cli test -- src/commands/docs/init/scaffold.test.ts src/commands/docs/init/integration.test.ts
```

Results:
- `oat-docs` static export build: pass
- Static export output: 40 prerendered docs paths plus static `/api/search`
- `@oat/docs-transforms` tests: pass (22 tests)
- `@oat/cli` targeted scaffold/init tests: pass, but they do not assert the parity details called out above

## Recommended Next Step

Run the `oat-project-review-receive` skill to turn these review findings into follow-up implementation work before project completion.
