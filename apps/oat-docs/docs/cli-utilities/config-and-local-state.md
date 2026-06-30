---
title: Config and Local State
description: Utility command groups for config discovery, backlog helpers, local paths, instruction integrity, and diagnostics.
---

# Config and Local State

This page covers the general-purpose OAT command groups that support configuration discovery, local-only state, backlog maintenance, instruction integrity, and diagnostics.

Use these commands when you need operational support around the toolkit rather than one of the deeper product lanes.

## `oat backlog ...`

Use the `oat backlog` group when you want direct CLI support for the file-backed backlog under `.oat/repo/pjm/backlog/`.

- `oat backlog init` - scaffold `.oat/repo/pjm/backlog/` with starter files and directories for a fresh repo
- `oat backlog generate-id <title>` - generate a deterministic `BL-YYMMDD-slug` backlog ID from a title
- `oat backlog generate-id <title> --created-at <timestamp>` - generate a reproducible ID for a known creation timestamp
- `oat backlog regenerate-index` - rebuild the managed backlog index table from item frontmatter

Backlog IDs are deterministic date+slug identifiers (`BL-YYMMDD-slug`) derived from the creation date and title, so two machines or worktrees produce the same ID for the same record without scanning the local checkout. The slug is capped at 30 characters at the last whole-word boundary (with trailing stop-words trimmed), so prefer concise, meaningful titles. Index regeneration is deterministic and safe to re-run when resolving an index merge conflict.

Run `oat backlog init` first when the local backlog scaffold does not exist yet in a fresh repo. This command group is primarily used by the `oat-pjm-*` project-management skills, but it is also available directly when you need to inspect or repair backlog metadata by hand.

