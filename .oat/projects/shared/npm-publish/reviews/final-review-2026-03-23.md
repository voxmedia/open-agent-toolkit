---
oat_generated: true
oat_generated_at: 2026-03-23
oat_review_scope: final
oat_review_type: code
oat_project: .oat/projects/shared/npm-publish/
---

# Code Review: final (all tasks p01-t01 through p04-t02)

**Reviewed:** 2026-03-23
**Scope:** Final code review of complete npm-publish implementation (146eed87..HEAD)
**Files reviewed:** 55
**Commits:** 14 (80c422b through a9350f8)

## Summary

The implementation is well-structured, follows the spec and design closely, and delivers all P0 and P1 requirements. The four public packages have correct manifests, the release validation runner is thorough, and the GitHub workflows are sound. The primary issue is a bug in the release and dry-run workflows where the `.npmrc.publish` heredoc content for the auth token line uses a literal `${NODE_AUTH_TOKEN}` inside single-quoted `<<'EOF'`, which prevents shell variable expansion and will produce a broken `.npmrc` that authenticates with the literal string `${NODE_AUTH_TOKEN}` instead of the actual token value. There are also a few minor carry-forward items around stale references in auto-generated and out-of-scope files.

## Findings

### Critical

- **`.npmrc.publish` auth token not expanded in release workflow** (`.github/workflows/release.yml:43-47`)
  - Issue: The heredoc uses `<<'EOF'` (single-quoted delimiter), which suppresses all variable expansion in the heredoc body. The line `//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}` will be written literally as `${NODE_AUTH_TOKEN}` instead of the actual token value. When `NPM_CONFIG_USERCONFIG` points to this file during the publish step, npm will attempt to authenticate with the literal string `${NODE_AUTH_TOKEN}`, and publishing will fail with a 401 or 403 error.
  - Fix: Change `<<'EOF'` to `<<EOF` (unquoted delimiter) so the shell expands `${NODE_AUTH_TOKEN}` at write time. Ensure `NODE_AUTH_TOKEN` is set in the environment for the "Configure npmjs registry" step (it currently is not -- only the "Verify npm auth" and "Publish packages" steps have it). Alternatively, keep the single-quoted heredoc and rely on npm's own environment variable expansion at runtime (npm does resolve `${NODE_AUTH_TOKEN}` in `.npmrc` natively), but then verify that `NPM_CONFIG_USERCONFIG` combined with pnpm's `--filter publish` correctly reads `.npmrc.publish` at publish time. The safest fix is to verify that npm/pnpm resolves the `${NODE_AUTH_TOKEN}` placeholder natively from the `.npmrc.publish` file at publish time -- if it does, this is a non-issue. If not, switch to `<<EOF` and add `NODE_AUTH_TOKEN` to the configure step's env.
  - Requirement: FR2 (coordinated multi-package publishing)
  - **Revised severity after analysis:** npm and pnpm **do** natively expand `${VAR}` references in `.npmrc` files at read time, so the single-quoted heredoc is actually intentional -- it preserves the literal `${NODE_AUTH_TOKEN}` in the file, and npm resolves it from the environment when publishing. Since `NODE_AUTH_TOKEN` is set in the "Publish packages" step's env, this should work correctly. **Downgraded to not a finding.** Removing from Critical.

None

### Important

- **Partial publish risk in release workflow** (`.github/workflows/release.yml:69-76`)
  - Issue: The publish step iterates over four packages in a `for` loop. If `@voxmedia/oat-docs-transforms` publishes successfully but `@voxmedia/oat-docs-config` fails, the release is left in a partial state with only some packages published at the new version. The design document explicitly identifies `partial-publish-risk` as a concern (line 514) but the implementation does not add a mitigation beyond failing fast.
  - Fix: This is an acknowledged design constraint for the first release. For a future improvement, consider adding `set -e` at the top of the run block (it may already be the default in GitHub Actions, but making it explicit documents intent), and consider a post-publish verification step that checks all four packages were published successfully. No fix required for the first release per the design document's rollback strategy, but document this as a known operational risk in the release runbook.
  - Requirement: FR2 (coordinated release)

- **Knowledge base files contain stale `@oat/*` references** (`.oat/repo/knowledge/testing.md:28-30`, `.oat/repo/knowledge/architecture.md:93-95`, `.oat/repo/knowledge/concerns.md:50`)
  - Issue: The auto-generated knowledge base files were committed as part of the project artifacts recording (commit `a9350f8`) but were generated from the pre-implementation codebase state (`oat_source_head_sha: 146eed8`). They contain stale `@oat/cli`, `@oat/docs-config`, `@oat/docs-transforms`, `@oat/docs-theme` references that contradict the public package contract.
  - Fix: Regenerate the knowledge base after merging this implementation by running the `oat-repo-knowledge-index` skill or equivalent. This is expected carry-forward work since the knowledge base is auto-generated.
  - Requirement: FR5 (reference alignment)

### Minor

- **`packages/cli/AGENTS.md` still references `@oat/cli`** (`packages/cli/AGENTS.md:16-18,35`)
  - Issue: The CLI package's AGENTS.md (not in the changed file set) still references `pnpm --filter @oat/cli test` and similar commands. While this file is not in the scope of the changed files, FR5's acceptance criteria state "Public-package naming changes do not leave contradictory repo guidance." This is a pre-existing reference that was not addressed by the implementation.
  - Suggestion: Update `packages/cli/AGENTS.md` filter references from `@oat/cli` to `@voxmedia/oat-cli` either as follow-up or as part of the knowledge base regeneration pass. This is not a blocker since the old filter name still resolves in the workspace due to pnpm workspace name resolution, but it creates confusion for contributors reading the instructions.

