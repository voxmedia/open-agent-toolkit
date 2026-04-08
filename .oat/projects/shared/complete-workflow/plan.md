---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-08
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p01']
oat_auto_review_at_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: complete-workflow

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Track installed tool packs in `.oat/config.json` so skills can check `tools.<pack>` config instead of inferring from filesystem heuristics.

**Architecture:** Add a `tools` key to `OatConfig` as `Partial<Record<PackName, boolean>>`. Write it during install/update, clear on remove, expose via `oat config get/set`. Update `oat-project-document` to check config instead of directory existence.

**Tech Stack:** TypeScript, vitest, commander (CLI framework)

**Commit Convention:** `feat(p01-tNN): description` for new functionality, `test(p01-tNN): description` for test-only commits

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] All tasks have stable IDs
- [x] Each task has verification command
- [x] Each task has atomic commit message

---

## Phase 0: Streamline project close-out workflow (complete)

### Task p00-t01: Auto-invoke PJM repo reference update from project-document

**Files:**

- Modified: `.agents/skills/oat-project-document/SKILL.md`

**Steps:**

- [x] Add `Skill` to `allowed-tools` in frontmatter
- [x] Insert new Step 1 (Check for PJM Infrastructure) between Step 0 and old Step 1
- [x] Renumber all subsequent steps (1→2 through 7→8) and update all internal cross-references
- [x] Bump skill version to 1.1.0
- [x] Commit: `feat(project-document): auto-invoke pjm repo reference update` (814e612)

### Task p00-t02: Exclude process artifacts from S3 archive sync

**Files:**

- Modified: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modified: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modified: `packages/cli/src/commands/project/archive/index.ts`
- Modified: `packages/cli/src/commands/project/archive/index.test.ts`
- Modified: `.agents/skills/oat-project-complete/SKILL.md`

**Steps:**

- [x] Add `S3_ARCHIVE_SYNC_EXCLUDES` constant (`['reviews/*', 'pr/*']`) in `archive-utils.ts`
- [x] Add `--exclude` flags to completion-time `aws s3 sync` call in `archiveProjectOnCompletion()`
- [x] Import and apply excludes in `buildArchiveSyncArgs()` in `index.ts`
- [x] Update test assertions in both test files to expect `--exclude` flags
- [x] Strengthen `oat-project-complete` Step 8 guidance to document S3 sync exclusions
- [x] Bump `oat-project-complete` skill version to 1.3.6
- [x] All tests pass (1160/1160)
- [x] Commit: `fix(archive): exclude reviews and PR artifacts from S3 sync` (01c3f4f)

---

## Phase 1: Track installed tool packs in config

### Task p01-t01: Add `tools` to OatConfig interface and normalizer

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`

**Steps:**

- [ ] Add `OatToolsConfig` type and `tools` field to `OatConfig` interface.

  In `oat-config.ts`, after the existing config interfaces, add:

  ```typescript
  export type OatToolsConfig = Partial<
    Record<
      | 'core'
      | 'ideas'
      | 'docs'
      | 'workflows'
      | 'utility'
      | 'project-management'
      | 'research',
      boolean
    >
  >;
  ```

  Add `tools?: OatToolsConfig;` to the `OatConfig` interface.

- [ ] Add normalization logic in `normalizeOatConfig()`.

  After the `autoReviewAtCheckpoints` block (around line 228), add a normalization block for `tools` following the same pattern as `archive`:

  ```typescript
  if (isRecord(parsed.tools)) {
    const VALID_PACKS = [
      'core',
      'ideas',
      'docs',
      'workflows',
      'utility',
      'project-management',
      'research',
    ];
    const tools: OatToolsConfig = {};
    for (const pack of VALID_PACKS) {
      if (typeof parsed.tools[pack] === 'boolean') {
        tools[pack as keyof OatToolsConfig] = parsed.tools[pack] as boolean;
      }
    }
    if (Object.keys(tools).length > 0) {
      next.tools = tools;
    }
  }
  ```

- [ ] Verify: `pnpm --filter @open-agent-toolkit/cli type-check`

- [ ] Commit: `feat(p01-t01): add tools config to OatConfig interface and normalizer`

### Task p01-t02: Add config get/set/describe support for tools keys

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`

**Steps:**

