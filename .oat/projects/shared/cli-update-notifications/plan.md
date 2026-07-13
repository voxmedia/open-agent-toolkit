---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-13
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p-rev1']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: cli-update-notifications

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Notify eligible CLI users when a newer stable OAT release is
available without prompting, disrupting automation, or changing command
results.

**Architecture:** A root Commander hook delegates to an injected update
notification service that applies eligibility policy, reads a user-level
preference and TTL cache, performs a short npm registry check when stale, and
emits a rate-limited warning through the existing logger.

**Tech Stack:** TypeScript, Node.js built-in fetch/filesystem APIs, Commander,
Vitest, and the existing OAT config/logger primitives.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] HiLL selection deferred to implementation preflight
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

The plan is sequential. Phase 2 imports and integrates the service and config
surface created in Phase 1, so its tests cannot pass independently. The final
documentation and lockstep package-version work also depends on the implemented
behavior and resulting file set. No adjacent phases have both disjoint write
sets and independent verification, so no parallel group is declared.

---

## Phase 1: Notification Policy and Service

### Task p01-t01: Add the user update-notification preference

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

Add focused tests proving that user config normalizes, reads, and writes the
optional `updateNotifications` boolean; missing values remain enabled by
default with `source=default`; explicit false resolves with `source=user`; and
config get/set/list/describe expose the user-scoped setting.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Extend `UserConfig` normalization, effective-config resolution, and the config
command catalog/set/get paths with a user-level `updateNotifications` boolean.
Missing resolves to enabled; explicit `false` is preserved. The owning command is
`oat config set updateNotifications false --user`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Keep the new key aligned with existing config metadata, key ordering, boolean
parsing, and scope validation rather than adding a separate mutation path.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Focused tests and CLI type-check pass.

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "feat(p01-t01): add update notification preference"
```

---

### Task p01-t02: Implement the cached update notification service

**Files:**

- Create: `packages/cli/src/app/update-notifier.ts`
- Create: `packages/cli/src/app/update-notifier.test.ts`

**Step 1: Write test (RED)**

Cover stable-version comparison, malformed/prerelease suppression, all
eligibility gates, fresh and stale cache behavior, 24-hour check and 72-hour
notice TTLs, successful registry metadata, timeouts/errors, atomic cache
updates, exact notice content, and the never-throw contract using injected
dependencies. Prove that a failed refresh records the attempt time and prevents
another fetch within 24 hours while preserving any previously trusted version.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/app/update-notifier.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Create a bootstrap-owned service that:

- skips non-interactive, JSON, CI, test, source-development, ephemeral-runner,
  environment-opted-out, and user-opted-out invocations;
- reads `~/.oat/update-check.json`;
- fetches the encoded npm package `latest` endpoint only when the check TTL is
  stale, using a short abort timeout;
- records the attempt timestamp after timeout, network, HTTP, malformed JSON,
  or invalid-version failures so offline users are not retried on every command,
  while preserving any trusted cached version;
- accepts only strict stable `major.minor.patch` versions and compares numeric
  tuples;
- warns at most once per version every 72 hours with the documented npm global
  install command; and
- contains every operational error without changing command state.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/app/update-notifier.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Keep policy, version parsing, cache validation, and registry access as small
internal functions. Use existing user-config and atomic JSON primitives, with
dependencies injectable at the orchestration boundary.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/app/update-notifier.test.ts && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Focused tests and CLI type-check pass.

**Step 5: Commit**

```bash
git add packages/cli/src/app/update-notifier.ts packages/cli/src/app/update-notifier.test.ts
git commit -m "feat(p01-t02): add cached CLI update notifier"
```

---

## Phase 2: CLI Integration and Release Readiness

### Task p02-t01: Wire notifications into command dispatch

**Files:**

- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/index.test.ts`

**Step 1: Write test (RED)**

Add bootstrap tests proving actionable commands invoke the notifier hook once,
while help/version paths do not; JSON and non-interactive contexts produce no
update warning and pass the correct flags to the hook; notifier rejection is
contained; normalized argv remains unchanged; and command parsing still
completes with the original exit behavior.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/index.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Install a root Commander `preAction` hook after command registration. Build the
existing global command context for the action command and call the notifier
with `OAT_VERSION`, process argv/environment, home, interaction/JSON flags, and
logger. Keep the hook thin and best-effort.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/index.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Preserve `main()` readability and avoid command-handler changes. Keep all
notification behavior in the app service.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/index.test.ts src/app/update-notifier.test.ts && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Bootstrap/notifier tests and CLI type-check pass together.

