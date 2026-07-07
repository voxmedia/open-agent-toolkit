# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

- Current review-gate backlog focuses on making configured gates visible earlier in implementation planning and preserving gate-run provenance, including recurring finding classes, the missing phase-gate opt-in prompt, and model/target metadata in gate review artifacts.
- A gate-target identity item emerged from a live 2026-07-07 incident (a gate reviewed the wrong project via ambient `activeProject`; unusual flow — two projects on one branch): declare the target project on `oat gate review` and verify the artifact's `oat_project` echo. Pairs with the gate-review-model provenance item and applies the `multi-family-dispatch` project's declared+observed pattern to gates.

<!-- OAT BACKLOG-INDEX -->

| ID                                   | Title                                                             | Status | Priority | Scope   | Estimate |
| ------------------------------------ | ----------------------------------------------------------------- | ------ | -------- | ------- | -------- |
| BL-260707-ask-to-enable-phase-review | Ask to enable phase review gates when gate config exists          | open   | medium   | task    | S        |
| BL-260706-front-load-recurring-gate  | Front-load recurring gate-finding classes into implementer briefs | open   | medium   | feature | L        |
| BL-260707-record-gate-review-model   | Record gate review model provenance in artifacts                  | open   | medium   | task    | S        |
| BL-260707-declare-gate-review-target | Declare gate review target project                                | open   | low      | task    | S        |

<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
