# Pre-move content conservation baseline

**Status:** Fable destinations approved subject to R1/R2; corrected draft awaits non-author conservation recheck. No page move or task approval claimed.

## Exact provenance

- Initial implementation base: `257517ab5aa1a5846cb4069ba036eafd7b5009f5`.
- Accepted p01 source / exact pre-move baseline: `8b78d9a935b31ef50e65713b03a022a5d022aa59`.
- Clean p02 acceptance-bookkeeping HEAD: `fc3515327df51632286f0c9a373e76e7b36b8c30`. Its only changes after the source baseline are root-owned state/implementation tracking; it is not a newer source baseline.
- Every source page and canonical skill was read through `git show <baseline>:<path>`; each exact page/frontmatter and raw section has a recorded SHA-256 in `route-migration.json` / `capability-baseline.json`. Dynamic Commander/config/pack extraction refuses a tracked CLI/skill-source difference from that baseline.
- Capture: `TSX_TSCONFIG_PATH=packages/cli/tsconfig.json node --import tsx .oat/projects/shared/docs-improvement-overhaul/references/capture-migration-baseline.mjs`. Run read-only config describe first as recorded below. This project-local evidence script is not imported by permanent app checks.

## Baseline drift and p01 additions

The initial and pre-move trees both have exactly **70 Markdown pages**, **11 directory indexes**, no MDX pages and **zero tracked docs assets**. No page was added/deleted in p01. Ten existing Markdown files changed. Five physical-parent label repairs match frontmatter: Contributing to OAT Docs, Sync Config (with its config-path suffix), .oat Directory Structure, Ideas Lifecycle, and Human-in-the-Loop Lifecycle (HiLL) Checkpoints. The other changes add/align authoring, navigation, generated-output ownership, source-only validation and restart guidance in contributing/documentation, docs-tooling/add-docs-to-a-repo, docs-tooling/commands, docs-tooling/workflows and reference/docs-index-contract. Existing implementation-base prose is not retroactively discarded: the recorded ten-file diff explains the source-baseline advance and p01's accepted additions. The initial SHA remains available for later reconciliation.

## Preservation units and normalization

The Markdown parser (the installed remark-parse + remark-gfm used by the CLI) identifies **840 page/heading-keyed sections**, including explicit preamble/blank units; fenced examples are not headings. **816** require equal normalized hashes at their named new page and heading/occurrence, with only three individually approved H1 exceptions. **24** router units require explicit accounting instead: all six Guide units, all nine CLI Utilities units and the remaining nine Contents units. The complete units, raw hashes, normalized hashes, original one-based source lines and destination names are in `route-migration.json.sections`.

URL normalization changes **only actual docs-page destination-string tokens** listed in each unit: the original page identity is a stable token, with query/fragment retained. Micromark tokens from remark-parse's installed dependency closure bind to the exact parsed link/image/definition owner offsets and decoded URL; missing, ambiguous or mismatched tokens fail explicitly. All other body bytes remain protected except three exact authorized H1 lines: `# OAT Documentation` → `# Home`, `# Workflow & Projects` → `# Projects`, `# Agentic Workflows` → `# Choose a Workflow`. `headingNormalization` records the exact old/new anchors, one-based source lines and incoming consumer sweep. Only the new H1 line normalizes back to its old literal; surrounding prose, other headings, code and whitespace do not normalize. External URLs remain exact unless explicitly identified hosted docs URLs. Frontmatter changes apply only the three repurposed titles. Getting Started is a new independent title/H1/introduction, not an old CLI title rewrite. CLI frontmatter has separate consolidation accounting, including its retained exact description at Reference. Line references include frontmatter; offset fields explicitly refer to the frontmatter-stripped body.

User Guide and CLI Utilities are the two consolidated routers. `guideConsolidation` enumerates every nonblank Guide sentence/bullet and its destination. `routeOnlySupersessions` enumerates three distinct items under the user's existing URL-break/no-alias decision: two Guide compatibility-status sentences at `guide/index.md:8` and `:18`, and the separate Home Contents compatibility-router entry at `index.md:19`. Exact text, source lines and decision provenance remain in the ledger; only these route-only claims/entry are superseded, not capability guidance. The duplicate Concepts bullet is retained once at Getting Started. Adoption-lane intent, other canonical capability descriptions, new-authoring direction and retired-bucket direction remain at Home's Canonical Sections body. The two old broad general-CLI descriptions (Home's CLI Contents item and Guide's CLI canonical item) are retained verbatim at `reference/index.md#general-cli-adoption-guidance`, not mislabeled as Getting Started onboarding. New Home Getting Started Contents text and short Reference owner-context links are separately inventoried additions. Guide's old H1 consolidates into `# Home` / `#home`. Fable approved the three narrow supersessions; root approves this adjacent R1 description-owner correction without changing another page destination or requiring another Fable round. No general paragraph-stripping exemption exists.

