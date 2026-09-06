---
title: '`.oat` Directory Structure'
description: 'Canonical .oat/ tree reference: config, projects, sync state, templates, and per-file purpose.'
---

# `.oat` Directory Structure

This document is the canonical reference for what lives under `.oat/`, what each file or directory does, and which parts are source-of-truth vs generated runtime state.

## Scope model

OAT uses two scopes for `.oat` data:

- Project scope: `<repo>/.oat/`
- User scope: `~/.oat/`

Project scope is used for project workflows and repo-local sync state. User scope is used for global ideas and user-level sync state.

## Top-level project `.oat/` layout

```text
.oat/
  config.json
  config.local.json
  projects/
    shared/
    synced/
      <project>.json
      <project>/
    local/
    archived/
  ideas/
  sync/
    manifest.json
    config.json
  templates/
  scripts/
  repo/
    knowledge/
    pjm/
    reference/
    reviews/
    archive/
```

## Top-level entries

| Path                     | Purpose                                             | Notes                                                                                                   |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `.oat/config.json`       | Shared repo runtime config for non-sync settings    | Includes `worktrees.root`, `projects.root`, `git.defaultBranch`, `archive.*`, and `documentation.*`     |
| `.oat/config.local.json` | Local per-developer runtime state                   | Gitignored; includes `activeProject`, `lastPausedProject`, `activeIdea`                                 |
| `.oat/state.md`          | Generated repo state dashboard                      | Gitignored; rebuilt with `oat state refresh` from config, project artifacts, and knowledge metadata     |
| `.oat/projects/`         | OAT project artifacts                               | `shared`, `synced`, `local`, and lifecycle `archived` locations                                         |
| `.oat/ideas/`            | Project-level ideas store                           | Often gitignored                                                                                        |
| `.oat/sync/`             | Interop sync state/config                           | See details below                                                                                       |
| `.oat/templates/`        | Artifact templates used by OAT skills               | Source for scaffolding. Includes `docs-app-fuma/` (Fumadocs) and `docs-app-mkdocs/` (MkDocs) templates. |
| `.oat/repo/`             | Repo-level PJM/knowledge/reference/review artifacts | Active PJM state under `pjm/`; durable references (including decisions) under `reference/`              |

## `.oat/sync/` details

| Path                      | Purpose                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `.oat/sync/manifest.json` | Records sync-managed entries, collection ownership, and drift state |
| `.oat/sync/config.json`   | Project sync behavior, provider settings, and known-stray choices   |

The equivalent user files are `~/.oat/sync/manifest.json` and
`~/.oat/sync/config.json`.

Manifest version 2 stores `collections` alongside per-entry evidence. Each
collection record uses scope-relative canonical/provider paths and records
whether OAT created the exact alias or adopted an existing one. Its inherited
entries refer back to that collection; the manifest never authorizes deletion
through the alias target. Writes are atomic, and unchanged manifests from the
older per-entry schema normalize in memory before the next successful sync.

`config.json` currently includes:

- `version`
- `defaultStrategy`
- `knownStrays` (optional exact provider-local paths)
- `providers.<provider>.enabled`
- `providers.<provider>.strategy` (optional override)

Primary ways this file is managed:

- `oat init --scope project` (interactive provider selection)
- `oat providers set --scope project --enabled ... --disabled ...`

## Config ownership (current)

Current config ownership:

- `.oat/config.json` owns shared non-sync repo settings (including `worktrees.root`, `projects.root`, and `documentation.*`).
- `.oat/config.local.json` owns per-developer project lifecycle state (`activeProject`, `lastPausedProject`, `activeIdea`).
- `~/.oat/config.json` owns user-level state (`activeIdea` at global scope).
- `.oat/sync/config.json` owns project sync/provider behavior and project known strays.
- `~/.oat/sync/config.json` owns user sync/provider behavior and personal known
  strays. OAT migrates legacy `~/.oat/config.json#knownStrays` entries here
  without removing unrelated user config.

