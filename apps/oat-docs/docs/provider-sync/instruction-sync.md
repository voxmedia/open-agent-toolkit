---
title: Instruction Sync
description: Project-scoped AGENTS.md and CLAUDE.md validation, the no-shim default, opt-in shim strategies, and Claude-only adoption.
---

# Instruction Sync

`oat instructions ...` is the project-scoped lane for keeping canonical `AGENTS.md` files and any sibling `CLAUDE.md` files consistent throughout a repository tree.

By default OAT keeps **no** `CLAUDE.md` shims: Claude Code reads `AGENTS.md` itself (see [Claude Code and AGENTS.md](#claude-code-and-agentsmd)). A repository opts back into shims with `instructions.claude.shims`.

Use it when you want OAT to:

- validate nested `AGENTS.md` files, and their `CLAUDE.md` shims when a shim strategy is configured
- remove the `CLAUDE.md` shims OAT created, under the default, and warn about any `CLAUDE.md` that would hide `AGENTS.md` from Claude Code
- create or repair `CLAUDE.md` shims with a chosen strategy, when you opt in
- adopt Claude-only directories back into canonical `AGENTS.md`

This command group is intentionally separate from manifest-backed provider sync. It operates on repo-local instruction files, not provider view manifests.

## Scope

Instruction sync is currently project-only.

- It scans the current repository recursively.
- It supports nested directories all the way down the tree.
- It skips provider-irrelevant or local-only roots such as `.git`, `.oat`, `.worktrees`, and `node_modules`.
- It stops at nested git checkouts: any directory below the root that holds its own `.git` (a directory, or the gitdir file of a submodule or linked worktree such as `.claude/worktrees/<name>`) is a separate repository that its own `oat instructions` run owns. Nothing inside it is scanned, removed, or warned about.
- Exception: `.oat/repo/**` is scanned even though the rest of `.oat/` is skipped, so the curated `AGENTS.md` files there (repo root guidance, `pjm/`, `reference/`) are managed and validated like any other directory. The rest of `.oat/` (`templates/`, `projects/`, `sync/`) stays excluded.
- It skips the documentation content tree by default, and any path you add to `instructions.claude.excludes`. See [Documentation trees](#documentation-trees) below.
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
child is skipped, and the app root is still synced (under a shim strategy it
keeps receiving its `CLAUDE.md` pointer). Opt the app root out explicitly if
you do not want it synced.

Add further paths with `instructions.claude.excludes`, a list of
repository-relative directories. Set it with
`oat config set instructions.claude.excludes "vendor,third_party/docs"`
(an empty value clears it, and `oat config unset` removes it), or write it
directly:

```json
{
  "documentation": {
    "root": "apps/oat-docs"
  },
  "instructions": {
    "claude": {
      "excludes": ["vendor", "third_party/docs"]
    }
  }
}
```

Each entry excludes that directory and everything beneath it, matching the
directory path exactly rather than by prefix — excluding `apps/docs` leaves a
sibling `apps/docs-legacy` scanned. Entries are repository-relative and
normalized, so `apps/./docs`, `apps//docs`, and `apps/docs/` all name the same
tree; absolute paths and paths escaping the repository are dropped with a
warning when they are already stored — and refused outright by
`oat config set` — and the repository root itself cannot be excluded. A structurally malformed value
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
is, even under the default `none` strategy, which removes managed shims
everywhere else. Exclusion does not silence the
[leftover `CLAUDE.md` warning](#leftover-claudemd-warnings), because Claude
Code does not honor OAT's exclusions. When any exclusion is configured,
`--json` output carries three additional fields.

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
- A `CLAUDE.md` beside it is either absent (the default, strategy `none`) or a shim derived from the sibling `AGENTS.md` (strategies `pointer`, `symlink`, and `copy`).
- If a directory contains only `CLAUDE.md`, OAT can adopt that file by writing canonical `AGENTS.md` content first. Under a shim strategy it then regenerates `CLAUDE.md`; under `none` it removes it.

## Commands

### `oat instructions validate`

Read-only validation for instruction integrity.

- Resolves the project root automatically.
- Scans nested directories for instruction pairs and Claude-only strays.
- Returns exit code `0` when everything is valid and `1` when drift is detected. Leftover-`CLAUDE.md` warnings never change the exit code.
- Suggests the matching repair command, including `--strategy` when you validated with an explicit `--strategy`.

### `oat instructions sync`

Repair and adoption command for instruction drift.

- Mutates by default.
- Use `--dry-run` to preview planned actions, including every planned removal.
- Under a shim strategy, use `--force` to overwrite mismatched `CLAUDE.md` files. Under `none`, `--force` has no effect: sync never deletes anything that is not an exact managed shim.
- Applies the effective strategy when creating, repairing, or removing `CLAUDE.md`.

Both commands report the effective strategy as `strategy:` in human output and as the `strategy` field under `--json`.

## Supported Strategies

| Strategy  | Expected `CLAUDE.md` shape       | Notes                                                                              |
| --------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| `none`    | no `CLAUDE.md`                   | Default. Sync removes the shims OAT created and warns about any other `CLAUDE.md`. |
| `pointer` | file content `@AGENTS.md`        | Lightweight and explicit. The default before shims became opt-in.                  |
| `symlink` | file symlink to `AGENTS.md`      | Uses a same-directory relative symlink.                                            |
| `copy`    | hard copy of `AGENTS.md` content | Useful when symlinks are undesirable.                                              |

Validation treats the selected file shape as part of correctness. For example, `copy` mode rejects a symlink even if the symlink resolves to identical content.

### Choosing a strategy

The effective strategy for a run is resolved in this order:

1. the `--strategy` flag, which overrides for that one run and never changes config;
2. `instructions.claude.shims` in `.oat/config.json`;
3. the built-in default, `none`.

Persist a shim strategy for the repository with:

```bash
oat config set instructions.claude.shims pointer
oat instructions sync
```

`oat config unset instructions.claude.shims` returns to the default. A value outside `none`, `pointer`, `symlink`, and `copy` is rejected with exit code `2` instead of silently falling back to the default, and `oat config set` can still repair it.

## Reported States

`oat instructions validate` and `oat instructions sync --dry-run` work from the same scan model.

| State              | Meaning                                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | The directory matches the effective strategy (under `none`: no `CLAUDE.md` beside `AGENTS.md`).                                                                  |
| `missing`          | Shim strategies only: `AGENTS.md` exists but sibling `CLAUDE.md` is missing. Under `none` a missing `CLAUDE.md` is correct, never drift.                         |
| `content_mismatch` | `CLAUDE.md` exists but has the wrong shape/content, or an instruction file is unreadable/broken.                                                                 |
| `stray`            | `CLAUDE.md` exists without sibling `AGENTS.md` and the Claude file is readable enough to adopt.                                                                  |
| `managed_shim`     | `none` only: a `CLAUDE.md` in an exact shape OAT writes. Drift; sync removes it.                                                                                 |
| `unmanaged`        | `none` only: a `CLAUDE.md` that is not an exact managed shape (hand-written, modified, or a symlink elsewhere). Reported and kept, never deleted, and not drift. |

## Removing OAT-Managed Shims

Under `none`, a non-dry-run sync removes the `CLAUDE.md` files OAT created, so
the repository never sits with shims in some directories and not others (see
[Claude Code and AGENTS.md](#claude-code-and-agentsmd) for why that state is
worse than either extreme). `--dry-run` lists each planned `remove` action and
changes nothing.

Removal is deliberately narrow. It only ever targets a file named `CLAUDE.md`
whose sibling is `AGENTS.md`, inside the tree the scan walks, in one of these
exact shapes:

- the pointer `@AGENTS.md` followed by a newline (LF or CRLF), and nothing else;
- a symlink whose target names the sibling `AGENTS.md`;
- a byte-identical copy of the sibling `AGENTS.md`.

Everything else is kept and reported as `unmanaged`: a hand-written or edited
`CLAUDE.md`, a pointer with extra lines or trailing spaces, a symlink to any
other file, `.claude/CLAUDE.md`, and any `CLAUDE.md` that a scanned instruction
file in another directory links to (`pkg/AGENTS.md -> ../CLAUDE.md`), which
is neither removed nor adopted because that would leave the link dangling; the
entry names the links. A `CLAUDE.md` that the sibling
`AGENTS.md` resolves to (the Claude-first `ln -s CLAUDE.md AGENTS.md` layout,
or a hard link) holds the only copy of the instructions, so it is never
treated as a shim of any shape; and a copy is only ever recognized against a
distinct regular `AGENTS.md`. `CLAUDE.local.md` is never touched and never
scanned as a shim; it is reported only through the
[leftover warning](#leftover-claudemd-warnings). A `CLAUDE.md` inside the
documentation content tree, an excluded directory, or a nested git checkout is
never touched.

Removal also fails closed at apply time. Immediately before deleting, sync
re-checks the file: it must still be the same file the scan saw (same device
and inode, and the same symlink target), still an exact managed shape, and not
the target of a link from any scanned instruction file. If it was edited or
replaced, or a link to it appeared, in between, it is kept, byte for byte, and reported
as `CLAUDE.md changed since planning (...); kept`, and the command exits `1`
so you can rerun it.

## Leftover `CLAUDE.md` Warnings

Under `none`, after sync (and on every `validate`) OAT reports each remaining
`CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md` anywhere in the
repository with a warning: while that file exists, Claude Code's default
`agents-md` mode ignores every `AGENTS.md` in the project. For a file at the
root (including `.claude/CLAUDE.md` and `CLAUDE.local.md` there) that holds for
every session; for a file in a subdirectory it holds for sessions started in
that directory or below, and the warning says so. The warning names exactly
two ways out:

- remove the file — or, when an `AGENTS.md` links to it (the warning's
  `linkedBy`), first replace each linking `AGENTS.md` with the file's content,
  because the file holds the only copy of those instructions; or
- set `instructions.claude.shims` in `.oat/config.json` to a shim
  strategy (`pointer`, `symlink`, or `copy`) and rerun `oat instructions sync`
  to add shims back everywhere.

This check is a separate, read-only walk of the whole repository. It
deliberately ignores `documentation.root` and
`instructions.claude.excludes`, which only limit what OAT may
change, because Claude Code's own walk does not honor them. Only `.git`,
`node_modules`, the root `.worktrees`, and nested git checkouts are skipped.

Warnings go to stderr in human mode and to the `warnings` array under `--json`
(each item has `code: "claude_md_hides_agents_md"`, a repository-relative
`path`, `linkedBy` — the repository-relative `AGENTS.md` paths whose symlink
chain reaches the file, empty when there are none — and the `message`).
Names are matched exactly: a case variant such as `claude.md` is neither
reported nor ever removed, because such names are common for ordinary
documents (a provider page named `claude.md`, for example). On a
case-insensitive filesystem, rename a case-variant file yourself if Claude Code
treats it as `CLAUDE.md`. They never change the exit code, a dry run leaves
out files it is about to remove, a repository with no remaining `CLAUDE.md`
prints nothing, and no warning is emitted under a shim strategy.

## Claude-Only Adoption

When a directory contains `CLAUDE.md` but no `AGENTS.md`, sync can adopt it:

1. Read the existing `CLAUDE.md`
2. Write canonical `AGENTS.md` with that content
3. Under a shim strategy, regenerate `CLAUDE.md` using that strategy. Under
   `none`, remove the `CLAUDE.md`, so adoption never leaves a file that makes
   Claude Code ignore `AGENTS.md`.

This means the original Claude instructions become canonical before the derived file is rewritten or removed.

Under `none` the removal is re-verified like any other: the `CLAUDE.md` must
still be the same file and now byte-identical to the new `AGENTS.md`. If it
changed during adoption, it is kept and reported as
`CLAUDE.md kept after adoption into AGENTS.md (...)`, and it is also named in a
leftover warning.

Readable Claude-only files are adoptable. Unreadable Claude-only files are not.
`.claude/CLAUDE.md` is Claude Code's own alternate project file, not a stray,
so under `none` it is never adopted.

## Claude Code and AGENTS.md

Claude Code reads `AGENTS.md` natively through its built-in `agents-md` plugin
(`anthropics/claude-code`, `mods/agents-md`, as of v2.1.278). Its
`instructionFiles` option defaults to `claude-md-or-agents-md`:

- In that default mode the plugin stands down for the **whole project** when
  any `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` exists in any
  directory from the project root down to the working directory; Claude Code
  then loads only `CLAUDE.md` files. A single root `CLAUDE.md` or a personal
  `CLAUDE.local.md` is enough to make it ignore every `AGENTS.md`, and a
  repository with shims in some directories but not others loses every
  `AGENTS.md` that has no shim. This is why the default removes managed shims
  and warns about the rest.
- In `claude-md-and-agents-md` mode, an `AGENTS.md` that a `CLAUDE.md` already
  imports or links is not loaded twice, so shims are harmless there.
- The option can be set only in user settings (`~/.claude/settings.json`),
  with `--settings`, or in managed settings. A project's
  `.claude/settings.json` cannot set it, so a repository cannot choose the mode
  for its contributors.

Opt into a shim strategy when your contributors need `CLAUDE.md`:

- they run Claude Code releases from before the built-in `agents-md` plugin;
- they set `instructionFiles` to `claude-md`, which loads no `AGENTS.md`;
- the plugin's documented gaps matter to you: nested `AGENTS.md` files attach
  only on a text file `Read` (not on `@`-mentions, IDE selections, or
  notebook, image, or PDF reads), and `--add-dir` directories contribute no
  `AGENTS.md`, where Claude Code's own `CLAUDE.md` loading covers those cases
  (for `--add-dir`, only when `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`
  is set).

## When `--force` Is Required

Under a shim strategy, `oat instructions sync` does not overwrite a mismatched `CLAUDE.md` unless you pass `--force`.

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

Preview and apply the default: remove OAT-managed shims and adopt Claude-only
strays into `AGENTS.md`:

```bash
oat instructions sync --dry-run
oat instructions sync
```

Opt the repository into pointer shims:

```bash
oat config set instructions.claude.shims pointer
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