`cliConsolidation` partitions every byte of the original CLI router body into exact paragraph/list-item, heading and separator rows. All **42 substantive guidance/list units** retain their exact text with only inventoried href rewrites: bootstrap/tool-pack guidance at Getting Started, general CLI adoption and config/state guidance at Reference, remote binding guidance at Backlog and planning, log navigation at Projects execution, gates at Advanced. The broad old CLI-lane introduction is explicitly Reference-owned, never the new Getting Started introduction. All eight original router headings and structural separators have named consolidation destinations; no unique capability is discarded. `cliMetadataAccounting` separately inventories title and description. The original page's nine section units carry per-row destinations rather than a misleading single relocated body.

`routerAccounting.items` individually names 70 non-Guide source list items: 69 retained descriptions with concrete destination anchors, entry targets and entry labels, plus Home's one superseded entry. Cross-owner Writing Skills/Docs Workflows discovery is specifically `skills/index.md#related-guides`; the existing workflow overview's Contents stays in `workflows/choose-workflow.md#contents`. Other redistributed descriptions have named physical-parent Contents entries, not an unresolved parent-or-body choice. Changed sidebar membership/order is a router change, not permission to delete unique information. New indexes/Contents blocks are explicitly additive and must be distinguished from old section text during the post-move comparison; no whole-site semantic fact extraction is required for this pure move. Later existing-prose rewrites/removals require pre-edit changed-page fact ledgers and non-author review before editing.

## Pages and named destinations

Thirty-three pages retain their source path, thirty-five move, and two routers (CLI Utilities and User Guide) consolidate into their explicitly accounted owners. Eight new router indexes are proposed; promoting the existing Reviews guide to its section index adds Contents, not a redundant Reviews/Reviews hop. Expected authored result: 76 pages, unless review changes the approved map. No aliases, redirect stubs or transitional pages.

