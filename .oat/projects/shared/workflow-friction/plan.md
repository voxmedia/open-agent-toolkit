---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-07
oat_phase: plan
oat_phase_status: in_progress
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

- [ ] Confirmed HiLL checkpoints with user
- [ ] Set `oat_plan_hill_phases` in frontmatter

---

## Preference Keys

These are the workflow preference keys to implement, grouped by tier:

### Tier 1 — Highest friction, clearest defaults (Phase 1)

| Key                              | Type                                            | Default          | Effect when set                                                                  |
| -------------------------------- | ----------------------------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| `workflow.hillCheckpointDefault` | `"every"` \| `"final"`                          | _unset (prompt)_ | Skip checkpoint prompt in implement; `"every"` = `[]`, `"final"` = last phase ID |
| `workflow.archiveOnComplete`     | `boolean`                                       | _unset (prompt)_ | Skip "Archive after completion?" in complete                                     |
| `workflow.createPrOnComplete`    | `boolean`                                       | _unset (prompt)_ | Skip "Open a PR?" in complete; when true, completion auto-triggers PR creation   |
| `workflow.postImplementSequence` | `"all"` \| `"summary-pr"` \| `"exit"`           | _unset (prompt)_ | Skip post-implementation sequence choice in implement                            |
| `workflow.reviewExecutionModel`  | `"subagent"` \| `"fresh-session"` \| `"inline"` | _unset (prompt)_ | Skip final review tier choice in implement                                       |

### Tier 2 — Medium friction, reasonable defaults (Phase 2)

| Key                                | Type      | Default          | Effect when set                                        |
| ---------------------------------- | --------- | ---------------- | ------------------------------------------------------ |
| `workflow.autoNarrowReReviewScope` | `boolean` | _unset (prompt)_ | Auto-narrow re-review to fix commits in review-provide |
| `workflow.autoFixBookkeepingDrift` | `boolean` | _unset (prompt)_ | Auto-fix stale state reconciliation in implement       |

### Skill behavior changes (non-config)

| Change                                              | Skill                 | Rationale                                                                                                                              |
| --------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Always resume implementation by default (no prompt) | oat-project-implement | Fresh start is a rare edge case; make it an explicit `fresh=true` argument override instead of prompting every time                    |
| Strengthen bookkeeping commit enforcement           | oat-project-implement | Bookkeeping commits are already marked `(required)` but agents sometimes skip them; elevate to top-level step with DO NOT SKIP callout |

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

Add workflow preference types, config registry entries, and CLI support.

### Task p01-t01: Add OatWorkflowConfig interface and extend OatConfig

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`

**Changes:**

1. Add `OatWorkflowConfig` interface with all preference keys:

   ```typescript
   export interface OatWorkflowConfig {
     hillCheckpointDefault?: 'every' | 'final';
     archiveOnComplete?: boolean;
     createPrOnComplete?: boolean;
     postImplementSequence?: 'all' | 'summary-pr' | 'exit';
     reviewExecutionModel?: 'subagent' | 'fresh-session' | 'inline';
     autoNarrowReReviewScope?: boolean;
     autoFixBookkeepingDrift?: boolean;
   }
   ```

2. Add `workflow?: OatWorkflowConfig` to the `OatConfig` interface

3. Add `workflow?: OatWorkflowConfig` to the `OatLocalConfig` interface (for per-developer overrides)

4. Update `normalizeOatConfig()` to normalize the `workflow` object (trim strings, validate enum values, coerce booleans)

5. Update `normalizeOatLocalConfig()` similarly

**Step 1: Write test (RED)**

Add test cases in the config normalization test file for:

- Valid workflow config passes through
- Invalid enum values are stripped
- Boolean coercion works
- Missing workflow key returns undefined

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Add the interface and normalization logic.

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Test passes (GREEN)

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/*.test.ts
git commit -m "feat(p01-t01): add OatWorkflowConfig interface and normalization"
```

---

### Task p01-t02: Register workflow keys in config command

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`

**Changes:**

1. Add all `workflow.*` keys to the `ConfigKey` union type
2. Add entries to `KEY_ORDER` array
3. Add `CONFIG_CATALOG` entries with full metadata (group, file, scope, type, default, mutability, owningCommand, description)
4. Extend `getConfigValue()` to resolve `workflow.*` keys with local-over-shared precedence:
   - Read `.oat/config.local.json` workflow.\* first
   - Fall back to `.oat/config.json` workflow.\*
   - Fall back to undefined (= prompt)
5. Extend `setConfigValue()` to handle workflow.\* keys:
   - Boolean keys: string→boolean coercion
   - Enum keys: validate against allowed values, reject invalid
   - Determine target file: local by default (user preference), shared with `--shared` flag or if key is inherently shared

**Step 1: Write test (RED)**

Add tests for:

- `oat config get workflow.archiveOnComplete` resolves correctly (local > shared > unset)
- `oat config set workflow.archiveOnComplete true` writes to local config
- `oat config set workflow.hillCheckpointDefault final` validates enum
- `oat config set workflow.hillCheckpointDefault invalid` rejects
- `oat config list` includes workflow keys
- `oat config describe workflow.archiveOnComplete` shows metadata

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Add registry entries and resolution logic.

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests pass (GREEN)

**Step 3: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "feat(p01-t02): register workflow preference keys in config command"
```

---

