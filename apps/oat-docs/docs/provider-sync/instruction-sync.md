---
title: Instruction Sync
description: Project-scoped AGENTS.md and CLAUDE.md validation, repair strategies, and Claude-only adoption.
---

# Instruction Sync

`oat instructions ...` is the project-scoped lane for keeping canonical `AGENTS.md` files aligned with sibling `CLAUDE.md` files throughout a repository tree.

Use it when you want OAT to:

- validate nested `AGENTS.md` / `CLAUDE.md` pairs
- repair missing or drifted `CLAUDE.md` files with a chosen strategy
- adopt Claude-only directories back into canonical `AGENTS.md`

This command group is intentionally separate from manifest-backed provider sync. It operates on repo-local instruction files, not provider view manifests.

## Scope

Instruction sync is currently project-only.

- It scans the current repository recursively.
- It supports nested directories all the way down the tree.
- It skips provider-irrelevant or local-only roots such as `.git`, `.oat`, `.worktrees`, and `node_modules`.
- Exception: `.oat/repo/**` is scanned even though the rest of `.oat/` is skipped, so the curated `AGENTS.md` files there (repo root guidance, `pjm/`, `reference/`) get their sibling `CLAUDE.md` shims managed and validated like any other directory. The rest of `.oat/` (`templates/`, `projects/`, `sync/`) stays excluded.
- It does not scan user-level provider roots such as `~/.claude` in this release.

## Canonical Model

- `AGENTS.md` is canonical.
- `CLAUDE.md` is derived from the sibling `AGENTS.md`.
- If a directory contains only `CLAUDE.md`, OAT can adopt that file by writing canonical `AGENTS.md` content first and then regenerating `CLAUDE.md`.

## Commands

### `oat instructions validate`

Read-only validation for instruction integrity.

- Resolves the project root automatically.
- Scans nested directories for instruction pairs and Claude-only strays.
- Returns exit code `0` when everything is valid and `1` when drift is detected.
- Suggests the matching repair command, including `--strategy` when you validated with a non-default mode.

### `oat instructions sync`

Repair and adoption command for instruction drift.

- Mutates by default.
- Use `--dry-run` to preview planned actions.
- Use `--force` to overwrite mismatched `CLAUDE.md` files.
- Reuses the selected strategy when creating or repairing `CLAUDE.md`.

## Supported Strategies

`CLAUDE.md` can be generated or validated in one of three modes:

| Strategy  | Expected `CLAUDE.md` shape       | Notes                                   |
| --------- | -------------------------------- | --------------------------------------- |
| `pointer` | file content `@AGENTS.md`        | Default mode. Lightweight and explicit. |
| `symlink` | file symlink to `AGENTS.md`      | Uses a same-directory relative symlink. |
| `copy`    | hard copy of `AGENTS.md` content | Useful when symlinks are undesirable.   |

Validation treats the selected file shape as part of correctness. For example, `copy` mode rejects a symlink even if the symlink resolves to identical content.

## Reported States

`oat instructions validate` and `oat instructions sync --dry-run` work from the same scan model.

| State              | Meaning                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `ok`               | The discovered instruction pair matches the selected strategy.                                   |
| `missing`          | `AGENTS.md` exists but sibling `CLAUDE.md` is missing.                                           |
| `content_mismatch` | `CLAUDE.md` exists but has the wrong shape/content, or an instruction file is unreadable/broken. |
| `stray`            | `CLAUDE.md` exists without sibling `AGENTS.md` and the Claude file is readable enough to adopt.  |

## Claude-Only Adoption

When a directory contains `CLAUDE.md` but no `AGENTS.md`, sync can adopt it:

1. Read the existing `CLAUDE.md`
2. Write canonical `AGENTS.md` with that content
3. Regenerate `CLAUDE.md` using the selected strategy

This means the original Claude instructions become canonical before the derived file is rewritten.

Readable Claude-only files are adoptable. Unreadable Claude-only files are not.

## When `--force` Is Required

`oat instructions sync` does not overwrite a mismatched `CLAUDE.md` unless you pass `--force`.

Typical pattern:

```bash
oat instructions validate --strategy symlink
oat instructions sync --dry-run --strategy symlink
oat instructions sync --force --strategy symlink
oat instructions validate --strategy symlink
```

This keeps validation, preview, and repair aligned to the same expected file shape.

## Manual-Repair Cases

Some states are intentionally surfaced as drift but not auto-repaired.

Examples:

- unreadable canonical `AGENTS.md`
- broken or unreadable `AGENTS.md` symlink targets
- unreadable Claude-only sources
- broken or unreadable paired `CLAUDE.md` symlink targets

In these cases, sync reports a manual-repair skip instead of guessing at destructive recovery.

## Example Workflow

Preview and adopt nested Claude-only strays as pointer files:

```bash
oat instructions sync --dry-run
oat instructions sync
```

Validate and repair everything as symlinks:

```bash
oat instructions validate --strategy symlink
oat instructions sync --dry-run --strategy symlink
oat instructions sync --force --strategy symlink
```

Validate and repair everything as hard copies:

```bash
oat instructions validate --strategy copy
oat instructions sync --dry-run --strategy copy
oat instructions sync --force --strategy copy
```

## Related Pages

- [Provider Interop Commands](commands.md)
- [Provider Interop CLI Scope and Surface](scope-and-surface.md)
- [Config and Local State](../cli-utilities/config-and-local-state.md)
- [Troubleshooting](../reference/troubleshooting.md)
