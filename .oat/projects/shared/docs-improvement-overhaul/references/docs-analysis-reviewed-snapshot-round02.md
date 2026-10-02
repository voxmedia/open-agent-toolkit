---
oat_generated: true
oat_generated_at: 2026-10-02
oat_analysis_type: docs
oat_analysis_mode: full
oat_docs_target: apps/oat-docs
oat_analysis_commit: 8b78d9a935b31ef50e65713b03a022a5d022aa59
---

# Docs Analysis: open-agent-toolkit

**Status:** Revised draft after Fable's conditional map approval and R1/R2 corrections. The original intrinsic review completed with one offered Low wording residual; refreshed intrinsic and non-author conservation checks are pending. Tracking has not been updated. No apply or migration is claimed.

## Target, mode and boundaries

The repository-canonical `.agents/skills/oat-docs-analyze/SKILL.md` version 1.6.1 is loaded explicitly, including its quality/directory criteria, template and shared Auto Artifact-Review Loop. The installed user-scope skill is not substituted. `.oat/config.json` declares `documentation.root=apps/oat-docs`, `tooling=fumadocs`, `index=apps/oat-docs/index.md`; app scripts/source config and app AGENTS agree. Authored source is `apps/oat-docs/docs`, not root-level Markdown or the generated app-root inventory.

The shared tracking helper read returns the earlier full analysis at `f837089fc2b9227892a721908c4512345513c33a`, which exists. This authorized task deliberately performs a **full current-surface analysis**, rather than narrowing to the stale tracking delta. The earlier planning reconnaissance is not represented as a formal analyze run. Exact pre-move source SHA is `8b78d9a935b31ef50e65713b03a022a5d022aa59`; clean dispatch bookkeeping HEAD is `fc3515327df51632286f0c9a373e76e7b36b8c30`, whose later changes are tracking-only. Initial implementation base remains `257517ab5aa1a5846cb4069ba036eafd7b5009f5`.

PJM doctor reports `adoption.state=declared` (canonical adoption/files pass; unrelated completed-backlog warnings are not repaired). No PJM/tracking write is performed. Source analysis only reads canonical pages/code; its own artifact and p02 evidence are the permitted writes. Downstream recommendations are bounded by the already authorized quick-project plan, not new feature or prose authority.

## Summary

- Files evaluated mechanically: 70 Markdown pages; no MDX or tracked content assets.
- Directories assessed: 11 Markdown-bearing directories; 11 indexes with useful Contents (100% coverage).
- Parsed page/heading units: 840, including explicit preambles; the amended proposal has 816 protected equal-normalized-hash units and 24 explicitly accounted router units, including the CLI Utilities and Guide consolidations. This is proposed conservation, not an applied site outcome.
- Parsed links/images/definitions: 477; zero unresolved file targets in the inventory. Branch source/anchor validation independently passes.
- Findings: 0 Critical, 2 High, 3 Medium, 1 Low. These are analysis recommendations, not code-review findings or proof of downstream implementation.
- Literal coverage evidence: 162 real registered CLI nodes, 362 explicit option declarations, 110 supported config catalog entries, separate schema-field patterns and 71 eligible skills derived from actual pack membership.
- Claim verification is repository-only and bounded. No external URL, deployed site, service operation, provider integration, publication, persona verdict or final browser acceptance is inferred.

## Inventory and directory assessment

Every page, heading, exact source/frontmatter hash, proposed destination, parsed source/hosted link and live consumer is in project `references/route-migration.json`; every section hash and normalization rule is summarized in `references/content-baseline.md`. Source refs refer to original one-based lines including frontmatter. Offset fields explicitly name stripped-body offsets.

Fable's actual review is retained in `references/fable-p02-map-review.md`. R1 consolidates the CLI Utilities router with all 42 guidance units individually accounted at their real owners, rather than relabelling its prose as Getting Started; Getting Started receives a new onboarding introduction. R2 inventories exactly three H1/title transitions (Home, Projects and Choose a Workflow), their old/new anchors and incoming-reference evidence; other native anchors remain unchanged. New index additions are distinct from preserved source. The amended proposal has 33 retained pages, 35 moves, two router consolidations and eight new indexes (76 projected pages); all 70 original source/destination pairs remain unchanged. `references/fable-map-correction-receipts.json` binds the amended draft and controls. Its final non-author conservation recheck remains pending; Fable requires no additional map review unless R1 changes other destinations.