CLI discovery surfaces:

- `oat config describe` lists the supported config surfaces and keys across shared repo, repo-local, user, and sync/provider config.
- `oat config describe <key>` prints scope, file, default, mutability, owning command, and description for one config key.
- `oat config list` prints the resolved values for the repo-scoped/local command surface.

Legacy `.oat/active-project` / `.oat/projects-root` / `.oat/active-idea` files may still be present in some environments but are no longer the canonical source in migrated command paths.

### `.oat/config.json` schema

Current schema keys:

| Key                                                        | Type                       | Default                  | Description                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------- | -------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`                                                  | `number`                   | `1`                      | Schema version                                                                                                                                                                                                                                                                                          |
| `worktrees.root`                                           | `string`                   | `".worktrees"`           | Root directory for git worktrees (repo-relative or absolute)                                                                                                                                                                                                                                            |
| `projects.root`                                            | `string`                   | `".oat/projects/shared"` | Default root directory for OAT projects                                                                                                                                                                                                                                                                 |
| `projects.defaultScope`                                    | `string`                   | `"synced"`               | Scope used by project creation when `--scope` is omitted: `shared`, `local`, or `synced`. Environment override: `OAT_PROJECTS_DEFAULT_SCOPE`.                                                                                                                                                           |
| `localPaths`                                               | `string[]`                 | -                        | Gitignored directories to sync between main repo and worktrees. Supports glob patterns. Managed via `oat local add/remove`.                                                                                                                                                                             |
| `documentation.root`                                       | `string`                   | -                        | Docs **app root** — the directory `oat docs init` scaffolds (e.g., `apps/docs`). Authored pages live under `<root>/docs`. See [Documentation path resolution](#documentation-path-resolution).                                                                                                          |
| `documentation.tooling`                                    | `string`                   | -                        | Documentation framework identifier (`mkdocs` or `fumadocs`)                                                                                                                                                                                                                                             |
| `documentation.config`                                     | `string`                   | -                        | Path to the documentation framework config file (e.g., `mkdocs.yml`, `next.config.js`)                                                                                                                                                                                                                  |
| `documentation.index`                                      | `string`                   | -                        | Path to the docs surface entry point: the generated app-root manifest `<root>/index.md` for Fumadocs, `mkdocs.yml` for MkDocs. Set by `oat docs init`. `oat docs generate-index` writes it only for the Fumadocs manifest transition and never for MkDocs.                                              |
| `documentation.excludes`                                   | `string[]`                 | -                        | Globs, relative to the docs directory, that `oat docs generate-index` leaves out of the generated index. See [Excluding pages from the generated index](#excluding-pages-from-the-generated-index).                                                                                                     |
| `documentation.requireForProjectCompletion`                | `boolean`                  | `false`                  | When `true`, OAT project completion gates require documentation to be updated                                                                                                                                                                                                                           |
| `git.defaultBranch`                                        | `string`                   | `"main"`                 | Default branch for PR creation. Auto-detected during `oat init` via `gh repo view` or `origin/HEAD`. Used by `oat-project-pr-final` and `oat-project-pr-progress`.                                                                                                                                      |
| `workflow.autoReviewAtHillCheckpoints`                     | `boolean`                  | unset                    | When `true`, completing a HiLL checkpoint automatically runs the extra lifecycle review. Does not control Tier 1 per-phase `oat-reviewer` gates. Can be overridden per-project via `oat_auto_review_at_hill_checkpoints` in `plan.md` frontmatter. Legacy `autoReviewAtCheckpoints` remains a fallback. |
| `workflow.dispatchPolicy.mode`                             | `string`                   | unset                    | Dispatch policy mode: `managed` lets OAT select model/effort controls; `inherit` leaves controls to the host/provider defaults.                                                                                                                                                                         |
| `workflow.dispatchPolicy.policy`                           | `string`                   | unset                    | Managed dispatch policy: `economy`, `balanced`, `high`, `frontier`, or `uncapped`. Capped policies compile to provider targets; `uncapped` keeps OAT-managed preferred selection without provider caps. `inherit` mode is separate and leaves controls to the host/provider.                            |
| `workflow.dispatchCeiling.preset`                          | `string`                   | unset                    | Legacy compatibility preset for capped managed policy setup (`balanced`, `maximum`, `cost-conscious`). `maximum` maps to `high`; `cost-conscious` maps to `economy`.                                                                                                                                    |
| `workflow.dispatchCeiling.providers.<provider>`            | `object` or legacy scalar  | unset                    | Reusable provider candidate ladder. The canonical shape maps `economy`, `balanced`, `high`, and `frontier` to ordered candidate cells; project and phase state record only a named maximum over that ladder.                                                                                            |
| `workflow.dispatchCeiling.providers.<provider>.<tier>`     | `{ candidates: [...] }`    | unset                    | One ordered candidate cell. Codex entries carry exact `model` plus `effort` and resolve to materialized roles; Claude entries carry a model; Cursor strings remain opaque and pass to Cursor byte-for-byte. The final candidate defines that tier's reviewer ceiling.                                   |
| `workflow.dispatchCeiling.providers.{codex,claude,cursor}` | `string`, route, or target | unset                    | Legacy compatibility input normalized to a one-candidate ladder. New configuration should use tiered candidate cells. The flat keys `workflow.dispatchCeiling.codex` and `workflow.dispatchCeiling.claude` were removed without migration.                                                              |
| `workflow.gates.skills`                                    | `object`                   | unset                    | Per-skill final gate config keyed by skill name. Managed with `oat gate set/unset`; gate-aware skills declare `oat_gateable: true`.                                                                                                                                                                     |
| `workflow.gates.execTargets`                               | `object`                   | built-ins                | Cross-runtime exec target registry keyed by opaque target id. Managed with `oat gate target set/unset`; built-ins cover Codex, Claude, and Cursor defaults.                                                                                                                                             |
| `archive.s3Uri`                                            | `string`                   | -                        | Base S3 URI for repo-scoped archived project sync, for example `s3://bucket/oat-archive`                                                                                                                                                                                                                |
| `archive.s3SyncOnComplete`                                 | `boolean`                  | `false`                  | When `true`, `oat-project-complete` uploads the archived project to the configured S3 archive after local archive succeeds                                                                                                                                                                              |
| `archive.summaryExportPath`                                | `string`                   | -                        | Repo-relative directory where completion exports `summary.md` as a dated snapshot like `20260401-<project-name>.md` for durable tracked reference                                                                                                                                                       |
| `archive.wrapUpExportPath`                                 | `string`                   | -                        | Repo-relative directory where `oat-wrap-up` writes dated reports like `20260413-wrap-up-past-week.md`; when unset, the skill falls back to `.oat/repo/reference/wrap-ups/`                                                                                                                              |
| `archive.awsProfile`                                       | `string`                   | -                        | Optional AWS named profile forwarded as `AWS_PROFILE` to every `aws` invocation in archive flows (`oat-project-complete` S3 sync, `oat repo archive sync`). Overrides ambient shell `AWS_PROFILE` / `AWS_DEFAULT_PROFILE` when set.                                                                     |
| `archive.awsRegion`                                        | `string`                   | -                        | Optional AWS region forwarded as `AWS_REGION` to every `aws` invocation in archive flows. Overrides ambient shell `AWS_REGION` / `AWS_DEFAULT_REGION` when set.                                                                                                                                         |

