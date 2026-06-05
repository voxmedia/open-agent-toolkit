---
title: Duet docs OAT Fumadocs improvement analysis
description: Improvement opportunities for the Duet docs OAT Fumadocs docs app.
---

# Agent prompt

You are working in `/Users/thomas.stang/Code/vox/duet/apps/duet-docs` to improve the Duet docs app based on the analysis below.

## Objective

Close the narrow OAT contract gaps and improve generated navigation/search quality across the large imported docs surface.

## Required steps

1. Add the missing `index.md` for the Markdown directory identified in the analysis, add missing `## Contents` sections, and make the parent app navigation include the Vox app directory.
2. Rewrite ellipsis-truncated frontmatter descriptions so generated navigation and search previews are meaningful.
3. Replace README-style titles and imported README-copy patterns with purpose-shaped package docs where practical.
4. Fix stale package examples, including the `duet-cli` yarn example, after checking current package scripts/source.
5. Replace or localize fragile external operational assets such as Slab-hosted images and stale proposal framing, or mark owner-review gaps explicitly.
6. Add or propose repeatable analyzer checks for truncated descriptions, README titles, parent Contents coverage, external image URLs, and multiple H1s.

## Generated artifact guidance

Treat `apps/duet-docs/index.md` as generated output. After changing authored docs source, run the documented generation/build path and verify the generated manifest includes the expected pages and improved metadata. Do not hand-edit the generated manifest as the primary fix.

## Validation

Run documented docs build/check commands. Verify directory/index coverage, `## Contents` coverage, generated manifest freshness, frontmatter description quality, and absence of new broken links.

## Evidence

Use the full analysis below for file paths, line references, priorities, and owner-review notes.

# Duet docs OAT Fumadocs improvement analysis

## Scope

Assigned repository/docs app analyzed: `apps/duet-docs` inside `/Users/thomas.stang/Code/vox/duet`.

Files and artifacts inspected (docs app setup and configuration):

- `apps/duet-docs/package.json`, `README.md`, `AGENTS.md`, `CLAUDE.md`
- `apps/duet-docs/source.config.ts`, `next.config.js`, `lib/source.ts`
- `apps/duet-docs/app/[[...slug]]/page.tsx`, `app/layout.tsx`
- `apps/duet-docs/index.md` (generated root index)
- Root `package.json`, root `AGENTS.md`

Files inspected (docs source tree — representative sample):

- `docs/index.md`, `docs/getting-started.md`
- `docs/apps/index.md`, `docs/apps/duet-network-vox/README.md`
- `docs/architecture/index.md`, `docs/architecture/multi-brand/index.md`
- `docs/auth/index.md`, `docs/auth/mobile-app-attestation.md`
- `docs/contributing/index.md`, `docs/contributing/documentation.md`, `docs/contributing/markdown-features.md`
- `docs/duet-api/index.md`, `docs/duet-api/vox/mobile-api.md`, `docs/duet-api/resource-api/endpoints-reference.md`
- `docs/packages/index.md`, `docs/packages/duet-cli/index.md`, `docs/packages/duet-cli/README.md`, `docs/packages/duet-ui/index.md`
- `docs/workflow/index.md`, `docs/workflow/docs-area-map.md`, `docs/workflow/production-deployments.md`, `docs/workflow/qa-deployments.md`, `docs/workflow/troubleshooting.md`
- `docs/working-with-ads/index.md`

Read-only audit scripts were run against the full docs tree for: Markdown/MDX file counts, directory index coverage, `## Contents` presence, relative link suffix compliance, frontmatter completeness, ellipsis-truncated descriptions, README-style titles, multiple-H1 outside code fences, and shell prompts inside fenced commands.

OAT/Fumadocs baseline references read: handoff prompt, SKILL.md, 01–12 + 14 + 16 baseline modules, `apps/oat-docs/AGENTS.md`, `AGENTS.md.template`, `oat-docs-analyze/SKILL.md`, `quality-checklist.md`, `directory-assessment-criteria.md`.

