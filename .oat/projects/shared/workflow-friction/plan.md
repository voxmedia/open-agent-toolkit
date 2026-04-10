---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-10
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p05']
oat_auto_review_at_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: Workflow Friction — User Preference Config

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Reduce workflow friction by allowing users to configure default answers for repetitive confirmation prompts in OAT workflow skills, so workflows run uninterrupted when preferences are set.

**Architecture:** Extend the existing config system with `workflow.*` keys in `.oat/config.json` (shared) and `.oat/config.local.json` (local overrides). Skills read preferences via `oat config get workflow.<key>` and skip prompts when a preference is set.

**Tech Stack:** TypeScript (CLI config commands + types), Markdown (skill SKILL.md updates), oxlint/oxfmt

**Commit Convention:** `feat(p01-t01): description` — e.g., `feat(p01-t01): add workflow preference types to OatConfig`

## Planning Checklist

- [x] HiLL checkpoint confirmation deferred to first `oat-project-implement` run (quick-mode convention)
- [x] `oat_plan_hill_phases` will be written by implement after user confirms checkpoint behavior

---

## Preference Keys

These are the workflow preference keys to implement, grouped by tier:

### Preference keys (6 total)

| Key                                | Type                                             | Default          | Effect when set                                                                                                                    |
| ---------------------------------- | ------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `workflow.hillCheckpointDefault`   | `"every"` \| `"final"`                           | _unset (prompt)_ | Skip checkpoint prompt in implement; `"every"` = `[]`, `"final"` = last phase ID                                                   |
| `workflow.archiveOnComplete`       | `boolean`                                        | _unset (prompt)_ | Skip "Archive after completion?" in complete                                                                                       |
| `workflow.createPrOnComplete`      | `boolean`                                        | _unset (prompt)_ | Skip "Open a PR?" in complete; when true, completion auto-triggers PR creation                                                     |
| `workflow.postImplementSequence`   | `"wait"` \| `"summary"` \| `"pr"` \| `"docs-pr"` | _unset (prompt)_ | `wait` = don't auto-chain; `summary` = generate summary only; `pr` = PR-final (includes summary); `docs-pr` = docs sync → PR-final |
| `workflow.reviewExecutionModel`    | `"subagent"` \| `"inline"` \| `"fresh-session"`  | _unset (prompt)_ | `subagent`/`inline` = run automatically; `fresh-session` = print guidance and offer escape hatch to subagent/inline                |
| `workflow.autoNarrowReReviewScope` | `boolean`                                        | _unset (prompt)_ | Auto-narrow re-review to fix commits in review-provide                                                                             |

### Resolution precedence

