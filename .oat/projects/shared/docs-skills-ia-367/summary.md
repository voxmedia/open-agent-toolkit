---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-24
oat_generated: true
oat_summary_revision_count: 4
oat_summary_includes_revisions: [p-rev1, p-rev2, p-rev3, p-rev4]
oat_summary_learnings_fingerprint: 82b85ae8c9ab640bee3db0a5bf5239f0b5173fdbeb05da6b51c796127fe8cd37
oat_summary_phase_fingerprint: 1835158f6aba4429244c8a8d1b41b776bea129bec2c27c4a7533a91115969e10
---

# Summary: docs-skills-ia-367

## Overview

Issue #367 identified a missing documentation information-architecture (IA) workflow and friction across skills, scaffolds, navigation and validation. This brief delivered guidance-driven IA selection, recorded architecture, approval-aware restructuring, reader-first starters and portable checks across Markdown, Fumadocs and MkDocs.

All 13 phase-units are accepted in their original order: p01, p-rev1, p02, p03, p-rev2, p-rev3, p04, p-rev4, p05, p06, p07, p08, p09. PRs #368, #369 and #371–#376 are merged; final PR #377 is open and implementation, final reviews and the stored closeout sequence are complete. The p09 product candidate is `a7e569e660566d62978928a00f44347ca4798941`, with all five public packages at **0.3.31** and `oat-docs-analyze` at **1.7.5**. No package publication or consumer rollout is claimed.

## What Was Implemented

The accepted implementation and source delivery checklist account for all eleven Outcomes and P1–P28:

1. **Contract accuracy (Outcome 1):** retired closed FP patches and plan residue; rendered detected Node requirements; corrected P7/E12/E13 statements; preserved export, trailing-slash, image and base-path settings through nested Turbopack configuration. Seeded stale literal docs paths fail the skill-test path check.
2. **IA method (Outcome 2):** five selection axes, six presets, two candidate structures with representative placements, an IA Proposal and updated writing/rubric/page guidance. Ten canonical page templates include the later Feature and QA assets.
3. **Guidance discovery (Outcome 3):** explicit/conversational → repository → user → built-in resolution, ordered source provenance and read-only external inputs. Existing docs route to analyze/apply first; loaded-sibling skill binding preserves the assets belonging to the loaded version.
4. **Recorded architecture (Outcome 4):** accepted authored IA decisions/sections, repository config mirrors, IA-fit and audience-misroute findings, normalized path validation and approved restructure blocks with inbound-link and old-URL plans.
5. **Approval and drift (Outcome 5):** recommendation IDs and explicit/default approval classes share one analysis-artifact plus approved-ID handoff. Blanket/unattended approval skips explicit items. Offline package drift distinguishes older/current/ahead/unverified and supplies bounded upgrade guidance.
6. **Authored navigation (Outcome 6):** Contents groups, string roots and file/line grammar errors; framework init navigation sync and prebuild freshness; hierarchical manifests follow authored order and child-index titles. Revision fixes preserve released generated headers, portable nested paths, exclusion semantics and fenced examples.
7. **Reader-first starters (Outcome 7):** CLI-owned framework AGENTS, reader Getting Started and contributor/toolchain pages; template/runtime parity; recursive GFM tabs before link transforms; static-export agent Markdown endpoints with base paths. MkDocs/Material remains an explicitly disclosed legacy alternative.
8. **Portable validation (Outcome 8):** `oat docs check` exposes JSON, stable rules and configurable severities/thresholds for reader structure, navigation, contributor commands, diagrams and provenance. It parses real Mermaid syntax, checks diagram associations/freshness and supplies checker/build/manifest CI wiring without executing documented commands.
9. **Preset scaffolds (Outcome 9):** six opt-in preset trees, canonical template bodies and non-reader exclusions. Paired preset/count flags require empty targets; 14 planned pages collapse tracks, 15 creates tracks, and flat-small stays flat. Preset selection alone creates no accepted IA decision.
10. **Source assessment (Outcome 10):** six analyze judgments plus `oat docs literals`, a bounded read-only quoted-literal occurrence helper. The public synthetic prototype demonstrates mapping, pairing, literals, registry/scenario judgment and raw Contents review; it establishes no autonomous-agent or runtime verdict.
11. **Docs and release reconciliation (Outcome 11):** current workflow pages, E13 narrow grants, per-delivery version bumps and the P-number delivery checklist. Three source backlog items are archived after their OAT work and qualified external-criteria transfer; the successor retains all eight unchecked consumer criteria.

