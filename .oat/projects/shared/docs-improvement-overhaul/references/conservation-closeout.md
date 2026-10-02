# Final coverage and conservation accounting

Status: bounded p06-t08 accounting handoff. This is not an independent acceptance verdict, a new 71-skill semantic audit, or a declaration that every CLI flag has a complete guide. Root owns final conservation acceptance and any disposition of review findings.

## Provenance and reproduction

- Current extraction: `c916af45c9860c000027d7e0467f6a77149861b8`, including the root-directed restoration of Quickstart's categorical Git-error statement.
- Immutable pre-move capability/content source: `8b78d9a935b31ef50e65713b03a022a5d022aa59`; initial implementation source: `257517ab5aa1a5846cb4069ba036eafd7b5009f5`.
- Accepted integrated-main content snapshot: `084053c3525344a0ab7c808a722715d574fae7bd`. Its 859 raw heading/occurrence units are additional chain evidence, not a replacement for the original 840-unit migration ledger.
- Reproduce: `TSX_TSCONFIG_PATH=packages/cli/tsconfig.json node --import tsx .oat/projects/shared/docs-improvement-overhaul/references/closeout-inventory.mjs`.
- Commander extraction instantiates the real `createProgram` and `registerCommands` APIs without parsing arguments, running actions, or invoking operational commands. Configuration extraction invokes only the read-only `config describe` catalog emitter, with update notification disabled. Skill eligibility uses the actual `PACK_MANIFEST` and canonical frontmatter, with the immutable capture's predicate.
- Committed docs are read with `git show` at the extraction SHA. Current working-tree prose is not silently substituted. The Markdown parser is the same remark/unified/GFM and GitHub-slugger family used by the capture; dependencies now resolve through the docs app because main moved them out of the CLI package. No guarded baseline capture was rerun or immutable baseline overwritten.
- Tracked item-by-item destinations/gaps and section dispositions: [current-coverage-accounting.json](current-coverage-accounting.json). Longer exact payloads, current lexical locators, hashes and edit-history parent SHAs are reproducible supporting data at `references/analysis/closeout-inventory.json` (ignored, not a permanent CI input). Lexical locators are explicitly not semantic proof.

## Capability conservation and changes

| Surface                                 | Immutable baseline | Current | Accounting                                                                                                               |
| --------------------------------------- | ------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| Registered Commander nodes              | 162                | 165     | All original nodes remain; three main additions                                                                          |
| Explicit option declarations            | 362                | 364     | Five additions, three accepted upstream source supersessions; ten metadata/default/description changes                   |
| Supported scoped config catalog entries | 110                | 110     | Same scoped keys and catalog metadata/defaults; no addition/removal                                                      |
| Canonical skill directories             | 83                 | 83      | Same directory inventory                                                                                                 |
| Eligible shipped user-facing skills     | 71                 | 71      | Same eligible set and pack/visibility/retirement attributes; every current guide anchor and five required fields resolve |

The 165 nodes contain 132 action-bearing commands and 33 structural parents. They are not 165 separate operations. Ancestor options are recorded once at the declaring node. Automatic `-h/--help` and the implicit `help` command are separately inspected Commander framework capabilities, not missing explicit registrations. The twelve ineligible skills remain separately accounted, not silently promoted or deleted. The old 296 schema field/pattern inventory is not mislabeled as 296 supported `config` command keys; arbitrary persisted keys are outside the supported catalog.

Main added `oat project closeout-check`, `oat template` and `oat template resolve`. It added `oat docs init --adopt`, `oat docs init --dry-run`, `oat project closeout-check --autonomous`, `oat project complete-state --autonomous` and `oat template resolve --output <path>`.

