---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-02-21
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_source: imported
oat_import_reference: references/imported-plan.md
oat_import_source_path: /Users/thomas.stang/.claude/plans/hazy-whistling-blossom.md
oat_import_provider: claude
oat_generated: false
---

# Implementation Plan: Add GitHub Copilot and Gemini CLI Providers

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Add GitHub Copilot and Gemini CLI as supported OAT sync providers, and enable user-scope agent sync for all providers.

**Architecture:** Declarative `ProviderAdapter` pattern — each provider is a small adapter (3 files) with path mappings and detection logic, registered in command files.

**Tech Stack:** TypeScript ESM, Vitest, pnpm workspaces

**Commit Convention:** `feat({scope}): {description}` - e.g., `feat(p01-t01): add Gemini CLI provider adapter`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: New Provider Adapters

### Task p01-t01: Create Gemini CLI provider (nativeRead: true)

Follows the Codex pattern — Gemini reads `.agents/skills/` and `.agents/agents/` natively at both workspace and user scopes.

**Files:**
- Create: `packages/cli/src/providers/gemini/paths.ts`
- Create: `packages/cli/src/providers/gemini/adapter.ts`
- Create: `packages/cli/src/providers/gemini/index.ts`
- Create: `packages/cli/src/providers/gemini/adapter.test.ts`

**Reference:** `packages/cli/src/providers/codex/` (same `nativeRead: true` pattern)

**Step 1: Write test (RED)**

Create `adapter.test.ts` following the Codex test pattern:
- Test `name` is `'gemini'` and `displayName` is `'Gemini CLI'`
- Test project mappings: skills + agents both `nativeRead: true`, `providerDir === canonicalDir`
- Test user mappings: same pattern
- Test `detect()` returns true when `.gemini/` exists
- Test `detect()` returns false when `.gemini/` doesn't exist

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/gemini/adapter.test.ts`
Expected: Test fails (RED) — files don't exist yet

**Step 2: Implement (GREEN)**

`paths.ts`:
- `GEMINI_PROJECT_MAPPINGS`: skill + agent, both `nativeRead: true`, `providerDir: '.agents/skills'` / `'.agents/agents'`
- `GEMINI_USER_MAPPINGS`: skill + agent, both `nativeRead: true`

`adapter.ts`:
- `detectGemini()`: check for `.gemini/` directory
- `geminiAdapter`: name `'gemini'`, displayName `'Gemini CLI'`, defaultStrategy `'auto'`

`index.ts`: re-export adapter + mappings

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/gemini/adapter.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/providers/gemini/
git commit -m "feat(p01-t01): add Gemini CLI provider adapter"
```

---

### Task p01-t02: Create GitHub Copilot provider (nativeRead: false)

Follows the Claude/Cursor pattern — Copilot has its own native paths that need symlink/copy sync.

**Files:**
- Create: `packages/cli/src/providers/copilot/paths.ts`
- Create: `packages/cli/src/providers/copilot/adapter.ts`
- Create: `packages/cli/src/providers/copilot/index.ts`
- Create: `packages/cli/src/providers/copilot/adapter.test.ts`

**Reference:** `packages/cli/src/providers/claude/` (same `nativeRead: false` pattern)

**Step 1: Write test (RED)**

Create `adapter.test.ts` following the Claude test pattern:
- Test `name` is `'copilot'` and `displayName` is `'GitHub Copilot'`
- Test project mappings: skills → `.github/skills`, agents → `.github/agents`, both `nativeRead: false`
- Test user mappings: skills → `.copilot/skills`, agents → `.copilot/agents`, both `nativeRead: false`
- Test `detect()` returns true when `.github/copilot-instructions.md` exists
- Test `detect()` returns true when `.github/agents/` exists
- Test `detect()` returns true when `.github/skills/` exists
- Test `detect()` returns false when only bare `.github/` exists (no Copilot markers)

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/copilot/adapter.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

`paths.ts`:
- `COPILOT_PROJECT_MAPPINGS`: skills `.agents/skills` → `.github/skills`, agents `.agents/agents` → `.github/agents`
- `COPILOT_USER_MAPPINGS`: skills `.agents/skills` → `.copilot/skills`, agents `.agents/agents` → `.copilot/agents`

`adapter.ts`:
- `detectCopilot()`: check for `.github/copilot-instructions.md` OR `.github/agents/` OR `.github/skills/` (`.github/` alone is too broad)
- `copilotAdapter`: name `'copilot'`, displayName `'GitHub Copilot'`, defaultStrategy `'symlink'`