## Key Decisions

- **Guidance-driven IA selection:** ship the generic five-axis method and six presets in `authoring-docs`; resolve explicit, repository, user and built-in guidance in that order. External exemplars remain advisory and read-only, while local instructions remain authoritative, so the public workflow is useful without a private pack.
- **Authored IA with config mirror:** record accepted architecture as a decision and an app AGENTS/contributing section, then mirror its checkable fields in repository config. Authored prose owns intent; tools audit the mirror and surface disagreement rather than silently replacing it.
- **Explicit docs apply approvals:** use one artifact/approved-ID handoff and require individual approval for explicit recommendations. Tooling updates are limited to docs dependencies, supported content migration and build verification; unsupported app/host changes remain manual, preventing blanket approval from expanding scope.
- **Fumadocs navigation is strict and generated from Contents maps:** retain the existing durable choice (`DR-261001-fumadocs-navigation-is-strict`). This project extends its implementation with groups and scaffold freshness; new scaffolds declare nav-sync ownership, while hand-authored and undeclared owners receive read-only comparison.
- **Reader-first starter ownership:** the CLI owns scaffold AGENTS and separates reader onboarding from contributor/toolchain instructions. Keep an explicit parity contract with OAT's own app and export loaded Markdown for agents; Markdown mode creates no docs-root AGENTS, and MkDocs limitations remain visible.
- **Portable docs check boundaries:** provide calibrated mechanical checks across all three modes without site builds or command execution inside the checker. Warnings stay visible, rule policy stays configurable, and unsupported or unavailable evidence remains qualified rather than acquiring an invented guarantee.
- **Judgment-led source verification:** keep P24's six assessments in analyze and use a narrow literal helper only for occurrence evidence. Canonical mapping and actual source/registry evidence govern judgments; missing evidence stays unverified, and substring matches do not prove semantic or runtime support.

## Design Deltas

- P15 uses `/llms/<page-slugs>/content.md` (root `/llms/content.md`) rather than literal `<page>.md` URLs. Exports contain raw loaded `.md` readers and exclude MDX; the approved shape preserves static export and base paths.
- P18 retains pinned MkDocs dependencies with a legacy disclosure instead of a Python upgrade. The Material maintenance/security horizon is May 5, 2027, not MkDocs-core end of life; non-reader exclusions are not a route-privacy boundary.
- P21 skips absent optional hand-authored metadata/pages/nav; implicit Fumadocs ordering remains deferred. P22 supports installed local pnpm binaries, with system-PATH-only and pre-install shorthand deferred; explicit script runs remain strict.
- P24 shipped the prototype-backed judgment/helper split rather than a new G5 rule or registry/scenario engine. The eight approved residual findings below remain part of the accepted result.

## Notable Challenges

- Pinned Fumadocs loader collisions and generated schema types required bounded adapters verified against real loader/build output. The reader/contributor hierarchy exposed integration behavior that isolated navigation fixtures had hidden.
- Real Mermaid parsing required a DOM dependency; fresh installs also exposed an upstream handler-attention incompatibility. The approved corrections used pinned jsdom and the exact compatible transitive dependency at effective pnpm install roots, with actual setup/build controls.
- p02 began before the late p01 correction p-rev1 was integrated. The approved p-rev1→p02 history discontinuity remains intact: no Base/Head anchor was normalized. Final reviews used the operator-approved explicit aggregate range `c3ba7e31d17521cf51252b5ee5167c6c81d8a629..a7e569e660566d62978928a00f44347ca4798941` covering all 13 units.

## Tradeoffs Made

