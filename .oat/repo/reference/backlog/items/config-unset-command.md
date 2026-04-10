---
id: bl-af93
title: 'Add `oat config unset <key>` command for removing config values'
status: open
priority: medium
scope: feature
scope_estimate: S
labels: [cli, config, workflow-preferences, ux]
assignee: null
created: '2026-04-10T00:00:00Z'
updated: '2026-04-10T00:00:00Z'
associated_issues: []
oat_template: false
---

## Description

`oat config set` lets users write a value to any of the three config surfaces (`--shared`, `--local`, `--user`), but there is no CLI path to **remove** a previously-set key. The only workaround is hand-editing JSON files (`.oat/config.json`, `.oat/config.local.json`, `~/.oat/config.json`), which is gross, error-prone, and requires knowing file layouts per surface.

This gap became load-bearing when the workflow preference keys (`workflow.*`) shipped in the workflow-friction project (2026-04-10). Workflow preferences are explicitly designed for experimentation — users set a default, try it for a while, and may want to reset it or move it to a different surface. Without `unset`, every experiment costs a JSON edit to undo.

### Why this is worse than a typical CLI polish gap

1. **Enum values have no "unset" / "null" equivalent via CLI.** For keys like `workflow.hillCheckpointDefault` (`every | final`), `workflow.postImplementSequence` (`wait | summary | pr | docs-pr`), and `workflow.reviewExecutionModel` (`subagent | inline | fresh-session`), there is no value you can pass to `oat config set` that represents "unset / prompt me again." You're stuck with one of the enum values until you hand-edit JSON.

2. **Surface migration has no clean CLI path.** Moving a key from `--user` to `--shared` (or vice versa) requires writing at the new surface and then manually deleting the old entry. We hit this in the workflow-friction project itself when deciding `workflow.createPrOnComplete` was better dropped than moved, and there was no CLI way to remove it from `~/.oat/config.json` — had to edit the file by hand.

3. **Discoverability cliff.** `oat config set <key> <value>` is the obvious entry point. Users will naturally try:
   - `oat config set workflow.archiveOnComplete` (no value) → argument error
   - `oat config set workflow.archiveOnComplete null` → enum/boolean validation rejects
   - `oat config set workflow.archiveOnComplete ""` → rejected for most key types (state keys currently coerce empty string to null, but workflow keys do not)
   - `oat config set workflow.archiveOnComplete false` → sets to `false`, **not** `null`. Different semantics: `false` means "definitely don't archive", `null` means "prompt me". Changes skill behavior.

4. **We dogfooded the gap in the first real session using workflow preferences.** The problem surfaced within minutes of actually configuring the OAT repo itself. That's a strong signal other users will hit it immediately when they start experimenting with workflow preferences.

### Current workarounds (all bad)

- **Hand-edit JSON files** — works but requires knowing file paths per surface (`~/.oat/config.json` vs `.oat/config.json` vs `.oat/config.local.json`), opens the door to invalid JSON, and doesn't run through the existing normalization pipeline
- **`oat config set <key> ""`** — only works for state keys (activeProject, lastPausedProject, activeIdea) that have special empty-string-to-null coercion. Rejected by workflow key enum/boolean validation.
- **`oat config set <key> false`** (for boolean preferences) — sets to explicit `false` rather than `null`. This is a behavioral difference: `null` means "skill prompts", `false` means "skill treats as off without asking". Users may not realize they're changing the semantics.
- **Delete the config file entirely** — nuclear option, removes all other preferences too

### Design options

**Option A (recommended): New verb `oat config unset <key> [surface-flag]`**

```bash
oat config unset workflow.hillCheckpointDefault --user
oat config unset workflow.createPrOnComplete --shared
oat config unset activeIdea --local
```

- Matches git convention (`git config --unset <key>`)
- Clean separation from `set`
- Surface flag tells it which config file to remove the key from
- If no surface flag, defaults to the same "auto" resolution as `set` (workflow keys → local, state keys → local, structural keys → shared)
- Rejects with a clear error if the key isn't present at the target surface (instead of silently no-op'ing)
- Opens the door for future `oat config list --unset` or similar discovery

**Option B: Extend `set` with `--unset` flag**

```bash
oat config set workflow.hillCheckpointDefault --unset --user
```

- Less new command surface
- But overloads `set` with a not-setting operation, which is confusing
- Harder to discover via `oat config --help`
- Not recommended

