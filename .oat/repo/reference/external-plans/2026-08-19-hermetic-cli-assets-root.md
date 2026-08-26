---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260817-let-resolveassetsroot-honor.md
oat_external_plan_commit: 6f443c08
oat_backlog_items:
  - BL-260817-let-resolveassetsroot-honor
oat_issue_url: null
created: '2026-08-20T02:37:32Z'
---

# Honor an explicit CLI assets root and isolate package coverage smoke tests

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

## Outcome

`resolveAssetsRoot` honors a non-empty `OAT_ASSETS_DIR` and applies the same
directory and bundle-integrity validation used for default packaged assets.
The package-coverage smoke test builds and reads a private temporary bundle, so
parallel asset rebuilds cannot make that consumer observe shared mutable state.

## Source and live evidence

- Source artifact or scope:
  `.oat/repo/pjm/backlog/items/BL-260817-let-resolveassetsroot-honor.md`
- Planned at: commit `6f443c08` on `2026-08-19`
- Related backlog items: `BL-260817-let-resolveassetsroot-honor` — Let
  resolveAssetsRoot honor OAT_ASSETS_DIR and make smoke asset reads hermetic
- Verified evidence:
  - `packages/cli/scripts/bundle-assets.sh:6` already accepts
    `OAT_ASSETS_DIR` as the bundle destination.
  - `packages/cli/src/fs/assets.ts:72` always derives
    `<cliRoot>/assets`; it validates directory shape and bundle metadata before
    returning.
  - `packages/cli/src/fs/assets.test.ts:9` currently tests only the default
    resolution path, while subsequent cases cover metadata validity.
  - `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs:27`
    imports built CLI consumers that resolve bundled assets during the test.
  - The bundle script's staged-renaming comments at lines 12–19 explicitly
    identify concurrent readers of the shared assets directory as a failure
    mode.

## Drift check

Run before editing:

```bash
git diff --stat 6f443c08..HEAD -- packages/cli/src/fs/assets.ts packages/cli/src/fs/assets.test.ts packages/cli/scripts/bundle-assets.sh tools/smoke/explainer-kit/package-coverage-consumers.test.mjs packages/*/package.json pnpm-lock.yaml
```

If asset resolution, metadata validation, or the smoke consumer changed,
reconcile the live ownership boundary before editing. A material mismatch is a
STOP condition.

## Repository conventions

- Build: `pnpm build` → all non-docs workspace builds pass and CLI dist exists.
- Typecheck: `pnpm type-check` → all TypeScript packages pass.
- Test:
  `pnpm --filter @open-agent-toolkit/cli test -- src/fs/assets.test.ts` → assets
  unit tests pass.
- Lint/format check: `pnpm check && pnpm lint && pnpm format` → TypeScript,
  smoke JavaScript, and formatting checks pass.
- Implementation pattern: preserve `CliError` exit code 2 and call
  `validateAssetsBundle` for both default and overridden roots.
- Git/PR convention: this changes shipped CLI behavior, so bump all five public
  package versions in lockstep; do not push or open a PR unless instructed.

## Scope

### In scope

- `packages/cli/src/fs/assets.ts` — optional environment injection, non-empty
  override resolution, and unchanged validation.
- `packages/cli/src/fs/assets.test.ts` — override, fallback, and invalid-root
  cases without mutating process-global environment.
- `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs` — one private
  bundle per test file and scoped environment restoration.
- Five public package manifests and `pnpm-lock.yaml` — required lockstep release
  bookkeeping for shipped CLI behavior.

### Out of scope

- Identifying every concurrent writer of `packages/cli/assets` — isolation
  removes this consumer's dependency regardless of writer identity.
- Removing staged publication from `bundle-assets.sh` — it still protects
  default consumers.
- Allowing invalid bundles through the override — metadata validation remains
  mandatory.
- General dependency injection for all CLI environment variables.

## Current state

The producer and reader contracts are asymmetric: the bundle script can target
an isolated directory, but runtime resolution cannot read it. The override is
safe as a normal runtime environment input because it does not bypass trust
checks: `stat` still requires a directory and `validateAssetsBundle` still
requires matching schema and `OAT_VERSION`. This plan therefore resolves the
backlog's policy question in favor of an unconditional explicit override with
fail-closed validation.

