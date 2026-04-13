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
**Files reviewed:** 26
**Commits:** 54 commits in range
**Result:** failed

## Summary

Reviewed the final project diff, active project artifacts, and archived review context through `reviews/archived/final-review-2026-04-13-v4.md`. Phase 7 appears to fix the prior dangling canonical `AGENTS.md` symlink gap: both dangling-`AGENTS.md` cases now surface as drift and sync dry-run reports manual repair rather than silently passing.

I found one remaining Medium issue in the adjacent broken Claude-only symlink path: validation classifies an unreadable `CLAUDE.md` symlink as an adoptable stray, so dry-run advertises a sync plan that apply cannot perform.

## Findings

### Critical

None

### Important

None

### Medium

- **Broken Claude-only symlinks are planned as adoptable strays** (`packages/cli/src/commands/instructions/instructions.utils.ts:191`, `packages/cli/src/commands/instructions/sync/sync.ts:117`)
  - Issue: `scanInstructionDirectories` preserves a dangling `CLAUDE.md` symlink, but the later classification path treats it the same as a readable Claude-only file when no sibling `AGENTS.md` exists. That yields `status: "stray"` and `oat instructions sync --dry-run` plans `create AGENTS.md` plus `update CLAUDE.md`. On apply, the adoption step tries to read the broken symlink as source content and fails with `ENOENT` before writing anything.
  - Impact: The dry-run output is not an accurate preview for this drift state, and the user gets generic filesystem failure instead of actionable "Claude source unreadable; repair manually" guidance. This is less severe than the prior `AGENTS.md` false-clean cases because validation still reports drift and apply does not mutate before failing.
  - Reproduction:

    ```bash
    tmp=$(mktemp -d)
    git init -q "$tmp"
    mkdir -p "$tmp/docs"
    ln -s missing-AGENTS.md "$tmp/docs/CLAUDE.md"
    pnpm run cli -- --cwd "$tmp/docs" instructions sync --dry-run
    pnpm run cli -- --cwd "$tmp/docs" instructions sync
    ```

    Observed: dry-run plans adoption and Claude regeneration; apply fails with `ENOENT: no such file or directory, open '.../docs/CLAUDE.md'`.

  - Fix: Preserve broken `CLAUDE.md` symlinks as visible drift, but classify the no-`AGENTS.md` variant as unreadable/non-adoptable rather than `stray`, or make `sync` convert that detail into a skipped manual-repair action. Add a regression test that asserts dry-run does not plan adoption for a dangling `CLAUDE.md` symlink with no sibling `AGENTS.md`.

### Minor

None

## Requirements/Design Alignment

| Requirement                                   | Status      | Notes                                                                                                                                          |
| --------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Project-scoped `AGENTS.md` / `CLAUDE.md` sync | implemented | Main pair validation, sync, and nested discovery are implemented.                                                                              |
| Pointer, symlink, and copy strategies         | implemented | Strategy selection, validation, sync, and validate fix guidance are covered.                                                                   |
| Claude-only stray adoption                    | partial     | Readable Claude-only files are adopted across strategies, but unreadable/broken Claude-only symlinks are still classified as adoptable strays. |
| Nested tree support with exclusions           | implemented | Existing integration and unit coverage exercise nested discovery and exclusions.                                                               |
| Phase 7 dangling canonical `AGENTS.md` fix    | implemented | Manual reproduction confirms dangling canonical `AGENTS.md` symlinks now surface as drift, including the no-`CLAUDE.md` sibling variant.       |

## Verification Commands

```bash
pnpm test
```

Result: passed. Turbo reported 8 successful tasks; the CLI package reported 148 test files and 1201 tests passed.

Manual checks run during review:

```bash
# Dangling AGENTS.md with no CLAUDE.md now reports drift and manual repair.
# Dangling AGENTS.md with pointer CLAUDE.md now reports drift and manual repair.
# validate --strategy symlink now prints: Fix with: oat instructions sync --strategy symlink
# Dangling CLAUDE.md with no AGENTS.md still dry-runs as adoptable, then apply fails with ENOENT.
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the Medium finding into a review-fix task, or explicitly accept it as deferred if the final release can tolerate this edge case.
