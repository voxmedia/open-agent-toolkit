---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-08
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ["p03"]
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: .oat/plan.md
oat_import_provider: claude
oat_generated: false
oat_template: false
oat_template_name: plan
---

# Implementation Plan: Configurable VCS Policy + Worktree Sync for OAT Directories

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Add per-path VCS policy (`localPaths` config), `oat local` CLI commands, worktree sync, and migrate active-idea pointers from standalone files to config.

**Architecture:** Extends `OatConfig` with `localPaths` array; new `oat local` command group manages gitignore and worktree copy; active-idea pointer consolidated into `config.local.json` (repo) and `~/.oat/config.json` (user).

**Tech Stack:** TypeScript ESM, Commander.js, Node.js fs/path, Biome, Vitest

**Commit Convention:** `feat(pNN-tNN): {description}`

## Planning Checklist

- [ ] Confirmed HiLL checkpoints with user
- [ ] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Config Schema + Active Idea Migration

### Task p01-t01: Add `localPaths` to OatConfig schema

**Files:**
- Modify: `packages/cli/src/config/oat-config.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/config/oat-config.test.ts
describe('localPaths normalization', () => {
  it('should deduplicate and sort localPaths', () => {
    // TODO
  });
  it('should default to empty array when omitted', () => {
    // TODO
  });
});
```

Run: `pnpm test packages/cli/src/config/oat-config.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

- Add `localPaths?: string[]` to `OatConfig` interface
- Add normalization in `normalizeOatConfig()` -- filter valid strings, deduplicate, sort
- Export `resolveLocalPaths(config)` helper returning resolved array (empty if omitted)

Run: `pnpm test packages/cli/src/config/oat-config.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Ensure normalization follows existing patterns in the file.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts
git commit -m "feat(p01-t01): add localPaths to OatConfig schema"
```

---

### Task p01-t02: Add `activeIdea` to OatLocalConfig + user-level config

**Files:**
- Modify: `packages/cli/src/config/oat-config.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/config/oat-config.test.ts
describe('activeIdea config', () => {
  it('should normalize activeIdea in local config', () => {
    // TODO
  });
  it('should resolve activeIdea with repo > user precedence', () => {
    // TODO
  });
  it('should read/write user-level config at ~/.oat/config.json', () => {
    // TODO
  });
});
```

Run: `pnpm test packages/cli/src/config/oat-config.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

- Add `activeIdea?: string | null` to `OatLocalConfig` interface
- Add normalization for `activeIdea` in `normalizeOatLocalConfig()`
- Export `resolveActiveIdea(repoRoot)`, `setActiveIdea(repoRoot, ideaPath)`, `clearActiveIdea(repoRoot)`
- Add `readUserConfig()` / `writeUserConfig()` pair for `~/.oat/config.json`
- Extend `ConfigKey` type and `KEY_ORDER` array in `packages/cli/src/commands/config/index.ts` to include `'activeIdea'`, so `oat config set activeIdea` works at the CLI level

Run: `pnpm test packages/cli/src/config/oat-config.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Mirror existing `activeProject` API patterns.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts
git commit -m "feat(p01-t02): add activeIdea to local config + user-level config API"
```

---

### Task p01-t03: Update idea skills for config-based active idea (hard cutover)

**Files:**
- Modify: `.agents/skills/oat-idea-new/SKILL.md`
- Modify: `.agents/skills/oat-idea-ideate/SKILL.md`
- Modify: `.agents/skills/oat-idea-summarize/SKILL.md`
- Modify: `.agents/skills/oat-idea-scratchpad/SKILL.md`

**Step 1: Write test (RED)**

No automated tests -- skill files are markdown. Manual verification in Step 4.

**Step 2: Implement (GREEN)**

For each skill:
- Replace `cat .oat/active-idea` / `cat ~/.oat/active-idea` with reads from `.oat/config.local.json` (repo) / `~/.oat/config.json` (user)
- Replace `echo "$IDEA_PATH" > .oat/active-idea` with `oat config set activeIdea "$IDEA_PATH"`
- Same precedence: project-level > user-level > ask
- `oat-idea-new` Step 7: write via config
- `oat-idea-ideate` Step 1: read via config
- `oat-idea-summarize` Step 1: read + write via config
- `oat-idea-scratchpad`: read via config