## Executive summary

- The docs app is a well-scaffolded OAT/Fumadocs app with correct `predev`/`prebuild` hooks, a clearly marked generated root `index.md`, and strong authoring guidance across four surfaces (app README, app AGENTS.md, root AGENTS.md, and `docs/contributing/`).
- OAT contract gaps are narrow but important: one Markdown directory missing `index.md`, two `index.md` files missing `## Contents`, and one brand app directory not listed in its parent's `## Contents`.
- Generated navigation and search quality is degraded by 36 pages with ellipsis-truncated descriptions and 10 pages with README-style titles carried over from imported README copies.
- Package documentation follows a README-copy pattern that produces thin `index.md` + mirrored README pairs rather than purpose-shaped package docs.
- Operational docs (production deployments, QA deployments, troubleshooting) are detailed but carry legacy signals: proposal-based framing, external image URLs, and Slab links that may become stale.
- Markdown hygiene is good overall: zero MDX, zero `overview.md`, all fenced code blocks have language identifiers, and only two pages have multiple document-level H1 headings.

## Detected setup

- **Docs app path:** `apps/duet-docs`
- **Docs source path:** `apps/duet-docs/docs/`
- **Detected framework/tooling:** Fumadocs (Next.js + MDX pipeline via `fumadocs-mdx`), OAT docs packages (`@open-agent-toolkit/docs-config`, `@open-agent-toolkit/docs-theme`, `@open-agent-toolkit/docs-transforms`), markdownlint-cli2, oxfmt
- **Generated artifacts:** `apps/duet-docs/index.md` — autogenerated by `oat docs generate-index --docs-dir docs --output index.md` on `predev` and `prebuild` (`package.json:8`, `package.json:10`)
- **Docs scripts:** `pnpm --filter duet-docs dev`, `pnpm --filter duet-docs build`, `pnpm --filter duet-docs docs:lint`, `pnpm --filter duet-docs docs:format` (root shortcuts: `pnpm dev:docs`, `pnpm build:docs`)
- **Authoring guidance:** `apps/duet-docs/AGENTS.md` (scaffolded from OAT bootstrap template), `apps/duet-docs/README.md`, `docs/contributing/documentation.md`, `docs/contributing/markdown-features.md`, root `AGENTS.md` `## Documentation` section

## Overall assessment

The Duet docs app is one of the more mature OAT/Fumadocs implementations inspected. It has a broad content surface (123 pages across 39 directories), consistent authored `## Contents` with `.md`-suffixed relative links, a well-documented authoring contract, and a docs area map that bridges code changes to docs sections. The main improvement areas are closing the few remaining OAT contract gaps, improving the metadata quality that feeds generated navigation and search, and reshaping the imported README-copy pages into purpose-driven package docs.

## Strong patterns

- **Pattern:** Every `## Contents` link uses `.md`-suffixed relative paths.
- **Evidence:** Read-only link audit across all `index.md` `## Contents` sections found zero extension-less relative links.
- **Why it works:** Agents can follow links to target files without path inference, and the `remark-links` plugin normalizes them for Fumadocs routing at build time (OAT convention).

- **Pattern:** Generated root `index.md` is clearly marked and not hand-edited.
- **Evidence:** `apps/duet-docs/index.md:1` starts with `<!-- AUTOGENERATED by oat docs generate-index`. `AGENTS.md:49` and `README.md:15` both warn against hand-editing.
- **Why it works:** Prevents generated/authored confusion and protects against silent clobbering (OAT convention).

- **Pattern:** Comprehensive authoring guidance across four surfaces.
- **Evidence:** `AGENTS.md` covers add-page, restructure-nav, audit/bulk-edit, and what-not-to-do. `docs/contributing/documentation.md` covers nav contract, local workflow, source-linking, generated files, and agent guidance. `docs/contributing/markdown-features.md` covers supported syntax with rendered examples.
- **Why it works:** Agents and human contributors have a consistent reference for the docs contract without tribal knowledge (baseline principle: make docs explicit enough for agents).

