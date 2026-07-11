# OAT Decision Index

> Generated decision table lives inside the managed section below. Keep curated narrative updates outside the marker pair so CLI regeneration stays safe.

## Curated Overview

- Add brief narrative summaries here as decisions are created and migrated.

<!-- OAT DECISION-INDEX -->

| ID                                       | Date       | Status   | Title                                                                   | Legacy |
| ---------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------- | ------ |
| DR-260711-configured-invocation-is       | 2026-07-11 | accepted | Configured invocation is separate from runtime identity                 | -      |
| DR-260711-cursor-candidate-probes        | 2026-07-11 | accepted | Cursor candidate probes require passed structured controls              | -      |
| DR-260711-cursor-catalog-presence-is     | 2026-07-11 | accepted | Cursor catalog presence is diagnostic only                              | -      |
| DR-260710-configured-gate-provenance-is  | 2026-07-10 | accepted | Configured gate provenance is separate from reviewer identity           | -      |
| DR-260710-declared-gate-projects-require | 2026-07-10 | accepted | Declared gate projects require artifact corroboration                   | -      |
| DR-260709-codex-targets-are-materialized | 2026-07-09 | accepted | Codex targets are materialized from canonical agents                    | -      |
| DR-260709-cursor-uses-generic-agents     | 2026-07-09 | accepted | Cursor uses generic agents with Task-level model arguments              | -      |
| DR-260709-dispatch-matrix-remains-source | 2026-07-09 | accepted | Dispatch matrix remains source of provider targets                      | -      |
| DR-260706-claude-remains-model-axis-only | 2026-07-06 | accepted | Claude remains model-axis only                                          | -      |
| DR-260706-gate-completion-is-signaled-by | 2026-07-06 | accepted | Gate completion is signaled by the JSON envelope not filesystem state   | -      |
| DR-260706-inherit-host-defaults-means-no | 2026-07-06 | accepted | Inherit Host Defaults means no OAT selection                            | -      |
| DR-260706-managed-uncapped-is-explicit   | 2026-07-06 | accepted | Managed Uncapped is explicit state                                      | -      |
| DR-260706-phase-review-gate-is-non       | 2026-07-06 | accepted | Phase review gate is non-pausing and separates verdict from disposition | -      |
| DR-260706-resolver-owns-preferred        | 2026-07-06 | accepted | Resolver owns preferred selection                                       | -      |
| DR-260706-review-artifacts-use-seconds   | 2026-07-06 | accepted | Review artifacts use seconds-precision UTC timestamps                   | -      |
| DR-260706-reviewer-targets-only-capped   | 2026-07-06 | accepted | Reviewer targets only capped policies                                   | -      |
| DR-260701-gates-v2-remains-deferred      | 2026-07-01 | accepted | Gates V2 remains deferred                                               | -      |
| DR-260701-lifecycle-gate-commands-stay   | 2026-07-01 | accepted | Lifecycle gate commands stay target-neutral by default                  | -      |
| DR-260701-provider-verification-happens  | 2026-07-01 | accepted | Provider verification happens at the CLI argv boundary                  | -      |
| DR-260701-review-gates-own-review-prompt | 2026-07-01 | accepted | Review gates own review prompt assembly                                 | -      |
| DR-260624-allocator-free-deterministic   | 2026-06-24 | accepted | Allocator-free deterministic IDs                                        | -      |
| DR-260624-file-per-record-decisions      | 2026-06-24 | accepted | File-per-record decisions with a generated index                        | -      |
| DR-260624-lockstep-release-bump-batched  | 2026-06-24 | accepted | Lockstep release bump batched to the final phase                        | -      |
| DR-260624-migration-is-lossless          | 2026-06-24 | accepted | Migration is lossless and guarded                                       | -      |
| DR-260624-two-physical-layers-not-one    | 2026-06-24 | accepted | Two physical layers, not one                                            | -      |

<!-- END OAT DECISION-INDEX -->

## Notes

- Decision records live as file-per-record Markdown files in this directory.
- Regenerate this index with `oat decision regenerate-index` after resolving conflicts.
