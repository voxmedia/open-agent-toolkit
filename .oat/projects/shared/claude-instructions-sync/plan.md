---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-13
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03'] # phases to pause AFTER completing (empty = every phase)
oat_auto_review_at_checkpoints: true
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
oat_template: false
oat_template_name: plan
---

# Implementation Plan: claude-instructions-sync

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Add project-scoped `AGENTS.md` / `CLAUDE.md` sync and Claude-only adoption to the `oat instructions` workflow, with nested directory support and pointer, symlink, and copy strategies.

**Architecture:** Extend the existing instructions scan/report/apply flow so it can discover both file types, classify per-directory states, and execute strategy-aware repairs or adoptions without moving the feature into the provider-sync manifest engine.

**Tech Stack:** TypeScript, Commander, Vitest, OAT CLI command layer

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Confirmed quick workflow and project-only first-release scope
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Model Discovery And Strategy State

### Task p01-t01: Expand instruction scan state for paired and stray files

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.types.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.test.ts`

**Step 1: Write test (RED)**

Add failing unit tests that cover:

- directories with `AGENTS.md` only
- directories with `CLAUDE.md` only
- directories with both files but non-matching strategy/content
- nested project scanning with existing exclusions preserved

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Update instruction scan types and utility functions so the command layer can report strategy-aware pair state and adoptable Claude-only stray state for project scope.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Simplify state normalization and report formatting so later sync/apply changes consume a stable instruction entry model.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.types.ts \
  packages/cli/src/commands/instructions/instructions.utils.ts \
  packages/cli/src/commands/instructions/instructions.utils.test.ts
git commit -m "feat(p01-t01): model instruction pair states"
```

---

### Task p01-t02: Add project-scoped strategy selection to the instructions commands

**Files:**

- Modify: `packages/cli/src/commands/instructions/validate/validate.ts`
- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.types.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

Add failing command tests for project-only strategy selection and reporting behavior in validate/sync flows.

**Step 2: Implement (GREEN)**

Add command options or config plumbing for `pointer`, `symlink`, and `copy`, and ensure validate/sync consume the same strategy resolution path for repo-scoped instruction files.

**Step 3: Refactor**

Consolidate shared option parsing and keep JSON/plain-text output stable where possible.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions`
Expected: Updated command tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions \
  packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t02): add instruction sync strategy selection"
```

---

## Phase 2: Implement Sync And Adoption Behavior

### Task p02-t01: Implement strategy-aware `CLAUDE.md` repair and generation

**Files:**

- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.types.ts`
- Modify: `packages/cli/src/fs/io.ts` (only if helper coverage is required)
- Modify: `packages/cli/src/commands/instructions/sync/sync.test.ts`

**Step 1: Write test (RED)**

Add failing sync tests for:

- pointer file creation/update
- file symlink creation/update
- hard-copy creation/update
- force-required overwrite behavior where destructive repair is needed

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Update sync planning and apply logic so `CLAUDE.md` can be created or repaired using the selected strategy instead of the current pointer-only write path.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Extract shared file-write/link-repair helpers as needed so strategy-specific behavior is explicit and reusable.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions/sync/sync.ts \
  packages/cli/src/commands/instructions/instructions.types.ts \
  packages/cli/src/fs/io.ts \
  packages/cli/src/commands/instructions/sync/sync.test.ts
git commit -m "feat(p02-t01): implement instruction sync strategies"
```

---

### Task p02-t02: Implement Claude-only stray adoption into canonical `AGENTS.md`

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.integration.test.ts`
- Modify: `packages/cli/src/commands/instructions/sync/sync.test.ts`

**Step 1: Write test (RED)**

Add failing tests for directories containing only `CLAUDE.md`, including safe adoption, overwrite/conflict handling, and post-adoption regeneration of `CLAUDE.md`.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.integration.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Implement project-scoped adoption so Claude-only stray files can be converted into canonical `AGENTS.md` content and then re-synced to `CLAUDE.md` with the requested strategy.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.integration.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Align adoption terminology, JSON payloads, and plain-text summaries so adoptable states and applied actions are easy to interpret.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions`
Expected: All instruction command tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.utils.ts \
  packages/cli/src/commands/instructions/sync/sync.ts \
  packages/cli/src/commands/instructions/instructions.integration.test.ts \
  packages/cli/src/commands/instructions/sync/sync.test.ts
