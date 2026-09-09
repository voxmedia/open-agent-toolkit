---
id: BL-260909-give-the-dispatch-record
title: Give the dispatch record a consumer or remove it
status: open
priority: high
scope: task
scope_estimate: S
labels:
  - dispatch
  - cli
  - skills
  - simplification
assignee: null
created: 2026-09-09T18:58:52.177Z
updated: 2026-09-09T18:58:52.177Z
associated_issues: []
external_plans: []
---

## Description

PR #255 (2026-09-03) added oat project dispatch record and the per-dispatch JSON journal under <project>/dispatch/, and waves 2 to 7 of the execution program mandated calling it from six lifecycle skills. Nothing reads the files: no CLI command or lifecycle skill consumes <project>/dispatch/\*.json (the only importer of commands/project/dispatch/record outside its own tests is a test), and the designed consumer, terminal reconciliation of every accepted dispatch (GitHub #266), has no producer. Wave 7 alone wrote 66 self-attested records. PR #288 removed the mandate from the skills and documented the command as optional and off by default; this item decides the command's fate so it is not left as write-only machinery: either wire a real consumer (the #266 reconciliation, with the reader named and tested) or delete the command, its record schema (providers/identity/{generic-dispatch-record,oat-dispatch-record,runtime-observation}.ts), the dispatch/ journal contract, and their docs (evidence-layers.md, scope-and-surface.md, the CLI reference). Apply the repository rule: a persisted artifact names the code or person that reads it, or it does not ship.

## Acceptance Criteria

- A decision record states which path was taken (consumer or removal) and why.
- Consumer path: a named code path reads `<project>/dispatch/*.json` for a purpose a user or a gate can observe, with a test that fails when the reader is removed; the skills' optional wording becomes a requirement again only then.
- Removal path: `oat project dispatch record`, the record schema modules, the `dispatch/` journal contract, and their docs are deleted; `pnpm check`, `pnpm test`, `pnpm test:smoke`, and the skill contract tests pass; no skill or doc references the command.
- Either way, no `<project>/dispatch/` directory is written by any default lifecycle path.