**Step 3: Refactor**

Remove any remaining references to pointer files.

**Step 4: Verify**

Run: `grep -r "active-idea" .agents/skills/oat-idea-*/SKILL.md` -- should return no matches.

**Step 5: Commit**

```bash
git add .agents/skills/oat-idea-*/SKILL.md
git commit -m "feat(p01-t03): update idea skills to use config-based activeIdea"
```

---

### Task p01-t04: Update docs for active-idea migration

**Files:**
- Modify: `apps/oat-docs/docs/reference/file-locations.md`
- Modify: `apps/oat-docs/docs/reference/oat-directory-structure.md`
- Modify: `apps/oat-docs/docs/ideas/lifecycle.md`

**Step 1: Write test (RED)**

No automated tests -- docs are markdown.

**Step 2: Implement (GREEN)**

- Update file-locations.md to reference `config.local.json` / `~/.oat/config.json` instead of pointer files
- Update oat-directory-structure.md to remove `active-idea` entries
- Update ideas/lifecycle.md with new config-based resolution

**Step 3: Refactor**

Ensure consistency across all three docs.

**Step 4: Verify**

Run: `grep -r "active-idea" apps/oat-docs/docs/` -- should return no matches.

**Step 5: Commit**

```bash
git add apps/oat-docs/docs/
git commit -m "docs(p01-t04): update docs for config-based activeIdea"
```

---

## Phase 2: `oat local` Command Group

### Task p02-t01: Scaffold `oat local` command group + `status` subcommand

**Files:**
- Create: `packages/cli/src/commands/local/index.ts`
- Create: `packages/cli/src/commands/local/status.ts`
- Modify: `packages/cli/src/commands/index.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/local/status.test.ts
describe('oat local status', () => {
  it('should list localPaths with existence and gitignore status', () => {
    // TODO
  });
  it('should warn on config/gitignore drift', () => {
    // TODO
  });
});
```

Run: `pnpm test packages/cli/src/commands/local/status.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

- `index.ts`: Create `createLocalCommand()` with subcommand registration
- `status.ts`: Read config > resolve `localPaths` > check existence + `.gitignore` membership > output table
- Register in command index

Run: `pnpm test packages/cli/src/commands/local/status.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Follow existing command patterns in the codebase.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/local/ packages/cli/src/commands/index.ts
git commit -m "feat(p02-t01): scaffold oat local command group + status subcommand"
```

---

### Task p02-t02: `oat local apply` -- managed gitignore section

**Files:**
- Create: `packages/cli/src/commands/local/apply.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/local/apply.test.ts
describe('oat local apply', () => {
  it('should create managed section in .gitignore', () => {
    // TODO
  });
  it('should replace managed section on re-run', () => {
    // TODO
  });
  it('should remove managed section when localPaths is empty', () => {
    // TODO
  });
});
```

Run: `pnpm test packages/cli/src/commands/local/apply.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

- Read `.gitignore` from repo root
- Find managed section by marker comments (`# OAT local paths` / `# END OAT local paths`)
- Replace content with current `localPaths` entries (trailing `/`)
- Append if section not present; remove if `localPaths` empty
- Dry-run by default; `--apply` to write

Run: `pnpm test packages/cli/src/commands/local/apply.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Extract gitignore section management if reusable.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/local/apply.ts packages/cli/src/commands/local/apply.test.ts
git commit -m "feat(p02-t02): add oat local apply with managed gitignore section"
```

---

### Task p02-t03: `oat local sync` -- bulk worktree copy

**Files:**
- Create: `packages/cli/src/commands/local/sync.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/local/sync.test.ts
describe('oat local sync', () => {
  it('should copy localPaths to worktree with --to', () => {
    // TODO
  });
  it('should copy localPaths from worktree with --from', () => {
    // TODO
  });
  it('should skip existing files without --force', () => {
    // TODO
  });
  it('should expand glob patterns', () => {
    // TODO
  });
});
```