git commit -m "feat(p02-t02): adopt claude instruction strays"
```

---

## Phase 3: Finish Coverage And Documentation

### Task p03-t01: Add end-to-end coverage for nested project directories

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.integration.test.ts`
- Modify: `packages/cli/src/commands/instructions/validate/validate.test.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.test.ts`

**Step 1: Write test (RED)**

Add failing integration cases for nested directories using mixed valid pairs, drifted pairs, excluded directories, and adoptable strays in the same repo tree.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.integration.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Fix remaining scan/report gaps and ensure project-only recursion behaves consistently across validate and sync.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions`
Expected: All targeted tests pass

**Step 3: Refactor**

Remove duplicate fixture setup and keep integration scenarios concise.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test`
Expected: CLI package test suite passes

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions
git commit -m "test(p03-t01): cover nested instruction sync flows"
```

---

### Task p03-t02: Update docs and help text for strategy-aware project sync

**Files:**

- Modify: `apps/oat-docs/docs/provider-sync/commands.md`
- Modify: `apps/oat-docs/docs/provider-sync/scope-and-surface.md`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write test (RED)**

Update or add failing help snapshot expectations for the revised `oat instructions` command surface.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/help-snapshots.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

Document the new project-only behavior, supported strategies, and Claude-only adoption semantics, then refresh help snapshots.

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/help-snapshots.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Keep docs language aligned with the actual command behavior and avoid describing deferred user-scope support as implemented.

**Step 4: Verify**

Run: `pnpm lint && pnpm type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add apps/oat-docs/docs/provider-sync/commands.md \
  apps/oat-docs/docs/provider-sync/scope-and-surface.md \
  packages/cli/src/commands/help-snapshots.test.ts
git commit -m "docs(p03-t02): document instruction sync strategies"
```

---

## Phase 4: Review Fixes From Final Review

### Task p04-t01: (review) Remove recursive deletion from instruction cleanup

**Files:**

- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`
- Modify: `packages/cli/src/commands/instructions/sync/sync.test.ts`

**Step 1: Understand the issue**

Review finding: `removeFile` currently uses `rm(path, { force: true, recursive: true })`, which is broader than needed for a file or symlink target.
Location: `packages/cli/src/commands/instructions/sync/sync.ts:35-37`

**Step 2: Implement fix**

Drop `recursive: true` from the default cleanup path and keep targeted test coverage aligned with the narrower delete behavior.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
Expected: Targeted sync tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/instructions/sync/sync.ts \
  packages/cli/src/commands/instructions/sync/sync.test.ts
git commit -m "fix(p04-t01): narrow instruction cleanup deletion"
```

### Task p04-t02: (review) Add copy-strategy stray adoption integration coverage

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.integration.test.ts`

**Step 1: Understand the issue**

Review finding: stray adoption is covered for pointer and symlink regeneration, but not for `--strategy copy`.
Location: `packages/cli/src/commands/instructions/instructions.integration.test.ts:235-314`

**Step 2: Implement fix**

Add a real-filesystem integration case for `oat instructions sync --strategy copy` that asserts adopted `AGENTS.md` content and regenerated `CLAUDE.md` copy content remain byte-for-byte aligned.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.integration.test.ts`
Expected: Integration suite passes with copy-strategy adoption coverage

**Step 4: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.integration.test.ts
git commit -m "test(p04-t02): cover copy-based stray adoption"
```

### Task p04-t03: (review) Separate scan diagnostics for Claude and AGENTS read failures

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.test.ts`

**Step 1: Understand the issue**

Review finding: the shared copy-mode catch block can mislabel `AGENTS.md` or `readlink` failures as `CLAUDE.md missing`.
Location: `packages/cli/src/commands/instructions/instructions.utils.ts:286-327`

**Step 2: Implement fix**

Split `CLAUDE.md`, `AGENTS.md`, and symlink-read failure handling so scan results report the correct detail for each failure mode.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
Expected: Utility tests pass with distinct failure reporting coverage

**Step 4: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.utils.ts \
  packages/cli/src/commands/instructions/instructions.utils.test.ts
git commit -m "fix(p04-t03): clarify instruction scan read errors"
```

### Task p04-t04: (review) Update instructions help text for strategy-aware drift repair

**Files:**

- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`
- Modify: `packages/cli/src/commands/instructions/validate/validate.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Understand the issue**

Review finding: help text still describes pointer-only drift even though validate/sync now support pointer, symlink, copy, and stray adoption workflows.
Location: `packages/cli/src/commands/instructions/sync/sync.ts:258`

