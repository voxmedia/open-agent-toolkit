---
oat_generated: true
oat_generated_at: 2026-03-10
oat_review_scope: final
oat_review_type: code
oat_project: /Users/thomas.stang/Code/open-agent-toolkit/.worktrees/open-agent-toolkit/guided-oat-init/.oat/projects/shared/guided-oat-init
---

# Code Review: final

**Reviewed:** 2026-03-10
**Scope:** Final code review for `04a6117ac4b03ea3146ec89dca4c7965bf5b87d6..HEAD`
**Files reviewed:** 7
**Commits:** 10 commits (`04a6117ac4b03ea3146ec89dca4c7965bf5b87d6..HEAD`)

## Summary

The guided `oat init` flow is largely implemented and the scoped verification commands pass in the target worktree, but one shipped path is broken in real usage: the provider-sync step shells out through this monorepo's dev script instead of the installed `oat` CLI. I also found a requirements-alignment gap in the completion summary and a minor inconsistency in the project tracking artifacts.

## Findings

### Critical

- **Provider sync step is wired to a repo-only dev script and fails in normal target repos** (`packages/cli/src/commands/init/index.ts:331`)
  - Issue: `runProviderSync` executes `pnpm run cli -- sync --scope project` with `cwd` set to the initialized project root. That command only exists in the OAT source workspace root `package.json`, while the published CLI entrypoint is the `oat` binary from `packages/cli/package.json`. In a normal repo being initialized, there is no `package.json` script named `cli`, so confirming the provider-sync step will fail before syncing anything. Reproduced during review with `tmpdir=$(mktemp -d) && cd "$tmpdir" && pnpm run cli -- sync --scope project`, which exits with `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`.
  - Fix: Invoke the installed CLI/runtime instead of the workspace dev script. The safest options are extracting and calling a reusable `runSyncCommand` helper directly, or spawning the current CLI entrypoint (`oat sync --scope project`, or `process.execPath` with the packaged entry module) so the step works outside this repo.
  - Requirement: `p01-t04`

### Important

- **Guided completion summary does not include all required configured items** (`packages/cli/src/commands/init/index.ts:492`)
  - Issue: The plan requires the final summary to report `Providers: {list or "skipped"}` and `Local paths: {count added, count existing}`. The implementation only prints tool packs, a single "`N configured`" local-path count, and provider sync status. The corresponding tests only assert the reduced summary surface (`packages/cli/src/commands/init/index.test.ts:1152`), so this requirements miss is not caught.
  - Fix: Track the selected/enabled provider set from the earlier init phase and include it in the guided summary, and split local-path reporting into added vs already-present counts as specified in `plan.md`. Extend the summary assertions in `index.test.ts` and `guided-setup.test.ts` to cover those exact fields.
  - Requirement: `p01-t04`

### Minor

- **OAT tracking artifacts report conflicting completion state** (`.oat/projects/shared/guided-oat-init/implementation.md:38`)
  - Issue: `implementation.md` shows Phase 1 as `complete` in the progress table but `in_progress` in the phase header, and `state.md` still says `**Status:** Plan Complete` while also saying implementation tasks are complete and final review is pending (`state.md:19`). That inconsistency can confuse resume logic and human reviewers at the handoff point.
  - Suggestion: Normalize the implementation/state status fields after implementation completion so the phase header, top-level status, and progress bullets all reflect the same lifecycle state.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `plan.md`, `implementation.md`, `state.md`, scoped git diff for `04a6117ac4b03ea3146ec89dca4c7965bf5b87d6..HEAD`, changed files under `packages/cli/src/commands/init/`, `packages/cli/src/commands/help-snapshots.test.ts`

**Design alignment:** Not applicable for quick mode because no `design.md` artifact is present.

### Requirements Coverage

| Requirement                                                      | Status      | Notes                                                                                                                                                                        |
| ---------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `p01-t01` Add `--setup` flag and guided entry point              | implemented | `--setup` is registered, fresh init detection is present, and non-interactive mode is guarded.                                                                               |
| `p01-t02` Tool packs guided step                                 | implemented | Guided step calls exported `runInitTools` path through injected dependency with forced project scope.                                                                        |
| `p01-t03` Local paths guided step                                | implemented | Multi-select defaults, delta add, and gitignore update are present and covered by tests.                                                                                     |
| `p01-t04` Provider sync step and summary                         | partial     | Step exists, but default provider sync invocation is broken outside the OAT workspace and the summary omits required provider/local-path detail.                             |
| `p01-t05` Integration coverage for full guided flow              | partial     | Integration tests cover happy/partial/non-interactive flows, but they mock `runProviderSync` and do not verify the real sync invocation or the full required summary fields. |
| Quick-mode success criterion: each guided step is skippable      | implemented | Tool packs, local paths, and provider sync all support skip paths in tests.                                                                                                  |
| Quick-mode success criterion: non-interactive mode is unaffected | implemented | `buildCommandContext()` disables interactivity in JSON mode and guided setup is gated on `context.interactive`.                                                              |

### Extra Work (not in declared requirements)

None.

## Verification Commands

Run these to verify the implementation:

```bash
pnpm --filter @oat/cli test
pnpm lint
pnpm type-check
tmpdir=$(mktemp -d) && cd "$tmpdir" && pnpm run cli -- sync --scope project
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