- **Pattern:** Docs area map bridges code changes to docs sections.
- **Evidence:** `docs/workflow/docs-area-map.md` provides a path-prefix mapping table from monorepo source paths to docs directories, plus a `duet-ui` sub-section mapping.
- **Why it works:** Reduces the "where should this docs change go?" question to a lookup table, which is especially valuable for agents making code changes (baseline principle: reduce human interrupts).

- **Pattern:** Zero MDX files and zero `overview.md` files.
- **Evidence:** File inventory across the full docs tree: 123 `.md` files, 0 `.mdx` files, 0 `overview.md` files.
- **Why it works:** Follows the OAT convention of preferring plain `.md` and using `index.md` for section entrypoints.

- **Pattern:** Strong API reference docs with source-file links and structured tables.
- **Evidence:** `docs/duet-api/vox/mobile-api.md` includes endpoint, auth middleware details, JWT claim tables, query parameter tables, response shapes, error tables, pagination docs, and curl examples. `docs/duet-api/resource-api/endpoints-reference.md` links handler and fragment source files for every endpoint.
- **Why it works:** Follows the API documentation baseline: auth, request/response shapes, errors, pagination, examples (07-api-docs.md).

## Improvement opportunities

### Missing `index.md` for `docs/apps/duet-network-vox`

- **Priority:** High
- **Evidence:** `docs/apps/duet-network-vox/` contains only `README.md`. No `index.md` exists. The parent `docs/apps/index.md` `## Contents` section (lines 10–13) lists only `duet-docs` and `duet-network-theverge` — Vox is not listed despite being mentioned in the page body (line 19).
- **Issue:** The directory has Markdown content but no `index.md` and is invisible to the authored navigation contract.
- **Why it matters:** Every content directory must have an `index.md` with a `## Contents` section (OAT convention, `quality-checklist.md`, `directory-assessment-criteria.md`). Missing coverage for a top-level brand app is a High severity gap.
- **Recommended change:** Create `docs/apps/duet-network-vox/index.md` with frontmatter and a `## Contents` section listing `README.md`. Add a `[Vox Network App](duet-network-vox/index.md)` entry to `docs/apps/index.md` `## Contents`.
- **Suggested target:** `docs/apps/duet-network-vox/index.md` (new), `docs/apps/index.md` (edit `## Contents`)
- **Owner review needed:** No — this is a structural contract fix.

### Missing `## Contents` in `docs/architecture/multi-brand/index.md`

- **Priority:** Medium
- **Evidence:** `docs/architecture/multi-brand/index.md` is a substantial content page (295 lines covering community resolution, brand custom apps, GSSP configuration, layouts, and feature config) but has no `## Contents` section. It has a `## Related` section at line 287 but that lists cross-links to other sections, not a local directory map.
- **Issue:** The directory uses `index.md` as a content page without the local-map contract. Currently a leaf directory, but the `## Contents` section is still expected by the OAT contract.
- **Why it matters:** `## Contents` is the machine-readable local map; anything not listed there is effectively invisible to navigation tooling (OAT convention).
- **Recommended change:** Add a `## Contents` section. Since this is currently a leaf directory, it can be a brief note that this section is self-contained, or it can list the major subsections as anchors.
- **Suggested target:** `docs/architecture/multi-brand/index.md`
- **Owner review needed:** No — structural contract fix.

### Missing `## Contents` in `docs/working-with-ads/index.md`

- **Priority:** Medium
- **Evidence:** `docs/working-with-ads/index.md` is a content page (68 lines) that directly documents ad placement. It has no `## Contents` section. Currently a single-file directory.
- **Issue:** Same as above — no local-map contract for the directory.
- **Why it matters:** Same OAT convention. Even single-file directories should expose `## Contents` in case future pages are added.
- **Recommended change:** Add a `## Contents` section.
- **Suggested target:** `docs/working-with-ads/index.md`
- **Owner review needed:** No — structural contract fix.