**Step 2: Implement fix**

Refresh the command descriptions to match the current strategy-aware behavior and update the corresponding help snapshots.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/help-snapshots.test.ts`
Expected: Help snapshot tests pass with updated wording

**Step 4: Commit**

```bash
git add packages/cli/src/commands/instructions/sync/sync.ts \
  packages/cli/src/commands/instructions/validate/validate.ts \
  packages/cli/src/commands/help-snapshots.test.ts
git commit -m "docs(p04-t04): refresh instruction command help"
```

### Task p04-t05: (review) Refresh provider-sync scope docs for strategy-aware instructions

**Files:**

- Modify: `apps/oat-docs/docs/provider-sync/scope-and-surface.md`

**Step 1: Understand the issue**

Review finding: `scope-and-surface.md` still describes pointer integrity only and does not mention the shipped strategy-aware instruction sync behavior.
Location: `apps/oat-docs/docs/provider-sync/scope-and-surface.md:10,56`

**Step 2: Implement fix**

Update the provider-sync scope documentation so it describes pointer, symlink, copy, and Claude-only adoption behavior consistently with the CLI.

**Step 3: Verify**

Run: `pnpm build:docs`
Expected: Docs build passes with the refreshed scope page

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/provider-sync/scope-and-surface.md
git commit -m "docs(p04-t05): refresh provider sync scope docs"
```

### Task p04-t06: (review) Clarify scan dependency typing boundaries

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.types.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
- Modify: `packages/cli/src/commands/instructions/validate/validate.ts`
- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`

**Step 1: Understand the issue**

Review finding: `InstructionsScanDependencies.strategy` mixes configuration with injected I/O dependencies, which muddies the scan contract.
Location: `packages/cli/src/commands/instructions/instructions.types.ts:66`

**Step 2: Implement fix**

Separate scan configuration from dependency injection so strategy selection is passed as options rather than as a pseudo-dependency.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: Instruction command tests and type-check pass with the clarified interface

**Step 4: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.types.ts \
  packages/cli/src/commands/instructions/instructions.utils.ts \
  packages/cli/src/commands/instructions/validate/validate.ts \
  packages/cli/src/commands/instructions/sync/sync.ts
git commit -m "refactor(p04-t06): separate instruction scan options"
```

### Task p04-t07: (review) Harden symlink validation against canonical path differences

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.test.ts`

**Step 1: Understand the issue**

Review finding: raw-string symlink target comparison can misclassify valid links when repo-root and resolved paths differ only by canonicalization.
Location: `packages/cli/src/commands/instructions/instructions.utils.ts:256-272`

**Step 2: Implement fix**

Normalize the compared paths through a canonicalization-safe check and add regression coverage for non-identical but equivalent root strings.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
Expected: Utility tests pass with canonical-path symlink coverage

**Step 4: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.utils.ts \
  packages/cli/src/commands/instructions/instructions.utils.test.ts
git commit -m "fix(p04-t07): harden instruction symlink validation"
```

### Task p04-t08: (review) Surface partial stray-adoption failures clearly

**Files:**

- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`
- Modify: `packages/cli/src/commands/instructions/sync/sync.test.ts`

**Step 1: Understand the issue**

Review finding: if Claude regeneration fails after stray adoption creates `AGENTS.md`, the operator gets no direct context about the half-applied state.
Location: `packages/cli/src/commands/instructions/sync/sync.ts:167-200`

**Step 2: Implement fix**

Wrap post-adoption repair failures with a clearer error that states `AGENTS.md` was already created and `CLAUDE.md` regeneration needs follow-up.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
Expected: Targeted sync tests pass with partial-adoption error coverage

**Step 4: Commit**

```bash
git add packages/cli/src/commands/instructions/sync/sync.ts \
  packages/cli/src/commands/instructions/sync/sync.test.ts
git commit -m "fix(p04-t08): clarify partial stray adoption failures"
```

### Task p04-t09: (review) Guard against AGENTS races during stray adoption

**Files:**

- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`
- Modify: `packages/cli/src/commands/instructions/sync/sync.test.ts`

**Step 1: Understand the issue**

Review finding: a new `AGENTS.md` can appear between scan and apply, and the current adoption path will overwrite it without re-checking.
Location: `packages/cli/src/commands/instructions/sync/sync.ts:167-177`

**Step 2: Implement fix**

Add a pre-write guard for the canonical `AGENTS.md` path so sync bails out cleanly when the directory no longer matches the scanned stray state.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
Expected: Targeted sync tests pass with the stray-race guard coverage

