---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-01
oat_generated: false
oat_template: false
---

# Design: docs-improvement-overhaul

## Overview

Make the documentation useful to a person choosing one capability, completing a task, or looking up a named skill. Home remains an overview; the seven primary sections are Getting Started, Skills, Workflows, Provider Sync, Docs Tooling, Reference, and Contributing. Skills is universal discovery, not a standalone-only bucket. Canonical family guides own usage prose; the catalog links to per-skill anchors without copying complete skill instructions.

First make authored navigation executable. Extend the shipped navigation CLI with an explicit Fumadocs projection of section Contents, preserving the existing MkDocs default. Then migrate information without rewriting substantive prose. A repository-specific catalog prevents supported skills from silently disappearing. Bounded authoring fills known guide gaps and improves the README and selected visuals; whole-site persona/conservation/editorial evaluation follows. This is one quick project with six independently reviewable, sequential phases: navigation, migration, README, skill discovery, bounded coverage/visuals, and whole-site improvement/final acceptance. README is separated because it addresses evaluators and can ship immediately after route migration.

The user separately invoked implementation after reviewed planning and added the phase 6 scope during p01. Fable reviews design, plan amendments and phase diffs. The full independent reviewer computer-use tour runs after the last phase. Implementers perform focused intermediate browser smokes rather than repeating the full tour every phase. Publication, merge and any removal/narrowing of documented content remain separate authority boundaries.

## Architecture

```text
section index.md Contents + page frontmatter
  -> oat docs nav sync --framework fumadocs
  -> ignored, owned meta.json output -> fumadocs-mdx -> real loader -> static site

canonical SKILL.md + shipped pack manifest + site-owned guide mapping
  -> repository-local docs-app script -> committed Skills catalog
  -> navigation generation -> static site

source docs + source-path consumers + migration inventory
  -> route/anchor/content checks + link crawl + browser journeys
```

Contents owns sidebar membership and order; frontmatter titles own labels for both leaf pages and section indexes. Generate folder titles from the child index title and reject parent Contents label mismatches for both kinds. Cross-links retain their authored labels but do not take ownership of another section's pages. The Skills page body owns the complete catalog; sidebar cross-links are limited to canonical family anchors, never one sidebar entry per skill. Cross-link duplicates must not change canonical breadcrumbs or previous/next traversal; verify the installed consumer and omit unsafe sidebar cross-links in favor of body links rather than shipping misleading navigation.

Generated framework metadata is ignored build output, not a second manually maintained map. The repository catalog generator is not a new public CLI command. The existing generated app-root agent index remains separate from both the human sidebar and the skill catalog.

Validation enrollment follows implementation order: navigation/source-route checks land in phase 1, mapping/catalog checks in phase 4. Consumer scaffolds call the installed oat binary, not this repository's workspace cli:source script. Permanent migration tests use self-contained fixtures, never the project-local migration evidence.

## Component Design

### 1. Shipped navigation compiler

**Interface:** extend `oat docs nav sync` with `--framework mkdocs|fumadocs`, `--check`, and Fumadocs-only `--validate-only`, retaining `--target-dir`. The last two modes are mutually exclusive. Validate-only checks the source graph without reading/comparing generated metadata or writing anything; check additionally requires and compares output. Omitting framework preserves MkDocs behavior. Current app/scaffold scripts generate Fumadocs metadata before fumadocs-mdx. MkDocs parsing/YAML preservation remain regression-tested.

The Fumadocs projection supports ordinary file-derived routes, a `/` loader base, section indexes, Markdown leaf pages, and relative cross-section links with optional fragments. Next's deployment basePath is not baked into metadata; the renderer applies it once. External links, query-bearing navigation entries, custom slug loaders, non-root loader bases, and a new separator DSL are out of scope and receive actionable diagnostics rather than accidental interpretation. Ignore code fences when reading the exact H2 Contents section; do not turn examples into navigation.

For each physical directory, classify Contents entries as its own landing, immediate owned leaf, immediate child section, or cross-link. Emit native identifiers for owned pages/folders and explicit routed links for cross-links; a cross-link to an index never recursively imports its children. Root `index` appears once; child landing pages attach once through Fumadocs folder behavior. Every canonical leaf and non-root section must have exactly one physical-parent ownership entry. Cross-links do not count as ownership. Missing entries, duplicate ownership, unresolved files/fragments, and leaf or section label/title mismatch fail validation. Phase 1 audits and fixes all current mismatches before enabling strict build integration, without renaming headings; the earlier four-item report was a sample, not an exhaustive assertion.