## Implementation steps

### 1. Add a validated, testable assets-root override

Change `resolveAssetsRoot` to accept an optional
`env: NodeJS.ProcessEnv = process.env`. Select
`resolve(env.OAT_ASSETS_DIR)` only when the value is non-empty after trimming;
otherwise retain the current module-relative default. Keep directory checks,
error exit codes, and `validateAssetsBundle` identical for both paths.

Do not silently fall back to packaged assets when an explicit override is
missing, not a directory, malformed, or version-mismatched. The operator chose
the override, so those cases must fail with the existing actionable errors.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli type-check` → the optional parameter is
backward compatible with existing zero-argument call sites.

### 2. Cover override and fallback boundaries in unit tests

Extend `packages/cli/src/fs/assets.test.ts` with temporary bundles containing
matching metadata. Pass an injected environment object to prove a valid
override wins and an unset/blank override falls back to the packaged root.
Add one explicit override failure case to prove validation is not bypassed.

Avoid assigning `process.env` in unit tests; the injected environment is the
hermetic seam.

**Verify:**
`pnpm --filter @open-agent-toolkit/cli test -- src/fs/assets.test.ts` → default,
override, blank, and invalid cases pass.

### 3. Give the package-coverage smoke consumer a private bundle

In `package-coverage-consumers.test.mjs`, create a temporary assets directory
for the file, run `bash packages/cli/scripts/bundle-assets.sh` with
`OAT_ASSETS_DIR` pointing there, and set the same variable before importing or
calling built CLI consumers. Register cleanup and restore the previous
environment value with `t.after` or a file-level lifecycle hook on every path.

Bundle once for the test file rather than once per assertion. Keep the bundle
outside `packages/cli/assets`, and assert the temporary root differs from the
shared root so a test regression cannot silently restore shared-state use.

**Verify:** after `pnpm build`, run
`node --test tools/smoke/explainer-kit/package-coverage-consumers.test.mjs` →
the consumer passes using the isolated root.

### 4. Apply release bookkeeping and full gates

Bump the five public packages together and update `pnpm-lock.yaml` through
pnpm. Do not hand-edit bundled assets; let existing build/CLI tooling generate
ephemeral copies as required by validation.

**Verify:**
`pnpm release:check-versions && pnpm release:validate` → lockstep and package
validation pass.

## Test plan

- Extend `packages/cli/src/fs/assets.test.ts` for valid override, blank fallback,
  missing override directory, and metadata/version validation.
- Change `tools/smoke/explainer-kit/package-coverage-consumers.test.mjs` to prove
  its built CLI import reads the isolated bundle.
- Focused commands:
  - `pnpm --filter @open-agent-toolkit/cli test -- src/fs/assets.test.ts` → pass.
  - `pnpm build && node --test tools/smoke/explainer-kit/package-coverage-consumers.test.mjs`
    → pass without reading shared assets.
- Full commands:
  `pnpm check && pnpm lint && pnpm format && pnpm type-check && pnpm test && pnpm build && pnpm release:check-versions && pnpm release:validate && pnpm build:docs`
  → all exit zero.

## Done criteria

- [ ] A non-empty `OAT_ASSETS_DIR` is resolved and validated before use.
- [ ] Missing, malformed, and version-mismatched explicit overrides fail closed.
- [ ] Unset or blank overrides preserve the packaged default.
- [ ] The package-coverage smoke file builds and reads only its temporary bundle.
- [ ] All five public package versions move together and release gates pass.
- [ ] `git status --short` contains only scoped implementation, tests, and
      required release metadata.

## STOP conditions

Stop and report instead of improvising when:

- a live consumer relies on `resolveAssetsRoot` ignoring an explicitly set
  `OAT_ASSETS_DIR`;
- bundle metadata cannot be generated for an isolated root without mutating
  the shared packaged assets;
- the smoke test runner executes multiple tests in the same process with
  conflicting environment ownership that cannot be locally scoped;
- a named verification gate fails twice after one bounded correction; or
- the change would weaken asset metadata or version validation.

## Review focus

- Confirm explicit overrides fail closed instead of falling back silently.
- Check environment restoration and temporary-directory cleanup on failures.
- Confirm the smoke proof exercises built CLI code and not only the unit-test
  injection seam.