All workflow keys resolve through the 3-layer chain (already implemented by `resolveEffectiveConfig()` from PR #38):

```
env override  >  .oat/config.local.json  >  .oat/config.json  >  ~/.oat/config.json  >  default (unset = prompt)
```

- **User-level** (`~/.oat/config.json`): personal defaults across all repos
- **Repo shared** (`.oat/config.json`): team decision for this repo, overrides user defaults
- **Repo local** (`.oat/config.local.json`): personal override for this repo, highest precedence
- If all three are unset, the skill prompts as before (backward compatible)

### Skill behavior changes (non-config)

| Change                                              | Skill                             | Rationale                                                                                                                              |
| --------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Always resume implementation by default (no prompt) | oat-project-implement             | Fresh start is a rare edge case; make it an explicit `fresh=true` argument override instead of prompting every time                    |
| Strengthen bookkeeping commit enforcement           | oat-project-implement             | Bookkeeping commits are already marked `(required)` but agents sometimes skip them; elevate to top-level step with DO NOT SKIP callout |
| Add required bookkeeping commit step                | oat-project-review-receive        | Skill modifies plan/impl/state but has no commit step; root cause of cross-agent bookkeeping drift                                     |
| Add required bookkeeping commit step                | oat-project-review-receive-remote | Same gap as review-receive                                                                                                             |

### Explicitly NOT configurable (safety gates)

These prompts remain interactive regardless of config:

- "Final review is not marked passed. Proceed anyway?" (pr-final) — safety gate
- "Completion gates not fully satisfied. Continue?" (complete) — safety gate
- "Documentation hard gate" (complete) — compliance gate
- "Worktree archive durability" (complete) — data-loss prevention
- Branch mismatch resolution (review-provide) — context-dependent
- Scope range fallback (review-provide) — context-dependent
- Subagent authorization (review-provide) — host-dependent

---

## Phase 1: Config System Extension

Add workflow preference types, register them in the config command, refactor `getConfigValue()` to use the existing `resolveEffectiveConfig()` utility, and add surface-targeting write flags.

**Prior art:** PR #38 introduced `packages/cli/src/config/resolve.ts` with `resolveEffectiveConfig()` — a generic 3-layer resolution function with per-key source attribution. Phase 1 builds on top of that utility rather than duplicating its logic.

### Task p01-t01: Add OatWorkflowConfig interface to all three config surfaces

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/resolve.ts`

**Changes:**

1. Add `OatWorkflowConfig` interface to `oat-config.ts`:

   ```typescript
   export interface OatWorkflowConfig {
     hillCheckpointDefault?: 'every' | 'final';
     archiveOnComplete?: boolean;
     createPrOnComplete?: boolean;
     postImplementSequence?: 'wait' | 'summary' | 'pr' | 'docs-pr';
     reviewExecutionModel?: 'subagent' | 'inline' | 'fresh-session';
     autoNarrowReReviewScope?: boolean;
   }
   ```

2. Add `workflow?: OatWorkflowConfig` to all three existing interfaces:
   - `OatConfig` (team shared)
   - `OatLocalConfig` (repo local)
   - `UserConfig` (user global) — this is the new addition since workflow preferences need user-level fallback

3. Extend `normalizeOatConfig()`, `normalizeOatLocalConfig()`, and `normalizeUserConfig()` to normalize the `workflow` object:
   - Validate enum values against allowed sets (strip invalid)
   - Coerce booleans from string inputs (`"true"` / `"false"`)
   - Trim strings
   - Drop empty/unknown fields

4. Add a `DEFAULT_WORKFLOW_CONFIG` block to `resolve.ts` so unset workflow keys show up in `oat config dump` output with `source: 'default'`:

   ```typescript
   const DEFAULT_WORKFLOW_CONFIG = {
     workflow: {
       hillCheckpointDefault: null,
       archiveOnComplete: null,
       createPrOnComplete: null,
       postImplementSequence: null,
       reviewExecutionModel: null,
       autoNarrowReReviewScope: null,
     },
   } satisfies Record<string, unknown>;
   ```

   Merge it into the existing `defaultValues` computation in `resolveEffectiveConfig()`.

**Step 1: Write test (RED)**

Add test cases in `oat-config.test.ts` and `resolve.test.ts`:

- Valid workflow config in each of the three files → passes through normalization
- Invalid enum values → stripped
- Boolean coercion from string → correct boolean
- Missing workflow key → undefined, does not crash
- `resolveEffectiveConfig()` → unset workflow keys appear with `source: 'default'`
- `resolveEffectiveConfig()` with workflow set in user only → resolves with `source: 'user'`
- `resolveEffectiveConfig()` with workflow set in shared + user → shared wins, `source: 'shared'`
- `resolveEffectiveConfig()` with workflow set in local + shared + user → local wins, `source: 'local'`

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Add the interface, normalization logic, and default workflow config.

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts
git commit -m "feat(p01-t01): add OatWorkflowConfig to all three config surfaces with resolve defaults"
```

---

### Task p01-t02: Register workflow keys in config command catalog

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Changes:**

1. Add all 6 `workflow.*` keys to the `ConfigKey` union type
2. Add entries to `KEY_ORDER` array (group workflow keys together, preferably after behavioral keys like `autoReviewAtCheckpoints`)
3. Add `CONFIG_CATALOG` entries with full metadata for each workflow key:
   - `group: 'Workflow Preferences'` (new group)
   - `file`: describe the 3-layer resolution (not a single file)
   - `scope`: `workflow` (new scope value indicating multi-surface)
   - `type`: enum string or boolean
   - `defaultValue`: `null` (unset)
   - `mutability`: `read/write`
   - `owningCommand`: `oat config set workflow.<key> <value>`
   - `description`: clear user-facing explanation including surface semantics

4. Do **not** extend `getConfigValue()` per-key logic here — that happens in p01-t03. This task only registers the keys in the catalog so they show up in `oat config describe`.

**Step 1: Write test (RED)**

Add tests for:

- `oat config describe workflow.archiveOnComplete` → returns catalog entry with correct metadata
- `oat config describe` → includes all 6 workflow keys in the "Workflow Preferences" group
- `oat config list` → includes workflow keys (value resolution comes in p01-t03, so for now they can show as unset/default)

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Add registry entries and catalog metadata.

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`

Manual: `pnpm run cli -- config describe workflow.archiveOnComplete`
Expected: Shows group, scope, type, default, mutability, owningCommand, description

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "feat(p01-t02): register workflow preference keys in config command catalog"
```

---

### Task p01-t03: Refactor `getConfigValue()` to use `resolveEffectiveConfig()`

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Rationale:**

`getConfigValue()` currently contains ~150 lines of hardcoded if-else resolution logic, one branch per key or key group. `resolveEffectiveConfig()` (PR #38, `packages/cli/src/config/resolve.ts`) already implements generic 3-layer resolution with per-key source attribution. Refactoring `getConfigValue()` to delegate to `resolveEffectiveConfig()` eliminates the duplicate logic, gives all existing keys the benefit of multi-surface resolution, and makes workflow keys work without any per-key special casing.

This is **Option A** from the workflow-friction planning discussion — refactor once, benefit everywhere.

**Changes:**

1. Replace the `getConfigValue()` body with a call to `resolveEffectiveConfig()`:

   ```typescript
   async function getConfigValue(
     repoRoot: string,
     key: ConfigKey,
   ): Promise<{ value: string | null; source: string }> {
     const userConfigDir = join(homedir(), '.oat');
     const resolved = await resolveEffectiveConfig(repoRoot, userConfigDir);
     const entry = resolved.resolved[key];
     if (!entry) {
       return { value: null, source: 'default' };
     }
     return {
       value: formatConfigValue(entry.value),
       source: entry.source,
     };
   }
   ```

2. Add `formatConfigValue()` helper that normalizes the `unknown` value from `resolveEffectiveConfig` back into the string format `oat config get` currently returns (stringify booleans, handle null, etc.).

3. Update the source display format. The legacy `getConfigValue` used source labels like `'env'`, `'config.json'`, `'config.local.json'`, `'default'`. `resolveEffectiveConfig` uses `'env'`, `'shared'`, `'local'`, `'user'`, `'default'`. The new labels are clearer and more consistent — update the `oat config list` / `oat config get` user-facing output to use them directly. This is a minor user-facing change worth calling out in commit message and docs.

4. Verify that all existing `oat config get <key>` invocations continue to return the expected values for the full set of registered keys:
   - `projects.root`, `worktrees.root` (with env override support)
   - `git.defaultBranch`
   - `documentation.*` (all fields)
   - `archive.*` (all fields)
   - `autoReviewAtCheckpoints`
   - `activeProject`, `lastPausedProject`, `activeIdea`
   - All 6 new `workflow.*` keys

**Step 1: Write test (RED)**

Add regression tests to cover the full set of existing keys:

- Each existing `ConfigKey` returns its expected value from `resolveEffectiveConfig()`
- Env overrides for `OAT_PROJECTS_ROOT` and `OAT_WORKTREES_ROOT` still work
- Source labels match new format (`'shared'`, `'local'`, `'user'`, `'env'`, `'default'`)
- Each of the 6 workflow keys resolves correctly through the 3-layer chain
- `oat config list` output includes all keys (existing + workflow) with correct source attribution

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Replace `getConfigValue()` body. Delete the ~150 lines of per-key if-else. Wire up the new format helper.

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`

Manual smoke test:

```bash
pnpm run cli -- config list
pnpm run cli -- config get projects.root
pnpm run cli -- config get autoReviewAtCheckpoints
pnpm run cli -- config get activeProject
OAT_PROJECTS_ROOT=/tmp/test pnpm run cli -- config get projects.root
```

Expected: All existing behavior preserved with the new source label format. Workflow keys return `null` / `source: 'default'` until set.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "refactor(p01-t03): replace getConfigValue() with resolveEffectiveConfig() delegation"
```

---

### Task p01-t04: Add `--user` / `--shared` surface flags to `oat config set`

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `packages/cli/src/config/oat-config.ts` (if `writeUserConfig()` needs to accept workflow section)

**Changes:**

1. Add `--user` and `--shared` flags to the `oat config set` command:
   - Default (no flag): existing behavior preserved — local keys → `config.local.json`, structural keys → `config.json`, workflow keys → `config.local.json` (matches "personal preference" default)
   - `--shared`: write to `.oat/config.json` (team decision)
   - `--user`: write to `~/.oat/config.json` (personal across all repos)
   - Flags are mutually exclusive — reject if both provided

2. Update `setConfigValue()` to accept a target surface parameter:

   ```typescript
   type ConfigSurface = 'auto' | 'shared' | 'local' | 'user';
   async function setConfigValue(
     repoRoot: string,
     key: ConfigKey,
     rawValue: string,
     surface: ConfigSurface = 'auto',
   ): Promise<...>
   ```

3. Surface restrictions:
   - Structural keys (`projects.root`, `worktrees.root`, `git.defaultBranch`, `documentation.*`, `archive.*`) — only valid with `--shared` or `auto` (reject `--user` / `--local` with a clear error message)
   - State keys (`activeProject`, `lastPausedProject`) — only valid with `auto` or `--local` (reject `--shared` / `--user`)
   - Behavioral keys (`autoReviewAtCheckpoints`) — valid with `--shared`, `--local`, or `--user`
   - Workflow keys (`workflow.*`) — valid with `--shared`, `--local`, or `--user`; default is `--local`

4. If `writeUserConfig()` doesn't already handle a `workflow` section, extend it to pass the workflow object through normalization and write it atomically. The existing `UserConfig` interface gets `workflow?: OatWorkflowConfig` in p01-t01, so this should mostly be type-level.

**Step 1: Write test (RED)**

Add tests for:

- `oat config set workflow.archiveOnComplete true` → writes to `config.local.json`, source `local` on next get
- `oat config set workflow.archiveOnComplete true --shared` → writes to `config.json`, source `shared` on next get
- `oat config set workflow.archiveOnComplete true --user` → writes to `~/.oat/config.json`, source `user` on next get
- `oat config set projects.root /custom --user` → rejected with error ("structural key cannot be set at user scope")
- `oat config set activeProject foo --shared` → rejected with error ("state key cannot be set at shared scope")
- `oat config set workflow.archiveOnComplete true --shared --user` → rejected with error (mutually exclusive)
- `oat config set workflow.hillCheckpointDefault invalid` → rejected with enum validation error
- `oat config set workflow.hillCheckpointDefault final --user` → succeeds, writes to user config

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Add the flag definitions, surface routing, validation, and user config write support.

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`

Manual smoke test:

```bash
# Set at user level
pnpm run cli -- config set workflow.archiveOnComplete true --user
pnpm run cli -- config get workflow.archiveOnComplete
# Expected: true (from user)

# Override at shared level
pnpm run cli -- config set workflow.archiveOnComplete false --shared
pnpm run cli -- config get workflow.archiveOnComplete
# Expected: false (from shared)

# Override at local level
pnpm run cli -- config set workflow.archiveOnComplete true
pnpm run cli -- config get workflow.archiveOnComplete
# Expected: true (from local)

# Confirm dump shows all three surfaces
pnpm run cli -- config dump
```

Expected: All three layers visible, resolution follows `local > shared > user`.

**Step 4: Cleanup**

Reset the test config values after manual smoke testing to avoid polluting the workflow-friction dev environment.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts packages/cli/src/config/oat-config.ts
git commit -m "feat(p01-t04): add --user and --shared surface flags to oat config set"
```

---

## Phase 2: Skill Integration — oat-project-implement

Update oat-project-implement to read workflow preferences before prompting.

### Task p02-t01: HiLL checkpoint default preference

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Changes:**

In Step 2.5 (checkpoint phase confirmation), before presenting the 3-option prompt:

```
HILL_DEFAULT=$(oat config get workflow.hillCheckpointDefault 2>/dev/null || true)
```

- If `HILL_DEFAULT` is `"every"` → write `oat_plan_hill_phases: []`, print "HiLL checkpoints: every phase (from config)", skip prompt
- If `HILL_DEFAULT` is `"final"` → write `oat_plan_hill_phases: ["<last-phase-id>"]`, print "HiLL checkpoints: final only (from config)", skip prompt
- If unset → prompt as before (no change)

**Step 1: Verify**

Run: `pnpm lint && pnpm format`
Expected: No errors. Manually confirm the skill's step indicators still match actual step numbering.

**Step 2: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p02-t01): read workflow.hillCheckpointDefault before checkpoint prompt"
```

---

### Task p02-t02: Post-implementation sequence preference

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Changes:**

In Step 15 (next steps sequence), before presenting the prompt:

```
POST_IMPL=$(oat config get workflow.postImplementSequence 2>/dev/null || true)
```

- If `"wait"` → exit without auto-chaining; print "Post-implementation: wait (from config). Run follow-up skills manually when ready."
- If `"summary"` → run `oat-project-summary` only; stop after summary completes
- If `"pr"` → run `oat-project-pr-final` (which auto-generates summary as part of its flow)
- If `"docs-pr"` → run `oat-project-document` then `oat-project-pr-final` (summary included in PR-final)
- If unset → prompt as before

**Note:** Summary is not a separate step when PR is included because `oat-project-pr-final` already handles summary generation. This is why `"summary"` is standalone and `"pr"` / `"docs-pr"` do not list summary explicitly.

Print: "Post-implementation: {chosen} (from config)" when using preference.

**Step 1: Verify**

Run: `pnpm lint && pnpm format`
Expected: No errors. Manually confirm the skill's step indicators still match actual step numbering.

**Step 2: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p02-t02): read workflow.postImplementSequence before sequence prompt"
```

---

### Task p02-t03: Review execution model preference

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Changes:**

In Step 14 (final review options), before presenting the 3-tier prompt:

```
REVIEW_MODEL=$(oat config get workflow.reviewExecutionModel 2>/dev/null || true)
```

- If `"subagent"` → dispatch subagent directly, no prompt
- If `"inline"` → run inline, no prompt
- If `"fresh-session"` → this is a **soft preference with escape hatch** because the agent cannot actually run a review in a fresh session on the user's behalf. Print:

  ```
  Per your config, your preference is to run review in a fresh session.
  Run `oat-project-review-provide code final` in a separate session, then
  resume this session when the review is complete.

  If you'd like to review here instead:
    1) subagent
    2) inline

  Enter 1 or 2 to run here, or press Enter to wait.
  ```

  Then wait for input. If user enters 1 or 2, proceed with that option. If they press Enter (or equivalent), pause the session to wait for the fresh-session review to complete.

- If unset → prompt the full 3-option choice as today (no behavioral change)

**Design note:** `subagent` and `inline` are "run automatically" preferences. `fresh-session` is a "step aside" preference because the agent can't act on it — it still offers the user an escape hatch to bail into one of the actionable modes.

**Step 1: Verify**

Run: `pnpm lint && pnpm format`
Expected: No errors. Manually confirm the skill's step indicators still match actual step numbering.

**Step 2: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p02-t03): read workflow.reviewExecutionModel before review tier prompt"
```

---

### Task p02-t04: Change resume to default behavior (no prompt)

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Changes:**

In Step 3, replace the "Resume from {task_id}, or start fresh?" prompt:

- **New default:** Always resume from the resolved task pointer. Print "Resuming from {task_id}." (no prompt).
- **Fresh start:** Only available as an explicit argument (e.g., `oat-project-implement fresh=true`). When passed, warn "Starting fresh — this will overwrite implementation.md" and proceed without asking.
- Remove the interactive choice entirely from normal flow.

**Step 1: Verify**

Run: `pnpm lint && pnpm format`
Expected: No errors. Manually confirm the skill's step indicators still match actual step numbering.

**Step 2: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "fix(p02-t04): always resume implementation by default, drop fresh-start prompt"
```