The following old options were removed by accepted upstream/source replacement in `fa1af130a` (#336), already present at the post-main snapshot; they were not removed by this documentation phase and are not claimed conserved:

| Historical declaration                                 | Source replacement                                                      | Current documentation                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| `oat docs nav sync --framework <name>`                 | Framework detection from marker/config files                            | `docs-tooling/commands.md`; current `--target-dir`/`--check` |
| `oat docs nav sync --validate-only`                    | Framework-specific current navigation checking replaces the old surface | `docs-tooling/commands.md`; current non-writing `--check`    |
| `oat project dispatch record --project <project-path>` | Validation-only evidence command; writes nothing                        | `reference/cli-reference.md:160`; `--event-file`             |

Command metadata changes are `oat docs init`, `oat docs nav sync`, `oat project dispatch` and `oat project dispatch record`. Ten changed option declarations are named individually in the JSON. Main-source supersession files remain unchanged since the accepted post-main snapshot. No new capability removal was found in the later docs-overhaul source tree; this is source-inventory evidence, not authorization to remove documented capabilities.

## Coverage destinations and named gaps

| Surface               | Destination evidence                                           | Explicit remaining coverage limitation                                                                                  |
| --------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Commands              | 156 exact-spelling section candidates                          | Nine exact-spelling gaps; structural parents are not independent missing operations                                     |
| Flags                 | 261 command-scoped candidates; 27 shared pack-family contracts | 76 declarations lack scoped destination evidence, not 76 distinct missing capabilities                                  |
| Scoped config entries | 71 exact-key section candidates                                | 39 lack exact-key/pattern mentions: 36 remote-policy entries, one legacy Claude column and two scoped strategy patterns |
| Eligible skills       | 71 canonical anchors and complete guide-field scaffolds        | Semantics rely on existing family source verification/correction records, not name matching or this field check         |

Neither an exact spelling nor a command and flag occurring together establishes complete arguments, defaults, mutual exclusions, exits, safety, output or examples. Shared pack contracts count only where the actual flags, attribute, negation and default agree with the documented family declaration. Standard inherited/help behavior is not counted again for each leaf.

The nine command gaps are `oat init tools ideas`, `oat init tools utility`, `oat init tools research`, `oat init tools brainstorm`, `oat cleanup project`, `oat cleanup artifacts`, `oat project split evaluate-signals`, `oat internal cursor-current-target` and `oat internal validate-skill-version-bumps`. The four legacy pack subcommands have common pack guidance; they are not four undocumented installation mechanisms. The two internal diagnostics are different from normal adopter journeys. Cleanup's destructive selection/confirmation contract and split's signal-input command are meaningful remaining exact-reference gaps.

Meaningful flag-reference gaps include `oat sync --install-canonical/--remove-canonical`; cleanup `--all-candidates/--yes/--dry-run`; remote publication/continuation approval and authority-evidence inputs; shared-storage fingerprint/config-target/current-mode/proposed-path/approval-digest inputs; and split `--fired/--non-interactive/--resume`. Existing family safety guidance remains, but does not establish complete flag-by-flag coverage. Global `--cwd/--verbose`, repeated pack flags and diagnostic-only options must not be presented as equivalent adoption blockers. Every declaration's destination or gap remains in the JSON.

The 36 remote-policy exact-key gaps are the operation-specific authority fields and GitHub/Linear/Jira description/default/operation overrides. Their family policy, authority vocabulary, provider alternatives and approval floors are documented at `workflows/backlog-and-planning/remote-project-management.md` and `reference/configuration.md`; this is partial family coverage, not a complete 36-key reference. The other gaps are `workflow.dispatchCeiling.providers.claude` and `sync.providers.<name>.strategy` in project and user sync scopes. Templated/legacy schema prose exists; no literal completeness claim is made.

## Protected content chain

The immutable migration receipt reports 816 protected units and 24 explicitly accounted router units (840 total), 70 router entries, 42 CLI guidance units and thirteen Guide rows. It remains a passing historical migration receipt, not a current pure-move proof after main integration and accepted editorial work. The original three route-only supersessions remain narrow; no new broad prose-removal exemption is introduced.

Current docs contain 89 pages and 1,061 heading/preamble units. All 76 post-main pages remain, with thirteen additions; none was deleted. Forty-nine existing pages changed. Of the 859 post-main source units:

| Current comparison                                         | Units | Meaning                                                                                                        |
| ---------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| Exact raw section hash                                     | 720   | Exact committed payload preserved                                                                              |
| Exact old section prefix plus additions                    | 42    | Old bytes retained before new content                                                                          |
| Exact old Markdown nodes plus insertions                   | 7     | Exact parsed nodes retained in order; inserted material separate                                               |
| Old text/code payload retained with structural/link checks | 23    | Includes named glossary additions and relocated headings; not automatic semantic equivalence of diagrams/links |
| Existing fact/editorial ledger correspondence              | 67    | Named current owners and exact ledger lines; prior source proofs and bounded correction records required       |

These categories sum to 859. The original 97 raw changed/renamed cases are seven node-insertion cases, 23 payload/structure cases and 67 ledger-correspondence cases, not 97 missing sections. The 67 cases contain 146 non-identical paragraph/code payloads, including duplicate lead-ins, glossary additions, corrected false statements, changed diagram syntax, and relocated examples. This is not a count of lost facts. `rewrittenPayloads` names each baseline clause, current owner/locator, source/current line and ledger correspondence; supporting data preserves untruncated clauses. The four initially unledgered cases below have targeted keeper/source checks, not a new full-site extraction campaign.

The old migration anchor inventory also exposes headings changed by accepted main/editorial work. Current named keepers include Quickstart's `#what-you-need`, `#then-choose-what-to-add`, `#workflows` and `#docs-tooling`; Concepts' `#choose-what-to-adopt`; Contributing's `#source-of-truth-hierarchy`; Choose a Workflow's `#where-to-go-from-here`; Lifecycle's `#quick-lane/#lite-lane/#import-lane`; and Review Flavors' `#independence-what-blocks-and-what-falls-back`. Old-anchor absence alone is neither a lost-fact finding nor proof of semantic preservation. Old ledger anchors stay immutable; current owners are separately recorded.

## Fact-ledger follow-through

| Existing authority/proof                                                                           | Current keeper and bounded interpretation                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `changed-page-facts.md:5` through its p02 dispositions and six literal pointer corrections         | General CLI independence remains at `reference/index.md#general-cli-adoption-guidance`; original setup/packs/config/local/doctor/remote/gate uses remain at named leaf owners. The old 42-string verifier is not falsely made current again.                                                                                          |
| `changed-page-facts.md:105` (p05) and diagram source verification records                          | All three adoption categories survive independently; canonical assets/scopes/CLI-vs-skill/HiLL remain. The old sequential stack and generated Gemini-view diagram were corrected, not asserted byte-identical. Gemini remains native-read-only. Diagram readability/operation belongs to visual evidence, not this source accounting. |
| `config-editorial-facts.md:15` (18 pre-edit pages), source citations and scoped conservation proof | Complete keys, flags, examples and unrelated baseline payload remain except named factual corrections: config write scope, core/install scope, init guidance, checkpoint/default precedence, gate-diversity fallback, remote replacement/storage/binding behavior. Their current owners are individually named in JSON.               |
| `config-editorial-facts.md:117` and `fable-lanes/editorial/config.changes.md`                      | Later plain-language rewrites affect added decision guidance; documented reasons remain, unsupported historical intent is not invented. Removed provenance notes stay in this project evidence.                                                                                                                                       |
| `fable-lanes/editorial/front-door.changes.md:108` (pre-existing facts moved/rephrased)             | Home/Quickstart routing, independent adoption and canonical-section facts have current destinations; source-of-truth hierarchy moved to Contributing. CLI utilities are routed to actual Bootstrap/Tool Packs/Config/CLI Reference owners rather than falsely renamed as an onboarding-only capability.                               |
| Five `fable-lanes/verification/skill-guides-family-*.verify.md` records plus `family-*.changes.md` | Existing source verification covers all 71 skills, with correction records. Current catalog destinations/guide fields resolve. Neither a draft verdict nor this field check is silently substituted for final accepted semantics.                                                                                                     |
| `fable-lanes/editorial/final-fixes-reference.changes.md` and `final-fixes-workflows.changes.md`    | Current core-scope, init/hook, checkpoint, gate independence, publication and internal-reference wording has named source evidence. Removed internal IDs/test filenames are not removed product facts.                                                                                                                                |

### Targeted root keeper checks

Root independently inspected these bounded deltas during p06-t08 and supplied their outcomes to this lane; these are not authored assertions of a new independent 71-skill audit:

| Baseline factual payload                                                                                                   | Current keeper / outcome                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Docs Analyze evaluates structure/drift/coverage/guidance/contracts and verifies analysis evidence/severity/recommendations | `docs-tooling/workflows.md:38`: original clause plus a definition of analysis artifact; original payload retained                                                                    |
| `--backlog-items` creates missing items; backlog-backed sources reuse items and add `external_plans` links                 | `skills/repo-improve.md:65`: retained, with always-on reverse-link behavior clarified; source `.agents/skills/oat-repo-improve/SKILL.md:249`; existing `family-A.changes.md:19`      |
| Backlog introduction's command-reference and two-layer PJM owner links                                                     | `workflows/backlog-and-planning/backlog-lifecycle.md:10`: both owners retained, with PJM expanded in place                                                                           |
| Nonblank summary trimmed before closed-item mutation; newest-first completed entry; optional `wont_do` summary             | `workflows/backlog-and-planning/backlog-lifecycle.md:66`: full row retains these clauses, adding only the plain definition of canonical format                                       |
| Quickstart Git failure is specifically a system error                                                                      | `getting-started/quickstart.md:17`: root-directed restoration at extraction SHA; root reports source exit 2 and thirteen existing Git/support tests passing                          |
| Removed duplicate default-on artifact-review example lines                                                                 | `reference/configuration.md:723` and `reference/configuration.md:792`: both keys and true defaults remain explicit; no configuration capability lost by removing duplicated examples |
| Legacy `spec` checkpoint in old example                                                                                    | `workflows/projects/planning/hill-checkpoints.md:29`: explicit older-project compatibility paragraph remains; not inferred absent from the shortened current example                 |

## Configuration-choice owners

All required choice families have actual current destination anchors. Their alternatives/defaults/decision guidance derive from the existing A–F source-verification records and eighteen-page ledger, not a fresh live gate/provider/bootstrap run:

| Choice family                                  | Canonical current owner                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Workflow mode                                  | `workflows/choose-workflow.md#which-mode-should-i-choose`                                  |
| Design interaction                             | `workflows/projects/planning/design-modes.md#choosing-an-interaction-mode`                 |
| HiLL frequency                                 | `workflows/projects/planning/hill-checkpoints.md#choosing-checkpoint-frequency`            |
| Dispatch policy/ladder                         | `workflows/advanced/dispatch-ceiling.md#choosing-policy-and-ladder-ownership`              |
| Provider enablement/strategy                   | `provider-sync/config.md#which-providers-to-enable`; `#links-or-copies`                    |
| Sync scope                                     | `provider-sync/scope-and-surface.md#choosing-sync-scope`                                   |
| Instruction strategy                           | `provider-sync/instruction-sync.md#which-instruction-strategy-should-i-choose`             |
| Stray disposition                              | `provider-sync/manifest-and-drift.md#choosing-a-stray-disposition`                         |
| Gate failure/diversity/budgets                 | `workflows/advanced/workflow-gates.md#choosing-gate-posture` and its child choices         |
| Remote descriptions/authority/provider/storage | `workflows/backlog-and-planning/remote-project-management.md#choosing-bindings-and-policy` |
| Tool packs/placement                           | `getting-started/tool-packs.md#choosing-packs-and-their-ownership`                         |
| Shared/local/user layer                        | `reference/configuration.md#choosing-a-config-layer`                                       |
| Markdown/Fumadocs/MkDocs                       | `docs-tooling/add-docs-to-a-repo.md#choosing-markdown-or-a-site-framework`                 |

## Limits and root handoff

- No currently unsupported semantic removal is established by this bounded reconciliation. The literal/hash and ledger-correspondence categories have different proof strengths; root must not accept the 67 count alone as semantic proof. If a baseline factual clause lacks its actual current keeper after ledger/source comparison, it remains unresolved and cannot be waived as polish.
- The source corrections above are corrections of false/overbroad documentation and accepted upstream source changes, not retrospective authorization for capability removal. Current command/config gaps remain explicit rather than prompting unapproved broad docs edits or new permanent CI.
- Existing per-page pre-edit ledgers, bounded change records and source-verification families are reused. No universal new pre-edit ledger was invented for the later editorial batch. Edit-parent provenance for targeted changed pages remains in supporting inventory; root's targeted checks above close the initially unledgered keeper questions.
- Native visual supplement: [final-native-visual-qa-2026-10-02.md](../reviews/final-native-visual-qa-2026-10-02.md). This lane did not read, disposition or independently repeat that review; its residuals/limits and acceptance remain root-owned. No browser/HTTP/source check in this lane is represented as visual QA.
- This lane edits only this handoff, its read-only reproduction probe and supporting coverage accounting. It does not edit source docs, immutable baselines, review findings, lifecycle tracking or commits.