**Step 5: Commit**

```bash
git add packages/cli/src/index.ts packages/cli/src/index.test.ts
git commit -m "feat(p02-t01): notify CLI users about stable updates"
```

---

### Task p02-t02: Document and format update notification behavior

**Files:**

- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/index.test.ts`
- Modify: `packages/cli/README.md`
- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`

**Step 1: Write validation expectation (RED)**

Confirm the docs do not yet describe the passive notice, TTL behavior, JSON/CI
suppression, `NO_UPDATE_NOTIFIER`, or the user config opt-out.

Run: `pnpm --filter oat-docs check`
Expected: Existing docs pass mechanically but lack the new user guidance.

**Step 2: Implement (GREEN)**

Document update-notification behavior and both suppression mechanisms in the
CLI README and existing config/local-state page. Apply the repository formatter
to the two integration files committed by p02-t01 and the two documentation
files so phase-wide formatting can pass without amending prior commits.

Run: `pnpm exec oxfmt --write packages/cli/src/index.ts packages/cli/src/index.test.ts packages/cli/README.md apps/oat-docs/docs/cli-utilities/config-and-local-state.md && pnpm --filter oat-docs check`
Expected: Declared files are formatted and documentation Markdown lint passes.

**Step 3: Refactor**

Keep documentation concise, ensure the configuration command is copyable, and
avoid promising interactive or package-manager-executed updates.

**Step 4: Verify**

Run: `pnpm --filter oat-docs check && pnpm format`
Expected: Docs checks and repository formatting pass.

**Step 5: Commit**

```bash
git add packages/cli/src/index.ts packages/cli/src/index.test.ts packages/cli/README.md apps/oat-docs/docs/cli-utilities/config-and-local-state.md
git commit -m "docs(p02-t02): document CLI update notifications"
```

---

### Task p02-t03: Prepare the lockstep public package release

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`

**Step 1: Run release validation (RED)**

Run release validation against the implemented shipped CLI change before
version updates.

Run: `pnpm release:validate`
Expected: Validation identifies the missing lockstep public package bumps.

**Step 2: Implement (GREEN)**

Bump all five lockstep public packages from `0.1.60` to `0.1.61` and run the
CLI asset bundler to regenerate `public-package-versions.json`.

Run: `pnpm release:validate`
Expected: Public package version and shipped-functionality validation pass.

**Step 3: Refactor**

Confirm only the five required public package versions and the generated public
package version manifest changed.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter oat-docs check && pnpm format && pnpm release:validate`
Expected: CLI tests, lint, type-check, docs checks, formatting, and release
validation pass.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p02-t03): bump lockstep public packages"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date       | Artifact                                                 |
| ------ | -------- | ------- | ---------- | -------------------------------------------------------- |
| p01    | code     | passed  | 2026-07-13 | `reviews/archived/p01-review-2026-07-13.md`              |
| p02    | code     | passed  | 2026-07-13 | `reviews/archived/p02-review-2026-07-13.md`              |
| p-rev1 | code     | passed  | 2026-07-13 | `reviews/archived/p-rev1-rereview-2026-07-13T183541Z.md` |
| final  | code     | passed  | 2026-07-13 | `reviews/archived/final-review-2026-07-13-v2.md`         |
| spec   | artifact | pending | -          | -                                                        |
| design | artifact | pending | -          | -                                                        |
| plan   | artifact | passed  | 2026-07-13 | structured auto-review                                   |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Phase p-rev1: Interactive CLI Update Offer

Source: inline feedback (2026-07-13)

### Task prev1-t01: (revision) Add the interactive update offer

**Files:**

- Modify: `packages/cli/src/app/update-notifier.ts`
- Modify: `packages/cli/src/app/update-notifier.test.ts`
- Create: `packages/cli/src/app/tool-bundle-update-guard.ts`
- Create: `packages/cli/src/app/tool-bundle-update-guard.test.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/index.test.ts`

**Step 1: Write tests (RED)**

Add focused coverage proving:

- ordinary eligible commands retain the passive notice;
- `oat init` (including nested init paths), `oat tools install` (including pack
  subcommands), and `oat tools update` suppress the duplicate passive warning
  and run one compatibility guard before any mutation;
- current, invalid, unavailable, opted-out, JSON, non-interactive, dry-run,
  source-development, test, CI, and ephemeral-runner contexts do not prompt or
  install;
