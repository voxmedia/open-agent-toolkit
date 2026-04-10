# Plan: `oat project archive pull` + `oat-wrap-up` skill

## Context

The user wants a recurring "shipping digest" capability over OAT projects: given a time window (past week, two weeks, custom date range), produce a single markdown wrap-up describing what shipped — features, bug fixes, new user-facing capabilities — across both OAT-tracked projects and merged PRs.

The initial framing put S3 fetch logic inside the wrap-up skill. During planning the user pivoted to a stronger architectural boundary: syncing archived projects down from S3 is a general OAT capability (teammates' projects should be visible to every OAT workflow, not just this one), so it belongs as a CLI primitive. With archives hydrated locally, the wrap-up skill collapses to a local-read + PR-fetch + synthesis flow.

This plan therefore delivers two sequenced units:

1. **Phase 1** — `oat project archive pull` CLI command that downloads S3-archived snapshots into the local archive directory, idempotent and safe to re-run.
2. **Phase 2** — `oat-wrap-up` skill (authored via `create-oat-skill`) that reads local summaries only, merges them with merged-PR metadata, and writes a date-ranged wrap-up report.

Each phase is its own PR / OAT project; Phase 2 depends on Phase 1 being shipped so teammate archives can be pulled before a wrap-up is generated.

---

## Decisions locked during planning

| Decision                | Choice                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Skill authoring pattern | `create-oat-skill` (produces portable skill + adds OAT conventions)                             |
| Report destination      | New config key `archive.wrapUpExportPath`, default `.oat/repo/reference/wrap-ups/`              |
| PR coverage             | All merged PRs in window, grouped into "shipped via OAT projects" vs "other merged PRs"         |
| Time range input        | Named ranges (`--past-week`, `--past-2-weeks`, `--past-month`) AND explicit `--since`/`--until` |
| S3 fetch                | Extracted out of the skill; replaced by the Phase 1 CLI command                                 |
| Automation              | Manual/model-invocable skill + documented recipes; OAT does not grow a scheduler                |
| CLI command name        | `oat project archive pull`                                                                      |

---

## Phase 1 — `oat project archive pull` CLI command

### Command shape

```
oat project archive pull [options]

Options:
  --since <YYYY-MM-DD>   Only pull snapshots dated on/after this date
  --until <YYYY-MM-DD>   Only pull snapshots dated on/before this date (default: today)
  --project <name>       Only pull snapshots whose project name matches
  --force                Re-pull snapshots already present locally
  --dry-run              List what would be pulled without downloading
  --json                 Machine-readable output
```

Default (no filters): pull every missing snapshot in the repo's S3 prefix.

### Algorithm

1. **Resolve config.** Call `resolveEffectiveConfig()` at `packages/cli/src/config/resolve.ts:75` to get `archive.s3Uri`. If unset, exit 1 with actionable error naming the config key.
2. **Gate on AWS CLI.** Call existing `ensureS3ArchiveAccess({ mode: 'sync', s3Uri, syncOnComplete: false })` at `packages/cli/src/commands/project/archive/archive-utils.ts:453`. Mode `'sync'` already throws `CliError` on missing/unconfigured AWS — exactly the right behavior for an explicit pull.
3. **List remote snapshots.** Build the S3 prefix via `buildRepoArchiveS3Uri(s3Uri, repoRoot)` at `archive-utils.ts:118`. Shell out to `aws s3api list-objects-v2 --bucket ... --prefix ... --delimiter /` to enumerate top-level snapshot directory names. (Prefer `list-objects-v2` over `aws s3 ls` for reliable pagination + JSON output.)
4. **Parse snapshot names.** For each listing, call `parseArchiveSnapshotName()` at `archive-utils.ts:154` to get `{ projectName, snapshotName, dateStamp }`. Discard entries with no date stamp (not in OAT snapshot format).
5. **Apply filters.** Filter on `--since`, `--until`, `--project` against the parsed fields.
6. **Diff against local.** For each candidate:
   - Scan `.oat/projects/archived/` (and timestamp-suffixed variants created by `resolveUniqueArchivePath` at `archive-utils.ts:300`).
   - Read each existing archive's `.oat-archive-source.json` (`ARCHIVE_SNAPSHOT_METADATA_FILENAME` at `archive-utils.ts:77`) to recover its `snapshotName`.
   - Skip if already present, unless `--force`.
7. **Download.** For each missing snapshot:
   - Determine target path via `resolveLocalArchiveProjectPath(projectsRoot, projectName)` at `archive-utils.ts:188`, then `resolveUniqueArchivePath` if the dir already exists.
   - Run `aws s3 sync {snapshotS3Uri}/ {targetPath}/` with `--exclude` patterns from `S3_ARCHIVE_SYNC_EXCLUDES` at `archive-utils.ts:83`.
   - Write `.oat-archive-source.json` at the new path using `writeArchiveSnapshotMetadata` so future pulls dedupe correctly.
8. **Report.** Per-snapshot lines (`✓ pulled`, `⊙ skipped`, `✗ failed`), totals at the end. Honor `--json` via a structured payload. Honor `--dry-run` by skipping steps 7–8 entirely.

### Files to create

- `packages/cli/src/commands/project/archive/pull.ts` — handler + orchestration.
- `packages/cli/src/commands/project/archive/pull.test.ts` — unit tests with injected `execFile` / `listObjects` / `fs` dependencies, matching the DI pattern in `archive-utils.ts`.

### Files to modify

- `packages/cli/src/commands/project/archive/index.ts` — register the new subcommand.
- `packages/cli/src/commands/project/archive/archive-utils.ts` — add small helper `scanLocalArchiveSnapshots(archivedDir)` that enumerates metadata files and returns `Map<snapshotName, archivePath>`. Export it.

### Reusable building blocks (Phase 1)

| Need                     | Function                             | Location                                |
| ------------------------ | ------------------------------------ | --------------------------------------- |
| AWS access gate          | `ensureS3ArchiveAccess`              | `archive-utils.ts:453`                  |
| Repo S3 prefix           | `buildRepoArchiveS3Uri`              | `archive-utils.ts:118`                  |
| Snapshot S3 URI          | `buildProjectArchiveS3Uri`           | `archive-utils.ts:122`                  |
| Snapshot name parser     | `parseArchiveSnapshotName`           | `archive-utils.ts:154`                  |
| Local archive path       | `resolveLocalArchiveProjectPath`     | `archive-utils.ts:188`                  |
| Unique-path-on-collision | `resolveUniqueArchivePath`           | `archive-utils.ts:300`                  |
| Metadata filename        | `ARCHIVE_SNAPSHOT_METADATA_FILENAME` | `archive-utils.ts:77`                   |
| Metadata writer          | `writeArchiveSnapshotMetadata`       | `archive-utils.ts:314`                  |
| Sync excludes            | `S3_ARCHIVE_SYNC_EXCLUDES`           | `archive-utils.ts:83`                   |
| Effective config         | `resolveEffectiveConfig`             | `packages/cli/src/config/resolve.ts:75` |
| CLI error class          | `CliError`                           | `@errors/cli-error`                     |

### Exit semantics

- `0` — success (including "nothing to pull").
- `1` — user error (invalid date, unset config, no matches with `--strict` if added).
- `2` — system error (AWS CLI missing / unconfigured in `mode: 'sync'`, network failure).

### Tests (Phase 1)

- List → parse → filter: mock `list-objects-v2` output; verify `--since`, `--until`, `--project` narrowing.
- Dedup: seed local archives with metadata files; verify skip logic; verify `--force` overrides.
- Dry-run: no `aws s3 sync` invocation; correct preview output.
- Missing config: actionable error, exit 1.
- AWS unavailable: `CliError` from `ensureS3ArchiveAccess` propagates, exit 2.
- Collision handling: target dir exists → new path gets timestamp suffix via `resolveUniqueArchivePath`.

---

## Phase 2 — `oat-wrap-up` skill

### Skill shape

- **Path**: `.agents/skills/oat-wrap-up/SKILL.md`
- **Authoring pattern**: `create-oat-skill` — wraps `create-agnostic-skill`, adds OAT conventions (mode assertion, `OAT ▸ WRAP-UP` progress banner, `{PROJECTS_ROOT}` resolution). Still produces a portable skill that runs on Claude, Codex, Gemini, Cursor, etc.
- **Frontmatter**:
  ```yaml
  name: oat-wrap-up
  version: 1.0.0
  description: Use when preparing a shipping digest or weekly/biweekly wrap-up summarizing OAT projects and merged PRs over a time window. Reads local summary files and GitHub PR metadata; writes a version-controlled markdown report.
  argument-hint: '[--since YYYY-MM-DD] [--until YYYY-MM-DD] [--past-week|--past-2-weeks|--past-month] [--output <path>] [--dry-run]'
  allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
  user-invocable: true
  ```

### Arguments

- `--since YYYY-MM-DD` / `--until YYYY-MM-DD` — explicit window (inclusive); `--until` defaults to today.
- `--past-week` / `--past-2-weeks` / `--past-month` — named shortcuts that resolve to concrete dates; mutually exclusive with `--since`.
- `--output <path>` — override the report destination.
- `--dry-run` — print to stdout, do not write a file.

Resolved dates are printed in the report header for reproducibility.

### Algorithm (SKILL.md step-by-step)

1. **Banner + mode assertion.** Print `────── OAT ▸ WRAP-UP ──────`. Fail fast if no `.oat/` directory. If `archive.s3Uri` is configured and `.oat/projects/archived/` contains no `.oat-archive-source.json` files, warn and suggest running `oat project archive pull` first so the wrap-up reflects the whole team's work.
2. **Resolve inputs.** Parse args. Resolve named ranges against today (absolute date conversion per user memory rule). Validate date format. Compute `window_label` (`past-week` / `past-2-weeks` / `past-month` / `custom`).
3. **Resolve config** via `oat config get`:
   - `projects.root` → `{PROJECTS_ROOT}` (fallback `.oat/projects/shared`).
   - `archive.summaryExportPath` → version-controlled summary directory (may be unset).
   - `archive.wrapUpExportPath` → version-controlled wrap-up directory (**new key**; fallback `.oat/repo/reference/wrap-ups`).
   - `gh repo view --json nameWithOwner --jq .nameWithOwner` → `{owner}/{name}` for PR search.
4. **Discover summary files.** Build a candidate set from three locations and dedupe:
   - Active: `{PROJECTS_ROOT}/*/summary.md` (handle multi-scope too: `.oat/projects/*/*/summary.md`).
   - Local archive (populated by Phase 1 + local completions): `.oat/projects/archived/*/summary.md` including timestamp-suffixed variants.
   - Version-controlled export: `{summaryExportPath}/*.md` if set.
5. **Parse and filter each summary.**
   - Confirm it's an OAT summary: frontmatter `oat_generated: true` OR filename matches `{YYYYMMDD}-{project}.md`.
   - Extract date (priority): `oat_last_updated` → `{YYYYMMDD}` from filename/parent (via `parseArchiveSnapshotName`) → file mtime.
   - Keep summaries whose date falls in `[since, until]`.
   - Extract project name from frontmatter, parent directory name, or parsed snapshot name.
6. **Dedupe by project name.** Same project may appear in multiple locations. Prefer the copy with latest `oat_last_updated`; ties broken by location priority (active > archived > exported).
7. **Fetch merged PRs.** Shell out:
   ```
   gh api graphql -f query='...SEARCH_MERGED_PRS_QUERY...' \
     -f variables='{"searchQuery":"is:pr is:merged merged:<since>..<until> repo:<owner>/<name>","first":25}'
   ```
   Reuse the exact search query pattern from `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts:198-205`. Paginate via the `endCursor` pattern from the same file. Capture number, title, author, mergedAt, labels, body.
8. **Cross-reference PRs to OAT projects.** For each merged PR, check if it's referenced from any included summary (scan summary body text; also scan the project's `pr/` directory if the summary path has a sibling). Partition into `ShippedViaOat` and `OtherMerged`.
9. **Synthesize the report.** Compose markdown using the structure below. Features / Bug fixes / New capabilities are _synthesized_ by the host agent reading each summary's Overview and What Was Implemented sections — not string-concatenated. Apply the summary template's section omission rule (omit empty sections).
10. **Write or print.** Destination: `{repoRoot}/{wrapUpExportPath}/{YYYY-MM-DD}-wrap-up-{label}.md`. Override with `--output`. `--dry-run` prints to stdout only.
11. **Final banner.** `OAT ▸ WRAP-UP ▸ DONE — <N> summaries + <M> PRs → <path>`.

