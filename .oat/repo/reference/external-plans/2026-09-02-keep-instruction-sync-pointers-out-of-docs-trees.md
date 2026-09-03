---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-02-program-intake-triage.md
  - .oat/repo/pjm/backlog/items/BL-260902-keep-pjm-init-provider.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260902-keep-pjm-init-provider
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/238
created: '2026-09-02T23:59:00Z'
---

# Keep instruction-sync pointer files out of documentation content trees

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** Issue #238 attributes the pointer writes to
> `oat pjm init`; on the live tree that command never writes `CLAUDE.md` and
> only prints a hint to run `oat instructions sync`, which is the real writer.
> This plan targets the instruction-sync scan. The doctor half of the issue
> was fixed by PR #244 and is a regression guard here, not new work.

## Outcome

`oat instructions sync` and `oat instructions validate` no longer treat a
documentation content tree as a pointer site. Directories under the configured
`documentation.root` are skipped by default, an explicit opt-out list in
`.oat/config.json` excludes additional paths, both commands apply the same
exclusion so validate never reports drift that sync refuses to fix, and the
`.oat/repo` carve-in keeps working. Docs validators, `oat docs generate-index`,
and MDX builds stay clean after a sync.

## Source and live evidence

- Source backlog item:
  [BL-260902-keep-pjm-init-provider — Keep instruction-sync pointer files out of documentation content trees](../../pjm/backlog/items/BL-260902-keep-pjm-init-provider.md)