- **`release-dry-run.yml` runs on every PR** (`.github/workflows/release-dry-run.yml:4-5`)
  - Issue: The dry-run workflow triggers on all pull requests to `main`, which means every PR (including docs-only or OAT artifact changes) will run a full build, release validation, and publish dry-run cycle. This could be unnecessarily expensive for non-code PRs.
  - Suggestion: Consider adding path filters to skip the dry-run for PRs that only change docs, `.oat/`, or other non-package files. Example: `paths: ['packages/**', 'tools/**', 'package.json', 'pnpm-lock.yaml', '.github/workflows/release*']`.

- **Publish order differs between dry-run and release workflows**
  - Issue: In `release-dry-run.yml`, the packages are published in the order `oat-cli, oat-docs-config, oat-docs-theme, oat-docs-transforms`. In `release.yml`, the order is `oat-docs-transforms, oat-docs-config, oat-docs-theme, oat-cli`. The release order (transforms first, then config which depends on it, then theme, then CLI) is intentionally dependency-ordered. The dry-run order doesn't match, which means the dry-run doesn't exercise the exact same sequence.
  - Suggestion: Align the dry-run package order to match the release order for consistency: `oat-docs-transforms, oat-docs-config, oat-docs-theme, oat-cli`.

## Requirements/Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `plan.md`, `implementation.md`, `discovery.md`

### Requirements Coverage

| Requirement | Status      | Notes                                                                                                                                                                                                                                   |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1         | implemented | Four packages correctly named `@voxmedia/oat-cli`, `@voxmedia/oat-docs-config`, `@voxmedia/oat-docs-theme`, `@voxmedia/oat-docs-transforms`. Contract helper defines and validates the set.                                             |
| FR2         | implemented | Tag-triggered release workflow publishes all four packages. Dry-run workflow validates on PRs. CI includes `release:validate`.                                                                                                          |
| FR3         | implemented | All four manifests have `repository`, `homepage`, `bugs`, `license`, `files`, `publishConfig.access`, proper exports. Validation runner checks tarball contents, metadata, and forbidden paths.                                         |
| FR4         | implemented | CLI README positions it as primary entry point. Docs package READMEs describe them as secondary libraries. Root README lists all four with CLI-first ordering.                                                                          |
| FR5         | partial     | In-repo code imports, templates, and scaffolding are fully aligned. Auto-generated knowledge base files contain stale references (carry-forward). `packages/cli/AGENTS.md` has stale filter names (pre-existing, not in changed files). |
| FR6         | implemented | `pnpm release:validate` runner builds, packs, and inspects all four packages. CI runs it on every push/PR. Dry-run workflow exercises `pnpm publish --dry-run`.                                                                         |
| NFR1        | implemented | Simple lockstep model using one tag-triggered workflow. No independent versioning or complex orchestration.                                                                                                                             |
| NFR2        | implemented | Explicit `files` lists in manifests. Validation checks for forbidden paths (src, tests, tsbuildinfo). Tarball inspection verifies only intended contents.                                                                               |
| NFR3        | implemented | Package READMEs clearly describe purpose and role. CLI described as primary. Docs packages described as secondary libraries for Fumadocs consumers.                                                                                     |
| NFR4        | implemented | Four-package shape preserved. Workspace deps use `workspace:*`. Lockstep version assumption maintained in scaffolding.                                                                                                                  |

### Extra Work (not in declared requirements)

None. All implementation work maps to planned tasks and requirements. The knowledge base files in the diff are auto-generated snapshots taken before implementation, not new work.

## Verification Commands

Run these to verify the implementation:

```bash
# Build all packages
pnpm build

# Run release validation (builds, packs, inspects tarballs for all 4 packages)
pnpm release:validate

# Run the public package contract tests
pnpm --dir packages/cli exec vitest run src/release/public-package-contract.test.ts

# Run scaffold and integration tests for renamed packages
pnpm --dir packages/cli exec vitest run src/commands/docs/init/scaffold.test.ts
pnpm --dir packages/cli exec vitest run src/commands/docs/init/integration.test.ts src/commands/docs/init/mkdocs-compat.test.ts src/commands/docs/e2e-pipeline.test.ts src/commands/docs/migrate/frontmatter.test.ts

# Build the docs site
pnpm build:docs

# Check for stale @oat/ references in consumer-facing docs
rg -n '@oat/(cli|docs-config|docs-theme|docs-transforms)' README.md apps/oat-docs/docs

# Full CI suite
pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm release:validate && pnpm build:docs
```

## Technical Debt Carry-Forward

| Item                                                   | Severity | Source                                                | Recommended Action                                              |
| ------------------------------------------------------ | -------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| Knowledge base stale `@oat/*` references               | Low      | Auto-generated files from pre-implementation snapshot | Regenerate with `oat-repo-knowledge-index` after merge          |
| `packages/cli/AGENTS.md` stale `@oat/cli` filter names | Low      | Pre-existing file not updated by implementation       | Update filter references to `@voxmedia/oat-cli`                 |
| Dry-run workflow runs on all PRs                       | Low      | Performance concern                                   | Add path filters to skip for non-code changes                   |
| Publish order mismatch between dry-run and release     | Low      | Consistency concern                                   | Align dry-run package order to match release order              |
| Partial publish risk                                   | Medium   | Acknowledged design constraint                        | Document in release runbook; consider post-publish verification |
