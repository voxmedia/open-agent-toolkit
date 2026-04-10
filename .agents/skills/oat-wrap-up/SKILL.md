---
name: oat-wrap-up
version: 1.0.0
description: Use when preparing a shipping digest or weekly/biweekly wrap-up summarizing OAT projects and merged PRs over a time window. Reads local summary files and GitHub PR metadata; writes a version-controlled markdown report.
argument-hint: '[--since YYYY-MM-DD] [--until YYYY-MM-DD] [--past-week|--past-2-weeks|--past-month] [--output <path>] [--dry-run]'
disable-model-invocation: false
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
---

# Wrap-Up

Read local OAT project summaries plus merged PRs over a time window, synthesize a shipping digest (features, bug fixes, new user-facing capabilities), and write a markdown report to a version-controlled directory.

## When to Use

Use when:

- Preparing a weekly, biweekly, or ad-hoc "what shipped" digest for a team retrospective or stakeholder update.
- Generating a release-notes seed from OAT-tracked projects and merged PRs over a specific window.
- Capturing an audit trail of what a team accomplished over a fixed period.

## When NOT to Use

Don't use when:

- You need a single specific project's summary — use `oat-project-summary` instead.
- You want an always-current status view without a fixed window — the wrap-up is window-scoped by design.
- Archived projects from teammates have not been hydrated locally yet — run `oat project archive sync` first so the digest reflects the full team's work. The skill warns if this looks undone but will not auto-run sync.

## Arguments

Parse from `$ARGUMENTS`:

- `--since YYYY-MM-DD`: (optional) Explicit window start date (inclusive).
- `--until YYYY-MM-DD`: (optional) Explicit window end date (inclusive). Defaults to today.
- `--past-week`: (optional) Named shortcut — last 7 days ending today.
- `--past-2-weeks`: (optional) Named shortcut — last 14 days ending today.
- `--past-month`: (optional) Named shortcut — last 30 days ending today.
- `--output <path>`: (optional) Override the report destination. Bypasses the `archive.wrapUpExportPath` config.
- `--dry-run`: (optional) Print the report to stdout instead of writing a file.

Exactly one time-range specifier is required: either a named range (`--past-week` / `--past-2-weeks` / `--past-month`) OR `--since` (with optional `--until`). Named ranges and `--since` are mutually exclusive.

## Prerequisites

- Repository is an OAT project (contains `.oat/`).
- For cross-teammate visibility: `oat project archive sync` has been run recently so teammates' archived projects are hydrated into `.oat/projects/archived/`. The skill warns if `archive.s3Uri` is configured but the local archive has no `.oat-archive-source.json` metadata files.
- `gh` CLI authenticated for the current repository (needed for merged-PR fetching via `gh api graphql`).

## Mode Assertion

**OAT MODE: Wrap-Up**

**Purpose:** Produce a date-ranged shipping digest over OAT-tracked projects and merged PRs.

**BLOCKED Activities:**

- No modifying OAT project summaries, plan files, or other implementation artifacts.
- No auto-running `oat project archive sync` — it is a user-gated prerequisite, not a side effect of this skill.
- No network writes of any kind. The GitHub API is read-only.

**ALLOWED Activities:**

- Reading local OAT summary files from active projects, local archive, and the version-controlled export directory.
- Fetching merged-PR metadata via `gh api graphql`.
- Writing a single markdown wrap-up report to the configured destination (or stdout on `--dry-run`).

**Self-Correction Protocol:**

If you catch yourself:

- About to modify a summary file → STOP, the skill is strictly read-only against summaries.
- About to auto-run `oat project archive sync` → STOP, the skill only warns; the user runs sync themselves.
- About to string-concatenate summary prose verbatim → STOP, the report is a synthesis, not a concatenation.
- About to skip the prerequisite warning when the local archive is empty and S3 is configured → STOP, emit the warning first.

**Recovery:**

1. Return to read-only discovery.
2. Re-derive any partially written output from the summaries and PR data captured so far.
3. Restart from the current step.

## Progress Indicators (User-Facing)

Print the phase banner once at start:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ WRAP-UP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Print each step indicator at the **start** of that step, not all at once upfront:

- `[1/9] Resolving inputs…`
- `[2/9] Resolving config…`
- `[3/9] Discovering summary files…`
- `[4/9] Parsing + filtering summaries…`
- `[5/9] Deduping by project…`
- `[6/9] Fetching merged PRs…`
- `[7/9] Cross-referencing PRs to OAT projects…`
- `[8/9] Synthesizing report…`
- `[9/9] Writing report…`

After step 9, print the final banner on a single line:

`OAT ▸ WRAP-UP ▸ DONE — <N> summaries + <M> PRs → <path>`

On `--dry-run`, replace `<path>` with `stdout (dry-run)`.

## Process

### Step 0: Archive-Sync Prerequisite Warning

Before any step indicator fires, check whether the local archive likely needs to be hydrated. Resolve the projects root and probe for archived metadata:

```bash
set -eu
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
ARCHIVE_DIR="$(dirname "$PROJECTS_ROOT")/archived"
S3_URI="$(oat config get archive.s3Uri 2>/dev/null || true)"

if [ -n "$S3_URI" ] && [ -d "$ARCHIVE_DIR" ]; then
  if ! find "$ARCHIVE_DIR" -maxdepth 2 -name '.oat-archive-source.json' 2>/dev/null | grep -q . ; then
    printf '⚠️  archive.s3Uri is configured but no archived snapshots are hydrated locally.\n'
    printf '    Run "oat project archive sync" first so teammates archived projects are visible to the wrap-up.\n'
    printf '    (Proceeding with active projects and the version-controlled summaries directory only.)\n'
  fi
elif [ -n "$S3_URI" ]; then
  printf '⚠️  archive.s3Uri is configured but %s does not exist.\n' "$ARCHIVE_DIR"
  printf '    Run "oat project archive sync" first so archived projects are available.\n'
  printf '    (Proceeding with active projects and the version-controlled summaries directory only.)\n'
fi
```

The `[ -d "$ARCHIVE_DIR" ]` guard protects against parent shells inheriting `set -o pipefail`, where `find` on a missing directory could fail the pipeline. The differentiated branch also gives clearer guidance when the directory is missing entirely versus merely empty of metadata.

Do NOT block on this warning. Continue to Step 1.

### Step 1: Resolve Inputs

Parse `$ARGUMENTS` and resolve the time window into concrete `SINCE` and `UNTIL` dates:

- If a named range (`--past-week` / `--past-2-weeks` / `--past-month`) is provided, compute:
  - `UNTIL` = today (ISO `YYYY-MM-DD` in the local timezone)
  - `SINCE` = `UNTIL` minus 7 / 14 / 30 days respectively
  - `WINDOW_LABEL` = the range name (`past-week` / `past-2-weeks` / `past-month`)
- If `--since YYYY-MM-DD` is provided, use it directly. `--until` defaults to today when omitted. `WINDOW_LABEL` = `custom`.
- If both named range and `--since` are provided, fail with `Error: --past-week / --past-2-weeks / --past-month are mutually exclusive with --since.`
- If neither is provided, fail with `Error: specify either --past-week / --past-2-weeks / --past-month or --since YYYY-MM-DD.`
- Validate that `SINCE` and `UNTIL` parse as `YYYY-MM-DD` and that `SINCE <= UNTIL`.

Resolve `--output` if present; otherwise leave it null (the destination will be computed in Step 2 from config).

Resolve `--dry-run` to a boolean.

Print the resolved window for reproducibility:

```
Window: SINCE → UNTIL (WINDOW_LABEL)
```

### Step 2: Resolve Config

Resolve the configuration surface via `oat config get`:

```bash
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
SUMMARY_EXPORT_PATH="$(oat config get archive.summaryExportPath 2>/dev/null || true)"
WRAPUP_EXPORT_PATH="$(oat config get archive.wrapUpExportPath 2>/dev/null || true)"
if [ -z "$WRAPUP_EXPORT_PATH" ]; then
  WRAPUP_EXPORT_PATH=".oat/repo/reference/wrap-ups"
fi
REPO_NAME_WITH_OWNER="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
```