### Task p01-t03: Resolution precedence — local overrides shared for workflow keys

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`

**Changes:**

The `getConfigValue()` function needs a resolution path for workflow keys:

1. Check `.oat/config.local.json` `workflow.<subkey>` first
2. Fall back to `.oat/config.json` `workflow.<subkey>`
3. Return `{ value: undefined, source: 'default' }` if neither is set

This means `oat config set workflow.archiveOnComplete true` writes to `config.local.json` by default (personal preference), while `oat config set workflow.archiveOnComplete true --shared` writes to `config.json` (team default).

**Note:** This may be merged into p01-t02 if the resolution logic is straightforward to include there. Keep as separate task for clarity.

**Step 1: Write test (RED)**

Test the full precedence chain:

- Local set, shared set → local wins
- Local unset, shared set → shared wins
- Both unset → returns undefined/default

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

Implement the resolution chain.

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: Tests pass (GREEN)

**Step 3: Commit**

```bash
git add packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "feat(p01-t03): add local-over-shared resolution for workflow keys"
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

**Step 1: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p02-t01): read workflow.hillCheckpointDefault before checkpoint prompt"
```

---

### Task p02-t02: Post-implementation sequence preference

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Changes:**

In Step 15 (next steps sequence), before presenting the 3-option prompt:

```
POST_IMPL=$(oat config get workflow.postImplementSequence 2>/dev/null || true)
```

- If `"all"` → run summary + docs + PR automatically
- If `"summary-pr"` → run summary + PR, skip docs
- If `"exit"` → exit (user will run individually)
- If unset → prompt as before

Print: "Post-implementation: {chosen} (from config)" when using preference.

**Step 1: Commit**

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

- If `"subagent"` → dispatch subagent directly
- If `"fresh-session"` → instruct fresh session
- If `"inline"` → run inline
- If unset → prompt as before

**Step 1: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p02-t03): read workflow.reviewExecutionModel before review tier prompt"
```

---

### Task p02-t04: Auto-fix bookkeeping drift preference

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Changes:**

In Step 3, before stale-state reconciliation prompt:

```
AUTO_FIX=$(oat config get workflow.autoFixBookkeepingDrift 2>/dev/null || true)
```

- If `"true"` → auto-fix and print "Auto-fixed bookkeeping drift (from config)"
- If unset → prompt as before

**Step 1: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p02-t04): read workflow.autoFixBookkeepingDrift before drift prompt"
```

---

### Task p02-t05: Change resume to default behavior (no prompt)

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Changes:**

In Step 3, replace the "Resume from {task_id}, or start fresh?" prompt:

- **New default:** Always resume from the resolved task pointer. Print "Resuming from {task_id}." (no prompt).
- **Fresh start:** Only available as an explicit argument (e.g., `oat-project-implement fresh=true`). When passed, warn "Starting fresh — this will overwrite implementation.md" and proceed without asking.
- Remove the interactive choice entirely from normal flow.

**Step 1: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "fix(p02-t05): always resume implementation by default, drop fresh-start prompt"
```

---

### Task p02-t06: Strengthen bookkeeping commit enforcement

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

**Step 1: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "fix(p02-t06): strengthen bookkeeping commit enforcement with DO NOT SKIP callouts"
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

**Step 1: Commit**

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

**Step 1: Commit**

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

**Step 1: Commit**

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

**Step 1: Commit**

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

**Step 1: Commit**

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

**Step 1: Identify source doc files**

Find the actual source files in `apps/oat-docs/` that correspond to the bundled docs.

**Step 2: Update source docs**

Add workflow preferences documentation.

**Step 3: Commit**

```bash
git add apps/oat-docs/
git commit -m "docs(p05-t01): document workflow preference config keys"
```

---

### Task p05-t02: Add `oat config describe` metadata for all workflow keys

**Files:**

- (Already covered in p01-t02, but verify completeness here)

**Verify:** Run `oat config describe` and confirm all workflow keys appear with:

- Correct group ("Shared Repo" or "Repo Local" depending on surface)
- Accurate descriptions
- Correct type annotations
- Correct default values
- Correct owning command (`oat config set`)

---

## Reviews

| Scope | Type | Status  | Date | Artifact |
| ----- | ---- | ------- | ---- | -------- |
| p01   | code | pending | -    | -        |
| p02   | code | pending | -    | -        |
| p03   | code | pending | -    | -        |
| p04   | code | pending | -    | -        |
| p05   | code | pending | -    | -        |
| final | code | pending | -    | -        |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - Config system extension (types, registry, resolution)
- Phase 2: 6 tasks - Skill integration for oat-project-implement (4 config prefs + resume default change + bookkeeping enforcement)
- Phase 3: 2 tasks - Skill integration for oat-project-complete
- Phase 4: 3 tasks - Review skill integration (1 config pref + 2 bookkeeping commit fixes for review-receive and review-receive-remote)
- Phase 5: 2 tasks - Documentation updates

**Total: 16 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Config types: `packages/cli/src/config/oat-config.ts`
- Config command: `packages/cli/src/commands/config/index.ts`
- Skills: `.agents/skills/oat-project-implement/SKILL.md`, `.agents/skills/oat-project-complete/SKILL.md`, `.agents/skills/oat-project-pr-final/SKILL.md`, `.agents/skills/oat-project-review-provide/SKILL.md`, `.agents/skills/oat-project-review-receive/SKILL.md`, `.agents/skills/oat-project-review-receive-remote/SKILL.md`
