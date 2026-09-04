---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260827-fail-closed-on-partial-or.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260827-fail-closed-on-partial-or
oat_issue_url: null
created: '2026-08-30T23:40:20Z'
---

# Reject structurally incomplete CLI asset bundles

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** This plan is the required predecessor of
> [Make asset-bundle errors aware of explicit overrides](./2026-08-30-make-assets-errors-override-aware.md).

## Outcome

`validateAssetsBundle` rejects metadata-only and truncated bundles before any
consumer can interpret missing content as a legitimate empty installation.
The structural check uses the bundle producer's stable top-level directory
contract and remains intentionally cheaper than a file inventory or checksum.

## Source and live evidence

- Source backlog item:
  [BL-260827-fail-closed-on-partial-or — Fail closed on partial or metadata-only OAT_ASSETS_DIR bundles](../../pjm/backlog/items/BL-260827-fail-closed-on-partial-or.md)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `packages/cli/src/fs/assets.ts:28-67` validates only metadata shape and
    `oatVersion`; it never checks bundle content.
  - `packages/cli/src/fs/assets.ts:85-110` applies that validator to both the
    packaged root and an explicit `OAT_ASSETS_DIR`, so one structural invariant
    protects both paths.
  - `packages/cli/scripts/bundle-assets.sh:41-42` creates seven stable top-level
    directories: `skills`, `agents`, `templates`, `scripts`, `docs`,
    `migration`, and `config`.
  - `packages/cli/src/fs/assets.test.ts:12-22` creates metadata-only fixtures,
    and `:41-68` currently treats them as valid overrides.
  - [2026-08-30 Wave 3 execution summary](../project-summaries/20260830-wave-3-execution.md)
    records the completed predecessor that introduced fail-closed metadata
    validation.
- Predecessor plan:
  [Honor an explicit CLI assets root and isolate package coverage smoke tests](./2026-08-19-hermetic-cli-assets-root.md)
  is implemented history, not a competing plan.

## Dependencies

| Type          | Dependency                                                                                                                                                             | Required state                                                                                                        | Current state                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Soft history  | [2026-08-19 assets-root plan](./2026-08-19-hermetic-cli-assets-root.md)                                                                                                | Preserve its explicit-override and fail-closed metadata behavior.                                                     | Implemented on current main.                          |
| Downstream    | [BL-260827-override-aware-remedy-text — Override-aware remedy text in assets-root fail-closed errors](../../pjm/backlog/items/BL-260827-override-aware-remedy-text.md) | Structural validation must land first or execute earlier in one explicitly ordered series.                            | Open; separately planned and blocked on this outcome. |
| Soft ordering | W1 group 2 plan [Make asset-bundle errors aware of explicit overrides](./2026-08-30-make-assets-errors-override-aware.md)                                              | Runs after this plan; both edit `packages/cli/src/fs/assets.ts` and `assets.test.ts`, so never in one parallel group. | Pending.                                              |