### Report structure

```markdown
---
oat_wrap_up: true
oat_generated: true
window_since: YYYY-MM-DD
window_until: YYYY-MM-DD
window_label: past-week
generated_at: <ISO timestamp>
---

# Wrap-up: YYYY-MM-DD to YYYY-MM-DD

## TL;DR

{2–4 sentences: headline of what shipped}

## Features introduced

{bullet list — one paragraph per feature: what shipped, where, linked PR(s)}

## Bug fixes

{bullet list}

## New user-facing capabilities

{for each: what it does, how to use it (commands, flags, URLs), link back to summary + PR}

## Shipped via OAT projects

{table: project | window date | PR | one-line outcome}

## Other merged PRs

{table: PR # | title | author | merged date}

## Open follow-ups

{aggregated Follow-up Items across included summaries}

## Included summaries (provenance)

{list of summary file paths used}
```

### Config addition

Add `archive.wrapUpExportPath?: string` to `OatArchiveConfig` in `packages/cli/src/config/oat-config.ts:20-24`, mirroring the existing `summaryExportPath` handling:

- Normalization: reuse the pattern at `oat-config.ts:183-190` (trim, strip trailing slashes, `normalizeToPosixPath`).
- Default in `resolveEffectiveConfig`: `.oat/repo/reference/wrap-ups`.
- Empty-string override disables the default and requires `--output`.