---

### Task p02-t05: Strengthen bookkeeping commit enforcement

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Changes:**

The skill already has 4 "Bookkeeping commit (required):" sections with explicit `git add` + `git commit` commands. Strengthen enforcement:

1. Add a top-level rule in the Mode Assertion / BLOCKED Activities section:

   ```
   **CRITICAL — Bookkeeping commits are mandatory, not optional.**
   After every code commit and after every phase/review-fix completion, you MUST
   commit the OAT tracking files (implementation.md, state.md, plan.md) as a
   separate bookkeeping commit. Do not defer, batch, or skip these commits.
   Skipping a bookkeeping commit is the primary cause of state drift.
   ```

2. In each existing "Bookkeeping commit (required):" section, add:

   ```
   **DO NOT SKIP.** This commit prevents state drift across sessions.
   ```

3. Verify the commit command pattern is consistent across all 4 sections:
   ```bash
   git add "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md" "$PROJECT_PATH/plan.md"
   git diff --cached --quiet || git commit -m "chore(oat): update tracking artifacts for {context}"
   ```

**Step 1: Verify**

Run: `pnpm lint && pnpm format`
Expected: No errors. Manually confirm all 4 bookkeeping commit sections have consistent command patterns and DO NOT SKIP callouts.

**Step 2: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "fix(p02-t05): strengthen bookkeeping commit enforcement with DO NOT SKIP callouts"
```

---

## Phase 3: Skill Integration — oat-project-complete and oat-project-pr-final

### Task p03-t01: Archive on complete preference

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`

