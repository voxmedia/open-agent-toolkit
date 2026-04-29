---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-28
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p05'] # phases to pause AFTER completing (empty = every phase)
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p02', 'p03']]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: aws-profile

> Execute this plan using `oat-project-implement` — phases run sequentially except where `oat_plan_parallel_groups` declares a group.

**Goal:** Allow users to switch AWS profile/region for the S3 sync that runs during `oat-project-complete` and `oat project archive sync`, via repo config or per-invocation CLI flags.

**Architecture:** Two new optional fields on `OatArchiveConfig` (`awsProfile`, `awsRegion`). The CLI merges them into the env passed to every `execFile('aws', …)` call in `packages/cli/src/commands/project/archive/`, with precedence flag > existing shell env > config. Skill (`oat-project-complete`) is unchanged at the auth layer.

**Tech Stack:** Node child_process, Commander, Vitest. No new dependencies.

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add archive.awsProfile + awsRegion to OatArchiveConfig`.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (none — quick mode default)
- [x] Set `oat_plan_hill_phases` in frontmatter (empty)
- [x] Evaluated phases for parallelism opportunities (p02 + p03 declared parallel)
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

Group `['p02', 'p03']` runs concurrently.

- **p02** modifies `packages/cli/src/commands/project/archive/archive-utils.ts` and its test file.
- **p03** modifies `packages/cli/src/commands/config/index.ts` and its test file.

Write sets are disjoint. Both depend on p01's `OatArchiveConfig` shape but neither depends on the other: p02 plumbs env to `aws` spawns, p03 only adds whitelist/descriptor/set-handler entries that round-trip through the same schema. Independent verification — each task scopes its own vitest run.

p04 imports the public helpers updated in p02 (`ensureS3ArchiveAccess`, `archiveProjectOnCompletion`), so it runs after the parallel group rejoins. p05 is documentation + release validation; it must be last because `pnpm release:validate` is a repo-wide gate.

---

## Phase 1: Config schema

### Task p01-t01: Add `awsProfile` + `awsRegion` to `OatArchiveConfig` and normalizer

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`

**Step 1: Write test (RED)**

In `oat-config.test.ts`, extend the existing archive normalization test cases to assert that:

- `archive.awsProfile: "work-sso"` round-trips through read/write.
- `archive.awsRegion: "us-east-1"` round-trips.
- Empty string for either trims to "unset" (omitted from the normalized config), matching the existing `s3Uri` trim-to-empty pattern.
- Non-string values are ignored.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts`
Expected: New cases fail (RED).

**Step 2: Implement (GREEN)**

In `oat-config.ts`:

- Extend `OatArchiveConfig` with `awsProfile?: string;` and `awsRegion?: string;`.
- In the archive normalizer block (around the existing `s3Uri` handling near line 268), add string-trim handlers for both new keys following the same pattern: trim, and only set when non-empty.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts`
Expected: All cases pass (GREEN).

**Step 3: Refactor**

If the trim+set logic now repeats three times for `s3Uri`/`awsProfile`/`awsRegion`, factor into a small local helper inside the normalizer. Keep the helper file-private; do not export.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts
git commit -m "feat(p01-t01): add archive.awsProfile + awsRegion to OatArchiveConfig"
```

---

### Task p01-t02: Surface new keys in resolver defaults + describe output

**Files:**

- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`

**Step 1: Write test (RED)**

In `resolve.test.ts`, extend the resolver coverage to assert:

- `result.resolved['archive.awsProfile']` is present with `value: undefined` and `source: 'default'` when unset.
- When set in `.oat/config.json`, the resolved entry reports `source: 'shared'` and the configured value.
- Same coverage for `archive.awsRegion`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts`
Expected: New cases fail (RED).

**Step 2: Implement (GREEN)**

In `resolve.ts`:

- Add `awsProfile: undefined` and `awsRegion: undefined` to the archive defaults block (sibling to the existing `s3SyncOnComplete: false`).
- Make sure the resolver's per-key emission loop covers both keys (mirror whatever pattern the existing archive keys use — likely no extra wiring beyond the defaults block, but verify).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/resolve.test.ts`
Expected: All cases pass (GREEN).

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts
git commit -m "feat(p01-t02): expose archive.awsProfile + awsRegion in config resolver"
```

---

## Phase 2: AWS spawn plumbing

### Task p02-t01: Forward profile + region env to every `aws` spawn in `archive-utils.ts`

**Files:**

- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Write test (RED)**

In `archive-utils.test.ts`, add cases that:

- Pass an `archive.awsProfile = "work-sso"` and `archive.awsRegion = "us-east-1"` through `archiveProjectOnCompletion` and assert the spy `execFile` is called with an env containing `AWS_PROFILE=work-sso` and `AWS_REGION=us-east-1` for the `aws sts get-caller-identity` and `aws s3 sync` calls.
- Same coverage for `ensureS3ArchiveAccess` directly when given the new options.
- Assert that an existing parent-process `AWS_PROFILE` is preserved (not clobbered by an unset config value) and is overridden when config provides one.
- Assert that when neither config nor parent env supply a profile, the spawned env contains no `AWS_PROFILE` key (i.e., we don't inject empty strings).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts`
Expected: New cases fail (RED).