| Baseline page                                    | Destination                                                             | Disposition          | Section units |
| ------------------------------------------------ | ----------------------------------------------------------------------- | -------------------- | ------------: |
| `cli-utilities/backlog-lifecycle.md`             | `workflows/backlog-and-planning/backlog-lifecycle.md`                   | move                 |             7 |
| `cli-utilities/bootstrap.md`                     | `getting-started/bootstrap.md`                                          | move                 |             5 |
| `cli-utilities/config-and-local-state.md`        | `reference/config-and-local-state.md`                                   | move                 |            13 |
| `cli-utilities/configuration.md`                 | `reference/configuration.md`                                            | move                 |            30 |
| `cli-utilities/index.md`                         | `getting-started/index.md` (new entry; body ledger names actual owners) | router-consolidation |             9 |
| `cli-utilities/project-log.md`                   | `workflows/projects/execution/project-log.md`                           | move                 |            10 |
| `cli-utilities/remote-project-management.md`     | `workflows/backlog-and-planning/remote-project-management.md`           | move                 |            11 |
| `cli-utilities/tool-packs.md`                    | `getting-started/tool-packs.md`                                         | move                 |            45 |
| `cli-utilities/workflow-gates.md`                | `workflows/advanced/workflow-gates.md`                                  | move                 |            20 |
| `contributing/code.md`                           | `contributing/code.md`                                                  | retain               |            12 |
| `contributing/commit-conventions.md`             | `contributing/commit-conventions.md`                                    | retain               |             6 |
| `contributing/design-principles.md`              | `contributing/design-principles.md`                                     | retain               |            13 |
| `contributing/documentation.md`                  | `contributing/documentation.md`                                         | retain               |             8 |
| `contributing/hooks-and-safety.md`               | `contributing/hooks-and-safety.md`                                      | retain               |             7 |
| `contributing/index.md`                          | `contributing/index.md`                                                 | retain               |             3 |
| `contributing/markdown-features.md`              | `contributing/markdown-features.md`                                     | retain               |             8 |
| `contributing/skills.md`                         | `contributing/skills.md`                                                | retain               |            25 |
| `contributing/smoke-testing.md`                  | `contributing/smoke-testing.md`                                         | retain               |            16 |
| `contributing/updating-model-guidance.md`        | `contributing/updating-model-guidance.md`                               | retain               |             6 |
| `contributing/verifying-cursor-pins.md`          | `contributing/verifying-cursor-pins.md`                                 | retain               |            16 |
| `docs-tooling/add-docs-to-a-repo.md`             | `docs-tooling/add-docs-to-a-repo.md`                                    | retain               |            14 |
| `docs-tooling/commands.md`                       | `docs-tooling/commands.md`                                              | retain               |            11 |
| `docs-tooling/index.md`                          | `docs-tooling/index.md`                                                 | retain               |             8 |
| `docs-tooling/workflows.md`                      | `docs-tooling/workflows.md`                                             | retain               |             9 |
| `guide/concepts.md`                              | `getting-started/concepts.md`                                           | move                 |             9 |
| `guide/index.md`                                 | `index.md`                                                              | router-consolidation |             6 |
| `index.md`                                       | `index.md`                                                              | retain               |             7 |
| `provider-sync/commands.md`                      | `provider-sync/commands.md`                                             | retain               |            15 |
| `provider-sync/config.md`                        | `provider-sync/config.md`                                               | retain               |            10 |
| `provider-sync/index.md`                         | `provider-sync/index.md`                                                | retain               |            10 |
| `provider-sync/instruction-sync.md`              | `provider-sync/instruction-sync.md`                                     | retain               |            21 |
| `provider-sync/manifest-and-drift.md`            | `provider-sync/manifest-and-drift.md`                                   | retain               |            14 |
| `provider-sync/providers.md`                     | `provider-sync/providers.md`                                            | retain               |            11 |
| `provider-sync/scope-and-surface.md`             | `provider-sync/scope-and-surface.md`                                    | retain               |            11 |
| `quickstart.md`                                  | `getting-started/quickstart.md`                                         | move                 |             9 |
| `reference/cli-reference.md`                     | `reference/cli-reference.md`                                            | retain               |             7 |
| `reference/docs-index-contract.md`               | `reference/docs-index-contract.md`                                      | retain               |             9 |
| `reference/file-locations.md`                    | `reference/file-locations.md`                                           | retain               |            13 |
| `reference/index.md`                             | `reference/index.md`                                                    | retain               |             5 |
| `reference/oat-directory-structure.md`           | `reference/oat-directory-structure.md`                                  | retain               |            16 |
| `reference/troubleshooting.md`                   | `reference/troubleshooting.md`                                          | retain               |            30 |
| `workflows/ideas/index.md`                       | `workflows/ideas/index.md`                                              | retain               |             7 |
| `workflows/ideas/lifecycle.md`                   | `workflows/ideas/lifecycle.md`                                          | retain               |            13 |
| `workflows/index.md`                             | `workflows/choose-workflow.md`                                          | move                 |            10 |
| `workflows/projects/artifacts.md`                | `reference/project-artifacts.md`                                        | move                 |            14 |
| `workflows/projects/autonomy.md`                 | `workflows/advanced/autonomy.md`                                        | move                 |            10 |
| `workflows/projects/cursor-cloud.md`             | `workflows/advanced/cursor-cloud.md`                                    | move                 |            11 |
| `workflows/projects/design-modes.md`             | `workflows/projects/planning/design-modes.md`                           | move                 |             9 |
| `workflows/projects/dispatch-ceiling.md`         | `workflows/advanced/dispatch-ceiling.md`                                | move                 |            16 |
| `workflows/projects/evidence-layers.md`          | `workflows/advanced/evidence-layers.md`                                 | move                 |             9 |
| `workflows/projects/hill-checkpoints.md`         | `workflows/projects/planning/hill-checkpoints.md`                       | move                 |             7 |
| `workflows/projects/implementation-execution.md` | `workflows/projects/execution/implementation-execution.md`              | move                 |            22 |
| `workflows/projects/index.md`                    | `workflows/projects/index.md`                                           | retain               |             7 |
| `workflows/projects/lifecycle.md`                | `workflows/projects/lifecycle.md`                                       | retain               |            35 |
| `workflows/projects/orchestration-model.md`      | `workflows/advanced/orchestration-model.md`                             | move                 |            15 |
| `workflows/projects/picking-up-projects.md`      | `workflows/projects/execution/picking-up-projects.md`                   | move                 |             8 |
| `workflows/projects/pr-flow.md`                  | `workflows/projects/closeout/pr-flow.md`                                | move                 |             7 |
| `workflows/projects/programmatic-execution.md`   | `workflows/advanced/programmatic-execution.md`                          | move                 |             7 |
| `workflows/projects/repo-analysis.md`            | `reference/repository-pr-comments.md`                                   | move                 |            14 |
| `workflows/projects/retro.md`                    | `workflows/projects/closeout/retro.md`                                  | move                 |            10 |
| `workflows/projects/review-flavors.md`           | `workflows/projects/reviews/review-flavors.md`                          | move                 |             7 |
| `workflows/projects/reviewing-oat-prs.md`        | `workflows/projects/reviews/reviewing-oat-prs.md`                       | move                 |             6 |
| `workflows/projects/reviews.md`                  | `workflows/projects/reviews/index.md`                                   | move                 |            18 |
| `workflows/projects/splitting.md`                | `workflows/projects/planning/splitting.md`                              | move                 |             9 |
| `workflows/projects/state-machine.md`            | `reference/project-state-machine.md`                                    | move                 |             9 |
| `workflows/skills/explainer-kit.md`              | `skills/explainer-kit.md`                                               | move                 |            10 |
| `workflows/skills/index.md`                      | `skills/index.md`                                                       | move                 |             8 |
| `workflows/skills/recon.md`                      | `skills/recon.md`                                                       | move                 |            12 |
| `workflows/skills/repo-improve.md`               | `skills/repo-improve.md`                                                | move                 |             8 |
| `workflows/wave-workflows.md`                    | `workflows/waves/wave-workflows.md`                                     | move                 |             7 |