### Files to create

- `.agents/skills/oat-wrap-up/SKILL.md`
- `.agents/skills/oat-wrap-up/references/report-template.md` — report skeleton consumed by step 9.
- `.agents/skills/oat-wrap-up/references/automation-recipes.md` — loaded on demand; contains Claude Code `CronCreate`, Codex, and plain-cron recipes.

### Files to modify

- `packages/cli/src/config/oat-config.ts` — add `wrapUpExportPath` field + normalization branch.
- `packages/cli/src/config/resolve.ts` — add default entry for `archive.wrapUpExportPath` in the defaults map around lines 41–68.
- `packages/cli/scripts/bundle-assets.sh` — add `oat-wrap-up` to `SKILLS` (alphabetical).
- `packages/cli/src/commands/init/tools/workflows/install-workflows.ts` — add `oat-wrap-up` to `WORKFLOW_SKILLS`.
- `AGENTS.md` — if it enumerates canonical skills by name, add the entry (verify during implementation; per the skills_system block it may not).

### Reusable building blocks (Phase 2)

| Need                                             | Function / pattern                                | Location                                                                                                                      |
| ------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Effective config                                 | `resolveEffectiveConfig`                          | `packages/cli/src/config/resolve.ts:75` (consumed indirectly via `oat config get`)                                            |
| Snapshot name parser                             | `parseArchiveSnapshotName`                        | `archive-utils.ts:154` (invoked from bash via small shell logic or an `oat` helper subcommand — or inline regex in the skill) |
| Merged-PR GraphQL query                          | `SEARCH_MERGED_PRS_QUERY` + search-string pattern | `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts:198-205` and `graphql-queries.ts`                     |
| Skill scaffolding workflow                       | `create-oat-skill`                                | `.agents/skills/create-oat-skill/SKILL.md`                                                                                    |
| Reference model for artifact-producing OAT skill | `oat-docs-analyze`                                | `.agents/skills/oat-docs-analyze/SKILL.md`                                                                                    |
| Summary frontmatter schema                       | `oat_generated`, `oat_last_updated`               | `.oat/templates/summary.md:1-12`                                                                                              |