### Ellipsis-truncated frontmatter descriptions (36 pages)

- **Priority:** Medium
- **Evidence:** 36 pages have `description:` values ending with `...` or `…`. Examples: `docs/cyclone/index.md` ("Cyclone-app is a Monorepo which includes a server and PostgreSQL database which is where various user generated content is stored. With the launch of SBNatio..."), `docs/auth/sso.md` ("This document describes the SSO login flow used to enable seamless authentication between sbnation.com and other community sites (e.g., bleedinggreennation.c..."), `docs/duet-api/resource-api/index.md` ("The Resource API provides RESTful endpoints for fetching content resources (articles, venues, maps, etc.) with full GraphQL fragment composition and type saf...").
- **Issue:** Descriptions drive search previews, social cards, and sibling summaries in the generated index. Truncated descriptions provide incomplete context and look like auto-generated stubs rather than authored summaries.
- **Why it matters:** The description drives nav display and search previews (OAT convention: "Empty descriptions hurt all three"). Truncated descriptions are worse than short but complete ones.
- **Recommended change:** Rewrite each truncated description as a complete 1–2 sentence summary. Prioritize the 19 `index.md` pages first since their descriptions surface in the generated root index.
- **Suggested target:** Each of the 36 affected pages, starting with section `index.md` files.
- **Owner review needed:** Unknown — some descriptions may need domain context to summarize well.

### README-style titles and imported README-copy pattern (10+ pages)

- **Priority:** Medium
- **Evidence:** 10 pages have titles containing "README" (e.g., `docs/packages/duet-cli/README.md` with `title: "duet-cli README"`, `docs/packages/duet-ui/README.md` with `title: "duet-ui README"`). These pages carry a `> [!NOTE]` at the top explaining they are documentation copies of the source README. The `docs/packages/duet-cli/README.md` page still references `yarn global add` (line 20) and includes `$` shell prompts (lines 20–21), which are stale given the pnpm-based monorepo.
- **Issue:** README-titled pages surface "README" in generated navigation and search. The README-copy pattern produces pages that are not task-shaped or reference-shaped — they are copies of a different artifact type. Some copies contain stale commands.
- **Why it matters:** The baseline guidance says package docs should include purpose, when to use, install, quick start, core concepts, and public API (10-library-framework-docs.md). A README copy satisfies none of these well. The README-style title degrades nav clarity.
- **Recommended change:** Over time, reshape each package README copy into a purpose-driven package overview merged into the `index.md`, removing the README mirror page. Short-term: retitle the pages to remove "README" from the title, and fix stale commands (e.g., `yarn` → `pnpm`).
- **Suggested target:** `docs/packages/*/README.md` and corresponding `docs/packages/*/index.md`
- **Owner review needed:** Yes — need to decide whether README copies should be retained alongside the index, merged into the index, or replaced with purpose-shaped package docs.

### Production deployments description and framing

- **Priority:** Low
- **Evidence:** `docs/workflow/production-deployments.md:3` has `description: "This document is based on the MVP Deployment Process Proposal."` and line 8 repeats the same with a Slab link. The description references a proposal rather than describing the page's purpose.
- **Issue:** The description does not help a reader or agent decide whether this page answers their question. Proposal-based framing signals a document that may not reflect current state.
- **Why it matters:** Baseline principle: reader-first, not system-first. Descriptions should explain the page's purpose, not its provenance.
- **Recommended change:** Rewrite the description to state the page's purpose (e.g., "How to initiate, monitor, roll back, and hotfix Duet production deployments"). Remove or move the proposal reference to a note inside the page.
- **Suggested target:** `docs/workflow/production-deployments.md` frontmatter
- **Owner review needed:** No — metadata improvement.

### External image URLs in operational docs

