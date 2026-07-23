---
title: Contributing Code
description: 'Contributor setup, repo structure, quality gates, and pull request expectations for OAT changes.'
---

# Contributing Code

Use this page when you are changing the OAT codebase itself rather than only editing docs content.

## Environment Setup

Install and verify the workspace from the repo root:

```bash
nvm use
corepack pnpm install
corepack pnpm build
corepack pnpm run cli -- help
```

The repo pins Node in `.nvmrc` and the package manager in `package.json`
(`packageManager`). If your machine has multiple Node or pnpm installs, prefer
Corepack from the active `.nvmrc` Node so workspace commands use the same pnpm
version as the hooks and CI.

For worktree-based implementation, initialize the worktree before starting the CLI workflow:

```bash
corepack pnpm run worktree:init
```

## Monorepo Structure

OAT is organized as a pnpm workspace with Turborepo orchestration.

- `packages/cli` - provider sync, docs tooling, and workflow-supporting CLI commands
- `packages/docs-*` - shared docs app config, transforms, and theme components
- `apps/oat-docs` - the docs app used in this repo
- `.agents/skills` - workflow and utility skills
- `.oat/projects` - project lifecycle artifacts

## Quality Gates

Run the workspace checks that match your change surface:

```bash
pnpm test
pnpm lint
pnpm format
pnpm type-check
pnpm build          # excludes docs for speed
pnpm build:docs     # builds docs site and its dependencies
```

For narrower changes, use package-specific checks when possible, but do not merge without passing the relevant workspace gates.

### TypeScript and type-aware linting

The workspace runs the stable TypeScript 7 compiler through the `typescript-7`
package alias. The `typescript` package name remains aliased to the TypeScript 6
compatibility package for tools that import the compiler API directly.

`pnpm lint` runs both standard Oxlint checks and a targeted tsgolint semantic
pass over production sources. The semantic pass enforces
`typescript/no-floating-promises` and `typescript/no-misused-promises`; tests
remain under the existing syntax-lint policy. Keep `pnpm type-check` as a
separate gate because compiler diagnostics and semantic lint rules cover
different failure modes.

## CLI and Docs-Specific Verification

Common targeted checks:

```bash
pnpm --filter @open-agent-toolkit/cli test
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm --filter oat-docs docs:lint
pnpm build:docs
```

## Release Bootstrap

The first publish under `@open-agent-toolkit/*` is a maintainer bootstrap step,
not the steady-state path.

- Run `pnpm release:validate` before any release attempt.
- Publish the four public packages manually the first time under the new npm
  org scope.
- After those packages exist in npm, configure npm trusted publishing for this
  repository so `.github/workflows/release.yml` can stay the steady-state
  top-level release path without an npm token.
- In steady state, `release.yml` owns automatic releases from `main` and manual
  reruns for an existing release tag; `ci.yml` remains validation-only.
- Use `.github/workflows/release-dry-run.yml` to validate the GitHub path after
  the npm trust relationship is configured.

## Implementation Expectations

- Follow the import-path rules and architectural guidance documented in [CLI Design Principles](design-principles.md).
- Keep changes traceable to plan tasks, implementation records, and review artifacts when you are working inside an OAT project.
- Prefer editing canonical sources and letting sync/generation flows update derived files.
- Preserve the repo’s current behavior unless the plan or review explicitly calls for a change.

## Pull Request Expectations

- Use task- or scope-linked commit messages that stay traceable to project artifacts.
- Keep implementation notes current in the active project's `implementation.md` and `state.md`.
- Make verification explicit in commit-adjacent notes or review artifacts.
- If docs behavior changes, update the docs surface in the same change window.

### Breaking CLI grammar changes

When a command, option name, or option placement changes, make the migration visible to both reviewers and release-note readers:

- Use a `BREAKING:` PR title or prominent callout so generated release notes retain the warning.
- Include the old and new copy-pasteable commands.
- State the migration action for scripts, docs, and automation that use the old grammar.

For example:

**Breaking change title/callout:** `BREAKING: move scope after the sync command`

**Before:** `oat --scope all sync` <!-- oat-doctor: allow-stale-invocation -->

**After:** `oat sync --scope all`

**Migration action:** Update repository scripts and documentation, then run `oat doctor --scope project` to find known-stale invocations.

## Related Guides

- [Contributing Docs](documentation.md)
- [Commit Conventions](commit-conventions.md)
- [Writing Skills](skills.md)
