# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

- Gate review provenance, declared project corroboration, final/range producer aggregation, and opt-in phase review setup are complete. Their current user-facing contracts live in the workflow-gate, project-review, and project-artifact documentation.
- Remaining dispatch follow-ups cover matrix normalization consolidation, Cursor catalog caching and model-slug verification, and the deferred machine schema/formatter work.
- The `codex-family-subagents` discovery added a 2026-07-09 follow-up to verify Cursor's actual GPT-5.6 subagent model slugs before OAT wires Sol, Terra, or Luna into Cursor dispatch configuration.
- High-priority review throughput work now tracks `oat-reviewer` orchestration of cheaper/faster reconnaissance subagents while preserving primary-reviewer judgment for synthesis, severity, and final findings.
- The `codex-family-subagents` dispatch UX supplement is split: human-facing display guidance is folded into project p03-t05, while reusable machine schema/formatter work is tracked as `BL-260709-add-dispatch-machine-schema`.
- High-priority workflow follow-up now tracks structured post-implementation sequencing so final-review-passed projects can run summary/docs/PR preparation before final HiLL approval when configured, while stricter repos can defer selected actions until after approval.

<!-- OAT BACKLOG-INDEX -->

| ID                                       | Title                                                                | Status | Priority | Scope   | Estimate |
| ---------------------------------------- | -------------------------------------------------------------------- | ------ | -------- | ------- | -------- |
| BL-260708-enable-oat-reviewer-subagent   | Enable oat-reviewer subagent orchestration for faster broad reviews  | open   | high     | feature | M        |
| BL-260709-split-post-implementation      | Split post-implementation sequence into pre- and post-approval steps | open   | high     | feature | M        |
| BL-260709-add-dispatch-machine-schema    | Add dispatch machine schema and formatter                            | open   | medium   | feature | M        |
| BL-260707-cache-cursor-model-catalog     | Cache Cursor model catalog during matrix validation                  | open   | medium   | task    | S        |
| BL-260707-consolidate-dispatch-matrix    | Consolidate dispatch matrix normalization and traversal              | open   | medium   | task    | M        |
| BL-260706-front-load-recurring-gate      | Front-load recurring gate-finding classes into implementer briefs    | open   | medium   | feature | L        |
| BL-260708-verify-cursor-gpt-5-6-subagent | Verify Cursor GPT-5.6 subagent model slugs                           | open   | medium   | task    | S        |

<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