All `documentation.*` keys are managed via `oat config get/set` and are set automatically by `oat docs init`.
The `git.defaultBranch` key is auto-detected during `oat init` and can be overridden via `oat config set git.defaultBranch <branch>`.
Archive settings are managed via `oat config get/set`, and `oat config describe archive.s3Uri` (or the other archive keys) shows the lifecycle and ownership details from the CLI.
Workflow gate objects are structured config and are managed with `oat gate`, not the scalar `oat config set` surface. See [Workflow Gates](../cli-utilities/workflow-gates.md).

Example:

```json
{
  "version": 1,
  "projects": {
    "root": ".oat/projects/shared",
    "defaultScope": "synced"
  },
  "worktrees": {
    "root": ".worktrees"
  },
  "documentation": {
    "root": "apps/docs",
    "tooling": "mkdocs",
    "config": "apps/docs/mkdocs.yml",
    "index": "apps/docs/mkdocs.yml",
    "requireForProjectCompletion": false
  }
}
```

### Documentation path resolution

`documentation.root` canonically names the docs **app root** — exactly the directory `oat docs init` scaffolds. Authored Markdown lives under `<root>/docs`, and the generated Fumadocs manifest is written to `<root>/index.md`, outside the tree it indexes.

`oat docs generate-index` resolves omitted options from this configuration:

| Option       | Omitted                                                                                  | Supplied                            |
| ------------ | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| `--docs-dir` | `<documentation.root>/docs` when that directory exists, otherwise `<documentation.root>` | Resolved from the current directory |
| `--output`   | `<documentation.root>/index.md`                                                          | Resolved from the current directory |

If an omitted option has no non-empty `documentation.root` to resolve against, or the configured root is not a directory, the command fails with exit code `2` before generating or writing anything.

**Compatibility behavior.** Preferring `<root>/docs` exists for legacy configs whose `root` names a docs _source_ directory rather than an app root; it is not a second meaning of the key. Because the rule is a plain directory-existence test, a source root that happens to contain its own `docs` subdirectory is narrowed to it. The command prints the directory it derived in both human and JSON output (`docsDir`, `docsDirSource`), and `--docs-dir` is the escape hatch when the derivation is wrong.

A legacy source root with no `docs` child resolves `--docs-dir` and `--output` to the same tree, so a bare run is refused rather than allowed to overwrite an authored page. Pass an explicit `--output` outside the source tree, or repoint `documentation.root` at the app root.

**Refused output targets.** Checked before generation for derived and explicit paths alike, the command refuses to write an output that is inside the docs directory it indexes, equals `documentation.config`, or ends in `.yml` / `.yaml`. A derived output whose existing file lacks the `AUTOGENERATED by oat docs generate-index` header is also refused; naming that same path with `--output` overwrites it explicitly.

**Configuration writes.** The only configuration write generation performs is the Fumadocs manifest transition: when the written manifest lies inside `documentation.root` and `documentation.tooling` is `fumadocs`, the repo-relative output path is recorded in `documentation.index`. A config that declares neither `documentation.tooling` nor `documentation.config` is treated as the same Fumadocs-shaped case. Any other declared tooling — `mkdocs` included — is never written, and neither are `documentation.root` and `documentation.config`. The value is always repo-relative: when `documentation.root` points outside the repository, the manifest is still generated but the key is left untouched rather than recording a machine-specific path.

### Excluding pages from the generated index

`documentation.excludes` and the repeatable `--exclude <glob>` flag feed one matcher. Flags **extend** the configured list rather than replacing it, so a one-off exclusion cannot silently republish pages the repository deliberately excluded. A directory left empty by exclusion emits no heading, and an empty list produces byte-identical output to no exclusions at all.

Patterns are matched against each candidate's path **relative to the docs directory being indexed** — the directory `--docs-dir` resolved to, not `documentation.root` and not the repository root.

| Pattern        | Matches                                                  |
| -------------- | -------------------------------------------------------- |
| `CLAUDE.md`    | only the root-level `CLAUDE.md`; patterns are anchored   |
| `**/CLAUDE.md` | `CLAUDE.md` at any depth, including the docs root        |
| `*.md`         | root-level Markdown only; `*` never crosses `/`          |
| `drafts/`      | the `drafts` directory and everything beneath it         |
| `api/**/*.md`  | Markdown at any depth under `api/`, including `api/x.md` |