For full project-management repo-reference setup, use [`oat pjm init`](tool-packs.md#install-vs-initialize). It scaffolds the two-layer PJM surface (`pjm/current-state.md`, `pjm/roadmap.md`, `reference/decisions/`, and AGENTS guides) and delegates the backlog sub-surface to `oat backlog init`.

## `oat decision ...`

Use the `oat decision` group for file-per-record decisions under `.oat/repo/reference/decisions/`. Each decision is its own file with a deterministic `DR-YYMMDD-slug` ID (the slug is capped at 30 characters at the last whole-word boundary, with trailing stop-words trimmed), and the human-facing index is a committed generated view.

- `oat decision init` - scaffold `.oat/repo/reference/decisions/` and the managed decision index
- `oat decision new <title>` - create a new decision record; supports `--status`, `--context`, and `--created-at`
- `oat decision regenerate-index` - rebuild the managed decision index table from record frontmatter
- `oat decision migrate` - convert a legacy single `decision-record.md` into file-per-record decisions, preserving each old `ADR-NNN`/`DR-NNN` ID as `legacy_id`; applies by default, so pass `--dry-run` to preview the legacy-to-new mappings without writing, and `--delete-legacy` to remove the source file after a verified migration (unlike `oat pjm migrate`, which defaults to dry-run)

The decision index uses managed marker pairs and is deterministic, so an index merge conflict can be resolved by re-running `oat decision regenerate-index` and staging the result. Decision records replace the legacy single `decision-record.md`; repos still on the old layout migrate with `oat decision migrate` (or the broader `oat pjm migrate`).

## `oat local ...`

`oat local` manages local-only, gitignored paths that still need to follow you between the main repo and worktrees.

Common examples:

- `.oat/ideas/`
- `.oat/**/reviews/archived/`

Available commands:

- `oat local status` - show whether configured local paths exist and are gitignored
- `oat local apply` - write the managed `.gitignore` section for configured paths
- `oat local sync` - copy local paths between the main repo and a worktree
- `oat local add` / `oat local remove` - maintain the `localPaths` config entries

Use this when you want archived review history or idea scratchpads to persist locally without being committed.

## `oat config ...`

Use `oat config` for repo runtime config inspection and supported key mutation.

- `oat config get <key>` - read one resolved config value
- `oat config set <key> <value>` - update a supported shared or repo-local key
- `oat config list` - show the resolved command-surface values with source information
- `oat config dump --json` - emit the full merged config payload with per-key source attribution, suitable for automation and debugging
- `oat config describe` - list supported config surfaces and keys across shared repo, repo-local, user, and sync/provider config
- `oat config describe <key>` - show file location, scope, default, mutability, and owning command for one key

Use `oat config dump --json` when you need the whole resolved config in one machine-readable response rather than a single key or a human-oriented list view.

Archive lifecycle settings live here as shared repo config:

- `archive.s3Uri`
- `archive.s3SyncOnComplete`
- `archive.summaryExportPath`
- `archive.wrapUpExportPath`
- `archive.awsProfile`
- `archive.awsRegion`

`archive.awsProfile` and `archive.awsRegion` are forwarded as `AWS_PROFILE` / `AWS_REGION` env vars into every `aws` spawn that runs during `oat-project-complete` and `oat repo archive sync`, and they override any values already set in the parent shell — the repo's archive-scoped declaration wins so users don't have to remember to unset `AWS_PROFILE` per shell. The per-invocation `oat repo archive sync --profile <profile>` and `--region <region>` flags then override the config for a single run, giving precedence `flag > config > shell env`. When neither flag nor config is set, the parent shell's `AWS_PROFILE` / `AWS_REGION` pass through unchanged. Raw access keys (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) remain a shell-environment concern — there is no config plumbing for them.

Tool-pack installation state also lives here as shared repo config:

- `tools.core`
- `tools.docs`
- `tools.ideas`
- `tools.project-management`
- `tools.research`
- `tools.utility`
- `tools.workflows`

Use `oat config get tools.<pack>` when you need an explicit installed-capability signal for workflows or troubleshooting. PJM diagnostics use `tools.project-management`; disabled or unset repos report PJM as skipped instead of treating absent `.oat/repo/pjm/` files as drift.

Workflow automation preferences are also visible through `oat config` and can be set at local, shared, or user scope. Notable review-loop keys:

- `workflow.autoArtifactReview.plan` - default-on bounded artifact review for generated `plan.md` files before implementation handoff
- `workflow.autoArtifactReview.analysis` - default-on bounded accuracy review for generated docs and agent-instructions analysis artifacts before apply workflows consume them

Use `oat config describe workflow.autoArtifactReview.plan` or `oat config describe workflow.autoArtifactReview.analysis` to inspect precedence, defaults, and writable surfaces. Set either key to `false` only when you intentionally want to bypass that generated-artifact review loop:

```bash
oat config set workflow.autoArtifactReview.plan false --shared
oat config set workflow.autoArtifactReview.analysis false --local
```

When archive settings are configured, completion uploads dated archive snapshots to S3, exports dated summary snapshots into the configured summary reference directory, and lets `oat-wrap-up` write tracked wrap-up reports into the configured wrap-up directory.

## `oat gate ...`

Use `oat gate` when a gate-aware skill should run a configured final command
before it is considered done.

Available commands:

- `oat gate resolve <skill>` - inspect the resolved gate config for one skill
- `oat gate set <skill>` / `oat gate unset <skill>` - write or clear a skill gate
- `oat gate target set <id>` / `oat gate target unset <id>` - write or clear an exec target
- `oat gate review <prompt...>` - run a review-specific gate and map blocking review findings to exit status
- `oat gate cross-provider-exec <prompt...>` - select an available exec target and run the prompt there

Use `oat gate review` for OAT review gates. It keeps the normal stateful
review-provider workflow: the review artifact, Reviews row update, and review
bookkeeping commits are expected, and the produced review must be received with
`oat-project-review-receive` before the host treats it as dispositioned.

Use `oat gate cross-provider-exec` for generic cross-runtime execution. It
avoids the current runtime by default, chooses a fresh Codex, Claude, or Cursor
target when available, and exits with the child process status. Target commands
are stored as JSON argv arrays, so configure them with
`oat gate target set --base-command-json ...` rather than `oat config set`.

For schema, examples, and current V1 limits, see [Workflow Gates](workflow-gates.md).

Use these reference pages for file ownership and schema details:

- [File Locations](../reference/file-locations.md)
- [`.oat` Directory Structure](../reference/oat-directory-structure.md)
- [Sync Config (`.oat/sync/config.json`)](../provider-sync/config.md)

## `oat instructions ...`

These commands validate and repair project-scoped instruction integrity between `AGENTS.md` and sibling `CLAUDE.md` files.

- `oat instructions validate` - read-only integrity check with `--strategy pointer|symlink|copy`
- `oat instructions sync` - preview or apply pointer, symlink, or hard-copy repairs

Use this command group when instruction files drift after manual edits or generated updates, or when nested project directories contain Claude-only stray files that should be adopted into canonical `AGENTS.md`.

Operational notes:

- Validation and sync use the same recursive scan model, so `--dry-run` previews the same states that `validate` reports.
- `pointer` is the default strategy; `symlink` and `copy` make file shape part of correctness.
- Unreadable canonical `AGENTS.md` files and unreadable Claude-only sources are surfaced as drift, but sync leaves them in manual-repair mode instead of guessing at recovery.

For the full state model, repair semantics, and examples, see [Instruction Sync](../provider-sync/instruction-sync.md).

## Repo state helpers

- `oat state refresh` - rebuild the generated, gitignored `.oat/state.md` dashboard for the repo
- `oat index init` - generate a lightweight `project-index.md` for orientation

## Internal helpers and diagnostics

- `oat internal validate-oat-skills` - validate `oat-*` skill contracts and metadata
- `oat doctor` - run environment and setup diagnostics, including installed-vs-bundled skill version checks

`oat doctor` is the quickest way to confirm that your runtime, directory structure, and installed OAT assets are healthy before deeper debugging. The `/oat-doctor` skill (installed via the core pack) provides richer diagnostics with check and summary modes, including config explanations sourced from bundled documentation.
