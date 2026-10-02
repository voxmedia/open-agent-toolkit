---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-01
oat_generated: false
oat_template: false
---

# Design: docs-improvement-overhaul

## Overview

Make the documentation useful to a person choosing one capability, completing a task, or looking up a named skill. Home remains an overview; the seven primary sections are Getting Started, Skills, Workflows, Provider Sync, Docs Tooling, Reference, and Contributing. Skills is universal discovery, not a standalone-only bucket. Canonical family guides own usage prose; the catalog links to per-skill anchors without copying complete skill instructions.

First make authored navigation executable. Extend the shipped navigation CLI with an explicit Fumadocs projection of section Contents, preserving the existing MkDocs default. Then migrate information without rewriting substantive prose. A repository-specific catalog prevents supported skills from silently disappearing. Finally, bounded authoring fills known guide gaps and improves the README and selected visuals. This is one quick project with five independently reviewable, sequential phases: navigation, migration, README, skill discovery, and coverage/final acceptance. README is separated because it addresses evaluators and can ship immediately after route migration.

The user authorized design and planning, not implementation. Fable reviews the design and plan; implementation approval remains a later boundary. The full independent reviewer computer-use tour runs after the last phase. Implementers perform focused browser smoke checks after navigation and migration, rather than repeating the full tour every phase.

## Architecture

```text
section index.md Contents + page frontmatter
  -> oat docs nav sync --framework fumadocs
  -> ignored, owned meta.json output -> fumadocs-mdx -> real loader -> static site

canonical SKILL.md + shipped pack manifest + site-owned guide mapping
  -> repository tools/docs catalog script -> generated Skills catalog
  -> navigation generation -> static site

source docs + source-path consumers + migration inventory
  -> route/anchor/content checks + link crawl + browser journeys
```

Contents owns sidebar membership and order; native page frontmatter owns page labels. Folder labels come from the owning Contents entry and generated folder metadata. Cross-links retain their authored labels but do not take ownership of another section's pages. The Skills page body owns the complete catalog; sidebar cross-links are limited to canonical family entrypoints, never one sidebar entry per skill.

Generated framework metadata is ignored build output, not a second manually maintained map. The repository catalog generator is not a new public CLI command. The existing generated app-root agent index remains separate from both the human sidebar and the skill catalog.

## Component Design

### 1. Shipped navigation compiler

**Interface:** extend `oat docs nav sync` with explicit `--framework mkdocs|fumadocs` and `--check`, retaining `--target-dir`. Omitting framework preserves MkDocs behavior. Current app and scaffold scripts explicitly choose Fumadocs and generate metadata before `fumadocs-mdx`. MkDocs parsing and YAML preservation remain regression-tested.

The Fumadocs projection supports ordinary file-derived routes, a `/` loader base, section indexes, Markdown leaf pages, and relative cross-section links with optional fragments. Next's deployment basePath is not baked into metadata; the renderer applies it once. External links, query-bearing navigation entries, custom slug loaders, non-root loader bases, and a new separator DSL are out of scope and receive actionable diagnostics rather than accidental interpretation. Ignore code fences when reading the exact H2 Contents section; do not turn examples into navigation.

For each physical directory, classify Contents entries as its own landing, immediate owned leaf, immediate child section, or cross-link. Emit native identifiers for owned pages/folders and explicit routed links for cross-links; a cross-link to an index never recursively imports its children. Root `index` appears once; child landing pages attach once through Fumadocs folder behavior. Every canonical leaf and non-root section must have exactly one physical-parent ownership entry. Cross-links do not count as ownership. Missing entries, duplicate ownership, unresolved files/fragments, and owned-leaf label/title mismatch fail validation. Phase 1 aligns the four observed mismatched labels/titles without renaming headings.

Generated metadata carries a recognizable ownership marker. Prevalidate the complete output and cleanup set before writing. Refuse any unmarked metadata, even when untracked: checking only Git tracking is unsafe in scaffolded/non-Git projects. Reject traversal and symlink escapes. Remove only positively marked stale outputs within the docs root. Ignore generated files in Git and exclude them from the CLI's bundled source docs. Generation is deterministic and rerunnable; filesystem write failures report incomplete output and fail rather than claiming a transactional guarantee.

`--check` performs the same source validation and a read-only comparison of generated output, including missing/different/stale metadata. A pristine checkout first generates ignored output, then checks it. CI also runs real-loader assertions and source validation, so regenerating metadata cannot hide orphan pages or invalid ownership.

### 2. Information migration and consumers