Run: `pnpm test packages/cli/src/commands/local/sync.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

- Accept `<worktree-path>` positional arg
- `--to` (default) / `--from` flag for direction
- `--force` for overwrite
- Validate target is a directory
- For each `localPaths` entry: expand globs > recursive copy > track stats
- Output summary table + totals

Run: `pnpm test packages/cli/src/commands/local/sync.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Extract copy logic if shared with worktree bootstrap.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/local/sync.ts packages/cli/src/commands/local/sync.test.ts
git commit -m "feat(p02-t03): add oat local sync for bulk worktree copy"
```

---

### Task p02-t04: `oat local add` / `oat local remove` -- path management

**Files:**
- Create: `packages/cli/src/commands/local/manage.ts`

**Step 1: Write test (RED)**

```typescript
// packages/cli/src/commands/local/manage.test.ts
describe('oat local add/remove', () => {
  it('should add paths to localPaths in config', () => {
    // TODO
  });
  it('should remove paths from localPaths in config', () => {
    // TODO
  });
});
```

Run: `pnpm test packages/cli/src/commands/local/manage.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

- `add`: validate paths start with `.oat/`, append to `localPaths`, deduplicate, write config
- `remove`: filter out matching paths, write config
- Both: print updated list, remind about `oat local apply`

Run: `pnpm test packages/cli/src/commands/local/manage.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Keep both subcommands in one file since they share config read/write.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/local/manage.ts packages/cli/src/commands/local/manage.test.ts
git commit -m "feat(p02-t04): add oat local add/remove for path management"
```

---

## Phase 3: Worktree Bootstrap Integration + Final Verification

### Task p03-t01: Update worktree bootstrap to use config + local sync

**Files:**
- Modify: `.agents/skills/oat-worktree-bootstrap/SKILL.md`

**Step 1: Write test (RED)**

No automated tests -- skill file is markdown.

**Step 2: Implement (GREEN)**

- Update Step 2.5: after config copy, `activeIdea` is already in `config.local.json`
- Remove `.oat/active-idea` from the copy loop
- Add: read `localPaths` from config > run `oat local sync --to <worktree-path>`
- Log results, non-blocking

**Step 3: Refactor**

Simplify the copy loop now that pointer files are gone.

**Step 4: Verify**

Run: `grep -r "active-idea" .agents/skills/oat-worktree-bootstrap/SKILL.md` -- should return no matches.

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap/SKILL.md
git commit -m "feat(p03-t01): update worktree bootstrap for config-based idea + local sync"
```

---

### Task p03-t02: Update autonomous worktree bootstrap for config + local sync

**Files:**
- Modify: `.agents/skills/oat-worktree-bootstrap-auto/SKILL.md`
- Modify: `.agents/skills/oat-worktree-bootstrap-auto/scripts/bootstrap.sh`

**Step 1: Write test (RED)**

No automated tests -- skill file is markdown + shell script.

**Step 2: Implement (GREEN)**

- Update SKILL.md: mirror the same config-based `activeIdea` + `oat local sync` integration from p03-t01
- Update `bootstrap.sh`: after provider sync (Step 4), add `oat local sync --to "$TARGET_PATH"` to copy `localPaths` into the worktree
- Remove any `active-idea` pointer file references if present

**Step 3: Refactor**

Ensure both bootstrap skills (manual + auto) share the same conventions per the auto skill's contract.

**Step 4: Verify**

Run: `grep -r "active-idea" .agents/skills/oat-worktree-bootstrap-auto/` -- should return no matches.
Run: `grep -n "oat local sync" .agents/skills/oat-worktree-bootstrap-auto/scripts/bootstrap.sh` -- should return a match.

**Step 5: Commit**

```bash
git add .agents/skills/oat-worktree-bootstrap-auto/
git commit -m "feat(p03-t02): update autonomous worktree bootstrap for config + local sync"
```

---

### Task p03-t03: Delete legacy pointer files + clean up gitignore

**Files:**
- Delete: `.oat/active-idea` (if exists)
- Modify: `.gitignore`

**Step 1: Write test (RED)**

No automated tests.

**Step 2: Implement (GREEN)**

- Delete `.oat/active-idea` if present
- Remove pointer file references from `.gitignore`

**Step 3: Refactor**

N/A

**Step 4: Verify**

Run: `grep -r "active-idea" .gitignore .agents/skills/ apps/oat-docs/` -- should return no matches.

**Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore(p03-t03): delete legacy active-idea pointer files"
```

