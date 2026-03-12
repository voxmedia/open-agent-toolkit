---
title: Repository Analysis
description: 'Repository-level analysis commands for collecting and triaging PR review comments.'
---

# Repository Analysis (`oat repo`)

The `oat repo` command group provides repository-level analysis and insight tools. These commands operate across merged pull requests rather than on individual PRs.

## Commands

| Command                                  | Purpose                                                              |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `oat repo pr-comments collect`           | Collect PR review comments from merged PRs via GitHub GraphQL API.   |
| `oat repo pr-comments triage-collection` | Interactively triage collected comments with keep/discard decisions. |

## `oat repo pr-comments collect`

Fetches review comments from merged pull requests using the GitHub GraphQL API (`gh api graphql`), filters noise, assigns stable IDs, and outputs monthly JSON + Markdown chunks.

### Options

| Option                | Required | Default                | Description                                                  |
| --------------------- | -------- | ---------------------- | ------------------------------------------------------------ |
| `--since <date>`      | Yes      | —                      | Start date for merged PRs (YYYY-MM-DD).                      |
| `--until <date>`      | No       | Today                  | End date for merged PRs (YYYY-MM-DD).                        |
| `--out-dir <path>`    | No       | `.oat/review-comments` | Output directory for collected comments.                     |
| `--repo <owner/name>` | No       | Current git remote     | GitHub repository. Resolved from `origin` remote if omitted. |
| `--no-ignore-bots`    | No       | Bots filtered          | Include bot comments in output.                              |

### Behavior

**GraphQL collection:** Uses `gh api graphql` to search merged PRs within the date range. Fetches PR metadata (title, author, merge date) alongside review comments in a single query. Handles nested pagination for PRs with more than 100 review comments.

**Repository resolution:** When `--repo` is omitted, parses `owner/name` from `git remote get-url origin` (supports both SSH and HTTPS URLs, including repo names with dots).

**Bot filtering** (enabled by default, disable with `--no-ignore-bots`):

- GitHub API author type (`Bot`)
- Login suffix (`[bot]`)
- Known service logins (CodeRabbit, Copilot, Sourcery, Vercel, Supabase, Codacy, SonarCloud, Codecov, Netlify, Linear, Changeset Bot, Renovate, Dependabot, Snyk)

**Trivial comment filtering:**

- Known phrase patterns (LGTM, nit, +1, looks good, ship it, nice, great, thanks, emoji-only)
- Short comments under 5 words — unless they contain code references (backticks, file paths, line numbers)

**Output:**

- Comments are assigned stable sequential IDs (`RC-001`, `RC-002`, ...) that correlate across JSON and Markdown.
- Grouped by PR merge month (not comment creation date) in reverse-chronological order.
- Each month produces a paired `{YYYY-MM}.json` and `{YYYY-MM}.md` file in the output directory.

### Example

```bash
oat repo pr-comments collect --since 2025-01-01
oat repo pr-comments collect --since 2025-06-01 --until 2025-12-31 --repo myorg/myrepo
```

## `oat repo pr-comments triage-collection`

Interactive keep/discard triage of previously collected review comments. Reads a monthly JSON chunk and presents each comment for disposition.

### Options

| Option                | Required | Default                | Description                           |
| --------------------- | -------- | ---------------------- | ------------------------------------- |
| `--month <YYYY-MM>`   | Yes      | —                      | Month chunk to triage.                |
| `--input-dir <path>`  | No       | `.oat/review-comments` | Directory containing collected JSON.  |
| `--output-dir <path>` | No       | `.oat/review-comments` | Output directory for triaged results. |

### Behavior

- Requires an interactive terminal (TTY). Fails with a clear error in non-interactive mode.
- For each comment, displays a summary (PR number/title, file path, author, date, body preview) and prompts `[k]eep` or `[d]iscard` (default: keep).
- Writes kept comments to `{YYYY-MM}.triaged.json` in the output directory.

### Example

```bash
oat repo pr-comments triage-collection --month 2025-03
oat repo pr-comments triage-collection --month 2025-03 --input-dir ./collected --output-dir ./triaged
```

## Dependency Injection

Both commands accept dependency injection for testability:

- `collect`: `CollectDependencies` interface — injectable `ghGraphQL` (GraphQL executor) and `resolveCurrentRepo` (git remote parser)
- `triage-collection`: `TriageDependencies` interface — injectable `readJsonFile` (JSON reader)

## Related

- Source: `packages/cli/src/commands/repo/pr-comments/`
- Types: `packages/cli/src/commands/repo/pr-comments/collect/pr-comments.types.ts`