### Automation recipes (referenced from SKILL.md)

`.agents/skills/oat-wrap-up/references/automation-recipes.md` documents three patterns:

1. **Claude Code (`CronCreate`)** — recurring trigger sending `/oat-wrap-up --past-week` every Monday 09:00. Example trigger JSON inline.
2. **Codex host** — equivalent scheduled-trigger call for Codex's runtime if one exists; otherwise direct user to plain-cron recipe.
3. **Plain cron / CI** — crontab entry that runs `claude -p "/oat-wrap-up --past-week"` (or the Codex headless equivalent) on a schedule, then `git add` + commit the resulting file. Example crontab and systemd timer unit.

Rationale (baked into the skill doc): `.agents/docs/agent-instruction.md:18` explicitly scopes scheduling out of OAT, so the skill mirrors that position rather than introducing an OAT scheduler.

### Tests (Phase 2)

- Config normalization: unit tests in `packages/cli/src/config/oat-config.test.ts` (if it exists) for `wrapUpExportPath` trim / posix / empty-string behavior. Add if missing.
- Skill validator: `pnpm oat:validate-skills` passes.
- Skill self-verification: document a reproducible dry-run invocation in the SKILL.md success criteria so future edits can verify it still works.

---

## Verification

### Phase 1

- `pnpm --filter @open-agent-toolkit/cli test` — new `pull.test.ts` passes.
- `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check` — clean.
- Manual smoke against a scratch bucket: upload two fake snapshot dirs via `aws s3 cp --recursive`, run `oat project archive pull --dry-run` → `oat project archive pull`, confirm both land under `.oat/projects/archived/` with metadata files, re-run and verify both are skipped.
- Collision test: create a duplicate of an archived project name locally, run pull, verify new copy gets a timestamp suffix.
- `pnpm release:validate` — required because `packages/cli` is publishable and shipped behavior changes. Per `AGENTS.md` definition-of-done for publishable packages. Public package versions must be bumped in the same PR (lockstep guardrail).

