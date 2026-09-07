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
- It skips the documentation content tree by default, and any path you add to `documentation.instructionPointerExcludes`. See [Documentation trees](#documentation-trees) below.
- It does not scan user-level provider roots such as `~/.claude` in this release.

## Documentation Trees

A documentation tree holds authored pages, not instructions for agents. A
`CLAUDE.md` written into one becomes a published page, and a page legitimately
named `CLAUDE.md` is content that must not be treated as a pointer. Both
`oat instructions validate` and `oat instructions sync` therefore skip the
documentation content root, so validate never reports drift that sync refuses
to fix.

The content root is derived from `documentation.root` in `.oat/config.json`:

- `<documentation.root>/docs` when that path is a directory;
- otherwise `documentation.root` itself.

This is the same derivation `oat docs generate-index` uses to pick its default
docs directory, so the excluded tree and the indexed tree agree by
construction. (`oat docs generate-index --docs-dir` overrides the index side
only; it does not change what instruction sync excludes.)

**App-level instruction files are still synced.** `documentation.root`
canonically names the docs _app_ root, and a file like
`apps/oat-docs/AGENTS.md` is instructions for working on the docs app rather
than a documentation page. When the app root has a `docs` child, only that
child is skipped, and the app root keeps receiving its `CLAUDE.md` pointer. Opt
the app root out explicitly if you do not want it synced.

Add further paths with `documentation.instructionPointerExcludes`, a list of
repository-relative directories:

```json
{
  "documentation": {
    "root": "apps/oat-docs",
    "instructionPointerExcludes": ["vendor", "third_party/docs"]
  }
}
```

Each entry excludes that directory and everything beneath it, matching the
directory path exactly rather than by prefix — excluding `apps/docs` leaves a
sibling `apps/docs-legacy` scanned. Entries are repository-relative and
normalized, so `apps/./docs`, `apps//docs`, and `apps/docs/` all name the same
tree; absolute paths and paths escaping the repository are dropped with a
warning, and the repository root itself cannot be excluded. A structurally malformed value
(anything other than an array of non-empty strings) is rejected with exit code
`2` rather than silently ignored.

The list is additive to the derived content root, and it is applied after the
`.oat/repo` carve-in, so excluding _another_ tree can never collaterally leave
`.oat/repo/**` unscanned. `.oat/repo` itself is never excludable — listing it
is reported as having no effect rather than silently honoured, and its
`AGENTS.md` keeps its pointer. A deliberate opt-out naming a path _beneath_
it, such as `.oat/repo/pjm`, is honoured: descendants are reached by ordinary
traversal, so only the carve-in root is protected from exclusion.

### When an exclusion does nothing

An entry that is well formed but cannot protect anything — it names a
directory that does not exist, differs in case from the real path on a
case-insensitive filesystem such as APFS, is absolute, escapes the repository,
or is the unexcludable `.oat/repo` — does not fail the command. It is reported
as a warning naming the entry, and it is never counted as protection.

The warning channel depends on the mode: in human mode warnings are written to
stderr, and under `--json` they are carried in the `exclusionWarnings` payload
field instead, because `--json` suppresses stderr warnings entirely.

That distinction matters most on a case-insensitive filesystem: a
`documentation.root` of `Apps/Docsapp` resolves happily while the scan compares
the real `apps/docsapp`, so the tree would be scanned after all. Trust
`effectiveExcludedPaths`, not `excludedPaths`, when deciding whether a tree is
protected — and read `exclusionWarnings` for the reason, since the stderr
warnings are silent under `--json`.

Because both commands read `.oat/config.json` to resolve exclusions, they
inherit its validation. Any value that fails a _fail-closed_ field check —
including keys these commands do not otherwise use, such as
`documentation.excludes` — makes `oat instructions sync` and
`oat instructions validate` exit `2` until it is repaired. Not every key is
fail-closed: a wrong-typed scalar such as `documentation.root` is dropped
rather than rejected, so it never aborts the command (a dropped `root` simply
leaves the content root underived, and no default exclusion applies).

Exclusion only stops a directory from being scanned. Nothing is deleted: a
`CLAUDE.md` that already exists inside an excluded tree is left exactly as it
is. When any exclusion is configured, `--json` output carries three additional
fields.

- `excludedPaths` lists the configured exclusions — a statement of intent, not
  a per-directory skip log, so `.oat` appearing there does not contradict
  `.oat/repo` still being scanned.
- `effectiveExcludedPaths` lists the subset that names a real, case-exact
  directory the scan actually pruned. It is present whenever `excludedPaths`
  is, including as an empty array when every configured entry turned out to be
  inert.
- `exclusionWarnings` lists one message per configured exclusion that will not
  protect anything — the `--json` counterpart of the stderr warnings above.

Each field is omitted when it would be empty. `exclusionWarnings` is
independent of the other two: an absolute or repository-escaping entry is
dropped before `excludedPaths` is built, so it appears only here.

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