- [ ] Add `tools.*` keys to the `ConfigKey` type union.

  Add these 7 keys:

  ```typescript
  | 'tools.core'
  | 'tools.docs'
  | 'tools.ideas'
  | 'tools.project-management'
  | 'tools.research'
  | 'tools.utility'
  | 'tools.workflows'
  ```

- [ ] Add `CONFIG_CATALOG` entries for each tools key.

  Add 7 entries following the `archive.s3SyncOnComplete` boolean pattern:

  ```typescript
  {
    key: 'tools.project-management',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand: 'oat tools install / oat tools update',
    description: 'Whether the project-management tool pack is installed.',
  },
  ```

  Repeat for all 7 packs.

- [ ] Add `getConfigValue()` handler for `tools.*` keys.

  Follow the `archive.*` pattern. After the existing archive block, add:

  ```typescript
  if (key.startsWith('tools.')) {
    const packName = key.slice('tools.'.length);
    const tools = config.tools ?? {};
    const value = tools[packName as keyof OatToolsConfig] ?? false;
    return { key, value: String(value), source: 'config.json' };
  }
  ```

- [ ] Add `setConfigValue()` handler for `tools.*` keys.

  Follow the `archive.s3SyncOnComplete` boolean pattern. After the existing archive block, add:

  ```typescript
  if (key.startsWith('tools.')) {
    const packName = key.slice('tools.'.length);
    const tools = { ...config.tools };
    tools[packName as keyof OatToolsConfig] =
      rawValue.trim().toLowerCase() === 'true';
    await dependencies.writeOatConfig(repoRoot, { ...config, tools });
    const nextValue = tools[packName as keyof OatToolsConfig] ?? false;
    return { key, value: String(nextValue), source: '.oat/config.json' };
  }
  ```

- [ ] Add the tools keys to `KEY_ORDER` array (used by `config list`).

  Insert `'tools.core', 'tools.docs', 'tools.ideas', 'tools.project-management', 'tools.research', 'tools.utility', 'tools.workflows'` in the appropriate position.

- [ ] Verify: `pnpm --filter @open-agent-toolkit/cli type-check`

- [ ] Commit: `feat(p01-t02): add config get/set/describe support for tools keys`