## Links, assets and live consumers

All **477 parsed authored link/image/definition occurrences** are inventoried with source line, target classification and exact from/to URL. There are zero unresolved source-file targets in that inventory; branch source/anchor validation is separately executed. Assets are explicitly an empty tracked inventory, not an omitted scan. The repository-wide consumer sweep records live consumers separately from historical project/repository evidence and captured fixture narratives. Archived evidence is not rewritten.

Five READMEs contain **17 hosted occurrences** (root 9; CLI 5; each docs package 1). Current in-repository sources can be repaired, but previously published npm READMEs remain stale until a separately authorized release. Added or removed current consumers must be reconciled against the inventory in p02-t03. Existing stale topic-map and .agents/README paths are recorded as prerequisite consumer gaps, not implied to be correct at this baseline.

## Capability ledger

- Real registered Commander tree: **162 nodes**, **362 option declarations**, one alias (`oat gate cross-provider-exec` → `exec`), declared arguments/defaults/choices and inherited-option provenance. Actions were never parsed/invoked. Hidden/internal nodes are retained, not dropped from the baseline.
- Read-only supported `CONFIG_CATALOG`: **110 entries** with defaults, scope/file, type, mutability, owning command and description. Source: `commands/config/index.ts:373`, `:414`, `:4002`; command: `NO_UPDATE_NOTIFIER=1 TSX_TSCONFIG_PATH=packages/cli/tsconfig.json node --import tsx packages/cli/src/index.ts --json config describe` (exit 0). The handler only selects/emits constant catalog entries; no read-mutate-write operation is executed.
- Separate TypeScript declaration inventory: **296 field/pattern records** across OatConfig, OatLocalConfig, UserConfig and SyncConfig, backed by `config/oat-config.ts` / `sync-config.ts` and real loaders. Structural fields are not falsely called catalog-supported mutation keys; dynamic wildcard families are patterns, not enumerated arbitrary persisted keys. No schema-only effective default is inferred. Catalog and loader defaults remain separately attributable.
- Real pack membership plus canonical frontmatter: **83 skill directories**, **71 eligible**. Four explicitly non-user-invocable helpers, two explicitly retired aliases, one explicitly repository-only triage skill and five currently unshipped/uncertain-intent skills are separately accounted for; no distribution promotion is authorized.
- Literal docs mentions are candidates, not assurance of useful coverage. Sixteen command nodes (including internal nodes) and forty scoped catalog entries representing 39 distinct keys have no exact literal mention; semantic completeness stays unresolved for p06. All eligible skill names occur somewhere, which is not per-skill anchor/scenario completeness.

## Verification and handoff

Executed baseline capture exits 0. Source-only app tests execute nine tests (not Turbo cache replay), exit 0. Neutralizing only the target-rejection guard makes stale-route and missing-fragment controls fail with Missing expected rejection (exit 1); the valid control passes. Restored focused controls execute three tests, exit 0. Full restored app check/types/tests pass. Disposable project/output-absent app check and nine tests pass after direct upstream dependency builds; absence assertions prove no app metadata/sidecar/.source/out or project artifacts exist after execution. Earlier Turbo setup failures remain separately recorded. Correction controls verify all 477 actual destination spans, 70 source hashes, 840 section hashes and 17 real repeated-label collisions; only the named H1 changes normalize, with surrounding paragraph mutations rejected. CLI router rows exactly partition the real source body and account all 42 substantive units. See migration-review.md for final logs/receipts. Canonical analysis remains byte-identical, reviewed with one offered Low residual, not a clean pass; root owns refresh of statements made stale by R1/R2. Fable review is actual and conditional approvals are recorded; non-author recheck remains pending. No downstream apply or task commit is permitted until root confirms readiness.