| Directory          | Pages | Index contract                                 | Proposed physical owner                                                                               |
| ------------------ | ----: | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| docs root          |     2 | present; Home owns current sections/quickstart | Home; quickstart moves to Getting Started                                                             |
| cli-utilities      |     9 | present; eight leaves locally owned            | dissolve into Getting Started, Reference, Projects execution, Backlog and planning, Advanced          |
| contributing       |    11 | present                                        | Contributing, unchanged                                                                               |
| docs-tooling       |     4 | present                                        | Docs Tooling, unchanged                                                                               |
| guide              |     2 | present; explicit compatibility router         | concepts to Getting Started; router explicitly consolidated into Home                                 |
| provider-sync      |     7 | present                                        | Provider Sync, unchanged                                                                              |
| reference          |     6 | present                                        | Reference, plus configuration/state/artifact/PR-comment owners                                        |
| workflows root     |     2 | present                                        | new Workflows landing; current mode-choice content becomes choose-workflow; Waves gets a directory    |
| workflows/ideas    |     2 | present                                        | Ideas, unchanged                                                                                      |
| workflows/projects |    21 | present but flat cross-intent list             | Projects lifecycle plus real planning/execution/reviews/closeout; advanced/reference owners separated |
| workflows/skills   |     4 | present                                        | top-level Skills; owned guides only in sidebar                                                        |

No overview.md, unexpected MDX, missing directory index or placeholder Contents is found. No Markdown hygiene failure is claimed: the app's scoped markdownlint/format/check receipts are recorded separately. No arbitrary description-length limit is invented.

## Findings

### Critical

None found in this bounded analysis. This is not a comprehensive operational safety audit.

### High

1. **H1: bundled docs lookup routes are already stale.**
   - Evidence: `.agents/skills/oat-docs/SKILL.md:94` topic table lists `guide/getting-started.md`, `guide/cli-reference.md`, `guide/tool-packs.md` and guide subtrees absent from the actual tracked docs tree. The real existing owner paths are recorded in the migration inventory. `reference/cli-reference.md:14` already links actual owners.
   - Confidence: high for missing paths; no claim of having run an installed user's lookup.
   - Recommendation: p02-t03 repairs the canonical topic table to approved owners and enrolls executable live-source target checking. Regenerate bundled sources through their existing owner, never hand-edit installed copies.
   - Disclosure: link_only; canonical targets are the approved new topic owners in the map.

2. **H2: canonical agent orientation has missing docs destinations.**
   - Evidence: `.agents/README.md` links `apps/oat-docs/docs/cli/index.md` and `projects/index.md`, neither present at the baseline. Its existing future `skills/index.md` link will become correct only after the approved migration. Its quickstart link must move too. Exact lines/bytes are in `externalConsumers`.
   - Confidence: high for source-file absence, not a claim about deployed behavior.
   - Recommendation: mechanical consumer repair under p02-t03, with root approval of the derived file boundary. Keep source orientation accurate without authoring a second catalog.
   - Disclosure: link_only; canonical targets are Reference CLI, Workflows Projects and Skills.

### Medium

1. **M1: primary discovery does not match the approved reader IA.**
   - Evidence: `docs/index.md:18` still prioritizes Quickstart/User Guide and exposes CLI Utilities rather than Getting Started/Skills; `workflows/index.md:16` nests Skills after workflows; `workflows/projects/index.md:14` mixes planning, execution, dispatch and reference concerns. The branch compiler now enforces this existing authored structure correctly; this is not a p01 compiler defect.
   - Recommendation: p02-t02 executes only the reviewed per-page preservation map: Home plus seven labels, Workflows choose-mode → Projects → Ideas → Backlog and planning → Waves → Advanced, and real Projects subdirectories.
   - Confidence: high. Disclosure: inline for section navigation, with body-only cross-owner family discovery.

2. **M2: ambiguous repository-analysis placement obscures the actual capability.**
   - Evidence: `workflows/projects/repo-analysis.md:8` describes repository-wide `oat repo pr-comments`, not research/knowledge indexing or a project prerequisite; its command table and `packages/cli/src/commands/repo/pr-comments/index.ts` match the registered commands. It is already referenced from `reference/cli-reference.md:23`.
   - Recommendation: approved Reference owner `reference/repository-pr-comments.md`, with a body discovery link from the Skills Review family if useful. This deliberately interprets reader intent instead of moving the ambiguous filename into a research skill family. Root and Fable agree on the Reference owner; amended conservation verification remains separate.
   - Confidence: high for actual command capability, medium for reader-placement taste. Disclosure: link_only.