- **Priority:** Low
- **Evidence:** `docs/workflow/production-deployments.md` references images hosted on `static.slab.com` and `slabstatic.com` (lines 19, 148, 157, 170, etc.). `docs/workflow/qa-deployments.md` references images under `docs/images/workflow/` (lines 24, 30, 48).
- **Issue:** External Slab-hosted images may become unavailable if the Slab workspace changes or if network access is restricted. The QA deployments page uses local images correctly, but the production deployments page does not.
- **Why it matters:** Baseline guidance: committed images are preferred over external URLs for durability (06-markdown-fumadocs.md).
- **Recommended change:** Download and commit the Slab-hosted images under `docs/images/workflow/` and update the references.
- **Suggested target:** `docs/workflow/production-deployments.md`
- **Owner review needed:** No — asset migration.

### Multiple document-level H1 headings (2 pages)

- **Priority:** Low
- **Evidence:** `docs/media/images.md` has two H1 headings outside code fences (lines 6 and 153). `docs/packages/duet-cli/README.md` has two H1 headings (lines 6 and 13).
- **Issue:** The Markdown convention is one `#` heading per page. Multiple H1s break document outline and accessibility.
- **Why it matters:** Baseline: one `#` heading per page (06-markdown-fumadocs.md). The `duet-cli/README.md` case is a legacy import artifact.
- **Recommended change:** Demote the extra H1s to `##`.
- **Suggested target:** `docs/media/images.md:153`, `docs/packages/duet-cli/README.md:13`
- **Owner review needed:** No — Markdown hygiene fix.

## Baseline authoring guidance deltas

**Information architecture (03-information-architecture.md):**

- The landing page (`docs/index.md`) answers "what is this," "how do I get started," and provides a full `## Contents` map, but does not explicitly address ownership, non-goals, or "what this project does not do" per the landing page contract. This is acceptable for an internal docs surface but worth noting.

**Page types (04-page-types.md):**

- Package README copies are not shaped as any of the four primary page types (tutorial, how-to, reference, explanation). They are imported artifact copies. The baseline says each page should have one primary job.
- The `working-with-ads/index.md` is a single-page explanation/how-to hybrid. This is fine per the baseline ("know the primary job of the page and keep the rest subordinate") but would benefit from a `## Contents` section for discoverability.

**Writing style (05-writing-style.md):**

- 36 truncated descriptions use ellipsis as if auto-generated from the first paragraph rather than authored as concise summaries. The style guidance says descriptions should be complete and useful.
- `docs/workflow/production-deployments.md` opens with "This document is based on the MVP Deployment Process Proposal" — proposal-provenance framing rather than purpose-first writing.

**Category-specific coverage:**

- CLI docs (08-cli-docs.md): `duet-cli` has only a README copy with a stale `yarn` install command. No command reference, flag documentation, config precedence, or CI guidance.
- Operations docs (11-architecture-operations-docs.md): Production deployments and troubleshooting pages are detailed but the deployment page lacks a clear ownership/escalation section. The troubleshooting page is strong (symptom-first with runbook structure).

## OAT/Fumadocs convention deltas

- **Missing `index.md`:** `docs/apps/duet-network-vox/` has Markdown content but no `index.md`. Convention: every content directory must have an `index.md`.
- **Missing `## Contents`:** `docs/architecture/multi-brand/index.md` and `docs/working-with-ads/index.md` lack `## Contents` sections. Convention: every `index.md` must include a `## Contents` section.
- **Navigation gap:** `docs/apps/index.md` `## Contents` does not list `duet-network-vox`, making that directory invisible to the authored navigation. Convention: anything not listed in `## Contents` is effectively invisible to navigation tooling.
- **No `overview.md` violation:** None found. Good.
- **No extension-less `## Contents` links:** None found. Good.
- **No hand-edited generated artifacts:** The generated root `index.md` shows the autogenerated marker. Good.
- **Plain `.md` preferred:** 123 `.md`, 0 `.mdx`. Good.
- **Authoring guidance present:** `AGENTS.md`, `README.md`, `docs/contributing/` all document the contract. Good.