Produce a complete baseline mapping before moving any of the 70 current source pages. Every old page gets one canonical destination or an explicit index/router consolidation with section-level information accounting. Leaf headings and substantive prose remain unchanged in the migration phase. Allowed edits are frontmatter labels, relative/hosted links, Contents maps, new section introductions, and explicitly inventoried redundant router lists. Do not count deleted repeated lists as deleted substantive guidance, or use that exception to remove unique information.

The migration manifest is verification evidence, not a runtime routing feature. Inventory old/new routes, headings, assets, external source-path consumers, and authorized normalization rules. Compare normalized leaf content against the implementation base, not an invented fixture. Rebuild the generated agent index and bundled docs from canonical source; never hand-edit generated copies.

Preserve the seven labels and the Workflows sequence: choose a mode, Projects, Ideas, Backlog and planning, Waves, then Advanced. Projects gains real planning/execution/review/closeout subdirectories. Advanced receives dispatch, autonomy, worktree and execution contracts; Reference receives artifact/state/evidence contracts. Dissolve CLI Utilities and retire User Guide as primary sections. The complete per-page map is a required migration deliverable, reviewed before moves.

**User decision: allow moved URLs to break.** Do not build aliases, redirects, compatibility pages or permanent transitional stubs. Update all in-repository links and explicitly report the route break. The map remains content-accounting evidence only. Canonical headings remain stable during the migration phase; that preserves content, not old-route compatibility. Verify moved old routes are absent from the exported routes, sidebar and search while their new destinations work.

### 3. Supported-skill catalog and ownership

Create a site-owned mapping under `apps/oat-docs/` consumed by a repository script under `tools/docs/`. Import the canonical pack manifest rather than copying its skill list. Default eligibility is a real canonical skill shipped in an installable pack, not retired, and not explicitly `user-invocable: false`. The current advisory expects 71 eligible skills out of 83 directories; recompute and explain discrepancies, never hard-code that count as permanent truth.

Generate existing source facts only: name, description and declared visibility. Curate family, canonical guide/anchor and project applicability (`required`, `optional`, or `none`) from each skill's actual prerequisites. No new skill runtime metadata schema is introduced. Render the compact catalog in the Skills page body, grouped by reader task, with name lookup and links to owners. No custom search/filter application is required; the existing site search and browser find suffice.

The mapping is checked in both directions: every eligible skill has one mapping and a real anchor, every mapping names a real eligible skill, and every canonical directory is accounted for as included or excluded with an evidence-backed reason. The five no-pack skills whose intent is unknown are excluded as currently unshipped, not declared permanently internal. Promoting them to supported distribution is a separate owner decision, not incidental docs work. Retain the uncertainty in an exclusion report.

Each supported skill gets a useful addressable section, not an empty anchor. Minimum coverage is source description, invocation, verified prerequisite/applicability and output/next step, with shared context once per family. Phase 4 creates all required anchors and minimum coverage so the catalog is independently shippable. Phase 5 deepens only the named thin/missing families below. Generated name/description blocks must not require hand-copying metadata into guides; curated prose explains the differences and task, rather than repeating the description mechanically.

One Review family owns the four ad-hoc and four project-review variants. Brainstorm is Skills-owned; Explainer Kit retains both variants; worktree bootstrap and Cursor Cloud belong under Workflows Advanced. Docs and agent-instructions chains each retain one family owner. Pack membership is packaging, never the visible task taxonomy.

### 4. Bounded reader experience and visuals

The root README serves an evaluator deciding within about 30 seconds whether provider sync, skills/workflows, or docs tooling fits. Lead with independent adoption choices, one clear first-success path and links into the site; contributor setup comes last. Keep it concise and retain one diagram. Package READMEs remain usable as text on npm and have their hosted links updated during migration.

Named README deliverable: one original, accessible SVG adoption overview answering “Which capability can I adopt independently?” Use text plus links as its equivalent. Do not depict the three capabilities as mandatory dependency layers. No copied Gizmo assets or prose.

Named docs visuals, Mermaid by default:

1. Getting Started quickstart: “Which first-success path should I take?” Rework the existing adoption visual instead of adding a second competing diagram.
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

Draft for Fable review. The initial approach review's label authority, catalog/sidebar separation, bounded authoring, independent README phase, real-loader tests and repo-local catalog recommendations are incorporated. The user explicitly declined old-route compatibility. Generated metadata remains ignored, but marker-based protection is retained because the CLI must safely operate outside tracked Git repositories.