Use one ignored app-root `.oat-fumadocs-nav.json` sidecar with schema version, docs-root-relative generated paths and last-written content hashes. Do not add unknown fields to Fumadocs metadata. Before replacing or deleting existing metadata, require a manifest entry and matching last-generated hash. One narrowly bounded recovery exception allows acknowledging an existing file whose bytes exactly equal the currently computed output for that path, without rewriting it; this heals interrupted generation or a lost sidecar. Semantic JSON equivalence is insufficient. Genuinely different unowned or externally edited files fail closed, even outside Git. Validate the entire manifest/output/cleanup set before writes; reject malformed manifests, traversal, duplicate paths and symlink escapes. Remove only positively owned stale output. Check mode remains read-only and requires sidecar parity. Ignore metadata and sidecar in Git and exclude them from bundled source docs. Generation is deterministic and rerunnable. Write files atomically and sidecar last; do not claim multi-file transactional guarantees. Contents edits during a running dev server require rerunning generation and restarting the server; hooks run on predev/prebuild, not a navigation watch loop.

`--check` performs source validation and read-only output comparison, including missing/different/stale metadata. CI's first check on a pristine checkout uses `--validate-only`, source-derived routes/anchors and committed catalog parity; no metadata, sidecar, .source or export is required. Separately test output drift and nonmutation with deliberately stale/missing fixtures. Real-loader tests generate their own temporary inputs; exported-route/crawl assertions run explicitly after build. Preserve current root Contents order in phase 1, accepting temporary User Guide prominence until phase 2.

### 2. Information migration and consumers

Produce a complete baseline mapping before moving any of the 70 current source pages. Every old page gets one canonical destination or an explicit index/router consolidation with section-level information accounting. Leaf headings and substantive prose remain unchanged in the migration phase. Allowed edits are frontmatter labels, relative/hosted links, Contents maps, new section introductions, and explicitly inventoried redundant router lists. Do not count deleted repeated lists as deleted substantive guidance, or use that exception to remove unique information.

The migration manifest is verification evidence, not a runtime routing feature. Inventory old/new routes, headings, assets, external source-path consumers, and authorized normalization rules. Compare normalized leaf content against the implementation base, not an invented fixture. Rebuild the generated agent index and bundled docs from canonical source; never hand-edit generated copies.

Preserve the seven labels and the Workflows sequence: choose a mode, Projects, Ideas, Backlog and planning, Waves, then Advanced. Projects gains real planning/execution/review/closeout subdirectories. Advanced receives dispatch, autonomy, worktree, execution contracts and dispatch evidence-layers; Reference receives artifact/state contracts. Dissolve CLI Utilities and retire User Guide as primary sections. The complete per-page map is a required migration deliverable, reviewed before moves. A small not-found page links Home and the existing search affordance; it does not preserve old routes.

**User decision: allow moved URLs to break.** Do not build aliases, redirects, compatibility pages or permanent transitional stubs. Update all in-repository links and explicitly report the route break. The map remains content-accounting evidence only. Canonical headings remain stable during the migration phase; that preserves content, not old-route compatibility. Verify moved old routes are absent from the exported routes, sidebar and search while their new destinations work.

### 3. Supported-skill catalog and ownership

Create a site-owned mapping under `apps/oat-docs/` consumed by repository-only scripts in that app's `scripts/` directory. Package-local tests resolve real Fumadocs dependencies; explicit Node/tsx runner, scoped TypeScript check and oxlint enrollment are specified in the plan. Import the canonical pack manifest through an explicit source alias rather than copying its list or adding public CLI exports. Default eligibility is a real canonical skill shipped in an installable pack, not retired, and not explicitly `user-invocable: false`. The current advisory expects 71 eligible skills out of 83 directories; recompute and explain discrepancies, never hard-code that count as permanent truth.

Generate existing source facts only: name, description and declared visibility. Curate family, canonical guide/anchor and project applicability from actual prerequisites: `required` means an existing active project is mandatory at invocation; `optional` means supported behavior differs when a project exists but invocation works without it; `none` means invocation needs no existing active project, including entry skills that create one. Record conditional details rather than implying `none` forbids project creation. No new skill runtime metadata schema is introduced. The mapping is reviewed as a separate task before prose. A non-author independently verifies every included skill's applicability against SKILL.md with file:line evidence, not only a sample.

Generate the compact catalog into a marked block in `docs/skills/index.md`, commit it, and include it in bundled docs for GitHub and offline skill consumers. The repository script has generate and non-writing check modes. Normal predev/prebuild runs catalog check (never silently rewrites committed output), then nav generation, then fumadocs-mdx and agent-index generation. After source/mapping edits, authors regenerate the catalog explicitly before building. CI rejects stale committed output before a build can obscure it. Group by reader task with owner links; no custom filter application is needed.

