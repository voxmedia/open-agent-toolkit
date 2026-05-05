---
id: bl-f19a
title: 'Strict-YAML validation in `oat:validate-skills`'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: task # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels: ['tooling', 'validation', 'developer-experience']
assignee: null
created: '2026-05-04T17:20:00Z'
updated: '2026-05-04T17:20:00Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

`pnpm oat:validate-skills` currently checks SKILL.md frontmatter against a small set of rules (length cap, required fields, lead-word constraint on `description`, etc.) but does **not** parse the frontmatter as YAML. As a result, frontmatter that fails actual YAML parsing — for example a bare colon mid-scalar that produces `mapping values are not allowed in this context` — passes the validator and ships, only failing later in consumers that load the YAML (provider sync, skill resolver, IDE integrations).

Concrete instance that motivated this item: `prev2` of the `independent-brainstorming` PR introduced an unquoted scalar that read:

```yaml
description: Use when the user explicitly invokes the `brainstorm` verb: `/oat-brainstorm`, ...
```

The bare `verb:` was parsed as a nested mapping inside the scalar. `pnpm oat:validate-skills` returned exit 0; downstream consumers raised `mapping values are not allowed in this context`. Fixed in commit `4f7a6bfb`, but the validator gap remains.

## What's still required

1. Parse SKILL.md frontmatter with a strict YAML parser (e.g., `yaml` npm package) and surface parse errors as a hard validation failure.
2. Verify the parsed frontmatter structure matches the documented schema (every required key present and of the right type) — distinct from the existing string-level checks that operate on the raw text.
3. Add at least one fixture-based test in the validate-skills suite that exercises the prev2 failure mode (bare colon mid-scalar) and confirms the new validator catches it.
4. Decide whether to bundle stricter checks (e.g., disallow bare colons in unquoted `description` scalars even when they happen to parse) or rely on the YAML parser as the source of truth. Recommend the latter — YAML correctness is well-defined and additional opinionated rules risk false positives.

## Acceptance Criteria

- `pnpm oat:validate-skills` fails with a clear error when any SKILL.md frontmatter cannot be parsed as YAML.
- The error message identifies the offending file path and includes the underlying YAML parser error (line/column when available).
- A regression test in the validate-skills suite covers the bare-colon-mid-scalar case.
- Existing valid skills continue to pass (no false positives).
- Pre-existing 6 unrelated `disable-model-invocation` failures (`oat-pjm-add-backlog-item`, `oat-pjm-update-repo-reference`, `oat-project-document`, `oat-project-pr-final`, `oat-project-spec`, `oat-project-summary`) are not affected by this change — they are missing-key issues, not parse-error issues, and remain in scope of their own follow-up.

## Notes

- Surfaced during the `independent-brainstorming` PR (#70) live dogfood pass on 2026-05-04. The parser-vs-string-check gap is generic; this item is not specific to `oat-brainstorm`.
- Related: the `disable-model-invocation` failures noted above suggest a separate follow-up to either backfill the missing key in the affected skills or relax the validator rule. Out of scope here.