There are no unsatisfied hard dependencies for this plan itself.

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- packages/cli/src/fs/assets.ts packages/cli/src/fs/assets.test.ts packages/cli/scripts/bundle-assets.sh packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml
```

Stop if the producer's directory set, asset validation boundary, or an existing
inventory/checksum contract changed materially.

## Repository conventions

- Build: `pnpm build` → all non-docs workspace builds pass and packaged assets
  are produced.
- Typecheck: `pnpm type-check` → all TypeScript packages pass.
- Focused test:
  `pnpm --filter @open-agent-toolkit/cli test -- src/fs/assets.test.ts` → valid,
  truncated, and metadata-invalid cases pass.
- Lint/format check: `pnpm check` → repository checks pass.
- Implementation pattern: use `CliError` exit code 2 and fail explicit
  overrides without fallback to packaged assets.
- Git/PR convention: shipped CLI behavior requires one lockstep bump of all
  five public packages; do not push or open a PR unless instructed.

## Scope

### In scope

- `packages/cli/src/fs/assets.ts` — a single declared required-directory set and
  deterministic structural validation after metadata/version validation.
- `packages/cli/src/fs/assets.test.ts` — complete fixture construction plus
  metadata-only, missing-directory, and non-directory cases.
- `packages/cli/scripts/bundle-assets.sh` — verification source only; change it
  only if live producer output contradicts the declared invariant.
- Five public package manifests and `pnpm-lock.yaml`.

### Out of scope

- Per-file manifests, hashes, checksums, or exhaustive asset enumeration.
- Validating every bundled skill/template document.
- Changing `OAT_ASSETS_DIR` precedence or fallback behavior.
- Override-specific remedy wording; the linked downstream plan owns it.
- Reworking staged bundle publication or cleanup.

## Current state

A directory containing only a valid `bundle-metadata.json` passes
`validateAssetsBundle`. Downstream commands then see absent collections and can
report a misleading empty/not-bundled state with exit code zero. The bundle
producer already provides a low-cost structural contract: all seven top-level
content directories exist even when a category has no entries.

Use that producer contract as the validation boundary. Check directory type,
not merely existence, and report the first missing/invalid directory in a
deterministic order. Preserve the current reinstall/rebuild remedy text in this
plan so the separately reviewed override-aware change can alter all failure
families coherently afterward.

## Implementation steps

### 1. Declare and validate the top-level bundle structure

In `assets.ts`, add one immutable list for the seven producer-owned directory
names. After metadata parses and matches the expected CLI version, `stat` each
resolved child in list order and require `isDirectory()`. Convert missing paths
and non-directory entries into `CliError` exit code 2 with the offending path
and the existing packaged-bundle rebuild/reinstall remedy family.

Do not swallow permission or unexpected I/O failures as a valid bundle. Keep
metadata failures before structural failures so malformed metadata remains the
primary diagnosis.

**Verify:** `pnpm --filter @open-agent-toolkit/cli type-check` → validation and
filesystem imports compile.

### 2. Make valid fixtures structurally complete

Change the shared `createBundle` test helper to create all required directories
before writing metadata. Update direct `validateAssetsBundle` success/version
fixtures to use the same complete shape so tests cannot continue legitimizing a
metadata-only bundle.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli test -- src/fs/assets.test.ts` → existing
valid/default/override cases still pass.

### 3. Lock down truncated and wrong-type failures

Add regression tests that:

- reject a metadata-only explicit override;
- remove each required directory in a table and reject the bundle;
- replace one required directory with a file and reject it;
- retain the current metadata-missing, invalid, and version-mismatch diagnoses;
  and
- prove a structurally complete override resolves successfully.

Assert exit code and stable error family without coupling every test to prose
that the downstream remedy plan intentionally changes.

**Verify:** focused assets tests pass with all table rows executed.

### 4. Apply release bookkeeping and full gates

Bump the five public package versions together and update `pnpm-lock.yaml` via
pnpm. Fetch `origin/main` immediately before version validation.

**Verify:**

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm run check:skill-bumps
git fetch origin main
pnpm release:check-versions
pnpm release:validate
pnpm build:docs
```

Every command exits zero; verify the focused assets suite actually executed.

## Test plan

- Refactor the existing fixture helper to create the producer's seven
  directories.
- Add metadata-only, per-directory missing, and wrong-type regressions.
- Preserve metadata/schema/version tests and explicit-root fail-closed tests.
- Run the focused assets test, full uncached tests when evidence grade matters,
  build, release validation, and docs build.

## Done criteria

- [ ] Metadata-only roots fail with exit code 2.
- [ ] Every producer-required top-level path must be a directory.
- [ ] Complete packaged and explicit bundles still resolve.
- [ ] Metadata/schema/version error precedence remains stable.
- [ ] No checksum or exhaustive inventory scope was introduced.
- [ ] All five public packages have one lockstep version bump.
- [ ] Focused and full gates exit zero.
- [ ] `git status --short` contains no unexplained file.

## STOP conditions

Stop and report instead of improvising when:

- the live bundle producer no longer creates the seven named directories;
- a supported distribution intentionally omits one of those directories;
- structural validation would require content-level integrity or checksums;
- an explicit override would silently fall back to packaged assets;
- a named verification gate fails twice after one bounded correction; or
- the change overlaps an unmerged implementation of the downstream remedy.

## Revalidation Before Execution

Revalidate against current `origin/main`, the source backlog item, predecessor
history, producer script, validator, tests, and downstream plan when:

- a dependency landed after this plan was written;
- substantial time elapsed or main advanced materially from
  `49aeb5075971180b48c131bbd2b21b82d455bfc9`;
- a cited asset, test, producer, or release contract changed;
- linked backlog/project/decision intent changed;
- another PR implemented part of the outcome; or
- metadata-only acceptance can no longer be reproduced.

Update or supersede stale instructions before import or execution.

## Review focus

- Compare the required list directly with the producer script.
- Verify deterministic error ordering and exit code 2.
- Confirm fixtures cannot pass without the full top-level shape.
- Reject scope creep into file inventory or remedy-text work.