**Option C: Treat empty-string value as "unset"**

```bash
oat config set workflow.hillCheckpointDefault "" --user
```

- Reuses existing command shape
- But already has different semantics for state keys (empty string → null coercion) vs workflow keys (rejected by enum validation)
- Would require changing validation to special-case empty string as "remove"
- Creates subtle asymmetry: the empty string is now magic for writes but not for reads
- Not recommended

### Implementation sketch (Option A)

1. **New command handler** `packages/cli/src/commands/config/unset.ts` (or inline in `index.ts` following the existing `get`/`set`/`list`/`describe`/`dump` pattern)

2. **`runUnset(keyArg, surface, context, dependencies)`**:
   - Validate the key via `isConfigKey()` (reject unknown keys with the same error message as `runSet`)
   - Resolve the target surface using the same `validateSurfaceForKey()` rules as `runSet` so unset respects the same per-key restrictions (e.g., can't unset a structural key at user scope if it wasn't writable at user scope)
   - If no flag is passed, default to `auto` and resolve via `defaultSurfaceForKey()` (matches `runSet`'s default behavior)
   - Read the target config file via the appropriate `readOatConfig` / `readOatLocalConfig` / `readUserConfig`
   - Remove the key from the parsed config object, handling nested paths (e.g., `workflow.archiveOnComplete` needs to unset the nested property and drop the empty `workflow` object if it becomes empty)
   - Write the updated config back via `writeOatConfig` / `writeOatLocalConfig` / `writeUserConfig`
   - Return `{ key, value: null, source: <target-surface> }` in `ConfigValue` shape for symmetry with `runSet`
   - If the key wasn't set at the target surface, either:
     - Return an error like "Key 'workflow.archiveOnComplete' is not set at local scope; nothing to unset" and exit 1
     - Or succeed as a no-op with an informational message
     - (Lean toward error for discoverability — silently succeeding hides bugs)

3. **Commander registration** in `createConfigCommand`:

   ```typescript
   .addCommand(
     new Command('unset')
       .description('Remove a key from an OAT config surface')
       .argument('<key>', 'Config key')
       .option('--shared', 'Remove from the shared repo config (.oat/config.json)')
       .option('--local', 'Remove from the repo-local config (.oat/config.local.json)')
       .option('--user', 'Remove from the user-level config (~/.oat/config.json)')
       .action(...)
   )
   ```

4. **Nested key handling**:
   - For `workflow.<subkey>`: remove the `subkey` from the `workflow` object. If the `workflow` object becomes empty, drop it entirely from the parent config (match the existing `normalizeWorkflowConfig` convention of returning `undefined` for empty workflow blocks).
   - For `documentation.<subkey>`: same pattern — remove the nested field and drop the `documentation` object if empty.
   - For `archive.<subkey>`: same.
   - For `tools.<packname>`: remove from the `tools` object.
   - For flat keys (`activeProject`, `autoReviewAtCheckpoints`, etc.): delete the property directly.

5. **Mutually exclusive flag validation**: same check as `runSet` — reject if more than one of `--shared`, `--local`, `--user` is present.

6. **Surface-to-key restriction** (same as set):
   - Structural keys (`projects.root`, `worktrees.root`, `git.*`, `documentation.*`, `archive.*`, `tools.*`) → only unset-able at shared scope
   - State keys (`activeProject`, `lastPausedProject`) → only unset-able at local scope
   - `activeIdea` → unset-able at local or user
   - `autoReviewAtCheckpoints` → only unset-able at shared (matches current set restriction)
   - Workflow keys (`workflow.*`) → unset-able at any of the three surfaces

7. **`oat config list` update**: after unset, `oat config list` should show the key as resolved from whatever lower-precedence surface or default. No code change needed — the existing resolution logic handles this correctly since we're just writing a config file with the key absent.

8. **Help snapshot update**: the `config --help` inline snapshot test will need another update to include `unset <key>` in the command list.

### Testing plan

- **Happy path per surface:**
  - `oat config unset workflow.archiveOnComplete --user` → removes from user config, subsequent `get` returns null/default
  - `oat config unset workflow.archiveOnComplete --shared` → removes from shared config
  - `oat config unset workflow.archiveOnComplete --local` → removes from local config
  - `oat config unset workflow.archiveOnComplete` (no flag) → removes from local config (auto default for workflow keys)

- **Nested object cleanup:**
  - Set `workflow.archiveOnComplete true --user`
  - `oat config unset workflow.archiveOnComplete --user` → workflow object is dropped from user config, file contents show `{ "version": 1 }` not `{ "version": 1, "workflow": {} }`

- **Partial nested unset:**
  - Set `workflow.archiveOnComplete true --user` AND `workflow.hillCheckpointDefault final --user`
  - `oat config unset workflow.archiveOnComplete --user` → workflow object still exists with just hillCheckpointDefault

- **Key not present at target:**
  - `oat config unset workflow.archiveOnComplete --shared` when nothing is set at shared → error, exit 1, clear message

- **Surface restrictions:**
  - `oat config unset projects.root --user` → rejected ("structural key can only be unset at shared scope")
  - `oat config unset activeProject --shared` → rejected ("state key can only be unset at local scope")
  - `oat config unset activeIdea --user` → accepted (matches prev1-t03 activeIdea multi-surface support)

- **Mutually exclusive flags:**
  - `oat config unset workflow.archiveOnComplete --shared --user` → rejected

- **Unknown key:**
  - `oat config unset made.up.key` → rejected with "Unknown config key" error (same as `get`/`set`)

- **Resolution after unset:**
  - Set `workflow.hillCheckpointDefault final --shared`
  - Set `workflow.hillCheckpointDefault every --user`
  - `oat config get workflow.hillCheckpointDefault` → returns `final` (shared wins over user)
  - `oat config unset workflow.hillCheckpointDefault --shared`
  - `oat config get workflow.hillCheckpointDefault` → returns `every` (falls back to user)
  - `oat config unset workflow.hillCheckpointDefault --user`
  - `oat config get workflow.hillCheckpointDefault` → returns null/default

- **JSON output mode:**
  - `oat config unset workflow.archiveOnComplete --user --json` → returns `{ status: 'ok', key: 'workflow.archiveOnComplete', value: null, source: 'user' }` or similar

### Documentation updates

- **`apps/oat-docs/docs/cli-utilities/configuration.md`**:
  - Add `oat config unset <key>` to the "What each command is for" list
  - Add an unset example to the "Setting preferences" / "Workflow preferences" section
  - Mention in the "Choosing the right surface" section that experiments are safe to unset
  - Update the Source labels subsection to mention that `default` source means the key was never set or was unset

- **`apps/oat-docs/docs/reference/cli-reference.md`** (if it exists and lists subcommands): add unset

- **Help snapshot**: update the `config --help` inline snapshot in `packages/cli/src/commands/help-snapshots.test.ts` to show the new verb

### Out of scope for this task

- **Bulk unset** (`oat config unset workflow.*`) — interesting but belongs in a follow-up
- **`oat config reset`** (unset all keys at a surface) — niche, belongs in a follow-up
- **Undo / history** for config changes — not needed
- **Refactor `setConfigValue` to share code with `unsetConfigValue`** — only if the implementation naturally lands there; don't force it

## Acceptance Criteria

- [ ] New `oat config unset <key>` verb registered on the config command
- [ ] Accepts `--shared`, `--local`, `--user` surface flags (mutually exclusive; same rules as `oat config set`)
- [ ] Defaults to auto surface resolution when no flag is passed (matches `oat config set` defaults per key type)
- [ ] Respects per-key surface restrictions (structural keys shared-only, state keys local-only except `activeIdea` which is local+user, workflow keys all three surfaces, `autoReviewAtCheckpoints` shared-only)
- [ ] Removes nested keys cleanly (e.g., `workflow.archiveOnComplete`) and drops empty parent objects (`workflow: {}` → no `workflow` key at all)
- [ ] Rejects unknown keys with the same error as `get`/`set`
- [ ] Returns exit 1 with a clear error when the key isn't set at the target surface (no silent no-op)
- [ ] `oat config get <key>` after unset returns the next-precedence resolved value or default
- [ ] Tests cover all surfaces, all key type restrictions, nested cleanup, mutually exclusive flag rejection, unknown key, and JSON output mode
- [ ] `oat config --help` snapshot updated
- [ ] Configuration docs updated with the unset command and surface-flag examples
- [ ] No regressions in existing `oat config set` / `get` / `list` / `describe` / `dump` behavior