**Step 4: Commit**

```bash
git add packages/cli/src/commands/instructions/sync/sync.ts \
  packages/cli/src/commands/instructions/sync/sync.test.ts
git commit -m "fix(p04-t09): guard stray adoption races"
```

### Task p04-t10: (review) Remove redundant post-sync guard

**Files:**

- Modify: `packages/cli/src/commands/instructions/sync/sync.ts`

**Step 1: Understand the issue**

Review finding: `getPostSyncEntries` has a redundant `action.type !== 'skip'` guard because `result === 'applied'` already excludes skipped actions.
Location: `packages/cli/src/commands/instructions/sync/sync.ts:228-232`

**Step 2: Implement fix**

Delete the unreachable conditional branch and keep the post-sync status computation semantically identical.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/sync/sync.test.ts`
Expected: Targeted sync tests still pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/instructions/sync/sync.ts
git commit -m "refactor(p04-t10): simplify post-sync guard"
```

### Task p04-t11: (review) Detect broken Claude symlinks during instruction scans

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.test.ts`

**Step 1: Understand the issue**

Review finding: the pre-filter can silently drop broken `CLAUDE.md` symlinks, leaving an otherwise-empty directory invisible to validate.
Location: `packages/cli/src/commands/instructions/instructions.utils.ts:175-200`

**Step 2: Implement fix**

Preserve broken instruction symlink candidates through the scan so the later classification pass can report them instead of dropping the directory.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
Expected: Utility tests pass with broken-symlink coverage

**Step 4: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.utils.ts \
  packages/cli/src/commands/instructions/instructions.utils.test.ts
git commit -m "fix(p04-t11): surface broken claude symlinks"
```

---

## Phase 5: Review Fixes From Independent Final Re-Review

### Task p05-t01: (review) Surface unreadable Claude files during validation

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.test.ts`

**Step 1: Understand the issue**

Review finding: non-`ENOENT` `CLAUDE.md` read failures in pointer/copy-mode validation can be omitted from scan results entirely.
Location: `packages/cli/src/commands/instructions/instructions.utils.ts:351`

**Step 2: Implement fix**

Record non-`ENOENT` `CLAUDE.md` read failures as `content_mismatch` entries with explicit detail text, and add regression coverage for an unreadable Claude file.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- packages/cli/src/commands/instructions/instructions.utils.test.ts`
Expected: Utility tests pass with unreadable-Claude coverage

**Step 4: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.utils.ts \
  packages/cli/src/commands/instructions/instructions.utils.test.ts
git commit -m "fix(p05-t01): report unreadable claude files"
```

### Task p05-t02: (review) Correct troubleshooting preview guidance

**Files:**

- Modify: `apps/oat-docs/docs/reference/troubleshooting.md`

**Step 1: Understand the issue**

Review finding: the troubleshooting page tells users to run `oat instructions sync` to preview changes, but preview requires `--dry-run`.
Location: `apps/oat-docs/docs/reference/troubleshooting.md:32`

**Step 2: Implement fix**

Update the troubleshooting guidance so preview uses `oat instructions sync --dry-run`, and keep apply/force guidance explicit and non-destructive.

**Step 3: Verify**

Run: `pnpm build:docs`
Expected: Docs build passes with corrected preview guidance

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/reference/troubleshooting.md
git commit -m "docs(p05-t02): fix troubleshooting preview command"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status          | Date       | Artifact                                       |
| ------ | -------- | --------------- | ---------- | ---------------------------------------------- |
| p01    | code     | pending         | -          | -                                              |
| p02    | code     | pending         | -          | -                                              |
| p03    | code     | pending         | -          | -                                              |
| final  | code     | fixes_completed | 2026-04-13 | reviews/archived/final-review-2026-04-13-v2.md |
| spec   | artifact | pending         | -          | -                                              |
| design | artifact | pending         | -          | -                                              |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - model instruction scan state and strategy selection
- Phase 2: 2 tasks - implement sync strategies and Claude-only adoption
- Phase 3: 2 tasks - finish nested-flow coverage and user-facing docs
- Phase 4: 11 tasks - address final review fixes before re-review
- Phase 5: 2 tasks - address independent final re-review findings

**Total: 19 tasks**

Independent final re-review findings were fixed. Re-run final code review before merge.

---

## References

- Design: not required for this quick-mode project
- Spec: not required for this quick-mode project
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md` (when `oat_plan_source: imported`)
