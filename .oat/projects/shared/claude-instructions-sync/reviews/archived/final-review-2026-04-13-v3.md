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
**Files reviewed:** 24
**Commits:** 46 commits in range
**Result:** failed

## Summary

Reviewed the final project diff, quick-mode project artifacts, and the prior archived review at `reviews/archived/final-review-2026-04-13-v2.md`. The prior two findings appear fixed, and the full workspace test suite passes, but I found two remaining issues: one correctness regression in broken `AGENTS.md` symlink handling and one strategy-specific CLI guidance problem.

## Findings

### Critical

None

### Important

- **Broken `AGENTS.md` symlinks can validate as healthy canonical instructions** (`packages/cli/src/commands/instructions/instructions.utils.ts:189`)
  - Issue: `scanInstructionDirectories` preserves any broken instruction symlink when `stat()` fails with `ENOENT`, including `AGENTS.md`. That was needed for broken `CLAUDE.md` visibility, but preserving broken `AGENTS.md` as a canonical source lets a directory with `AGENTS.md -> missing.md` and `CLAUDE.md` containing `@AGENTS.md\n` validate as `ok` under the default pointer strategy. This is a regression from the original scanner, which only treated symlinked `AGENTS.md` as canonical when its target resolved to a file.
  - Impact: `oat instructions validate` can report success even though the canonical `AGENTS.md` source of truth is unreadable/missing, so `sync --strategy copy` or user edits later fail against a repo that validation claimed was clean.
  - Fix: Do not record broken `AGENTS.md` symlinks as canonical entries in the scan-time preservation branch. Preserve only broken `CLAUDE.md` symlinks there, or classify broken `AGENTS.md` explicitly as drift/unreadable before allowing a pair to become `ok`. Add a regression test with a dangling `AGENTS.md` symlink and pointer `CLAUDE.md`.

### Medium

- **Validate fix guidance drops the selected strategy** (`packages/cli/src/commands/instructions/validate/validate.ts:58`)
  - Issue: When validation is run with `--strategy symlink` or `--strategy copy`, drift output still says `Fix with: oat instructions sync`. That command defaults to `pointer`, so following the guidance can create or repair `CLAUDE.md` using the wrong strategy.
  - Impact: A user who explicitly validates symlink or copy mode can unintentionally convert missing `CLAUDE.md` files back to pointer files instead of fixing the strategy they selected.
  - Fix: Include the selected non-default strategy in the guidance, for example `Fix with: oat instructions sync --strategy symlink`. Add command coverage for `validate --strategy symlink` drift output.

### Minor

None

## Requirements/Design Alignment

### Requirements Coverage

| Requirement                                    | Status      | Notes                                                                                                             |
| ---------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Project-scoped `AGENTS.md` / `CLAUDE.md` sync  | implemented | Command changes remain in the `oat instructions` surface.                                                         |
| Pointer, symlink, and copy strategies          | partial     | Core sync/validate behavior is implemented, but validate guidance does not preserve the chosen strategy.          |
| Claude-only stray adoption                     | implemented | Adoption and post-adoption regeneration are covered for pointer, symlink, and copy.                               |
| Nested tree support with exclusions            | implemented | Nested integration coverage exists and excludes `node_modules` plus root-level `.git`, `.oat`, and `.worktrees`.  |
| Safe validation of canonical instruction state | partial     | Broken `AGENTS.md` symlinks can be classified as healthy under pointer validation.                                |
| Prior final review findings                    | fixed       | Unreadable `CLAUDE.md` files now report `content_mismatch`, and troubleshooting preview docs now use `--dry-run`. |

### Extra Work

None requiring action. The public package version bump to `0.0.23` matches the repository release guardrail for CLI changes.

## Verification Commands

Commands run during this review:

```bash
pnpm test
```

Result: passed; Turbo reported 8 successful tasks, and the CLI package reported 148 test files and 1197 tests passed.

Manual reproduction used during review:

```bash
# In a temp repo with .git/, docs/AGENTS.md -> missing.md, and docs/CLAUDE.md containing @AGENTS.md\n:
pnpm run cli -- --cwd "$TMP/docs" instructions validate --json
```

Observed result: `status: "ok"` with `detail: "pointer valid"` despite the broken canonical `AGENTS.md` symlink.

```bash
# In a temp repo with real AGENTS.md and pointer CLAUDE.md:
pnpm run cli -- --cwd "$TMP/docs" instructions validate --strategy symlink
```

Observed result: drift output ends with `Fix with: oat instructions sync`, omitting `--strategy symlink`.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert these findings into plan tasks before finalizing the project.