3. **M3: skill-name visibility is not useful complete skill coverage.**
   - Evidence: `workflows/skills/index.md:20` names research, synthesis, resume/state, repository and closeout skills in lists, while only three owned guides exist: Explainer Kit, Repo Improve, Recon. Actual `PACK_MANIFEST` plus canonical frontmatter yields 71 eligible skills, not a frozen advisory constant. Project-required/optional/none classification has not yet been audited here.
   - Recommendation: p04 mapping/applicability/scenario tasks, followed by the exact p05 bounded deepening list. No new catalog or guide prose is authorized in p02. Skills sidebar contains owned guides only; body/catalog discovers Docs Tooling and Workflows owners (journeys 2 and 5 must exercise that route).
   - Confidence: high for file/eligibility inventory; completeness and scenario quality remain independent p04 work. Disclosure: link_only to owning families.

### Low

1. **L1: exact CLI/config coverage is unresolved despite broad command maps.**
   - Evidence: the instantiated registry and real supported CONFIG_CATALOG expose 16 command nodes and 40 catalog keys without exact literal docs mentions. Some are internal nodes or dynamic/grouped families; absence of a literal is not conclusive absence of explanation. Forty keys are not silently discarded from the baseline.
   - Recommendation: carry named gaps and source/default provenance into p06-t01/current-tree reconciliation, then bounded configuration-choice guidance. Do not fabricate effective defaults for schema-only/dynamic fields or widen p02 into reference completeness authoring.
   - Confidence: high for mechanical literal-match result; semantic coverage explicitly unverified. Disclosure: ask_user only for new removal/publication/scope decisions; routine p06 evidence reconciliation follows its existing approval.

## Generated index, local maps and navigation drift

`apps/oat-docs/index.md:1` has the expected AUTOGENERATED warning and is tracked. Its sorted agent inventory is intentionally not the sidebar. Current entries name baseline paths; after migration it must be regenerated by the branch CLI. Alphabetic agent inventory versus authored Contents order is not reported as sidebar drift. Source generation semantics are proven by `commands/docs/index-generate/generator.ts`, app package prebuild and app AGENTS, not guessed from JSON.

The current branch `docs nav sync --framework fumadocs --validate-only` validates authored source without reading or writing ignored metadata/sidecar/MDX/export. Source/anchor validation passes. Existing local `--check` separately reports 11 owned metadata outputs in parity; missing output in a pristine control is not invalid source. No metadata is regenerated, adopted, reformatted or removed by this analysis. Real temporary-fixture loader tests remain distinct from source validation and final browser proof.

## Links, Contents and authoring guidance

All 477 parsed link/image/definition occurrences have exact source→destination inventory. Fenced/inline example text is not a link oracle. The existing branch source validator separately checks file and renderer-compatible heading anchors; external URL availability is not tested. Frontmatter titles and physical-parent membership are aligned after the five p01 label repairs. Body links can cross owners but do not reparent sidebar nodes. A source-only missing-target/fragment helper now supports reusable consumer checks; its tests use self-contained temporary fixtures and read no migration/project artifact.

App AGENTS, contributing/documentation and reference/docs-index-contract cover source location, generated inventory boundaries, Contents, .md links/default, approved analyze/apply routing, byte-owned ignored output and restart after structural edits. Those are not missing/stale conventions. The only proposed route retirements are explicit inventory items; no unsupported loader/alias convention is introduced.

## Repository-checkable accuracy verification