A trailing `/` restricts a pattern to directories and never matches a file; without it, a pattern that matches a directory path still prunes that directory. `**` spans `/` only as a whole path segment — inside a segment (`a**b`) it is an ordinary single-segment wildcard. Matching is case-sensitive, `/` is the separator on every platform, and only `*` and `**` are metacharacters — every other character, `.` included, is literal. A leading `./` or `/` is stripped, so both spellings anchor at the docs root. Entries are trimmed and de-duplicated; a malformed `documentation.excludes` (a non-array, or an empty or non-string entry) is rejected with exit code `2` rather than silently ignored. `oat config set documentation.excludes` can still replace or clear a malformed value, so the repair the error names always works.

Set the list with the comma-separated grammar, and clear it with an empty value:

```bash
oat config set documentation.excludes "**/CLAUDE.md,**/AGENTS.md"
oat config set documentation.excludes ""
```

This repository pins the invocation explicitly, which is the portable fallback anywhere the configured defaults are not what you want:

```bash
oat docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md
```

### Worktree root precedence

When resolving the worktree root directory, `oat-worktree-bootstrap` uses this strict precedence (stops at the first match):

1. **`--path <root>` flag** — Explicit CLI override (highest priority)
2. **`OAT_WORKTREES_ROOT` env var** — Environment-level override
3. **`.oat/config.json` `worktrees.root`** — Persisted project config
4. **First existing directory** (checked in order):
   - `<repo>/.worktrees`
   - `<repo>/worktrees`
   - `../<repo-name>-worktrees`
5. **Fallback default** — `../<repo-name>-worktrees`

For repo-relative values (levels 3-4), paths are resolved from the repository root. If the resolved root is project-local (`.worktrees` or `worktrees`), the skill verifies it is git-ignored before creating new worktrees.

## Project artifact structure

Each OAT project lives under:

- `.oat/projects/shared/<project>/`
- `.oat/projects/synced/<project>/` for a gitignored nested worktree whose
  history is published to `refs/oat/projects/<project>`
- `.oat/projects/synced/<project>.json` for the tracked discovery record that
  identifies the ref, remote, and active transaction state; archived closeout
  deletes this record after terminal durability is verified
- `.oat/projects/local/<project>/`
- `.oat/projects/archived/<project>/`

Completion and archive sync behavior:

- When archiving is selected, `oat-project-complete` archives locally into
  `.oat/projects/archived/<project>/`. For a synced project, the snapshot omits
  the nested checkout's `.git` pointer and `reviews/`. After required local and
  configured S3 durability succeeds, completion makes
  `refs/oat/completed/<project>` authoritative, removes the nested worktree,
  and deletes the tracked JSON record. Full-SHA links remain reachable through
  the completed ref.
- Both a completed-only ref and completed plus same-SHA active alias are valid
  terminal shapes. The alias is inert and ignored by list, pull, and open;
  differing SHAs are a hard mismatch with explicit recovery guidance.
- When archiving is disabled or declined, completion leaves the synced
  checkout and ref in place, pushes the finalized artifacts, and exact-path
  commits the tracked record as complete.
- If `archive.s3SyncOnComplete=true` and `archive.s3Uri` is configured, completion must successfully upload a dated snapshot such as `<archive.s3Uri>/<repo-slug>/projects/20260401-<project>/` before it retires the active record and checkout.
- `oat repo archive sync` syncs all repo archived projects down from S3 into `.oat/projects/archived/`.
- `oat repo archive sync <project-name>` syncs the latest dated remote snapshot for a single project into `.oat/projects/archived/<project-name>/`.
- Default archive sync is non-destructive toward unrelated local-only archive data, but it does replace a local project archive when a newer dated remote snapshot is selected for that same project.
- `oat project prune` is separate and destructive: for a terminal project it
  removes the completed ref and any matching active alias, while leaving local
  and S3 archive snapshots intact. A ref mismatch blocks deletion.