**Changes:**

In Step 2 (batched confirmation), for the "Archive after completion?" question:

```
ARCHIVE_PREF=$(oat config get workflow.archiveOnComplete 2>/dev/null || true)
```

- If `"true"` → include archive in the plan, skip asking, print "Archive: enabled (from config)"
- If `"false"` → skip archive, print "Archive: disabled (from config)"
- If unset → ask as before

Note: The "Ready to mark complete?" question (Question 1) should still be asked — it's a meaningful confirmation, not a preference.

**Step 1: Verify**

Run: `pnpm lint && pnpm format`
Expected: No errors. Manually confirm the skill's step indicators still match actual step numbering.

**Step 2: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md
git commit -m "feat(p03-t01): read workflow.archiveOnComplete before archive prompt"
```

---

### Task p03-t02: Create-PR-on-complete preference

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`

**Changes:**

Note: `oat-project-pr-final` already auto-creates PRs without confirmation (Step 5: "push and create the PR automatically"). This config key only affects the completion flow's "Open a PR?" question.

**In oat-project-complete Step 2**, for "Open a PR?" question:

```
PR_ON_COMPLETE=$(oat config get workflow.createPrOnComplete 2>/dev/null || true)
```

- If `"true"` → include PR creation in the completion plan, skip asking, print "PR on complete: enabled (from config)"
- If `"false"` → skip PR creation, print "PR on complete: disabled (from config)"
- If unset → ask as before
- Still skip entirely if `oat_pr_status: open` (existing behavior preserved)