| Checked claim                                                  | Docs evidence                                        | Canonical evidence                                                                                               | Verdict / boundary                                                                                                                      |
| -------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Contents order, title ownership and source-only nav validation | reference/docs-index-contract.md:8, :17              | commands/docs/nav/index.ts; fumadocs.ts; apps/oat-docs/scripts/validate.ts                                       | verified source contract; current app source/temporary-loader tests run separately                                                      |
| Source index is generated, not authored sidebar                | contributing/documentation.md; app AGENTS            | app package prebuild; commands/docs/index-generate/generator.ts                                                  | verified; current warning present, post-move regeneration pending                                                                       |
| Repository PR-comment command pair exists                      | workflows/projects/repo-analysis.md:8, command table | registered Commander nodes; commands/repo/pr-comments/index.ts and collect/triage constructors                   | command/option spelling verified without running GraphQL or triage                                                                      |
| Shared/local/user config are distinct                          | cli-utilities/configuration.md                       | config/oat-config.ts OatConfig/OatLocalConfig/UserConfig and loaders; supported CONFIG_CATALOG scope/file fields | declarations/loaders/catalog inventoried; individual behavioral tradeoffs/default rationales not globally verified here                 |
| Provider sync uses its own config schema/defaults              | provider-sync/config.md                              | config/sync-config.ts:16, :30                                                                                    | version/defaultStrategy/knownStrays/providers schema and default object verified; effective provider-specific overrides remain distinct |
| All declared skills are supported distribution                 | workflows/skills/index.md name lists                 | real pack manifest + 83 canonical frontmatters                                                                   | not assumed: 71 eligible; 4 non-invocable, 2 retired, 1 repository-only, 5 unshipped/unknown-intent exclusions                          |
| Compatibility router remains stable                            | guide/index.md:8, :18; index.md:19                   | source route currently exists; explicit user decision in design                                                  | true at baseline; three exact route-only statements are approved supersessions under the no-alias decision, with no capability removal  |

No checked source claim is promoted into assurance of a service, MCP/provider behavior, GitHub Pages deployment, publication or non-author persona outcome. Source-unverifiable historical rationale remains an owner-review gap for p06, not invented prose.

## Content opportunities and ordered recommendations

| Order | Plan owner | Bounded action                                                                             | Evidence / disclosure                                                       | Acceptance                                                                                                    |
| ----: | ---------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
|     1 | p02-t01    | Review complete map, 840 hashes, explicit router accounting and real capability provenance | project baseline/map; inline evidence                                       | non-author normalization + intrinsic artifact review + Fable map review, before moves                         |
|     2 | p02-t02    | Preservation-only move and new physical index maps                                         | exact approved destinations; source text retained                           | source validation, hash/accounting comparison, export absence/canonical checks, targeted browser smoke        |
|     3 | p02-t03    | Mechanical live-consumer/topic-map/README repair and regeneration                          | inventoried current consumers; link_only                                    | live-source targets, 17 README hosted occurrences, export crawl; deliberate old URL break disclosed           |
|     4 | p04 / p05  | Source-audited useful canonical skill anchors/scenarios and bounded deepening              | manifest, canonical skill contracts, mapping review                         | no copied second skill inventory; independent prerequisites/scenarios, catalog parity                         |
|     5 | p06        | Reconcile current capabilities, meaningful choices and changed-page facts                  | config/catalog/registry provenance and baseline; source-backed explanations | non-author reconciliation and one bounded editorial/persona round; no unauthorized content/capability removal |

The old-route behavior is intentionally breaking. No aliases/redirect stubs. Reused canonical roots (notably `/workflows`, whose mode-choice content moves to a leaf while a new canonical section index takes its route) must not be falsely asserted absent. Previously published npm README links are outside the current-source repair and remain stale until separately authorized release.

## Intrinsic review and tracking handoff

Read-only branch config get returns `workflow.autoArtifactReview.analysis=true`, source `default`, exit 0. The active project has no concrete retry override; shared loop default is 2. Root must dispatch the intrinsic reviewer with `type: analysis`, `scope: docs`, this `analysis_artifact`, `oat_output_mode: structured` and the unchanged configured High target. It is an analysis-artifact-only review, not a phase code/final reviewer. Critical/High unambiguous artifact-only corrections may be applied; Medium/Low are offered through root; no source/apply target may be edited by that loop.

Actual Fable conditional approval has arrived; R1/R2 corrections and their non-author conservation proof remain mandatory before t01 commit or moves. No additional peer map round is required unless R1 changes other destinations. This artifact-only refresh is rewrite one of the two allowed cycles, with refreshed intrinsic review pending. The original reviewed snapshot and review receipt remain immutable. Only after intrinsic review concludes does root perform the shared verified tracking write through `.oat/scripts/resolve-tracking.sh`. No tracking or downstream apply outcome is claimed prematurely.
