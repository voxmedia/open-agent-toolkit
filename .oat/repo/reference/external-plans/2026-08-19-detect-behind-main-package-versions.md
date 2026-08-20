---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260817-detect-branch-behind-published.md
oat_external_plan_commit: 6f443c08
oat_backlog_items:
  - BL-260817-detect-branch-behind-published
oat_issue_url: null
created: '2026-08-20T02:37:32Z'
---

# Reject publishable package versions overtaken by current main

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

## Outcome

The existing `release:check-versions` gate continues to enforce lockstep bumps
against the branch merge base and additionally rejects a publishable change
whose package version is not strictly greater than the current `origin/main`
version. CI catches a long-lived branch that was valid when created but was
later overtaken by a main release.

## Source and live evidence

- Source artifact or scope:
  `.oat/repo/pjm/backlog/items/BL-260817-detect-branch-behind-published.md`
- Planned at: commit `6f443c08` on `2026-08-19`
- Related backlog items: `BL-260817-detect-branch-behind-published` — Detect
  branch-behind-published-main package versions in CI
- Verified evidence:
  - `tools/release/check-version-bumps.ts:52` resolves a merge base and lines
    64–93 compare changed packages only with versions at that merge base.
  - `tools/release/release-utils.ts:73` finds `origin/main` or `main` only to
    compute the common ancestor, not to read the current main tip.
  - `.github/workflows/ci.yml:17` checks out full history and line 46 already
    runs `pnpm release:check-versions`, so `origin/main` is available on the PR
    merge path without a new network dependency.
  - `packages/cli/src/release/check-version-bumps.test.ts:35` covers unchanged
    merge-base versions but has no overtaken-main fixture.
  - All five current public manifests are at `0.2.32` at the planned commit.

## Drift check

Run before editing:

```bash
git diff --stat 6f443c08..HEAD -- tools/release/check-version-bumps.ts tools/release/release-utils.ts packages/cli/src/release/check-version-bumps.test.ts packages/cli/src/release/release-utils.test.ts .github/workflows/ci.yml AGENTS.md package.json
```

If the release gate gained current-main or registry comparison, re-evaluate
whether this plan is already satisfied. Do not add a second competing gate.

## Repository conventions

- Build: `pnpm build` → all non-docs workspace builds pass.
- Typecheck: `pnpm type-check` → release TypeScript compiles.
- Test:
  `pnpm --filter @open-agent-toolkit/cli test -- src/release/check-version-bumps.test.ts src/release/release-utils.test.ts`
  → release unit tests pass.
- Lint/format check: `pnpm check` → repository checks pass.
- Implementation pattern: retain dependency injection in
  `runVersionBumpCheck` so Git/reference behavior is tested with synthetic
  package states rather than remote mutation.
- Git/PR convention: extend the existing CI gate; do not add npm credentials,
  fetch from the registry, push, or open a PR unless instructed.

## Scope

### In scope

- `tools/release/check-version-bumps.ts` — current-main version state and an
  additive failure alongside existing merge-base lockstep failures.
- `tools/release/release-utils.ts` — a fail-closed current-main ref resolver and
  stable numeric package-version comparator if no suitable helper exists.
- `packages/cli/src/release/check-version-bumps.test.ts` and
  `packages/cli/src/release/release-utils.test.ts` — red/green synthetic drift
  fixtures and malformed/reference edge cases.
- `.github/workflows/ci.yml` or `AGENTS.md` only if the existing command or
  checkout contract must be clarified; no new step is expected.

### Out of scope

- Querying npm for published versions — CI already has the authoritative
  current `origin/main` ref and should remain offline/deterministic.
- Changing which five packages form the public lockstep set.
- Automatically rewriting versions on stale branches.
- Replacing merge-base change detection; both checks protect different failure
  modes and must coexist.

## Current state

The gate first skips when no merge base exists, then skips when no public
package roots changed, and otherwise compares each current version with its
merge-base version. That correctly enforces a bump relative to branch origin
but cannot detect a higher release added to main afterward. Because CI uses
`fetch-depth: 0`, the deterministic comparison source is current
`origin/main`, not npm.

## Implementation steps