### Task p01-t03: Write tools config during install

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`

**Steps:**

- [ ] After the AGENTS.md section update (around line 614) and before `reportSuccess()`, add a config write that records installed packs.

  The function already has `projectRoot` resolved and `selectedPacks` available. Add:

  ```typescript
  // Record installed tool packs in shared config
  const config = await dependencies.readOatConfig(projectRoot);
  const tools = { ...config.tools };
  for (const pack of selectedPacks) {
    tools[pack] = true;
  }
  await dependencies.writeOatConfig(projectRoot, { ...config, tools });
  ```

  This requires adding `readOatConfig` and `writeOatConfig` to `InitToolsDependencies`. The interface already imports from `@config/oat-config`. Add these two to the interface and `DEFAULT_DEPENDENCIES`.

- [ ] Verify: `pnpm --filter @open-agent-toolkit/cli type-check`

- [ ] Commit: `feat(p01-t03): write tools config on install`

### Task p01-t04: Reconcile tools config during update

**Files:**

- Modify: `packages/cli/src/commands/tools/update/index.ts`

**Steps:**

- [ ] After `updateTools()` returns and before auto-sync (around line 128), add reconciliation logic.

  When `--all` or `--pack` is used, scan the installed tools to determine which packs are present and write the result to config. This catches existing repos that installed packs before this config existed. Build a fresh `tools` object from the scan — do not spread the existing config, as that would preserve stale flags for packs that were removed from disk.

  ```typescript
  // Reconcile tools config from scan results
  if (!dryRun && (target.kind === 'all' || target.kind === 'pack')) {
    const repoRoot = await resolveProjectRoot(context.cwd);
    const config = await readOatConfig(repoRoot);

    // Build fresh tools state from scan — clears stale flags
    const allToolsFlat = [
      ...result.updated,
      ...result.current,
      ...result.newer,
    ];
    const installedPacks = new Set(
      allToolsFlat
        .map((t) => t.pack)
        .filter((pack): pack is PackName => pack !== 'custom'),
    );
    const tools: Partial<Record<PackName, boolean>> = {};
    for (const pack of installedPacks) {
      tools[pack] = true;
    }

    await writeOatConfig(repoRoot, { ...config, tools });
  }
  ```

  Add imports for `readOatConfig`, `writeOatConfig` from `@config/oat-config`, `PackName` from `@commands/tools/shared/types`, and `resolveProjectRoot` (already imported via `@fs/paths`).

- [ ] Verify: `pnpm --filter @open-agent-toolkit/cli type-check`

- [ ] Commit: `feat(p01-t04): reconcile tools config on update`

### Task p01-t05: Clear tools config on remove

**Files:**

- Modify: `packages/cli/src/commands/tools/remove/index.ts`

**Steps:**

- [ ] After `removeTools()` returns and before auto-sync (around line 113), clear removed packs from config.

  When removing by `--pack`, set `tools.<pack>: false`. When removing `--all`, set all known packs to false.

  ```typescript
  // Clear removed tool packs from config
  if (!dryRun && result.removed.length > 0) {
    const repoRoot = await resolveProjectRoot(context.cwd);
    const config = await readOatConfig(repoRoot);
    const tools = { ...config.tools };

    if (target.kind === 'all') {
      for (const pack of VALID_PACKS) {
        tools[pack] = false;
      }
    } else if (target.kind === 'pack') {
      tools[target.pack] = false;
    }
    // For single-tool removal, don't clear the pack — other tools may still be installed

    await writeOatConfig(repoRoot, { ...config, tools });
  }
  ```

  Add imports for `readOatConfig`, `writeOatConfig` from `@config/oat-config`.

- [ ] Verify: `pnpm --filter @open-agent-toolkit/cli type-check`

- [ ] Commit: `feat(p01-t05): clear tools config on remove`

### Task p01-t06: Update oat-project-document to check config

**Files:**

- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Steps:**

- [ ] Replace the `.oat/repo/reference/` directory check in Step 1 with a config check.

  Change Step 1 from:

  > Check if `.oat/repo/reference/` directory exists (indicates the project-management toolpack is active).

  To:

  > Check if the project-management tool pack is installed by reading config:
  >
  > ```bash
  > PJM_INSTALLED=$(oat config get tools.project-management 2>/dev/null || echo "false")
  > ```
  >
  > **If `PJM_INSTALLED` is `true`:** invoke `oat-pjm-update-repo-reference` automatically...
  > **If `PJM_INSTALLED` is not `true`:** Skip silently...

  Update the condition text and sub-bullets accordingly. The success/failure/skip behavior stays the same.

- [ ] Bump skill version from `1.1.0` to `1.2.0`.

- [ ] Verify: Skill reads cleanly, step numbers and cross-references are consistent.

- [ ] Commit: `feat(p01-t06): check tools config instead of directory existence in project-document`

### Task p01-t07: Add tests for config round-trip

**Files:**

- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Steps:**

- [ ] Add a test in `oat-config.test.ts` for tools normalization round-trip:
  - Write config with `tools: { 'project-management': true, workflows: true }`, read back, verify normalized correctly.
  - Write config with invalid tools values (e.g., `tools: { 'project-management': 'yes' }`), verify they are dropped during normalization.
  - Write config with empty tools object, verify `tools` key is omitted from normalized output.

- [ ] Add tests in `config/index.test.ts` for get/set:
  - `oat config get tools.project-management` returns `'false'` when not set.
  - `oat config set tools.project-management true` writes boolean `true` to config.json.
  - `oat config get tools.project-management` returns `'true'` after setting.
  - `oat config set tools.project-management false` writes boolean `false`.

- [ ] Verify: `pnpm --filter @open-agent-toolkit/cli test`

- [ ] Commit: `test(p01-t07): add tests for tools config`

### Task p01-t08: Add tests for install/update/remove config writes

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: `packages/cli/src/commands/tools/update/update-tools.test.ts` (or `index.test.ts`)
- Modify: `packages/cli/src/commands/tools/remove/remove-tools.test.ts` (or `index.test.ts`)

**Steps:**

- [ ] Add test in init tools tests: after `runInitTools()` completes, read `.oat/config.json` and verify `tools` object has `true` for each installed pack.

- [ ] Add test in update command tests: after `oat tools update --all` completes, read `.oat/config.json` and verify `tools` config reflects the installed packs from the scan result.

- [ ] Add test in remove command tests: after `oat tools remove --pack project-management` completes, read `.oat/config.json` and verify `tools['project-management']` is `false`.

- [ ] Verify: `pnpm --filter @open-agent-toolkit/cli test`

- [ ] Commit: `test(p01-t08): add tests for install/update/remove config writes`

### Task p01-t09: Lockstep version bumps and validation

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`

