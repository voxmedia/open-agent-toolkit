# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

- CLI update awareness is shipped at `0.1.62`: eligible ordinary commands use
  passive cached npm `latest` metadata, while `init`, `tools install`, and
  `tools update` guard against installing older bundled tool versions from an
  outdated CLI. Automation-safe suppression and a persistent user opt-out keep
  non-human workflows silent.
- Build reliability: concurrent CLI invocations race on in-place `packages/cli/assets` regeneration (five incidents on 2026-07-12, including one silent bundle corruption). `BL-260712-serialize-cli-asset-bundling` — Serialize CLI asset bundling with atomic staging — tracks atomic staging plus a portable lock; increasingly urgent as multi-agent workflows make concurrent invocations in one worktree routine.
- Gate review provenance, declared project corroboration, final/range producer aggregation, and opt-in phase review setup are complete. Their current user-facing contracts live in the workflow-gate, project-review, and project-artifact documentation.
- Dispatch matrix normalization consolidation, pass-scoped Cursor catalog caching, and the Dispatch Report V1 schema/formatter are shipped.
- The live workflow smoke fixture is complete: deterministic root verification, an opt-in authenticated runner, root-owned phase-agent topology, safe recovery/cleanup, public runbooks, and a canonical Codex packet passing 10/10 assertions.
- Reusable dispatch contracts are split between a provider-neutral utility engine and a project lifecycle adapter. Analytical callers can use bounded reconnaissance without importing project phase/task/gate policy; a separate root-owned exact-launch broker remains optional backlog work for specialized nesting.
- GPT-5.6 live Task/subagent slug eligibility remains an active recheck: structured controls exposed no Task events, so the current Cursor candidates remain configured but unvalidated. Re-run after a qualifying client rollout or Cursor support evidence, with a 2026-08-08 review-by date.
- High-priority review throughput work now tracks `oat-reviewer` orchestration of cheaper/faster reconnaissance subagents while preserving primary-reviewer judgment for synthesis, severity, and final findings.
- The `codex-family-subagents` dispatch UX split is complete: human-facing guidance and the reusable Dispatch Report V1 schema/formatter shipped through `dispatch-schema-matrix-infrastructure`.
- Structured post-implementation sequencing is shipped, allowing summary, documentation, and PR preparation to run before or after final approval according to configuration.
- High-priority reliability work tracks activity-aware gate timeouts; medium-priority workflow maintenance tracks project-scoped gate overrides and trimming common-path implementation context.
- High-priority review-efficiency work now tracks skipping redundant reviewer dispatches after narrowly classified, deterministically validated bookkeeping-only fixes in both direct/subagent and gate-originated review flows.

<!-- OAT BACKLOG-INDEX -->

| ID                                       | Title                                                               | Status | Priority | Scope   | Estimate |
| ---------------------------------------- | ------------------------------------------------------------------- | ------ | -------- | ------- | -------- |
| BL-260711-add-activity-aware-gate        | Add activity-aware gate timeouts                                    | open   | high     | feature | M        |
| BL-260711-add-root-owned-dispatch-broker | Add root-owned dispatch broker for exact OAT subagent launches      | open   | high     | feature | M        |
| BL-260708-enable-oat-reviewer-subagent   | Enable oat-reviewer subagent orchestration for faster broad reviews | open   | high     | feature | M        |
| BL-260712-serialize-cli-asset-bundling   | Serialize CLI asset bundling with atomic staging                    | open   | high     | task    | S        |
| BL-260711-skip-re-review-for-bookkeeping | Skip re-review for bookkeeping-only review findings                 | open   | high     | feature | M        |
| BL-260706-front-load-recurring-gate      | Front-load recurring gate-finding classes into implementer briefs   | open   | medium   | feature | L        |
| BL-260712-per-project-override           | Per-project override to disable configured external gates           | open   | medium   | feature | M        |
| BL-260708-verify-cursor-gpt-5-6-subagent | Verify Cursor GPT-5.6 subagent model slugs                          | open   | medium   | task    | S        |

<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
