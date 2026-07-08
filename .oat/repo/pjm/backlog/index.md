# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

- Current review-gate backlog focuses on making configured gates visible earlier in implementation planning and preserving gate-run provenance, including recurring finding classes, the missing phase-gate opt-in prompt, and model/target metadata in gate review artifacts.
- A gate-target identity item emerged from a live 2026-07-07 incident (a gate reviewed the wrong project via ambient `activeProject`; unusual flow — two projects on one branch): declare the target project on `oat gate review` and verify the artifact's `oat_project` echo. Pairs with the gate-review-model provenance item and applies the `multi-family-dispatch` project's declared+observed pattern to gates.
- The `multi-family-dispatch` final review added follow-ups for matrix helper consolidation, per-pass Cursor catalog caching, and producer aggregation for final/range review gates.
- The `codex-family-subagents` discovery added a 2026-07-09 follow-up to verify Cursor's actual GPT-5.6 subagent model slugs before OAT wires Sol, Terra, or Luna into Cursor dispatch configuration.
- High-priority review throughput work now tracks `oat-reviewer` orchestration of cheaper/faster reconnaissance subagents while preserving primary-reviewer judgment for synthesis, severity, and final findings.

<!-- OAT BACKLOG-INDEX -->

| ID                                       | Title                                                                  | Status | Priority | Scope   | Estimate |
| ---------------------------------------- | ---------------------------------------------------------------------- | ------ | -------- | ------- | -------- |
| BL-260708-enable-oat-reviewer-subagent   | Enable oat-reviewer subagent orchestration for faster broad reviews    | open   | high     | feature | M        |
| BL-260707-ask-to-enable-phase-review     | Ask to enable phase review gates when gate config exists               | open   | medium   | task    | S        |
| BL-260707-cache-cursor-model-catalog     | Cache Cursor model catalog during matrix validation                    | open   | medium   | task    | S        |
| BL-260707-consolidate-dispatch-matrix    | Consolidate dispatch matrix normalization and traversal                | open   | medium   | task    | M        |
| BL-260706-front-load-recurring-gate      | Front-load recurring gate-finding classes into implementer briefs      | open   | medium   | feature | L        |
| BL-260707-record-gate-review-model       | Record gate review model provenance in artifacts                       | open   | medium   | task    | S        |
| BL-260708-verify-cursor-gpt-5-6-subagent | Verify Cursor GPT-5.6 subagent model slugs                             | open   | medium   | task    | S        |
| BL-260707-declare-gate-review-target     | Declare gate review target project                                     | open   | low      | task    | S        |
| BL-260707-support-producer-identity      | Support producer identity aggregation for final and range review gates | open   | low      | task    | M        |

<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