**Step 1: Verify**

Run: `pnpm lint && pnpm format`
Expected: No errors. Manually confirm the skill's step indicators still match actual step numbering.

**Step 2: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md
git commit -m "feat(p03-t02): read workflow.createPrOnComplete before PR prompt in complete"
```

---

## Phase 4: Skill Integration — Review Skills

### Task p04-t01: Auto-narrow re-review scope preference

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`

**Changes:**

In Step 3a, before "Scope to fix task commits only?" prompt:

```
AUTO_NARROW=$(oat config get workflow.autoNarrowReReviewScope 2>/dev/null || true)
```

- If `"true"` → auto-narrow, print "Re-review scope: narrowed to fix commits (from config)"
- If `"false"` → use full scope, print "Re-review scope: full (from config)"
- If unset → prompt as before

**Step 1: Verify**

Run: `pnpm lint && pnpm format`
Expected: No errors. Manually confirm the skill's step indicators still match actual step numbering.

**Step 2: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md
git commit -m "feat(p04-t01): read workflow.autoNarrowReReviewScope before scope prompt"
```

---

### Task p04-t02: Add bookkeeping commit step to oat-project-review-receive

**Files:**

- Modify: `.agents/skills/oat-project-review-receive/SKILL.md`

**Rationale:**

This skill modifies `plan.md` (adds fix tasks, updates Reviews table, updates Implementation Complete totals), `implementation.md` (adds review notes, sets `oat_current_task_id`), and `state.md` (updates phase status, current task) — but has **no commit step**. When a separate agent runs this skill, all changes are left uncommitted. The original agent returns to dirty state it didn't create, causing drift.

`oat-project-review-provide` already has a proper "Commit Review Bookkeeping Atomically (Required)" step — this skill needs the same pattern.

**Changes:**

Add a new step after the archive step (Step 7.5) and before the summary (Step 11), or as a new Step 8:

````markdown
### Step 8: Commit Review Bookkeeping (Required)

**CRITICAL — DO NOT SKIP.** When this skill runs in a separate agent session (subagent, fresh session, or different conversation), uncommitted bookkeeping updates cause state drift for the original agent.

Commit all modified OAT tracking files atomically:

\```bash
git add "$PROJECT_PATH/plan.md" "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md"

# Include the archived review artifact if it was moved

git add "$PROJECT_PATH/reviews/" 2>/dev/null || true
git diff --cached --quiet || git commit -m "chore(oat): record review findings and add fix tasks ({scope})"
\```

Do not include unrelated files in this commit. Do not defer this commit without explicit user approval.
````

Also add to the Success Criteria section:

```
- ✅ All artifact updates are committed before the skill exits
```

**Step 1: Verify**

Run: `pnpm lint && pnpm format`
Expected: No errors. Manually confirm the new step number doesn't conflict with existing step numbering.

**Step 2: Commit**

```bash
git add .agents/skills/oat-project-review-receive/SKILL.md
git commit -m "fix(p04-t02): add required bookkeeping commit step to review-receive"
```

---

### Task p04-t03: Add bookkeeping commit step to oat-project-review-receive-remote

**Files:**

- Modify: `.agents/skills/oat-project-review-receive-remote/SKILL.md`

**Rationale:**

Same gap as `oat-project-review-receive` — this skill updates `plan.md`, `implementation.md`, and `state.md` when processing GitHub PR comment feedback, but has no commit step.

**Changes:**

Add a commit step after artifact updates (after Step 6) and before optional GitHub replies (Step 8):

````markdown
### Step 7: Commit Review Bookkeeping (Required)

**CRITICAL — DO NOT SKIP.** Uncommitted bookkeeping updates cause state drift when this skill runs in a separate agent session.

Commit all modified OAT tracking files atomically:

\```bash
git add "$PROJECT_PATH/plan.md" "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md"
git diff --cached --quiet || git commit -m "chore(oat): record remote review findings and add fix tasks ({scope})"
\```

Do not include unrelated files. Do not defer without explicit user approval.
````

Also add to the Success Criteria / Output Contract:

```
- ✅ All artifact updates are committed before the skill exits
```

**Step 1: Verify**

Run: `pnpm lint && pnpm format`
Expected: No errors. Manually confirm the new step number doesn't conflict with existing step numbering.

**Step 2: Commit**

```bash
git add .agents/skills/oat-project-review-receive-remote/SKILL.md
git commit -m "fix(p04-t03): add required bookkeeping commit step to review-receive-remote"
```

---

## Phase 5: Documentation and Bundled Docs Update

### Task p05-t01: Update OAT bundled docs with workflow preferences

**Files:**

- Modify: `~/.oat/docs/cli-utilities/configuration.md`
- Modify: `~/.oat/docs/workflows/projects/lifecycle.md`

**Changes:**

1. Add a "Workflow Preferences" section to `configuration.md` listing all `workflow.*` keys with descriptions and examples
2. Add a note in `lifecycle.md` about configurable defaults reducing friction
3. Include example setup commands:
   ```bash
   # Power-user setup — run once, reduce friction forever
   oat config set workflow.hillCheckpointDefault final
   oat config set workflow.archiveOnComplete true
   oat config set workflow.createPrOnComplete true
   oat config set workflow.postImplementSequence summary-pr
   oat config set workflow.reviewExecutionModel subagent
   oat config set workflow.autoNarrowReReviewScope true
   oat config set workflow.autoFixBookkeepingDrift true
   ```

**Note:** Bundled docs at `~/.oat/docs/` are read-only reference. The source docs that get bundled live in `apps/oat-docs/`. Update the source docs, and they'll be bundled on next `oat init tools`.

4. Document the relationship between the existing top-level `autoReviewAtCheckpoints` key and the new `workflow.*` namespace. Explain that `autoReviewAtCheckpoints` is not being migrated under `workflow.*` for backward compatibility, and clarify which key controls what.

**Step 1: Identify source doc files**

Find the actual source files in `apps/oat-docs/` that correspond to the bundled docs.

**Step 2: Update source docs**

Add workflow preferences documentation including the `autoReviewAtCheckpoints` relationship note.

**Step 3: Verify**

Run: `pnpm build:docs`
Expected: Docs build succeeds with no errors.

**Step 4: Commit**

```bash
git add apps/oat-docs/
git commit -m "docs(p05-t01): document workflow preference config keys"
```

---

### Task p05-t02: Add `oat config describe` metadata for all workflow keys

**Files:**

- (Already covered in p01-t02, but verify completeness here)

**Step 1: Verify**

Run: `oat config describe` and confirm all workflow keys appear with:

- Correct group ("Shared Repo" or "Repo Local" depending on surface)
- Accurate descriptions
- Correct type annotations
- Correct default values
- Correct owning command (`oat config set`)

Run: `oat config set workflow.archiveOnComplete true && oat config get workflow.archiveOnComplete`
Expected: Returns `true` with source `config.local.json`

---

## Revision Phase p-rev1: Final Review Fixes

Fix tasks generated from `final` code review (2026-04-10, auto-triggered at p05 HiLL checkpoint).

### Task prev1-t01: (review) Stage moved review artifact in review-receive Step 7.6 commit

**Files:**

- Modify: `.agents/skills/oat-project-review-receive/SKILL.md`

**Step 1: Understand the issue**

Review finding `I1`: Step 7.5 runs `mv "$REVIEW_PATH" "$ARCHIVED_REVIEW_PATH"` to move the consumed review artifact into `reviews/archived/`, but the new Step 7.6 atomic commit only stages `plan.md`, `implementation.md`, and `state.md` — so the rename remains unstaged after the commit. A subagent running this skill will leave the worktree dirty with the moved artifact, and the original agent will return to exactly the drift scenario p04-t02 was intended to eliminate.

**Step 2: Implement fix**

Update the Step 7.6 commit command to also stage the `reviews/` directory changes (both the deletion of the original path and the new archived location):

```bash
git add "$PROJECT_PATH/plan.md" "$PROJECT_PATH/implementation.md" "$PROJECT_PATH/state.md"
git add "$PROJECT_PATH/reviews/"
git diff --cached --quiet || git commit -m "chore(oat): record review findings and add fix tasks ({scope})"
```

Use scoped `git add "$PROJECT_PATH/reviews/"`, not repo-wide `git add -A`. Note in the prose that this captures both the Step 7.5 archive move AND any newly-created review fix task references.

**Step 3: Verify**

Manually read the updated SKILL.md to confirm the `git add "$PROJECT_PATH/reviews/"` line is present and that the commit command still rejects `-A`/glob patterns.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-review-receive/SKILL.md
git commit -m "fix(prev1-t01): stage moved review artifact in review-receive Step 7.6 commit"
```