The mapping is checked in both directions: every eligible skill has one mapping and a real anchor, every mapping names a real eligible skill, and every canonical directory is accounted for as included or excluded with an evidence-backed reason. The five no-pack skills whose intent is unknown are excluded as currently unshipped, not declared permanently internal. Promoting them to supported distribution is a separate owner decision, not incidental docs work. Retain the uncertainty in an exclusion report.

Each supported skill gets a useful addressable section, not an empty anchor. Minimum coverage is source description, invocation, verified prerequisite/applicability, a realistic example scenario/use case and output/next step, with shared context once per family. Example invocations are required for arguments, modes or non-obvious phrasing; shared examples explicitly explain variant selection. A scenario marker in each anchor supports mechanical coverage, while non-author source verification establishes accuracy/usefulness. Phase 4 creates all required anchors and minimum coverage so the catalog is independently shippable. Phase 5 deepens only the named thin/missing families below. Generated name/description blocks must not require hand-copying metadata into guides; curated prose explains the differences and task, rather than repeating the description mechanically.

### Whole-site reader experience amendment

During p01, Fable relayed the user's request for phase 6 whole-site evaluation, not only reorganization and skill coverage. Capture an all-content/capability baseline before the p02 move, preserving initial implementation-base provenance and p01 changes. Inventory real CLI commands/flags, supported configuration keys and shipped skills; for the pure move, compare page/heading-keyed normalized section hashes at named destinations with explicit link/frontmatter/router accounting. Do not gate a preservation-only move on whole-site semantic extraction. Fact ledgers are extracted from pre-edit pages only where existing prose is actually rewritten/removed, and independently verified then. Additions retain mechanical conservation and source-audited new claims. Re-derive current CLI/config surfaces at p06 reconciliation. Project-local evidence is never a permanent CI input.

After p05, two fresh non-author reviewers see only the rendered site and README: junior-to-mid developer onboarding and Engineering Manager/Tech Lead adoption evaluation. They explicitly try to select a skill from an example and choose a configuration, and judge clarity, writing, helpfulness and compelling/credible adoption value. Prefer actual reviewer-session working directories outside the repository; if the native host cannot bind this, disclose instruction-only source-blindness. Prefer different qualifying models within the policy; serialize shared-display control and disclose any same-model fallback.

Codex/Fable consensus turns findings and coverage gaps into a named bounded editorial list, with both positions durable. The user explicitly declined a triage HiLL wait. Unresolved disagreement keeps content and chooses the smaller rewrite; content/capability removal or narrowing still requires explicit user approval. Add decision guidance for meaningful config alternatives: when to choose, tradeoffs, verified defaults/rationale and a concise recommendation, without replacing complete key references or inventing historical intent. A non-author verifies changed facts/defaults/examples against source and the pre-edit page fact ledger. Run one editorial round and one fresh persona re-evaluation; triage remaining negative verdicts once into bounded small fixes or reported residuals, never an endless polish loop or a false positive verdict. Critical/High, factual-safety and conservation failures remain blocking under existing review limits.

Fresh persona re-evaluation and conservation closeout precede final independent computer-use QA, now p06-t05. Fable reports user permission for a final-only dedicated Zen window on laptop, contingent on host/reachability/isolation proof; Mini phase smokes continue independently. A non-author Codex tour plus Fable's clearly labelled artifact/nonvisual review is fallback if his surface is blocked, not a claimed Fable browser pass. Actual GitHub README acceptance still requires authorized publication. The earlier one-SVG/four-docs-diagram stopping list remains unchanged.

One Review family owns the four ad-hoc and four project-review variants. Brainstorm is Skills-owned; Explainer Kit retains both variants; worktree bootstrap and Cursor Cloud belong under Workflows Advanced. Docs and agent-instructions chains each retain one family owner. Pack membership is packaging, never the visible task taxonomy.

### 4. Bounded reader experience and visuals

The root README serves an evaluator deciding within about 30 seconds whether provider sync, skills/workflows, or docs tooling fits. Lead with independent adoption choices, one clear first-success path and links into the site; contributor setup comes last. Keep it concise and retain one diagram. Package READMEs remain usable as text on npm and have their hosted links updated during migration.

Named README deliverable: one original, accessible, theme-neutral SVG adoption overview answering “Which capability can I adopt independently?” Use text plus links as its equivalent. GitHub's theme does not propagate into an embedded image: use explicit colors/background with contrast on both page themes, not inherited CSS. Do not depict the three capabilities as mandatory dependency layers. No copied Gizmo assets or prose. Verify the actual README on an authorized published branch in both GitHub themes; without publication approval, local preview is provisional and GitHub acceptance remains pending.

