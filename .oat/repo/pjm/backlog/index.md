# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

- Gate review provenance, declared project corroboration, final/range producer aggregation, and opt-in phase review setup are complete. Their current user-facing contracts live in the workflow-gate, project-review, and project-artifact documentation.
- Dispatch matrix normalization consolidation, pass-scoped Cursor catalog caching, and the Dispatch Report V1 schema/formatter are shipped.
- GPT-5.6 live Task/subagent slug eligibility remains an active recheck: structured controls exposed no Task events, so the current Cursor candidates remain configured but unvalidated. Re-run after a qualifying client rollout or Cursor support evidence, with a 2026-08-08 review-by date.
- High-priority review throughput work now tracks `oat-reviewer` orchestration of cheaper/faster reconnaissance subagents while preserving primary-reviewer judgment for synthesis, severity, and final findings.
- The `codex-family-subagents` dispatch UX split is complete: human-facing guidance and the reusable Dispatch Report V1 schema/formatter shipped through `dispatch-schema-matrix-infrastructure`.
- High-priority workflow follow-up now tracks structured post-implementation sequencing so final-review-passed projects can run summary/docs/PR preparation before final HiLL approval when configured, while stricter repos can defer selected actions until after approval.
- High-priority orchestration follow-up now tracks a root-owned exact-dispatch broker and launcher-owned provenance so phase coordinators can retain phase semantics without broad permissions or nested provider initialization; root-direct execution remains a documented fallback only.

<!-- OAT BACKLOG-INDEX -->

| ID                                       | Title                                                                | Status | Priority | Scope   | Estimate |
| ---------------------------------------- | -------------------------------------------------------------------- | ------ | -------- | ------- | -------- |
| BL-260711-add-activity-aware-gate        | Add activity-aware gate timeouts                                     | open   | high     | feature | M        |
| BL-260711-add-live-workflow-smoke        | Add live workflow smoke fixture                                      | open   | high     | feature | L        |
| BL-260711-add-root-owned-dispatch-broker | Add root-owned dispatch broker for exact OAT subagent launches       | open   | high     | feature | M        |
| BL-260708-enable-oat-reviewer-subagent   | Enable oat-reviewer subagent orchestration for faster broad reviews  | open   | high     | feature | M        |
| BL-260709-split-post-implementation      | Split post-implementation sequence into pre- and post-approval steps | open   | high     | feature | M        |
| BL-260706-front-load-recurring-gate      | Front-load recurring gate-finding classes into implementer briefs    | open   | medium   | feature | L        |
| BL-260708-verify-cursor-gpt-5-6-subagent | Verify Cursor GPT-5.6 subagent model slugs                           | open   | medium   | task    | S        |

<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