---

### Task prev1-t02: (review) Document source label rename in configuration.md

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`

**Step 1: Understand the issue**

Review finding `I2`: The `getConfigValue()` refactor in p01-t03 changes the `source` field returned by `oat config get --json` and `oat config list` from `config.json` / `config.local.json` → `shared` / `local` / `user`. The p01-t03 commit message mentions this but the published docs do not call it out. Any external script that greps for `"source":"config.json"` will silently stop matching.

**Step 2: Implement fix**

Add a "Source labels" subsection to `configuration.md` under "The fastest way to inspect config" that:

- Lists the current labels: `env`, `local`, `shared`, `user`, `default`
- Notes that earlier CLI versions (pre-this-release) returned `config.json` / `config.local.json` as the source strings
- Explains why the rename happened (consistency with `oat config dump` output)

**Step 3: Verify**

Run: `pnpm build:docs`
Expected: docs build succeeds. Read the rendered section to confirm the note is visible.

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/configuration.md
git commit -m "docs(prev1-t02): document source label rename in configuration guide"
```

---

### Task prev1-t03: (review) Resolve activeIdea --user surface inconsistency

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Understand the issue**

Review finding `I3`: The catalog advertises a user-level `activeIdea` entry (`~/.oat/config.json`) but `validateSurfaceForKey()` rejects `oat config set activeIdea <path> --user` because `activeIdea` is in `isStateKey()`. The new `--user` flag (p01-t04) makes this pre-existing inconsistency more visible.

