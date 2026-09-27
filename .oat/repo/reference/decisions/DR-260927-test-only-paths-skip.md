---
id: DR-260927-test-only-paths-skip
title: Test-only paths skip the lockstep bump
date: 2026-09-27
status: accepted
legacy_id: null
---

# Test-only paths skip the lockstep bump

## Context

`versionPolicyIgnorePatterns` for `packages/cli` is only `assets/**`
(`packages/cli/src/release/public-package-contract.ts`). A change limited to
`*.test.ts` under `packages/cli/src` therefore forces the five-package lockstep
bump (`DR-260826-wave-level-lockstep-bump`), even though test files never ship:
each package's `tsconfig.json` leaves its test files out of `dist`, and the
published `files` lists only `dist`, `README.md`, and (for the CLI) `assets`.
The skill-bump rule already exempts a skill's `tests/` directory for the same
reason. Tracked by `BL-260826-decide-whether-test-only-paths`.

## Decision

A path counts toward the lockstep version policy only if it can reach a
published artifact. For each public package, add to
`versionPolicyIgnorePatterns` exactly the test patterns that package's
`tsconfig.json` leaves out of `dist`:

- `packages/cli`: `src/**/*.test.ts`, `src/**/__tests__/**`
- `packages/control-plane`: `**/*.test.ts`, `**/*.spec.ts`
- `packages/docs-config`, `packages/docs-transforms`: `src/**/*.test.ts`
- `packages/docs-theme`: none (its tsconfig excludes no test paths)

Test helpers, fixtures, or support modules that compile into `dist` still
count. The ignore list must never be broader than the compile exclusion.

Rejected alternative: keep bumping on any `src` change. It is simpler, but it
publishes releases with no shipped change.

## Consequences

- A PR limited to excluded test files needs no lockstep bump;
  `pnpm release:check-versions` accepts it unchanged.
- The implementation adds a contract test that fails when a package's
  ignore patterns and its tsconfig test exclusion diverge, so a future tsconfig
  change cannot widen the ignore list silently.
- Skill-bundled assets (`.agents/skills`, `.agents/agents`, `.oat/templates`,
  `.oat/scripts`, `apps/oat-docs/docs`) keep their current bump rules; the
  canonical skill `tests/` exemption is unchanged.
- AGENTS.md's Package Management section states the rule.