Named docs visuals, Mermaid by default:

1. Getting Started concepts: “Which first-success path should I take?” Rework the existing adoption diagram from `guide/concepts.md` in `getting-started/concepts.md`; quickstart links to it rather than adding a duplicate.
2. Provider Sync: “What is canonical, and which provider views are generated?” Show ownership and drift direction, not undocumented conflict resolution.
3. Docs Tooling: “How do bootstrap, analyze, approval and apply relate?” Preserve the actual approval boundary.
4. Ideas: “Where does a scratchpad, backlog item or project belong?” Show optional promotion, not an obligatory lifecycle.

This is the stopping list: one README SVG and four docs visual treatments. Existing project lifecycle diagrams are not wholesale redrawn. Each behavior diagram needs independent source verification; each visual has adjacent explanatory text and a descriptive accessible label. Mermaid source is canonical. Do not introduce a second manually maintained SVG version of the same flow or a new rendering pipeline just for polish. SVG hero source is original and self-contained, with no external fonts or resources.

Named coverage expansions (not an unlimited skill rewrite): research/comparison/synthesis family (`analyze`, `compare`, `deep-research`, `skeptic`, `synthesize`); repository knowledge and improvement (`oat-repo-knowledge-index`, `oat-repo-maintainability-review`, existing repo-improve chain); session closeout (`oat-wrap-up`); project resume/state controls (`oat-project-open`, `oat-project-reconcile`, `oat-project-clear-active`); and skill authoring (`create-agnostic-skill`). Use tested/source-verified examples, expected outputs, prerequisites and next steps. Other skills receive the minimum owner coverage from phase 4, not bespoke long guides.

## Testing Strategy

Use `deliberate-testing` to choose behavioral tests, not snapshots that reproduce implementation assumptions. Reuse real Contents and installed Fumadocs behavior as oracles. Focused compiler tests cover ordering, labels, landing pages, cross-links without reparenting, missing/orphan/double-owned pages, fragments, authored-file refusal, deterministic generation, check-mode nonmutation, stale cleanup, and traversal/symlink rejection. Preserve current MkDocs fixtures. For ownership/write protections, reproduce the rejected bad state and passing valid control; neutralize the guard to prove the key test fails, then restore it.

Run the real installed Fumadocs loader over generated metadata, verifying sidebar order and labels, native ownership, breadcrumbs and previous/next behavior, rather than comparing only a fabricated metadata object. Build a newly scaffolded app to prove first-build ordering. Verify basePath exactly once in the actual app. Repository checks cover catalog eligibility/mapping/anchors, migration content accounting, source-path topic maps, hosted links and generated-source parity. Wire new checks into named package/root scripts and CI rather than leaving local-only assurances.

Browser acceptance uses the exact built checkout, not an unverified deployed version. Serve the static export with the deployment basePath and run `docs:check-links` against that explicit local URL. Phase 1 implementer smoke: authored order/labels, root and child landings, canonical breadcrumb/previous-next, cross-family links. Phase 2 implementer smoke: new seven-section hierarchy, moved leaf, Skills/Workflows entrypoints and updated internal links. Save route, build revision, actions and outcome for each.

After the last phase, an independent reviewer must actually use computer-use browser controls, open pages, navigate the sidebar/search and click through all seven journeys in the IA reference, replacing its old-route compatibility journey with deliberate old-route removal and new-destination verification. Also review the README render and all five named visuals. Use desktop and narrow/mobile viewports, light/dark themes, keyboard navigation, readable diagrams, overflow checks, native headings/anchors, and page-error/console observations where the browser exposes them. Record screenshots, URLs, viewport/theme, actions, expected/actual results and findings in a durable final visual-QA artifact. Automated crawls, source inspection or a green build cannot substitute for this reviewer tour. If browser access or rendering is unavailable, report blocked visual acceptance rather than a pass. No requirement for a full reviewer browser tour at each intermediate phase.

Each separately mergeable phase that changes shipped CLI/docs assets includes regenerated bundles, relevant skill version bumps and a lockstep bump of all five public packages. Run the repository's eight Definition-of-Done gates in order at each PR boundary, plus root lint/format when their surfaces change. Capture real exit codes and distinguish cached results from executed tests. Planning artifacts alone do not trigger product version bumps or the full suite.

## Review Status

Fable accepted the original direction with unified title authority, schema-safe ownership tracking, committed/bundled catalog storage and independent per-skill applicability verification. The original plan gate completed and the user separately invoked implementation under High dispatch. Moved URLs may break. The phase 6 reader/conservation/configuration/scenario amendment is newly drafted during p01 and requires review before p06; earlier gate evidence is not represented as reviewing this later amendment.