**Steps:**

- [ ] Bump the version in all four publishable packages to the next patch version. This PR changes shipped CLI behavior (new config key, config writes on install/update/remove), which requires lockstep version bumps across all publishable packages per repo policy.

- [ ] Run `pnpm release:validate` — this is the gate that proves the lockstep bump requirement is satisfied. Do not proceed until it passes.

- [ ] Run full test suite: `pnpm test`

- [ ] Run full lint + type-check: `pnpm lint && pnpm type-check`

- [ ] Commit: `chore: bump publishable package versions`

### Task p01-t10: (review) Preserve repo-level tools config across scope-specific mutations

**Files:**

- Modify: `packages/cli/src/commands/tools/update/index.ts`
- Modify: `packages/cli/src/commands/tools/remove/index.ts`
- Modify: `packages/cli/src/commands/tools/update/config-write.test.ts`
- Modify: `packages/cli/src/commands/tools/remove/config-write.test.ts`

**Step 1: Understand the issue**

Review finding: scope-specific update/remove operations currently rewrite `.oat/config.json` from only the requested scopes, which can clear a tool-pack flag even when the pack remains installed in another scope.
Location: `packages/cli/src/commands/tools/update/index.ts:119`, `packages/cli/src/commands/tools/remove/index.ts:104`

**Step 2: Implement fix**

Reconcile repo-level `tools` config from the union of installed packs across both concrete scopes when update/remove rewrites config. Keep the requested mutation behavior unchanged, but ensure the shared repo config still reflects packs that remain available from another scope.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: pass, including coverage proving project-scope mutations preserve packs still installed in user scope

**Step 4: Commit**

```bash
git add packages/cli/src/commands/tools/update/index.ts packages/cli/src/commands/tools/remove/index.ts packages/cli/src/commands/tools/update/config-write.test.ts packages/cli/src/commands/tools/remove/config-write.test.ts
git commit -m "fix(p01-t10): preserve tools config across scopes"
```

### Task p01-t11: (review) Remove redundant assets-root lookup in tools update

**Files:**

- Modify: `packages/cli/src/commands/tools/update/index.ts`

**Step 1: Understand the issue**

Review finding: the update command resolves `assetsRoot` twice within the same execution path, even though the second use can reuse the earlier value.
Location: `packages/cli/src/commands/tools/update/index.ts:120`

**Step 2: Implement fix**

Resolve `assetsRoot` once in the update action and reuse that value for both core-doc refresh checks and tools-config reconciliation.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/tools/update/index.ts
git commit -m "fix(p01-t11): reuse assets root in update command"
```

### Task p01-t12: (review) Clarify non-tools config preservation in update reconciliation

**Files:**

- Modify: `packages/cli/src/commands/tools/update/index.ts`

**Step 1: Understand the issue**

Review finding: the update reconciliation preserves non-tools config keys via `{ ...config, tools: ... }`, but that intent is implicit.
Location: `packages/cli/src/commands/tools/update/index.ts:122`

**Step 2: Implement fix**

Add a brief comment or equivalent clarification explaining that the spread preserves unrelated shared-config keys while the `tools` map is fully rebuilt from the scan.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/tools/update/index.ts
git commit -m "docs(p01-t12): clarify update config reconciliation"
```

---

## Reviews

| Scope | Type     | Status      | Date       | Artifact                                       |
| ----- | -------- | ----------- | ---------- | ---------------------------------------------- |
| plan  | artifact | received    | 2026-04-07 | reviews/artifact-plan-review-2026-04-07.md     |
| final | code     | passed      | 2026-04-07 | reviews/archived/final-review-2026-04-07-r2.md |
| final | code     | fixes_added | 2026-04-08 | reviews/archived/final-review-2026-04-08.md    |

## Implementation Complete

- [ ] All tasks complete
- [ ] All tests passing
- [ ] Lint and type-check clean
- [ ] `pnpm release:validate` passes

## References

- Config schema: `packages/cli/src/config/oat-config.ts`
- Config commands: `packages/cli/src/commands/config/index.ts`
- Tool install: `packages/cli/src/commands/init/tools/index.ts`
- Tool update: `packages/cli/src/commands/tools/update/`
- Tool remove: `packages/cli/src/commands/tools/remove/`
- Project document skill: `.agents/skills/oat-project-document/SKILL.md`
- Project complete skill: `.agents/skills/oat-project-complete/SKILL.md`