## Recommended follow-up work

1. **Create `docs/apps/duet-network-vox/index.md` and add it to `docs/apps/index.md` `## Contents`.** Target: `docs/apps/duet-network-vox/index.md` (new), `docs/apps/index.md` (edit). Evidence: directory has Markdown but no index; parent `## Contents` omits it. Owner review: not needed.

2. **Add `## Contents` to `docs/architecture/multi-brand/index.md` and `docs/working-with-ads/index.md`.** Target: both files. Evidence: OAT contract requires `## Contents` in every `index.md`. Owner review: not needed.

3. **Rewrite 36 ellipsis-truncated descriptions as complete 1–2 sentence summaries.** Target: all 36 affected pages, prioritizing `index.md` pages. Evidence: descriptions surface in generated nav/search. Owner review: unknown (domain context may be needed for some).

4. **Retitle 10 README-copy pages to remove "README" from the title.** Target: `docs/packages/*/README.md`, `docs/apps/*/README.md`. Evidence: README in title degrades nav/search summaries. Owner review: not needed for title change; owner review needed for deciding whether to merge README content into index.

5. **Fix stale `yarn` command in `docs/packages/duet-cli/README.md`.** Target: `docs/packages/duet-cli/README.md:20`. Evidence: monorepo uses pnpm; the source README may also be stale. Owner review: yes — need to confirm whether the source README has also been updated.

6. **Download and commit Slab-hosted images in `docs/workflow/production-deployments.md`.** Target: `docs/workflow/production-deployments.md` and `docs/images/workflow/`. Evidence: external URLs may become unavailable. Owner review: not needed.

7. **Demote extra H1 headings in `docs/media/images.md:153` and `docs/packages/duet-cli/README.md:13`.** Target: both files. Evidence: Markdown convention is one H1 per page. Owner review: not needed.

8. **Rewrite `docs/workflow/production-deployments.md` description to state purpose instead of proposal provenance.** Target: frontmatter. Evidence: current description does not help readers decide if the page answers their question. Owner review: not needed.

## Candidate checks for `oat-docs-analyze`

- **Truncated description check:** Flag `description:` values containing `...` or `…` as likely auto-truncated rather than authored. Severity: Medium.
- **README-titled page check:** Flag pages whose `title:` contains "README" as potential imported copies that may need reshaping. Severity: Low.
- **Parent `## Contents` completeness check:** For each Markdown directory that has an `index.md`, verify that all sibling Markdown files and immediate child directories with Markdown are listed in the parent directory's `## Contents`. The existing index-contract check catches missing `index.md` and missing `## Contents`, but does not flag a directory that exists and has an `index.md` but is omitted from its parent's `## Contents`. Severity: High.
- **External image URL check:** Flag Markdown image references to non-committed URLs (e.g., `slab.com`, `slabstatic.com`, `static.slab.com`) as potentially fragile. Severity: Low.
- **Multiple document-level H1 check:** Flag pages with more than one `#` heading outside code fences. Severity: Low.

## Open questions

- Should the 10 README-copy pages be retained as separate mirror pages alongside the package `index.md`, or should their content be merged into the `index.md` and the README copies removed? The current pattern produces thin `index.md` files that primarily link to the README copy.
- The `docs/apps/index.md` body (line 19) mentions Eater and SB Nation brand apps but neither has a docs directory. Should empty app directories with placeholder `index.md` be created for Eater and SB Nation for completeness, or should they be documented only when substantive app-specific content exists?
- The `docs/workflow/production-deployments.md` page includes Fastly API key environment variable names and service IDs in shell function examples. Are these safe for the internal docs surface, or should they be abstracted?
- Some `## Contents` descriptions in `index.md` files are also truncated with ellipses (matching the frontmatter descriptions). When descriptions are fixed, should `## Contents` link descriptions also be updated to match, or should they remain shorter summaries?