- Brief mode and incremental phase deliveries avoided a speculative task plan; pinned design contracts and accepted execution evidence carried alignment. Remote corrections became four explicit revision phases rather than rewriting accepted history.
- Static-export restructuring uses verified host recovery or stubs/pointers; unsupported app/hosting edits are reported manual. This general tooling choice does not reverse OAT's earlier repository-specific moved-URL retirement decision.
- Mechanical evidence stays bounded: source matching is line-local, case-sensitive and entity-normalized once; installed-package drift can safely report unverified; diagram syntax/freshness does not prove rendering or semantics. Consumer acceptance remains separate from OAT capability delivery.

## Integration Notes

- `documentation.ia`, `navOwner`, `nonReaderPaths`, guidance and checker policy have distinct roles. Missing navOwner is undeclared, not an automatic migration; Markdown ignores sidebar ownership. Existing manifest-only `excludes` semantics remain separate.
- New framework builds check authored navigation freshness. Contents stays dash-only, with errors for entry-like `*`/`+` bullets and empty groups; repair the source map rather than editing generated navigation.
- At p09, all nine ordered gates passed. Fresh Gate 3 execution covered CLI 9,068, supporting 369, docs 93, smoke 165, skills 713 and scripts 1 tests, with zero skips; 1,087 sentence/validation contracts also ran fresh. Turbo executed/cached counts were check 11/0, types 6/5, test 7/5, build 0/5 and docs 0/6; direct manifest freshness ran despite the cached docs build.
- Independent final review and the configured cross-family exit gate both returned 0 Critical/High/Medium/Low findings. Gate run `96d4018b-7030-4867-a0cb-85be5d8beb1a` reviewed the explicit aggregate range and was received successfully. Earlier runtime, packed, negative-control and manual proofs remain inherited evidence; simulated Windows paths are not native Windows execution. The flagship checker reports 0 errors and 756 visible warnings.

## Revision History

- **p-rev1:** corrected scaffold nav-sync instructions to target the rendered nested app explicitly, with the original command failing and the targeted command passing. The accepted correction was integrated into already-started p02 without rewriting either phase's anchors.
- **p-rev2:** corrected skill lookup to bind the actual loaded sibling before user and repository fallbacks, preserving matching references/scripts. Mixed-scope evidence demonstrated the original stale-user-skill selection.
- **p-rev3:** trimmed IA decision/track paths before traversal checks, preserving valid padded controls and unchanged config on rejection. Repaired the Reviews table without changing review identities or outcomes.
- **p-rev4:** restored generated-manifest header compatibility and portable nested ordering, then preserved directory-only exclusion parity and fenced Contents examples. Focused regressions and independent confirmation closed the four external compatibility findings.

## Autonomous Execution Learnings

### Agent-instruction updates

- Keep source/triad assessment in analyze judgment and qualify helper occurrences; absent registry or mapping evidence must remain unverified. The prototype supports the narrow helper, not a generic semantic checker. Source: oat-project:docs-skills-ia-367#2026-10-24-worked-well-p08-prototype-1

### Workflow issues

- For prose/lint-only recovery, retain the mandatory Recovery Event, ledger transitions and one exits line; reserve extended diagnosis for behavioral or composition failures. Repeated narrative added review cost without improving the product assurance. Source: oat-project:docs-skills-ia-367#2026-10-23-friction-recovery-receipt-proportionality-1

## Follow-up Items

All eight historical findings (two Medium, six Low) retain explicit operator approval on 2026-10-24. No new remediation requirement is inferred:

- **p06 Gate-M1 / W-M1 — Medium:** installed local binaries were corrected; system-PATH-only binaries and shorthand before dependency installation remain deferred. Revisit on a real repository report; explicit script runs stay strict and no binary is executed.
- **p06 Gate-M2 / W-M2 — Medium:** title-only metadata and absent optional pages were corrected; implicit Fumadocs order may still diverge from Contents. Revisit on confusing order in an actual repository or another justified framework dependency; explicit/malformed lists and nav-sync stay strict.
- **p06 Gate-L1 — Low:** valid MkDocs Python YAML tags can warn on stderr while JSON/results remain intact. Consider narrow log handling when encountered, preserving syntax diagnostics.
- **p06 Gate-L2 — Low:** unsupported glob/multi-package filters receive a misleading literal-filter suggestion. Clarify exact-single-package wording when these diagnostics are next revised; multi-package support is not required.
- **p06 R3-L1 — Low:** malformed MkDocs YAML is attributed to index.md, and unreadable Fumadocs sources can expose raw absolute navigation errors. Bad inputs still exit 1. Revisit on a real report; wrong exits or hidden required errors trigger correction. Keep any fix to YAML-local attribution/safe relative messages; no partial-navigation engine is required.
- **p06 R3-L2 — Low:** unreadable reader paths disappear from parsed-page structural inventory, causing false directory-index errors and leaf-size warnings, including with intentional frontmatter warn/off policy. Revisit when actual use encounters these false findings; wrong exits or hidden required errors trigger correction. A minimal fix preserves discovered membership and skips content-dependent conclusions for unreadable pages; configurable frontmatter policy must survive. This is not merely diagnostic wording.
- **p05 R3-L2 — Low:** the named `RemarkLinksOptions` barrel export is deferred; inline options remain typed and no consumer requires the public symbol. Revisit when a consumer/typed wrapper needs to name it; no runtime guarantee is deferred.
- **p03 Gate-L1 — Low:** hoisted-only docs packages return safe unverified drift without an upgrade command. Define the ancestor-search boundary and add a real hoisted-layout regression before changing resolution.

The former p03 Gate-L2 allowed-tools gap is closed by p09-t01, not a ninth open deferral. External automation configuration and actual consumer acceptance moved to **BL-261024-roll-out-the-shipped-oat-docs**, whose eight criteria remain unchecked. Consumer repositories, house conventions, package publication and BL-260830 discovery prerequisites were outside this delivery. PR #377 awaits exact-head checks and remote feedback clearance for the authorized plain merge. Lifecycle completion is recorded; configured archive retains the project evidence and exports this written summary.

## Explainer Outcome

- **project-recap:** skipped — operator selected a written summary only (persisted interactive preference, 2026-10-24; root commit `1229389ff0198c7e83e6f872496ac410bcaad0ea`).

## Associated Issues

- **#367:** P1–P28 accounted for by `references/issue-367-delivery-checklist.md`; issue response: https://github.com/voxmedia/open-agent-toolkit/issues/367#issuecomment-6388402460.
- **BL-261002-catch-hardcoded-docs-paths** and **BL-261002-correct-docs-bootstrap-docs:** closed and archived with implementation evidence.
- **BL-260911-make-docs-bootstrap-a-front:** transfer-qualified closure, with original criteria/history and reciprocal successor links preserved. Its external acceptance was transferred, not claimed complete.

## Workflow Observations

- **2026-10-24 · worked-well · p08-prototype** (project, decision) `oat-project:docs-skills-ia-367#2026-10-24-worked-well-p08-prototype-1`
  docs367-p08-local-design-20261024: Public synthetic prototype supports a narrow line-local entity-normalized occurrence helper while all six P24 assessments remain analyze judgment.
- **2026-10-23 · friction · p05-integration** (project) `oat-project:docs-skills-ia-367#2026-10-23-friction-p05-integration-1`
  Required p05 contributor entry plus child index exposed the pinned loader collision that OAT nav and remarkLinks previously flattened.
- **2026-10-23 · friction · recovery-receipt-proportionality** (project, efficiency) `oat-project:docs-skills-ia-367#2026-10-23-friction-recovery-receipt-proportionality-1`
  docs367-p04-complexity-process-20261023: independent complexity review found all p04 product mechanisms proportionate but repeated narrative around the one-line prose recovery added reading cost.
- **2026-10-22 · friction · verification runtime** (project) `oat-project:docs-skills-ia-367#2026-10-22-friction-verification-runtime-1`
  Gate 3 freshly passed 8,857 CLI tests, then a smoke resolver failed to import a built control-plane module.

Synthesized recommendations for categorized learnings are in the Autonomous Execution Learnings section.