### Phase 2

- `oat sync --scope all` — the new canonical skill appears in all provider views.
- `pnpm oat:validate-skills` — passes; frontmatter includes `version: 1.0.0` per `create-oat-skill` success criteria.
- `pnpm --filter @open-agent-toolkit/cli test` — config normalization tests pass.
- End-to-end in this repo: invoke `/oat-wrap-up --past-2-weeks --dry-run` in Claude Code and verify the generated report discovers recent summaries under `.oat/projects/shared/` and `.oat/repo/reference/project-summaries/` (both present in this repo), correctly partitions merged PRs into OAT-linked vs other, and prints provenance for each included summary.
- Without `--dry-run`: confirm file lands at `.oat/repo/reference/wrap-ups/{today}-wrap-up-past-2-weeks.md`, formatted per the report structure.
- Portability smoke: verify `SKILL.md` body references tools only from `allowed-tools` and documents the runtime split for question-asking (Claude Code `AskUserQuestion` / Codex equivalent / plain text fallback) per `create-oat-skill` step 3.
- `pnpm release:validate` — required (publishable-package files are touched via the new config key).

---

## Sequencing

- **PR 1**: Phase 1 only — new CLI subcommand, tests, docs. OAT project scope e.g. `oat-project-archive-pull`.
- **PR 2**: Phase 2 only — skill, config key, bundle wiring, tests. Depends on PR 1 being released so local archives can be populated cross-teammate before the wrap-up runs in anger. OAT project scope e.g. `oat-wrap-up-skill`.

Both phases match the **Quick workflow** from the feature-planning triage (bounded features, clear requirements, clear interfaces). Each gets its own OAT project via `oat-project-quick-start`.