---

### Task p03-t04: Final build + lint + type-check + test

**Files:**
- None (verification only)

**Step 1: Write test (RED)**

N/A

**Step 2: Implement (GREEN)**

N/A

**Step 3: Refactor**

N/A

**Step 4: Verify**

Run: `pnpm build && pnpm lint && pnpm type-check && pnpm test`
Expected: All pass with no errors

**Step 5: Commit**

Fix any issues found, then:

```bash
git commit -m "chore(p03-t04): fix issues from final verification"
```

---

### Task p03-t05: (review) Fix localPaths path traversal — reject unsafe paths

**Files:**
- Modify: `packages/cli/src/commands/local/manage.ts`
- Modify: `packages/cli/src/commands/local/manage.test.ts`

**Step 1: Understand the issue**

Review finding: `addLocalPaths()` accepts any string including absolute paths (`/tmp/foo`) and parent-relative paths (`../other-repo`). With `--force`, `syncLocalPaths()` can delete/copy arbitrary filesystem paths outside the repo boundary.
Location: `manage.ts:19-40`, `sync.ts:38-62`

**Step 2: Write test (RED)**

Add tests for:
- Reject absolute paths (starting with `/`)
- Reject parent-relative paths (containing `..`)
- Accept valid `.oat/`-prefixed paths
- Reject empty strings

**Step 3: Implement fix (GREEN)**

Add path validation in `addLocalPaths()`:
- Reject absolute paths (starts with `/`)
- Reject paths containing `..` segments
- Normalize and validate before persisting
- Return rejected paths with reason in result

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test -- --run src/commands/local/manage.test.ts`
Expected: All tests pass

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/local/manage.ts packages/cli/src/commands/local/manage.test.ts
git commit -m "fix(p03-t05): reject unsafe paths in oat local add"
```

---

### Task p03-t06: (review) Fix stale state.md body content

**Files:**
- Modify: `.oat/projects/shared/config-local-worktree-sync/state.md`

**Step 1: Understand the issue**

Review finding: `state.md` body text still says "Plan Complete" and "Ready for implementation" even though all 12 tasks are complete. Frontmatter is correct but body content is template-stale, which can misroute lifecycle skills.

**Step 2: Implement fix**

Update `state.md` body content:
- "Current Phase" → "Implementation - Tasks complete; awaiting final review"
- Progress section → mark implementation tasks as complete
- Remove stale "Ready for implementation" text

**Step 3: Verify**

Read `state.md` to confirm body matches frontmatter state.

**Step 4: Commit**

```bash
git add .oat/projects/shared/config-local-worktree-sync/state.md
git commit -m "fix(p03-t06): update stale state.md body content"
```

---

### Task p03-t07: (review) Add glob expansion to localPaths sync

**Files:**
- Modify: `packages/cli/src/commands/local/sync.ts`
- Modify: `packages/cli/src/commands/local/sync.test.ts`
- Modify: `packages/cli/src/commands/local/status.ts`
- Modify: `packages/cli/src/commands/local/status.test.ts`
- Modify: `packages/cli/src/commands/local/apply.ts`
- Modify: `packages/cli/src/commands/local/apply.test.ts`

**Step 1: Write test (RED)**

Add tests for glob expansion:
- Pattern like `.oat/projects/**/reviews` matches multiple project review dirs
- Non-glob paths still work as literal directories
- Missing glob matches report as missing (not error)

**Step 2: Implement fix (GREEN)**

- Add a shared `expandLocalPaths(repoRoot, localPaths)` helper that:
  - Detects glob characters (`*`, `?`, `[`) in a path entry
  - Expands globs using `node:fs` + `glob` (or `fast-glob`) relative to repoRoot
  - Returns literal paths unchanged