### 1. Resolve current main separately from the merge base

Add a release utility that selects an existing `origin/main`, with local `main`
as a non-CI fallback, and returns the ref itself rather than its merge base.
Inject that resolver and a `readMainPackageJsonFn` into
`runVersionBumpCheck`. Preserve the current merge-base resolver and changed
workspace detection unchanged.

If publishable roots changed but no current-main ref can be resolved, return a
failed result with actionable text. Do not skip this new guard on the merge
path; a missing comparison source makes safety unprovable.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli test -- src/release/release-utils.test.ts`
→ origin/main, local fallback, and missing-ref cases pass.

### 2. Compare all lockstep versions strictly above current main

For changed publishable work, read the five current manifests and the same five
manifests at the resolved current-main ref. Add a narrow stable-version
comparator that accepts exactly numeric `major.minor.patch` values and reports
malformed or missing evidence as an error instead of mapping it to `0.0.0`.

Require every current lockstep version to be greater than its current-main
counterpart. Append package-qualified errors to the existing lockstep errors so
one run reports all required rebases/re-bumps. Equal and lower versions fail;
higher versions pass.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli test -- src/release/check-version-bumps.test.ts`
→ higher, equal, lower, and malformed synthetic cases pass.

### 3. Reproduce the overtaken-branch failure and retain normal skips

Add a synthetic case shaped like the reported regression: merge base at
`0.2.28`, branch at `0.2.29`, and current main at `0.2.30`. Assert the existing
merge-base rule would otherwise pass but the combined result fails with all
five affected package names. Add a green case with branch `0.2.31` and main
`0.2.30`, plus a no-public-change case proving docs-only work still skips the
strict-greater comparison.

The CLI result status and exit code remain the existing `failed`/1 behavior; do
not introduce a second script unless live structure makes extension impossible.

**Verify:** `pnpm release:check-versions` → passes on the current checkout.

### 4. Confirm CI and local Definition of Done stay aligned

Because CI already fetches full history and runs the extended command, no
workflow step should be necessary. Verify `origin/main` exists in CI's checkout
contract. Update workflow comments or `AGENTS.md` only if the command's local
precondition needs explicit documentation; do not duplicate the gate.

**Verify:** `pnpm check && pnpm type-check && pnpm test && pnpm build` → all
exit zero with the extended release gate's unit tests included.

## Test plan

- Extend `packages/cli/src/release/check-version-bumps.test.ts` with:
  overtaken-main failure, strictly-higher success, equal failure, lower failure,
  malformed evidence failure, missing main ref failure, and unchanged-root skip.
- Extend `packages/cli/src/release/release-utils.test.ts` for ref selection and
  stable numeric comparison.
- Focused command:
  `pnpm --filter @open-agent-toolkit/cli test -- src/release/check-version-bumps.test.ts src/release/release-utils.test.ts`
  → all release guard cases pass.
- Repository command: `pnpm release:check-versions` → exits zero on a branch
  whose current versions are valid against current main.
- Full commands:
  `pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm release:check-versions`
  → all exit zero.

## Done criteria

- [ ] The existing command retains merge-base lockstep enforcement.
- [ ] Changed publishable work fails when any current version is equal to or
      lower than current main.
- [ ] The `0.2.29` branch versus `0.2.30` main regression is red in tests.
- [ ] A strictly higher lockstep version is green, and no-public-change work
      retains its current skip behavior.
- [ ] Missing refs or malformed versions fail with actionable diagnostics.
- [ ] CI uses the extended existing gate without registry credentials.
- [ ] `git status --short` contains no unexplained or out-of-scope files.

## STOP conditions

Stop and report instead of improvising when:

- CI no longer fetches a trustworthy current-main ref;
- release policy permits prerelease or build-metadata versions that the stable
  numeric comparator cannot represent;
- current-main comparison would run for branches with no publishable changes;
- satisfying the requirement would require npm credentials or network access;
- a named verification gate fails twice after one bounded correction.

## Review focus

- Verify the code compares with the current main tip, not its merge base.
- Verify missing reference/version evidence fails closed only when publishable
  work changed.
- Ensure the new errors compose with the existing lockstep report and name all
  affected packages in one run.
