---
oat_generated: true
oat_generated_at: 2026-04-13
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: /Users/thomas.stang/.codex/worktrees/bf36/open-agent-toolkit/.oat/projects/shared/claude-instructions-sync
---

# Code Review: final

**Reviewed:** 2026-04-13
**Scope:** final code review for `6d4e274325d9d21c4e42062ff94dc970a275ccde..HEAD`
**Files reviewed:** final project diff, Phase 6 fix paths, docs, tests, and project artifacts
**Result:** failed

## Summary

Reviewed the final project diff and prior archived review context through `final-review-2026-04-13-v3.md`. Phase 6 fixes the two v3 findings for the covered cases: a broken `AGENTS.md` symlink paired with pointer `CLAUDE.md` no longer validates as healthy, and non-default validate guidance now preserves the selected strategy.

One remaining scanner edge case still produces a false clean validation result: a dangling canonical `AGENTS.md` symlink with no sibling `CLAUDE.md` is dropped from the scan entirely.

## Findings

### Critical

None

### Important

- **Dangling canonical `AGENTS.md` symlinks without `CLAUDE.md` are invisible to validation** (`packages/cli/src/commands/instructions/instructions.utils.ts:189`)
  - Issue: `scanInstructionDirectories` now preserves broken `CLAUDE.md` symlinks when `stat()` fails with `ENOENT`, but it still skips broken `AGENTS.md` symlinks. Phase 6 covers the case where a sibling `CLAUDE.md` causes the directory to surface as `stray`, but if the directory only contains `AGENTS.md -> missing.md`, the scanner records no entry at all.
  - Impact: `oat instructions validate` reports `status: "ok"` with `scanned: 0`, and `oat instructions sync --dry-run` reports no changes, even though a canonical instruction path exists and is unreadable. That leaves a broken `AGENTS.md` source of truth unreported and unrepaired.
  - Reproduction:

    ```bash
    tmp=$(mktemp -d)
    git init -q "$tmp"
    mkdir -p "$tmp/docs"
    ln -s missing-AGENTS.md "$tmp/docs/AGENTS.md"
    pnpm run cli -- --cwd "$tmp/docs" --json instructions validate
    ```

    Observed: JSON payload has `status: "ok"`, `summary.scanned: 0`, and no entries.

  - Fix: Preserve or explicitly classify dangling `AGENTS.md` symlinks during scan rather than skipping them. A suitable result would be a drift entry that points at the canonical `AGENTS.md` path with an unreadable/broken symlink detail, plus regression coverage for dangling `AGENTS.md` without a sibling `CLAUDE.md`.

### Medium

None

### Minor

None

## Requirements/Design Alignment

| Requirement                                   | Status      | Notes                                                                                                                                            |
| --------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project-scoped `AGENTS.md` / `CLAUDE.md` sync | partial     | Main pair/adoption behavior is implemented, but a dangling canonical `AGENTS.md` path can be missed entirely when no sibling `CLAUDE.md` exists. |
| Pointer, symlink, and copy strategies         | implemented | Strategy selection, validation, sync, and validate guidance are covered.                                                                         |
| Claude-only stray adoption                    | implemented | Pointer, symlink, and copy adoption flows are covered.                                                                                           |
| Nested tree support with exclusions           | implemented | Mixed nested-tree coverage exists.                                                                                                               |
| Prior v3 findings                             | partial     | The exact v3 repros are fixed, but the broken-canonical-symlink gap remains for the no-`CLAUDE.md` variant.                                      |

## Verification Commands

```bash
pnpm test
```

Result: passed. Turbo reported 8 successful tasks; the CLI package reported 148 test files and 1199 tests passed.

Manual reproduction:

```bash
tmp=$(mktemp -d)
git init -q "$tmp"
mkdir -p "$tmp/docs"
ln -s missing-AGENTS.md "$tmp/docs/AGENTS.md"
pnpm run cli -- --cwd "$tmp/docs" --json instructions validate
pnpm run cli -- --cwd "$tmp/docs" instructions sync --dry-run
```

Observed: validation reports `ok` with `scanned=0`, and dry-run reports no entries or actions.

## Recommended Next Step

Run `oat-project-review-receive` to convert the Important finding into a review-fix task before finalizing the project.
