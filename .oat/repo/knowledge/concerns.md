---
oat_generated: true
oat_generated_at: 2026-08-19
oat_source_head_sha: e0408f4676a7b84e4240b4c568b78265f1d5cd0a
oat_source_main_merge_base_sha: 6f443c0843d75b704168b8ca739b5bcf7f406f07
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Codebase Concerns

**Analysis Date:** 2026-08-19

## Tech Debt

**CI does not run the repository lint and format commands:**

- Issue: Root scripts define `pnpm lint` and `pnpm format`, but the CI job runs neither. The repository guidance explicitly says those checks are manual for changes under `tools/smoke` or `.agents/skills`.
- Files: `package.json`, `.github/workflows/ci.yml`, `AGENTS.md`, `apps/oat-docs/docs/contributing/code.md`
- Impact: A pull request can be green in CI while failing repository-wide lint or formatting checks that contributors were expected to run locally.
- Fix approach: The current control is documented manual execution; no CI step or other automated status check covers these commands.

**Release publication lists are duplicated in workflow shell loops:**

- Issue: The five public package names are repeated in both the dry-run and publish workflows, while the authoritative package contracts are implemented separately in `tools/release/validate-public-packages.ts`.
- Files: `.github/workflows/release-dry-run.yml`, `.github/workflows/release.yml`, `tools/release/validate-public-packages.ts`, `AGENTS.md`
- Impact: Adding or removing a public package requires synchronized edits across validation and both workflow loops; a stale loop can build or validate a package without publishing it.
- Fix approach: The package list is currently maintained in separate workflow and TypeScript locations; no generated or checked linkage is present.

## Performance Bottlenecks

**Branch checkout hook reinstalls dependencies unconditionally:**

- Problem: The `post-checkout` script comment says installation is conditional on package changes, but the script always runs `pnpm install --frozen-lockfile`.
- Files: `tools/git-hooks/post-checkout`, `tools/git-hooks/README.md`
- Cause: There is no changed-path or lockfile comparison in the hook before invoking pnpm.
- Improvement path: Not detected; every checkout currently pays the dependency-install command cost, subject to pnpm cache state.

## Fragile Areas

**Repository and release jobs use different Node major versions:**

- Files: `.nvmrc`, `package.json`, `.github/workflows/ci.yml`, `.github/workflows/release-dry-run.yml`, `.github/workflows/release.yml`, `apps/oat-docs/docs/contributing/code.md`
- Why fragile: General CI uses the `.nvmrc` Node 22.17.0 toolchain, while release dry-run and publish use Node 24. The package engine accepts both, so release-only runtime differences are not exercised by the normal CI job.
- Safe modification: Release documentation describes this as an intentional npm/trusted-publishing split, but no cross-major runtime job is present in `.github/workflows/ci.yml`.
- Test coverage: CI executes the full test/build sequence on Node 22 only; Node 24 is exercised by release workflows.

**Git hook failures are deliberately non-blocking or hidden:**

- Files: `package.json`, `tools/git-hooks/pre-commit`, `tools/git-hooks/manage-hooks.js`, `apps/oat-docs/docs/contributing/hooks-and-safety.md`
- Why fragile: The package `prepare` script suppresses hook setup errors with `|| true`, and the pre-commit OAT status check also suppresses its exit status. The documentation confirms that drift warnings never fail a commit.
- Safe modification: This is the documented contributor-hook policy; local hook installation or drift checks cannot be treated as a reliable enforcement boundary.
- Test coverage: No CI job verifies that each contributor has successfully installed or enabled the managed hooks.

## Test Coverage Gaps

**Coverage collection is opt-in and has no detected threshold gate:**

- What's not tested: The root `pnpm test` command runs Vitest without coverage, and only the CLI package exposes a separate `test:coverage` script.
- Files: `package.json`, `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-transforms/package.json`, `.github/workflows/ci.yml`
- Risk: The required CI test gate verifies passing assertions but does not measure or enforce coverage for unexercised command, package, or integration paths.
- Priority: Medium

---

_Concerns audit: 2026-08-19_