- Use `expandLocalPaths` in `syncLocalPaths()`, `checkLocalPathsStatus()`, and `applyGitignore()`
- For `applyGitignore`: write the raw config patterns (not expanded) to `.gitignore` — gitignore natively supports globs

**Step 3: Refactor**

Extract `expandLocalPaths` into a shared utility if used by 3+ modules.

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test -- --run src/commands/local/`
Expected: All tests pass

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/local/
git commit -m "feat(p03-t07): add glob expansion for localPaths in sync/status"
```

---

### Task p03-t08: (review) Remove unused LocalPathStatus import

**Files:**
- Modify: `packages/cli/src/commands/local/status.test.ts`

**Step 1: Understand the issue**

Review finding: `pnpm lint` reports unused `type LocalPathStatus` import at `status.test.ts:5`.

**Step 2: Implement fix**

Remove the unused `type LocalPathStatus` from the import statement.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli lint`
Expected: No warnings in `status.test.ts`

**Step 4: Commit**

```bash
git add packages/cli/src/commands/local/status.test.ts
git commit -m "fix(p03-t08): remove unused LocalPathStatus import"
```

---

### Task p03-t09: (review) Fix false drift warnings for glob-configured localPaths in status

**Files:**
- Modify: `packages/cli/src/commands/local/status.ts`
- Modify: `packages/cli/src/commands/local/status.test.ts`

**Step 1: Write test (RED)**

Add a test that creates a repo with a glob-based `.gitignore` entry (e.g. `.oat/projects/**/reviews/`) and expanded directories that match the glob. Verify `checkLocalPathsStatus()` reports `gitignored: true` for the expanded paths.

```typescript
it('should detect gitignored status for glob-expanded paths', async () => {
  const repoRoot = await createRepoRoot();
  await mkdir(join(repoRoot, '.oat', 'projects', 'shared', 'alpha', 'reviews'), { recursive: true });
  // .gitignore has the raw glob pattern
  await writeFile(join(repoRoot, '.gitignore'), '.oat/projects/**/reviews/\n', 'utf8');

  const results = await checkLocalPathsStatus(repoRoot, ['.oat/projects/**/reviews']);

  // Should expand glob and report each match as gitignored
  expect(results).toEqual([
    { path: '.oat/projects/shared/alpha/reviews', exists: true, gitignored: true },
  ]);
});
```

Run: `pnpm --filter @oat/cli test -- --run src/commands/local/status.test.ts`
Expected: Test fails (RED)

**Step 2: Implement fix (GREEN)**

Update `isPathGitignored()` in `status.ts` to handle glob patterns in `.gitignore`. Options:
- Use `minimatch` or `picomatch` to test expanded paths against gitignore glob entries
- Or shell out to `git check-ignore -q <path>` for authoritative git matching
- Or match expanded paths back to their original config glob patterns and check those

Simplest approach: enhance `isPathGitignored()` to use a glob matcher (e.g. `picomatch` which is already a transitive dep, or Node.js `path.matchesGlob()` if available in Node 22) to test each `.gitignore` line against the expanded path.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- --run src/commands/local/status.test.ts`
Expected: All tests pass (GREEN)

Run: `pnpm --filter @oat/cli lint && pnpm --filter @oat/cli type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/local/status.ts packages/cli/src/commands/local/status.test.ts
git commit -m "fix(p03-t09): fix false drift warnings for glob-configured localPaths in status"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| final | code | passed | 2026-03-08 | reviews/final-review-2026-03-08-v3.md |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |
| plan | artifact | passed | 2026-03-08 | reviews/artifact-plan-review-2026-03-08.md |

**Status values:** `pending` > `received` > `fixes_added` > `fixes_completed` > `passed`

---

## Implementation Complete

**Summary:**
- Phase 1: 4 tasks - Config schema + active idea migration + skill/docs updates
- Phase 2: 4 tasks - `oat local` command group (status, apply, sync, add/remove)
- Phase 3: 9 tasks - Worktree bootstrap integration (manual + auto) + cleanup + final verification + review fixes

**Total: 17 tasks**

Ready for code review and merge.

---

## References

- Imported Source: `references/imported-plan.md`
