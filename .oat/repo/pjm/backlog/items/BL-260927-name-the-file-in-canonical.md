---
id: BL-260927-name-the-file-in-canonical
title: Name the file in canonical rule parse errors and keep one bad rule from
  aborting sync
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - sync
  - rules
  - cli
assignee: null
created: 2026-09-27T03:35:36.287Z
updated: 2026-09-27T03:35:36.287Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/316
external_plans: []
---

## Description

The Claude, Cursor, and Copilot rule transforms receive `canonicalPath` but call `parseCanonicalRuleMarkdown(canonicalContent)` without it, so frontmatter errors read `in <inline>`, and the missing-frontmatter branch in `packages/cli/src/rules/canonical/parse.ts` carries no path at all. One invalid rule aborts the whole `oat sync`, including unrelated skills and agents. Third-party installers such as Argent write Cursor-style `alwaysApply: true` rules into `.agents/rules/`; the Cursor importer already maps that field. Reproduced on 2026-09-26. Source: GitHub issue #316.

## Acceptance Criteria

- Every canonical rule parse error names the repository-relative file, for all three provider transforms and for missing frontmatter.
- A recorded choice between accepting `alwaysApply: true` as an alias for `activation: always` and skipping an invalid rule with a warning that names the file ships with tests.
- A sync with one invalid rule and otherwise valid content either completes the valid work or fails with a message naming every invalid rule.