- decline and prompt abort continue the requested tool update using the current
  CLI's bundle, with an explicit warning that those tool versions may be older
  than the versions bundled with the available CLI release;
- acceptance invokes npm once with an argument array, `shell: false`, inherited
  stdio, and the exact validated version rather than a mutable dist-tag, then
  stops before tool mutation and asks the user to rerun `oat tools update`; and
- installer failure aborts before tool mutation with an actionable CLI error.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/app/update-notifier.test.ts src/app/tool-bundle-update-guard.test.ts src/index.test.ts`
Expected: Tests fail because reusable availability resolution and the
interactive command integration do not exist.

**Step 2: Implement (GREEN)**

Refactor the existing notifier internals into a reusable best-effort
availability resolver that returns the validated newer stable version while
preserving the cache, suppression, timeout, and never-throw contracts. Keep
`maybeNotifyAboutUpdate` as the passive wrapper used by ordinary commands.

Add a shared pre-mutation compatibility guard for command paths rooted at
`init`, `tools install`, and `tools update`. When a newer stable CLI is
available, explain that these commands copy tools bundled with the currently
running CLI. If the user continues under an older CLI, the command can only
install that older CLI's bundled tool versions rather than the versions bundled
with the available release. Use `confirmAction` with a default-false prompt and,
on acceptance, execute:

```text
npm install --global @open-agent-toolkit/cli@<validated-version>
```

Use `execFile`/argument-array execution with `shell: false` and inherited stdio.
After a successful CLI install, stop before command action and tell the user to
rerun the original command under the new CLI so its bundled tools are used. On
decline, warn that the command is continuing with the current CLI's bundle,
then proceed. Dry-run, JSON, non-interactive, opted-out, current-version,
ephemeral, and unavailable-metadata paths remain non-prompting.

The root bootstrap hook classifies the complete Commander command path. It runs
the guard instead of the passive notifier for guarded paths and uses a private,
success-only control signal to prevent the old process from executing the
command action after a CLI upgrade. Installer failures prevent mutation and
remain actionable errors.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/app/update-notifier.test.ts src/app/tool-bundle-update-guard.test.ts src/index.test.ts`
Expected: Focused tests pass.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: CLI tests, lint, and type-check pass.

**Step 4: Commit**

```bash
git add packages/cli/src/app/update-notifier.ts packages/cli/src/app/update-notifier.test.ts packages/cli/src/app/tool-bundle-update-guard.ts packages/cli/src/app/tool-bundle-update-guard.test.ts packages/cli/src/index.ts packages/cli/src/index.test.ts
git commit -m "feat(prev1-t01): guard bundled tool mutations"
```

---

### Task prev1-t02: (revision) Document the interactive offer

**Files:**

- Modify: `packages/cli/README.md`
- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`

**Step 1: Update documentation**

Explain that ordinary eligible commands remain passive. Before interactive
`oat init`, `oat tools install`, or `oat tools update` mutations, a known newer
CLI triggers a compatibility warning and offer to install the exact newer
stable CLI version through npm. Document that acceptance updates the CLI and
requires rerunning the original command, while decline continues with the
current CLI's bundle and warns that its tool versions may be older than those
bundled with the available release. Also cover default-no consent, suppression,
dry-run/JSON/non-interactive behavior, failure semantics, and the distinction
between bundled tools and the CLI package.

**Step 2: Verify**

Run: `pnpm --filter oat-docs check && pnpm format`
Expected: Docs checks and repository formatting pass.

**Step 3: Commit**

```bash
git add packages/cli/README.md apps/oat-docs/docs/cli-utilities/config-and-local-state.md apps/oat-docs/docs/cli-utilities/tool-packs.md
git commit -m "docs(prev1-t02): document interactive CLI update offer"
```

---

### Task prev1-t03: (revision) Prepare the revision release

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`

**Step 1: Update versions**

Bump all five lockstep public packages from `0.1.61` to `0.1.62` and run the
CLI asset bundler to regenerate `public-package-versions.json`. Do not modify
`pnpm-lock.yaml` unless validation proves it is required.

**Step 2: Verify**

Run: `pnpm test && pnpm lint && pnpm type-check && pnpm build && pnpm --filter oat-docs check && pnpm format && pnpm release:validate`
Expected: Full repository and release verification pass.

**Step 3: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(prev1-t03): bump lockstep public packages"
```

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - User preference and cached notifier service
- Phase 2: 3 tasks - Command integration, documentation, and release readiness
- Phase p-rev1: 3 tasks - Interactive tools-update offer and revision release

**Total: 8 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
