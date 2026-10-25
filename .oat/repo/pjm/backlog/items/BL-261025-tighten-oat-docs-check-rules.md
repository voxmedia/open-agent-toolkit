---
id: BL-261025-tighten-oat-docs-check-rules
title: Tighten oat docs check rules and diagnostics
status: open
priority: medium
scope: feature
scope_estimate: M
labels:
  - docs
  - consumer-rollout
assignee: null
created: 2026-10-25T13:57:10.268Z
updated: 2026-10-25T13:57:10.268Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/367
external_plans: []
---

## Description

`oat docs check` reports false positives, misses non-conforming docs and points
findings at the wrong place. This item consolidates four follow-ups filed on
2026-10-25 from read-only conformance runs of OAT docs tooling 0.3.32 on
consumer repositories, as follow-ups to
[BL-261024-roll-out-the-shipped-oat-docs — Roll out the shipped OAT docs front door and approval policy to consumer repositories](BL-261024-roll-out-the-shipped-oat-docs.md)
and issue #367. The archived source records keep their original wording:

- [BL-261025-narrow-the-oat-docs-check — Narrow the oat docs check provenance rule and allow line or pattern exceptions](../archived/BL-261025-narrow-the-oat-docs-check.md) (medium, S)
- [BL-261025-close-oat-docs-check-reader — Close oat docs check reader-rule gaps: per-group width limits and a title rule](../archived/BL-261025-close-oat-docs-check-reader.md) (medium, S)
- [BL-261025-report-accurate-lines-for-oat — Report accurate lines for oat docs check structural and separator findings](../archived/BL-261025-report-accurate-lines-for-oat.md) (low, S)
- [BL-261025-skip-diagram-freshness-when — Skip diagram-freshness when only Mermaid accessibility metadata changes](../archived/BL-261025-skip-diagram-freshness-when.md) (low, S)

### Provenance false positives and coarse exceptions

- The home-path pattern `(?:~\/|\/Users\/|\/home\/)`
  (`packages/cli/src/commands/docs/check/reader-rules.ts`) is unanchored, so it
  matches relative paths such as `fixture/home/` and a product's own documented
  install locations (for example `~/.<product>/`), which made up most hits in
  one repository.
- The `.oat/` and home-path patterns run on every source line, including fenced
  code examples and legitimate config references such as `.oat/config.json`.
- `documentation.check.exceptions` match a path and rule only (`checker.ts`), so
  allowing one documented home path turns off `.oat/`, backlog-reference and
  link-escape detection for the whole file. The message suggests a
  reason-bearing exception that cannot target one line or one pattern.

### Reader-structure gaps

- A single `###` group bypasses every width limit.
  `grouped = retained.some((e) => e.group !== undefined)` (`reader-rules.ts`)
  exempts `root-width`, `contents-width` and `folder-size` as soon as one group
  exists; one `### Everything` heading over 39 entries cleared three errors in a
  consumer repository. There is no per-group limit.
- There is no `title` rule, although oat-docs-bootstrap Step 4 and
  oat-docs-apply Step 5 require a nonempty frontmatter `title`. A page with no
  frontmatter reports only `description`.

### Finding locations and output streams

- `contents-separator` keeps only the last location per separator style
  (`separators.set(entry.separator, …)` in `reader-rules.ts`), so it flags a
  consistent page and misses others that use the minority separator.
- Structural findings (`contents-width`, `root-width`, `overview`,
  `directory-index`, unlisted `navigation`) have no `line`, although most could
  point at the `## Contents` heading or the entry.
- Text output sends findings to stderr and only the summary to stdout, so piping
  the check shows just the summary.

### Diagram freshness

- `diagram-freshness` warns when only Mermaid `accTitle`/`accDescr` lines change
  and demands SVG regeneration, so applying the `diagram-accessibility` fix
  always produces freshness warnings for diagrams with light/dark SVG pairs.

### Install-dependent command results

- The `commands` rule accepts pnpm shorthand for a local binary (`pnpm tsx …`)
  only when that binary is present in `node_modules/.bin`, so the same page
  passes locally and fails in a docs-only CI install that skips repository-root
  dependencies (observed in the consumer rollout).

## Acceptance Criteria

None of the four sources was high priority. Each group names its source
priority.

Provenance rule (medium):

- [ ] Home-path detection is anchored to path starts (start of line, whitespace, quote or backtick) and does not match relative `…/home/` segments.
- [ ] Fenced code and recognized config-file references are either skipped or reported separately from prose planning leaks, as documented.
- [ ] Exceptions can narrow to a pattern (for example an allowed home-path prefix) or a line, without suppressing other provenance or link checks in the same file.
- [ ] Regression tests at the `checkDocs` boundary cover the false positives above and keep real backlog/planning leaks reported.

Reader rules (medium):

- [ ] Groups exempt flat width only when every group stays within a per-group threshold (configurable through `documentation.check.thresholds`); a single oversized group is reported.
- [ ] A stable `title` rule reports a missing or empty frontmatter title, with `error|warn|off` policy, documented in the check page rule table.
- [ ] Tests at the `checkDocs` boundary cover the one-group bypass and a page without a title.

Finding lines and output (low):

- [ ] `contents-separator` reports every entry (or the first per file) that uses a minority separator, with its physical line.
- [ ] Structural findings carry a `line` where a heading or entry exists, without changing the G5 JSON keys.
- [ ] The text-output stream split is either documented or changed so piped output includes findings.

Diagram freshness (low):

- [ ] Changes limited to Mermaid accessibility metadata lines do not require SVG changes, covered by a test at the `checkDocs` boundary with a real Git comparison.

Install-dependent command results (medium):

- [ ] `oat docs check` gives the same `commands` result for pnpm local-binary shorthand regardless of which `node_modules` trees are installed, either by resolving declared dependency bins from `package.json` or by reporting the shorthand consistently with an `pnpm exec` suggestion.