- `SUMMARY_EXPORT_PATH` may be empty. When empty, Step 3 skips that discovery location.
- `WRAPUP_EXPORT_PATH` falls back to `.oat/repo/reference/wrap-ups` because `oat config get` returns empty when unset. This fallback lives in the skill, not in the CLI, to match the sibling `archive.summaryExportPath` behavior.
- `REPO_NAME_WITH_OWNER` must resolve successfully — fail fast if `gh repo view` errors (auth issue or wrong cwd).

If `--output` was set in Step 1, use it as the final destination. Otherwise the destination is:

```
<repoRoot>/<WRAPUP_EXPORT_PATH>/<UNTIL>-wrap-up-<WINDOW_LABEL>.md
```

### Step 3: Discover Summary Files

Build a candidate set from three local locations. Use `Glob` for each and collect absolute paths:

1. **Active projects**: `${PROJECTS_ROOT}/*/summary.md` AND multi-scope `.oat/projects/*/*/summary.md` (some repos use scope subdirectories under `.oat/projects/`).
2. **Local archive**: `.oat/projects/archived/*/summary.md`. Also include timestamp-suffixed variants like `.oat/projects/archived/*-[0-9]*/summary.md` (created by `resolveUniqueArchivePath` when the same project is archived twice).
3. **Version-controlled export**: `${SUMMARY_EXPORT_PATH}/*.md` — only if `SUMMARY_EXPORT_PATH` is non-empty. Files here follow the `{YYYYMMDD}-{project}.md` naming produced by the completion workflow.

Collect every candidate path into a single list before filtering in Step 4.

### Step 4: Parse and Filter Summaries

For each candidate file:

1. Read the file and parse its YAML frontmatter.
2. Verify OAT origin: the file is an OAT summary if either
   - the frontmatter contains `oat_generated: true`, OR
   - the filename matches the `YYYYMMDD-{project}.md` pattern (export directory format).
     Drop any file that matches neither check.
3. Extract the summary date using this priority order:
   1. Frontmatter `oat_last_updated` (YYYY-MM-DD).
   2. The `{YYYYMMDD}` prefix parsed from the filename or parent directory. Format the prefix as a date.
   3. File `mtime` (last-resort fallback).
4. Extract the project name using this priority order:
   1. Frontmatter `project_name` or similar explicit field if present.
   2. The parent directory basename (strip any timestamp suffix like `-20260403120000`).
   3. The filename-embedded project name (portion after `{YYYYMMDD}-` for the export format).
5. Keep the summary only if its resolved date is within `[SINCE, UNTIL]` (inclusive).

The result is a list of `{projectName, date, path, source, content}` records where `source` is one of `active`, `archived`, `exported`.

### Step 5: Dedupe by Project

The same project can appear in multiple locations (e.g., an active project that was also exported to the version-controlled directory). Dedupe with these rules:

1. Group records by project name.
2. Within each group, prefer the record with the latest `oat_last_updated` frontmatter value (or resolved date if frontmatter is missing).
3. On ties, prefer `source` in this order: `active` > `archived` > `exported`. Rationale: the active project is the freshest copy when work is still in progress; the local archive is the next most recent; the version-controlled export is a historical snapshot.

The result is a list of at most one summary per project, all within the time window.

### Step 6: Fetch Merged PRs

Fetch merged PRs in the window via `gh api graphql`. Reuse the search-string pattern from `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts:198-205`:

```bash
SEARCH_QUERY="is:pr is:merged merged:${SINCE}..${UNTIL} repo:${REPO_NAME_WITH_OWNER}"
```

Paginate using `endCursor` / `hasNextPage` — do not stop at the first page. Capture for each PR: number, title, author login, mergedAt, labels, and body (for cross-reference scanning in Step 7).

Example single-page call (the agent should loop until `hasNextPage` is false):

```bash
gh api graphql \
  -f query='query($searchQuery: String!, $first: Int!, $after: String) {
    search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        ... on PullRequest {
          number
          title
          author { login }
          mergedAt
          labels(first: 20) { nodes { name } }
          body
        }
      }
    }
  }' \
  -f searchQuery="$SEARCH_QUERY" \
  -F first=25
```

Store the flattened PR list for Step 7.

### Step 7: Cross-Reference PRs to OAT Projects

For each merged PR, determine whether it is already "claimed" by an included summary:

1. Collect the set of included summaries from Step 5.
2. For each summary, scan the body text for PR references matching `#<number>`, `github.com/.../pull/<number>`, or the bare PR number when adjacent to keywords like "PR", "merged", "ships in".
3. Build a map of `pr_number → summary.projectName` for every match.

Partition the merged PRs into two groups:

- **Shipped via OAT projects**: PRs whose number appears in the cross-reference map.
- **Other merged PRs**: all other merged PRs in the window.

### Step 8: Synthesize Report

Compose the markdown report by **reading** each included summary and **synthesizing** (not concatenating) its Overview and What Was Implemented sections into the report's narrative sections. Apply the summary template's section-omission rule — omit any report section with no content.

Use the skeleton at `references/report-template.md` as the scaffold. Key synthesis rules:

- **TL;DR**: 2–4 sentences describing the headline of what shipped during the window. This is your summary, written fresh, not a copy of any single project's overview.
- **Features introduced**: one bullet per new feature. Each bullet is a short paragraph naming the capability, where it shipped, and linking the relevant PR(s).
- **Bug fixes**: one bullet per bug fix. Be specific about what broke and what now works.
- **New user-facing capabilities**: for each new capability a user can directly invoke or rely on, describe what it does and how to use it (command, flag, URL, UI affordance). This is where release-notes-level content lives.
- **Shipped via OAT projects**: a compact table listing project name, window date, linked PR(s), and a one-line outcome per project.
- **Other merged PRs**: a compact table listing PR number, title, author, and merged date for merged PRs not claimed by any OAT project summary in the window.
- **Open follow-ups**: aggregate the `Follow-up Items` section across all included summaries. Dedupe similar items.
- **Included summaries (provenance)**: a simple list of the summary file paths consulted, so readers can audit what the report drew from.

If a section would be empty (e.g., no bug fixes shipped during the window), omit it entirely — do not include a "None" placeholder.

### Step 9: Write Report or Print to Stdout

Compose the final markdown document with this frontmatter at the top:

```yaml
---
oat_wrap_up: true
oat_generated: true
window_since: { SINCE }
window_until: { UNTIL }
window_label: { WINDOW_LABEL }
generated_at: { ISO 8601 UTC timestamp }
---
```

Followed by `# Wrap-up: {SINCE} to {UNTIL}` as the H1 and then the synthesized sections from Step 8.

Destination logic:

- If `--dry-run` is set, write the report to stdout. Do not create or modify any file.
- Otherwise, if `--output` was explicitly set in Step 1, write to that path (create parent directories if needed).
- Otherwise, write to `<repoRoot>/<WRAPUP_EXPORT_PATH>/<UNTIL>-wrap-up-<WINDOW_LABEL>.md` (create parent directories if needed).

After the write (or stdout output), print the final banner:

```
OAT ▸ WRAP-UP ▸ DONE — <N_summaries> summaries + <N_prs> PRs → <path_or_stdout>
```

Do NOT commit the resulting file. If the user wants it committed, they run `git add` and `git commit` themselves, or use an automation wrapper (see `references/automation-recipes.md`).

## Examples

### Basic Usage

```
/oat-wrap-up --past-week
```

```
/oat-wrap-up --past-2-weeks --dry-run
```

```
/oat-wrap-up --since 2026-03-20 --until 2026-04-01
```

```
/oat-wrap-up --past-month --output /tmp/march-wrapup.md
```

### Conversational

```
Summarize what shipped this past week across OAT projects and merged PRs.
```

```
Give me a biweekly digest — the last 14 days of shipped work — and write it
to the usual wrap-ups directory.
```

```
Produce a wrap-up for the window 2026-03-20 to 2026-04-01 and print it to stdout
so I can review before committing it.
```

## Reference

- Report skeleton: `references/report-template.md`
- Automation patterns (Claude Code `CronCreate`, Codex host scheduling, plain cron): `references/automation-recipes.md`
- Prerequisite command: `oat project archive sync` at `packages/cli/src/commands/project/archive/index.ts:244`
- Merged-PR query pattern: `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts:198-205`
- Summary frontmatter schema: `.oat/templates/summary.md`
- Config key: `archive.wrapUpExportPath` (managed via `oat config set archive.wrapUpExportPath <path>`)

## Troubleshooting

**`gh repo view` fails with an auth error:**