Typical contents:

```text
<project>/
  state.md
  discovery.md
  spec.md
  design.md
  plan.md
  implementation.md
  summary.md
  reviews/
  pr/
  references/
```

### Core artifact roles

| File                    | Purpose                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `state.md`              | Lifecycle routing state (`oat_phase`, status, current task pointers)                                                                                                                                                           |
| `discovery.md`          | Problem framing and requirements discovery notes                                                                                                                                                                               |
| `spec.md`               | Formalized requirements                                                                                                                                                                                                        |
| `design.md`             | Technical architecture/design decisions                                                                                                                                                                                        |
| `plan.md`               | Executable task/phase plan and review table                                                                                                                                                                                    |
| `implementation.md`     | Execution log, progress table, outcomes, verification history                                                                                                                                                                  |
| `summary.md`            | Institutional memory artifact — generated from project artifacts by `oat-project-summary`. Contains overview, key decisions, design deltas, challenges, follow-up items. Used as PR description source and archive cover page. |
| `reviews/*.md`          | Active tracked review artifacts awaiting receive/closeout                                                                                                                                                                      |
| `reviews/archived/*.md` | Local-only historical review artifacts after receive/closeout                                                                                                                                                                  |
| `pr/*.md`               | PR description artifacts                                                                                                                                                                                                       |
| `references/*`          | Imported or supporting source material                                                                                                                                                                                         |

Not all workflow modes require every artifact:

- `spec-driven`: discovery + spec + design + plan + implementation
- `quick`: discovery + plan + implementation (spec/design optional)
- `import`: imported plan + implementation (spec/design optional)

## `.oat/repo/` structure

| Path                   | Purpose                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `.oat/repo/knowledge/` | Generated codebase knowledge indexes                                                     |
| `.oat/repo/pjm/`       | Active operational PJM layer (`current-state.md`, `roadmap.md`, and `backlog/`)          |
| `.oat/repo/reference/` | Durable append-mostly references, including file-per-record decisions under `decisions/` |
| `.oat/repo/reviews/`   | Repo-scoped review artifacts (ad-hoc/non-project)                                        |
| `.oat/repo/archive/`   | Archived repo-level artifacts                                                            |

Canonical project-management repo-reference surface splits the active
operational layer (`pjm/`) from durable references (`reference/`):

```text
.oat/repo/
  AGENTS.md
  pjm/
    AGENTS.md
    current-state.md
    roadmap.md
    backlog/
  reference/
    AGENTS.md
    decisions/
      AGENTS.md
      index.md
```

Decisions are file-per-record under `reference/decisions/` (managed with the
`oat decision` command group), replacing the legacy single
`reference/decision-record.md`. Repos still on the old single-`reference/`
layout migrate with `oat pjm migrate`. Running `oat decision init` by itself
creates the `decisions/` subtree and decision-specific AGENTS guidance without
creating the broader `pjm/` surface.

## User scope (`~/.oat/`)

Common user-scope entries:

```text
~/.oat/
  config.json
  ideas/
  sync/
    config.json
    manifest.json
```

User scope is primarily for:

- User-level ideas
- User-level provider sync state and personal known-stray choices

## Practical guidance

- Treat `.oat/templates/` as scaffolding source.
- Treat `.oat/config.json` + `.oat/config.local.json` as OAT runtime config/state (`oat config get/set/list/describe` is the preferred interface).
- Treat `.oat/sync/manifest.json` and `.oat/sync/config.json` as sync runtime state/config.
- Treat project artifacts under `.oat/projects/**` as lifecycle source-of-truth for workflow execution.
- Keep `state.md`, `plan.md`, and `implementation.md` consistent after each workflow step.