**Step 2: Implement (GREEN)**

In `archive-utils.ts`:

- Extend `EnsureS3ArchiveAccessOptions` and `ArchiveProjectOnCompletionOptions` with `awsProfile?: string | null` and `awsRegion?: string | null`.
- Add a private helper `function buildAwsEnv(parentEnv, opts)` that returns a shallow-cloned env, layering in `AWS_PROFILE`/`AWS_REGION` from `opts` only when non-empty. Do not set the var when both parent and opts lack a value.
- Replace the four `execFile('aws', …)` callsites' `env:` argument with the helper output. Continue to base from `dependencies.env ?? process.env`.
- Pass the new options through the existing call chain so `archiveProjectOnCompletion` forwards them into `ensureS3ArchiveAccess`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts`
Expected: All cases pass (GREEN).

**Step 3: Refactor**

Ensure the helper is file-private and lives near the top of the file (close to `normalizeS3Uri`). Update existing test fixtures that pass `dependencies.env` to assert no regression in the no-config path.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
git commit -m "feat(p02-t01): forward archive.awsProfile + awsRegion to aws spawns"
```

---

## Phase 3: Config command surface

### Task p03-t01: Wire `archive.awsProfile` + `archive.awsRegion` into `oat config`

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

In `index.test.ts`, add cases that:

- `oat config set archive.awsProfile work-sso` writes `{ archive: { awsProfile: "work-sso" } }` into `.oat/config.json`.
- `oat config set archive.awsRegion us-east-1` likewise.
- `oat config set archive.awsProfile ""` either removes the key or stores it as unset (match the chosen empty-handling behavior from p01-t01).
- `oat config describe archive.awsProfile` prints `Key: archive.awsProfile`, an owning command line, and a description; the JSON form returns the same fields.
- `archive.awsProfile` and `archive.awsRegion` appear in the `oat config list` whitelisted-keys output.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts`
Expected: New cases fail (RED).

**Step 2: Implement (GREEN)**

In `index.ts`:

- Extend the `CONFIG_KEYS` union type (around line 32) with `'archive.awsProfile' | 'archive.awsRegion'`.
- Add both keys to the whitelisted keys array (around line 109-110).
- Add `CONFIG_KEY_DESCRIPTORS` entries (around lines 234-253) with `description` and `owningCommand: 'oat config set archive.awsProfile <value>'` (and the region variant).
- Extend the set-handler block (around lines 851-868) to handle both keys: trim, drop trailing slashes is irrelevant for these — just trim. Empty string → delete the key from `archive`. Otherwise assign.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts`
Expected: All cases pass (GREEN).

**Step 3: Refactor**

If the set-handler now has near-identical branches for `awsProfile`/`awsRegion`, fold them into a single switch arm or a small string-key map. Keep the existing handlers for `s3Uri`/`s3SyncOnComplete` untouched.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "feat(p03-t01): wire archive.awsProfile + awsRegion into oat config"
```

---

## Phase 4: Archive sync CLI flags

### Task p04-t01: Add `--profile` and `--region` flags to `oat project archive sync`

**Files:**

- Modify: `packages/cli/src/commands/project/archive/index.ts`
- Modify: `packages/cli/src/commands/project/archive/index.test.ts`

**Step 1: Write test (RED)**

In `index.test.ts`, add cases that:

- `oat project archive sync --profile foo --region bar` reads the config, then invokes `ensureS3ArchiveAccess` and the `aws s3 ls`/`aws s3 sync` execFiles with an env containing `AWS_PROFILE=foo` and `AWS_REGION=bar`, even when the config sets a different profile/region.
- When the flag is absent, the env reflects the config value.
- When neither flag nor config is set but `process.env.AWS_PROFILE` is present, the spawn env preserves it.
- The resolved profile/region passed to `ensureS3ArchiveAccess` matches the same precedence (flag > parent env > config).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/index.test.ts`
Expected: New cases fail (RED).

**Step 2: Implement (GREEN)**

In `index.ts`:

- Add `.option('--profile <profile>', 'AWS profile override for this sync')` and `.option('--region <region>', 'AWS region override for this sync')` to the `archive sync` subcommand.
- Extend `ArchiveSyncOptions` with `profile?: string` and `region?: string`.
- Resolve effective profile/region in the action with precedence flag > existing `processEnv.AWS_PROFILE`/`AWS_REGION` > `config.archive?.awsProfile`/`awsRegion`. If the flag is provided but empty after trim, treat as not provided.
- Pass the resolved values into `ensureS3ArchiveAccess` and into the helper that builds env for `runArchiveSync` / `listArchiveSnapshots` (mirror the helper introduced in p02-t01 — extract it to a shared module if convenient, or duplicate the small clone).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/index.test.ts`
Expected: All cases pass (GREEN).

**Step 3: Refactor**

If p02 introduced `buildAwsEnv` privately in `archive-utils.ts`, consider promoting it to an internal export so this command can reuse it. Avoid duplicating the env-merge logic across the two files.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter @open-agent-toolkit/cli test`
Expected: No errors. Full CLI test suite green (catches any cross-file regressions from p02+p03 merging back).

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/index.ts packages/cli/src/commands/project/archive/index.test.ts
git commit -m "feat(p04-t01): add --profile + --region flags to oat project archive sync"
```

---

## Phase 5: Docs + release validation

### Task p05-t01: Document the new config keys and CLI flags

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`

**Step 1: Plan content** (no test for docs)

Sections to add or extend:

- In `configuration.md`'s archive keys block, list `archive.awsProfile` and `archive.awsRegion` with a one-line description and a `oat config set` example.
- Add a "Credential resolution" subsection explaining the precedence chain (flag > shell env > config) and noting that raw access keys remain a shell-env concern, not a config concern.
- In `config-and-local-state.md`, append the two new keys to the archive keys list around lines 56-59.

**Step 2: Implement**

Write the docs edits matching the existing tone and code-fence style. Keep examples minimal.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/oat-docs build`
Expected: Docs build passes (catches broken links/anchors).

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/cli-utilities/config-and-local-state.md
git commit -m "docs(p05-t01): describe archive.awsProfile + awsRegion + sync flags"
```

---

### Task p05-t02: Lockstep version bump + `release:validate`

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Step 1: Bump versions in lockstep**

Determine the current shared version (read all five `package.json` files; they should agree). Bump the patch (or minor if discovery flagged this as a feature — recommended `minor` because it adds new public CLI flags and config keys). Update all five files to the same new version.

**Step 2: Run release validation**

Run: `pnpm release:validate`
Expected: Pass.

If it fails, fix the underlying issue in the failing package and re-run. Do not bypass.

**Step 3: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "chore(p05-t02): bump publishable packages for archive AWS profile support"
```

---

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                                   |
| ------ | -------- | ------- | ---------- | ------------------------------------------ |
| p01    | code     | passed  | 2026-04-28 | reviews/p01-code-review-2026-04-28.md      |
| p02    | code     | passed  | 2026-04-28 | reviews/p02-code-review-2026-04-28-rev2.md |
| p03    | code     | passed  | 2026-04-28 | reviews/p03-code-review-2026-04-28.md      |
| p04    | code     | passed  | 2026-04-28 | reviews/p04-code-review-2026-04-28-rev2.md |
| p05    | code     | passed  | 2026-04-28 | reviews/p05-code-review-2026-04-28.md      |
| final  | code     | pending | -          | -                                          |
| spec   | artifact | n/a     | -          | -                                          |
| design | artifact | n/a     | -          | -                                          |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`.

Quick mode: spec + design rows remain `n/a` (no spec/design artifacts produced). Implementation phase reviews follow the same rules as spec-driven mode.

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — extend `OatArchiveConfig` schema and config resolver.
- Phase 2: 1 task — plumb profile/region env into archive-utils.ts AWS spawns.
- Phase 3: 1 task — wire new keys into `oat config` set/describe/list.
- Phase 4: 1 task — add `--profile` / `--region` flags to `oat project archive sync`.
- Phase 5: 2 tasks — docs and lockstep release validation.

**Total: 7 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Source files: `packages/cli/src/config/oat-config.ts`, `packages/cli/src/config/resolve.ts`, `packages/cli/src/commands/project/archive/archive-utils.ts`, `packages/cli/src/commands/project/archive/index.ts`, `packages/cli/src/commands/config/index.ts`
- Docs: `apps/oat-docs/docs/cli-utilities/configuration.md`, `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`
- Release guardrail: `AGENTS.md` (lockstep public package set)