- Run `gh auth status` and authenticate against the current repository's host.
- Verify the current working directory is inside a git repo with a configured `origin` remote.

**Report is empty or "no summaries found":**

- The window may genuinely have no activity — double-check `SINCE` and `UNTIL`.
- Check whether teammates' archived projects are hydrated: `ls .oat/projects/archived/` should list directories. If empty and `archive.s3Uri` is configured, run `oat project archive sync` first.
- Verify that `.oat/projects/*/*/summary.md` and/or `${SUMMARY_EXPORT_PATH}/*.md` contain files whose `oat_last_updated` falls inside the window.

**Report is missing PRs that clearly merged in the window:**

- Confirm `gh` is authenticated and scoped to the right repo via `gh repo view --json nameWithOwner`.
- Verify the GraphQL search query uses `merged:${SINCE}..${UNTIL}` (inclusive on both ends) — some date-boundary surprises come from the `mergedAt` timestamp being in UTC.
- Check pagination: if the fetch stopped before `hasNextPage: false`, extend the pagination loop.

**`archive.wrapUpExportPath` returns empty from `oat config get` but the skill wrote to a different path:**

- This is expected. The skill's internal fallback is `.oat/repo/reference/wrap-ups` — the config layer itself returns empty for unset values, consistent with the sibling `archive.summaryExportPath` behavior.
- To change the destination, either `oat config set archive.wrapUpExportPath <path>` or use `--output <path>` for a one-off override.

**"Shipped via OAT projects" is empty or "Other merged PRs" contains PRs that clearly correspond to included summaries (false negative):**

- Step 7's cross-reference logic is strict: it only claims a PR for a summary when the summary body literally contains the PR number (`#<n>`, `github.com/.../pull/<n>`, or a bare PR number adjacent to keywords like "PR", "merged", "ships in"), or when a sibling `pr/` directory inside the project references the PR. OAT summaries as authored today (see `.oat/templates/summary.md`) do not inline PR numbers, so in repos that have not adopted the convention of citing PRs in summaries, the cross-reference will often find zero matches and all merged PRs will land in "Other merged PRs".
- **Workaround options (author-time)**: add a short "Associated PRs" section to project summaries and list PR numbers inline, OR populate `pr/` under each project directory with PR metadata so the sibling scan has data to match against.
- **Workaround options (report-time)**: manually re-read the generated report; move PRs from "Other merged PRs" into "Shipped via OAT projects" by hand if the correspondence is obvious (matching keywords in the PR title and the summary's What Was Implemented section). The skill is designed to produce an editable draft, not a final release note.
- This is a v1 limitation. Future versions may add a looser heuristic (e.g., title-keyword matching, commit-to-project mapping via `git log`) to close the gap.

**A PR was partitioned into "Shipped via OAT projects" but the narrative does not mention it (false positive):**

- The `#<number>` pattern can false-positive when a summary references a heading anchor like `#42`, a footnote marker, or a legacy issue number that happens to match a PR number in the window. Step 7's hits are advisory, not authoritative.
- If the synthesized report puts a PR in the wrong bucket, the fix is manual: re-read the summary that claims the PR and the PR's actual body. If the connection is incorrect, move the PR row from "Shipped via OAT projects" to "Other merged PRs" by hand and delete the entry from any feature/bug/capability bullets that cite it.

## Success Criteria

- ✅ Prerequisite warning fired (if applicable) before step 1 started.
- ✅ Time window resolved to concrete `SINCE`/`UNTIL` dates and printed for reproducibility.
- ✅ Config resolution used `archive.wrapUpExportPath` with the documented fallback when unset.
- ✅ Summary discovery covered all three local locations (active, archived, exported).
- ✅ Summaries filtered by `oat_last_updated` within the window and deduped by project with the documented precedence.
- ✅ Merged PRs fetched with pagination and partitioned into "Shipped via OAT projects" vs "Other merged PRs".
- ✅ Report is a synthesis of summary content, not a verbatim concatenation.
- ✅ Report lands at the resolved destination (or stdout on `--dry-run`) with correct frontmatter.
- ✅ Final banner printed with accurate counts and path.
- ✅ No files were modified except the single output report (and no files at all on `--dry-run`).