- Source issue: [#238](https://github.com/voxmedia/open-agent-toolkit/issues/238)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `packages/cli/src/commands/pjm/init.ts:50-55` — comment and
    `INSTRUCTIONS_SYNC_HINT`: `oat pjm init` never writes `CLAUDE.md` shims;
    ownership stays with `oat instructions sync`.
  - `packages/cli/src/commands/instructions/instructions.utils.ts:27-37` —
    the scan excludes only `node_modules` globally and `.git`/`.oat`/
    `.worktrees` at root, with a `.oat/repo` carve-in; every other directory
    holding an `AGENTS.md` becomes a pointer site.
  - `packages/cli/src/commands/instructions/instructions.utils.ts:155-265` —
    `scanInstructionDirectories` BFS; no docs-tree awareness.
  - `packages/cli/src/commands/instructions/sync/sync.ts:143-151`, `:205+` —
    every `missing` entry becomes a `create` of `@AGENTS.md`.
  - `packages/cli/src/commands/instructions/sync/sync.ts:1-23` — sync imports
    no config module; it cannot see `documentation.root`.
  - `packages/cli/src/commands/instructions/instructions.types.ts:57-60` —
    `InstructionsScanOptions` carries only `strategy` and `debug`; the shared
    `scanInstructionFiles` signature is used by validate too (`:77-81`).
  - `packages/cli/src/commands/pjm/doctor.ts:26-34` — `CLAUDE.md` is already
    an allowed pointer (PR #244).
  - `packages/cli/src/config/oat-config.ts:36-42`, `:1195-1226` —
    `OatDocumentationConfig` exposes `root`; this repository sets
    `root: apps/oat-docs` in `.oat/config.json`.
- Constraining decisions:
  [DR-260217-introduce-oat-config-json](../decisions/DR-260217-introduce-oat-config-json.md)
  (opt-out belongs in `.oat/config.json`, not a new dotfile),
  [DR-260718-tracked-config-guard-rejected](../decisions/DR-260718-tracked-config-guard-rejected.md)
  (skip at write time rather than tolerate after the fact).

## Dependencies

| Type          | Dependency                                                                                        | Required state                                                                   | Current state          |
| ------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------- |
| Satisfied     | [PR #244](https://github.com/voxmedia/open-agent-toolkit/pull/244) doctor pointer acceptance      | Keep `pjm doctor` accepting repo-level pointers.                                 | Merged at `9aef8f81a`. |
| Soft ordering | Sibling plan [Add docs-index exclusions](./2026-09-02-add-exclusions-to-docs-index-generation.md) | Both edit `OatDocumentationConfig` and its parser; sequence, do not parallelize. | Pending.               |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                          | Affected | Files in common                                                                                                                         | Required update                                                                                                               |
| ---------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` merges | Minor    | `pjm/init.ts` (read-only anchor here), `commands/shared/agents-md.ts`, and provider-sync docs pages; not the instructions scan or sync. | Re-run the drift check and re-anchor the `init.ts:50-55` citation; confirm no new pointer writer was added to `agents-md.ts`. |
| `review-plan-workflow` (draft PR #190) merges  | No       | None of the in-scope files.                                                                                                             | None.                                                                                                                         |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- packages/cli/src/commands/pjm/init.ts packages/cli/src/commands/pjm/doctor.ts packages/cli/src/commands/instructions packages/cli/src/commands/shared/agents-md.ts packages/cli/src/config/oat-config.ts .oat/config.json apps/oat-docs/docs/provider-sync/instruction-sync.md apps/oat-docs/docs/provider-sync/commands.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If `pjm/init.ts` now writes pointers, or `scanInstructionFiles` gained an
exclusion option, STOP and refresh this plan.

## Repository conventions

- Build: `pnpm build` → passes. Typecheck: `pnpm type-check` → passes.
- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/instructions src/config/oat-config.test.ts`.
- Lint/format/docs: `pnpm check` → passes.
- Implementation pattern: extend `InstructionsScanOptions` and apply the
  predicate inside `scanInstructionDirectories` so sync and validate share it.
- Git/PR convention: shipped CLI behavior; five-package lockstep bump; do not
  push or open a PR unless instructed.

## Scope

### In scope

- `packages/cli/src/commands/instructions/instructions.types.ts` —
  `excludedPaths?: string[]` on `InstructionsScanOptions`.
- `packages/cli/src/commands/instructions/instructions.utils.ts` —
  repo-relative skip predicate beside the global exclusion check
  (`:186-201`).
- `packages/cli/src/commands/instructions/sync/sync.ts` and
  `validate/validate.ts` — read config and pass exclusions.
- `packages/cli/src/config/oat-config.ts` — parse an explicit opt-out list
  (for example `documentation.instructionPointerExcludes`) beside `root`.
- Tests: `instructions.utils.test.ts`, `sync/sync.test.ts`,
  `validate/validate.test.ts`, `instructions.integration.test.ts`,
  `oat-config.test.ts`.
- Docs: `apps/oat-docs/docs/provider-sync/instruction-sync.md` and
  `provider-sync/commands.md:165`.
- Five public package manifests.

### Out of scope

- `pjm/init.ts` — already pointer-free; do not add pointer logic to it.
- `pjm/doctor.ts` — PR #244 already accepts the repo-level pointers.
- Provider `oat sync` — it does not write pointers.
- Any deletion sweep of existing pointers — issue #238 shows naive sweeps
  destroy legitimate content `CLAUDE.md` files.

## Current state

`createInstructionsSyncCommand` (`sync.ts:339-356`) resolves the project root,
calls `scanInstructionFiles(repoRoot, { strategy })` (`utils:267`), classifies
each directory (`utils:299-450`) as `ok | missing | content_mismatch | stray`,
plans actions (`sync.ts:119`), applies them (`:205`), and builds the payload.
`oat instructions validate` (`validate/validate.ts:53`) shares the scan, so an
exclusion must live in `scanInstructionFiles`. The `.oat/repo` carve-in is the
sharpest interaction: excluding a docs root must never suppress the carve-in.

## Implementation steps

### 1. Add the exclusion option to the scan

Add `excludedPaths` to `InstructionsScanOptions` and a skip predicate in
`scanInstructionDirectories` that compares repo-root-relative paths, evaluated
after the carve-in check so `.oat/repo/**` is still scanned.

**Verify:** `pnpm exec vitest run src/commands/instructions/instructions.utils.test.ts`
→ new exclusion cases pass; existing cases unchanged.

### 2. Add the config surface

In `oat-config.ts:1195-1226` derive the default exclusion from
`documentation.root` and parse an explicit list key; trim and normalize each
entry like the existing string keys.

**Verify:** `pnpm exec vitest run src/config/oat-config.test.ts` → pass.

### 3. Wire sync and validate identically

Resolve config in `sync.ts:372-376` and `validate.ts:53`, pass the merged
exclusions, and keep the human and JSON payloads unchanged except for an
additive `excludedPaths` field.

**Verify:** `pnpm exec vitest run src/commands/instructions/sync/sync.test.ts src/commands/instructions/validate/validate.test.ts`
→ a docs-tree directory produces no `create` action and no drift report.

### 4. Prove it on a fixture tree

Add an integration case with `documentation.root` pointing at a fixture docs
tree containing `AGENTS.md` pages; run sync twice.

**Verify:** `pnpm exec vitest run src/commands/instructions/instructions.integration.test.ts`
→ no pointer under the docs tree, second run is a no-op, `.oat/repo` pointers
present.

### 5. Document and bump

Update the two docs pages; bump the five lockstep packages above fresh
`origin/main`.

**Verify:** `pnpm check` → exit 0; then the eight AGENTS.md gates in order.

## Test plan

Pattern: the existing carve-in scan cases in `instructions.utils.test.ts`.

- `skips directories under documentation.root`.
- `honors an explicit opt-out list`.
- `still scans the .oat/repo carve-in when .oat is excluded`.
- `re-run is idempotent with no create actions`.
- `sync.test.ts`: `plans no create for an excluded docs directory`; `still
plans create for a non-excluded sibling`.
- `pjm/init.test.ts:188` (`exposes a sync next-step hint`) stays green as the
  proof that init remains pointer-free.

## Done criteria

- [ ] Sync and validate skip the configured docs root and opt-out paths and
      agree with each other.
- [ ] The `.oat/repo` carve-in still produces pointers.
- [ ] A fixture docs tree stays free of pointers across repeated syncs.
- [ ] `pjm doctor` still accepts repo-level pointers.
- [ ] Docs, lockstep bump, and all gates pass; `git status --short` is clean.

## STOP conditions

Stop and report instead of improvising when:

- `oat pjm init` on the executor's tree does write pointers (the target moved);
- excluding a docs root would leave `.oat/repo/**` unscanned;
- the opt-out design requires a new dotfile instead of `.oat/config.json`;
- sync and validate cannot share one exclusion path; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #238, and
the instruction-sync tests when substantial time passes, main advances
materially from `49aeb5075971180b48c131bbd2b21b82d455bfc9`, the sibling
docs-index exclusion plan or the truthfulness project lands, cited contracts
change, another PR implements part of the outcome, or a load-bearing claim
cannot be reproduced. Apply the landing-event table above.

## Review focus

- The predicate is evaluated after the carve-in, not before.
- Validate and sync produce consistent results on the same tree.
- No pointer deletion logic was introduced.