`index.ts`: re-export adapter + mappings

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/copilot/adapter.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/providers/copilot/
git commit -m "feat(p01-t02): add GitHub Copilot provider adapter"
```

---

## Phase 2: User-Scope Agents + Registration

### Task p02-t01: Enable user-scope agent mappings for all providers

The contract test currently enforces that user mappings contain only `skill` content type. Relax this constraint and add user-scope agent mappings to all providers.

**Files:**
- Modify: `packages/cli/src/providers/shared/adapter-contract.test.ts` — Relax "no agents in user mappings" assertion
- Modify: `packages/cli/src/providers/claude/paths.ts` — Add agent to `CLAUDE_USER_MAPPINGS`
- Modify: `packages/cli/src/providers/cursor/paths.ts` — Add agent to `CURSOR_USER_MAPPINGS`
- Modify: `packages/cli/src/providers/claude/adapter.test.ts` — Update expected user mappings
- Modify: `packages/cli/src/providers/cursor/adapter.test.ts` — Update expected user mappings

Note: Codex and Gemini already have user-scope agent mappings via `nativeRead: true` (pointing at `.agents/agents`). Copilot already has user-scope agents in its mappings from p01-t02.

**Step 1: Write test (RED)**

Update contract test to allow agent content type in user mappings. Update Claude and Cursor adapter tests to expect agent in user mappings.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/`
Expected: Tests fail — Claude/Cursor paths don't include user-scope agents yet

**Step 2: Implement (GREEN)**

- `packages/cli/src/providers/claude/paths.ts`: Add `{ contentType: 'agent', canonicalDir: '.agents/agents', providerDir: '.claude/agents', nativeRead: false }` to `CLAUDE_USER_MAPPINGS`
- `packages/cli/src/providers/cursor/paths.ts`: Add `{ contentType: 'agent', canonicalDir: '.agents/agents', providerDir: '.cursor/agents', nativeRead: false }` to `CURSOR_USER_MAPPINGS`

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/providers/
git commit -m "feat(p02-t01): enable user-scope agent sync for all providers"
```

---

### Task p02-t02: Register new providers in command files

Add imports and append new adapters to adapter arrays in all 7 command files.

**Files:**
- Modify: `packages/cli/src/commands/init/index.ts`
- Modify: `packages/cli/src/commands/sync/index.ts`
- Modify: `packages/cli/src/commands/providers/list/list.ts`
- Modify: `packages/cli/src/commands/providers/inspect/inspect.ts`
- Modify: `packages/cli/src/commands/providers/set/index.ts`
- Modify: `packages/cli/src/commands/status/index.ts`
- Modify: `packages/cli/src/commands/doctor/index.ts`
- Modify: `packages/cli/src/providers/shared/adapter-contract.test.ts` — Add `geminiAdapter` and `copilotAdapter` to `ADAPTERS` array

**Step 1: Write test (RED)**

Add `geminiAdapter` and `copilotAdapter` to the `ADAPTERS` array in `adapter-contract.test.ts`.

Run: `pnpm --filter @oat/cli test -- --run packages/cli/src/providers/shared/adapter-contract.test.ts`
Expected: Tests fail if imports are missing or adapters aren't properly structured

**Step 2: Implement (GREEN)**

In each of the 7 command files:
- Add `import { copilotAdapter } from '@providers/copilot';`
- Add `import { geminiAdapter } from '@providers/gemini';`
- Append `copilotAdapter, geminiAdapter` to the adapter array

Run: `pnpm --filter @oat/cli test`
Expected: All tests pass (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check && pnpm build`
Expected: No errors

Run: `pnpm run cli -- providers list`
Expected: Shows all 5 providers including Gemini CLI and GitHub Copilot

**Step 5: Commit**

```bash
git add packages/cli/src/commands/ packages/cli/src/providers/shared/adapter-contract.test.ts
git commit -m "feat(p02-t02): register Copilot and Gemini providers in all commands"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| final | code | pending | - | - |
| spec | artifact | pending | - | - |
| design | artifact | pending | - | - |
| plan | artifact | received | 2026-02-21 | reviews/artifact-plan-review-2026-02-21.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**
- Phase 1: 2 tasks - New Gemini and Copilot provider adapters
- Phase 2: 2 tasks - User-scope agents for all providers + command registration

**Total: 4 tasks**

Ready for code review and merge.

---

## References

- Imported Source: `references/imported-plan.md`
- Provider reference: `.agents/docs/provider-reference.md`
- Skills guide: `.agents/docs/skills-guide.md`
- Subagents guide: `.agents/docs/subagents-guide.md`
- Codex adapter (nativeRead pattern): `packages/cli/src/providers/codex/`
- Claude adapter (sync pattern): `packages/cli/src/providers/claude/`