**Step 2: Implement fix**

Prefer **Option (a)** per the reviewer's recommendation: allow `activeIdea --user` as a legitimate surface by treating it as a multi-surface state key.

- Update `validateSurfaceForKey()`: special-case `activeIdea` to allow `local` or `user` surface (but still reject `shared`)
- Update `setConfigValue()`: add a branch that writes `activeIdea` to user config when `effectiveSurface === 'user'`, using `readUserConfig`/`writeUserConfig` analogously to the workflow key branches
- Update tests: add coverage for `oat config set activeIdea <path> --user` writing to `~/.oat/config.json`, and confirm `oat config get activeIdea` resolves from user when set there
- Confirm `activeProject` and `lastPausedProject` remain local-only (they don't have a user-surface catalog entry)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests pass, including new `activeIdea --user` tests.

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Clean.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "fix(prev1-t03): allow activeIdea --user surface to match catalog"
```

---

### Task prev1-t04: (review) Update workflow catalog description precedence text

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`

**Step 1: Understand the issue**

Review finding `m1`: Each workflow key catalog description ends with `Resolution: local > shared > user.` This omits `env` (future-proof) and `default` (how unset state is represented). Users may be confused about where the "unset" state comes from.

**Step 2: Implement fix**

Update all 6 workflow catalog entries: change `Resolution: local > shared > user.` → `Resolution: env > local > shared > user > default.`

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Existing tests still pass (the catalog test assertions use substring matching so they should still match; update them if they become too loose).

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/index.ts
git commit -m "docs(prev1-t04): include full precedence chain in workflow catalog descriptions"
```

---

### Task prev1-t05: (review) Use "unset" instead of "null" for workflow defaults in catalog

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`

**Step 1: Understand the issue**

Review finding `m2`: Workflow catalog entries show `defaultValue: 'null'` which reads confusingly for boolean keys (user asks "is the default `null` or `false`?"). Other optional catalog entries like `documentation.root` use `defaultValue: 'unset'` — a clearer convention that matches the skill behavior ("unset = prompt").

**Step 2: Implement fix**

Update all 6 workflow catalog entries: change `defaultValue: 'null'` → `defaultValue: 'unset'`.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Existing tests still pass. If the `describe workflow.archiveOnComplete` test asserts `Default: null`, update it to `Default: unset`.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "docs(prev1-t05): use unset instead of null for workflow catalog defaults"
```

---

### Task prev1-t06: (review) Restructure fresh-session escape hatch for readability

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Understand the issue**

Review finding `m3`: The `fresh-session` soft-preference escape hatch in Step 14 is documented inline in dense prose. Future skill readers may have trouble spotting the three outcomes (`1` → subagent, `2` → inline, Enter → wait).

**Step 2: Implement fix**

Break the escape hatch outcomes out into a short bullet list below the printed guidance block. Keep the existing guidance text but follow it with something like:

```
Handle the user response:

- `1` → dispatch the subagent review
- `2` → run the review inline
- Enter (or equivalent) → pause the session and wait for the fresh-session review to complete
```

**Step 3: Verify**

Run: `pnpm lint && pnpm format`
Expected: Clean.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "docs(prev1-t06): restructure fresh-session escape hatch as bullet list"
```

---

### Task prev1-t07: (review) Clarify autoNarrowReReviewScope description

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`

**Step 1: Understand the issue**

Review finding `m4`: The `workflow.autoNarrowReReviewScope` catalog description reads as unconditional, but the preference only applies when re-reviewing completed fix tasks. A user who sets it to `true` but runs review-provide before any fix tasks have been completed won't see any config effect (which is correct behavior, just unclear from the description).

**Step 2: Implement fix**

Update the `workflow.autoNarrowReReviewScope` catalog description to clarify the scoping:

```
Auto-narrow re-review scope to fix-task commits in oat-project-review-provide when re-reviewing completed fix tasks. Has no effect on initial reviews. When unset, the skill prompts. Resolution: env > local > shared > user > default.
```

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Existing tests still pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/index.ts
git commit -m "docs(prev1-t07): clarify workflow.autoNarrowReReviewScope branch scoping"
```

---

### Task prev1-t08: (review) Verify and fix docs anchor for workflow preferences section

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md` (if anchor is broken)

**Step 1: Understand the issue**

Review finding `m6`: `lifecycle.md` links to `configuration.md#workflow-preferences-workflow` but the auto-generated slug for `## Workflow preferences (\`workflow.\*\`)` may differ depending on Fumadocs' slug generator.

**Step 2: Implement fix**

1. Run `pnpm build:docs` and inspect the rendered configuration.md for the actual anchor slug used for the "Workflow preferences" heading.
2. If the anchor differs from `#workflow-preferences-workflow`, update the link in `lifecycle.md` to match the actual slug.
3. If the anchor resolves correctly, no change is needed — verify and mark this task complete with a note in implementation.md.

**Step 3: Verify**

Run: `pnpm build:docs` and confirm the docs build succeeds. Manually verify the anchor resolves by inspecting the rendered HTML or JSON.

**Step 4: Commit**

```bash
# Only commit if an actual change was needed
git add apps/oat-docs/docs/workflows/projects/lifecycle.md
git commit -m "docs(prev1-t08): fix workflow preferences section anchor in lifecycle doc"
```

---

## Revision Phase p-rev2: Re-Review Polish

Single fix task from `final-review-2026-04-07-v2.md` re-review (0 important, 1 minor).

### Task prev2-t01: (review) Fix stale owningCommand on activeIdea user catalog row

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`

**Step 1: Understand the issue**

Re-review finding: The prev1-t03 fix correctly made `oat config set activeIdea <value> --user` a supported command, but the corresponding user-surface catalog row still says `owningCommand: 'user config APIs (not surfaced via oat config set)'`. Verified via `oat config describe activeIdea`: the user row still prints the stale text. Users may interpret this as "I can't set this via the CLI" when in fact they can.

**Step 2: Implement fix**

Update the user-surface `activeIdea` catalog entry (`packages/cli/src/commands/config/index.ts:378-389`):

- Change `owningCommand` from `'user config APIs (not surfaced via oat config set)'` to `'oat config set activeIdea <value> --user'` to match the now-working command
- Optionally tighten the `description` to mention that the user-level row is the fallback used when the repo-local `activeIdea` is unset

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Clean (no tests assert on the stale text, so this should pass without test updates)

Run: `pnpm run cli -- config describe activeIdea`
Expected: User-scope row shows `Owning command: oat config set activeIdea <value> --user`

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/index.ts
git commit -m "docs(prev2-t01): fix stale owningCommand on activeIdea user catalog row"
```

---

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                            |
| ------ | -------- | ----------- | ---------- | --------------------------------------------------- |
| p01    | code     | pending     | -          | -                                                   |
| p02    | code     | pending     | -          | -                                                   |
| p03    | code     | pending     | -          | -                                                   |
| p04    | code     | pending     | -          | -                                                   |
| p05    | code     | pending     | -          | -                                                   |
| final  | code     | fixes_added | 2026-04-10 | reviews/archived/final-review-2026-04-07-v2.md      |
| spec   | artifact | n/a         | -          | -                                                   |
| design | artifact | n/a         | -          | -                                                   |
| plan   | artifact | passed      | 2026-04-08 | reviews/archived/artifact-plan-review-2026-04-08.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks — Config system extension (types + UserConfig, catalog registration, getConfigValue refactor to use resolveEffectiveConfig, --user/--shared flags on set)
- Phase 2: 5 tasks — Skill integration for oat-project-implement (3 config prefs + resume default change + bookkeeping enforcement)
- Phase 3: 2 tasks — Skill integration for oat-project-complete
- Phase 4: 3 tasks — Review skill integration (1 config pref + 2 bookkeeping commit fixes for review-receive and review-receive-remote)
- Phase 5: 2 tasks — Documentation updates
- Revision Phase p-rev1: 8 tasks — Final review fix tasks (3 important + 5 minor findings)
- Revision Phase p-rev2: 1 task — Re-review polish (1 minor drift from prev1-t03)

**Total: 25 tasks (16 plan + 8 rev1 + 1 rev2)**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Config types: `packages/cli/src/config/oat-config.ts`
- Config command: `packages/cli/src/commands/config/index.ts`
- Skills: `.agents/skills/oat-project-implement/SKILL.md`, `.agents/skills/oat-project-complete/SKILL.md`, `.agents/skills/oat-project-pr-final/SKILL.md`, `.agents/skills/oat-project-review-provide/SKILL.md`, `.agents/skills/oat-project-review-receive/SKILL.md`, `.agents/skills/oat-project-review-receive-remote/SKILL.md`
