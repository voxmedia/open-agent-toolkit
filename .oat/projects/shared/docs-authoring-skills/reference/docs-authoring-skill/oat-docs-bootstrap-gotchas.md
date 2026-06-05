---
title: OAT docs bootstrap gotchas and considerations
description: Lessons from prior OAT Fumadocs refactors that should inform new docs bootstrap runs.
---

# OAT docs bootstrap gotchas and considerations

## Source projects reviewed

Citation shorthand used below:

- `duet:<path>:<line>` refers to `/Users/thomas.stang/Code/vox/duet/.oat/projects/archived/fumadocs-refactor/<path>`.
- `honeycomb:<path>:<line>` refers to `/Users/thomas.stang/Code/vox/honeycomb/.oat/projects/archived/fumadocs-refactor/<path>`.
- `oat:<path>:<line>` refers to `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/<path>`.

Reviewed source projects and artifacts:

- Duet `fumadocs-refactor`
  - Lifecycle artifacts: `state.md`, `discovery.md`, `plan.md`, `implementation.md`, `summary.md`, `pr/description.md`.
  - Reference artifacts: `reference/corrections-log.md`, `reference/invalid-references-to-remove.md`, `reference/runbook.md`.
  - Repo spot checks: `apps/duet-docs/package.json`, `apps/duet-docs/AGENTS.md`, `apps/duet-docs/CLAUDE.md`, `apps/duet-docs/index.md`, `apps/duet-docs/docs/index.md`, `apps/duet-docs/next.config.js`, `apps/duet-docs/source.config.ts`, `apps/duet-docs/.markdownlint.jsonc`, `apps/duet-docs/.oxfmtrc.json`.
- Honeycomb `fumadocs-refactor`
  - Lifecycle artifacts: `state.md`, `discovery.md`, `plan.md`, `implementation.md`, `summary.md`, `pr/project-pr-2026-06-01.md`.
  - Reference and review artifacts: `reference/runbook.md`, `reviews/p02-review-2026-06-01.md`, `reviews/p03-review-2026-06-01.md`, `reviews/p04-review-2026-06-01.md`, `reviews/p05-review-2026-06-01.md`, `reviews/p06-review-2026-06-01.md`, `reviews/final-review-2026-06-01.md`.
  - Repo spot checks: `apps/honeycomb-docs/package.json`, `apps/honeycomb-docs/AGENTS.md`, `apps/honeycomb-docs/CLAUDE.md`, `apps/honeycomb-docs/index.md`, `apps/honeycomb-docs/docs/index.md`, `apps/honeycomb-docs/next.config.js`, `apps/honeycomb-docs/source.config.ts`, `apps/honeycomb-docs/.markdownlint.jsonc`, `apps/honeycomb-docs/.oxfmtrc.json`.
- OAT docs standards and bootstrap conventions
  - Research-pack baseline: `SKILL.md`, `01-principles.md`, `02-agent-workflow.md`, `03-information-architecture.md`, `06-markdown-fumadocs.md`, `14-review-rubric.md`, `16-docs-audit-prompts.md`.
  - OAT-specific rules: `apps/oat-docs/AGENTS.md`, `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`, `.agents/skills/oat-docs-analyze/SKILL.md`, `.agents/skills/oat-docs-analyze/references/quality-checklist.md`, `.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`, `.agents/skills/oat-docs-bootstrap/SKILL.md`.
- Additional reference repos checked for docs build/dev isolation: `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation`, `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs`, `/Users/thomas.stang/Code/vox/duet/apps/duet-docs`, `/Users/thomas.stang/Code/vox/vox-mobile-app/documentation`, `/Users/thomas.stang/Code/vox/cyclone-app/apps/documentation`, `/Users/thomas.stang/Code/stoa/apps/documentation`.

## Executive summary

- Bootstrap needs to distinguish a brand-new docs surface from a migration. Honeycomb's preflight found 122 Markdown files, about 42 directories, 38 `overview.md` files, MkDocs syntax, Python build tooling, CI, docs indexing, and stale OAT config before any scaffold decision (`honeycomb:discovery.md:28-56`).
- Early app-location decisions prevent churn. Honeycomb kept `apps/honeycomb-docs` because deploy workflow, Docs MCP indexing, and `.oat/config.json` already referenced that path (`honeycomb:discovery.md:69-70`).
- The authored navigation source is `docs/**/index.md` and each `## Contents` section. OAT docs guidance says `.md`-suffixed links in `## Contents` are the machine-readable local map, generated navigation is derived, and generated files must not be hand-edited (`oat:apps/oat-docs/AGENTS.md:11-20`).
- Build success does not prove render fidelity. Duet's Fumadocs build passed while MkDocs figures rendered zero images; after conversion the relay page went from 0 to 22 images and total bundled images went from 7 to 56 (`duet:reference/invalid-references-to-remove.md:53-96`, `duet:reference/corrections-log.md:156-176`).
- The bootstrap should install guardrails for formatter and linter behavior. Both prior projects ended on `docs:lint` and `docs:format:check`; Duet's runbook warns that formatters can silently corrupt fenced examples and recommends `embeddedLanguageFormatting: "off"` (`duet:reference/runbook.md:239-244`, `duet:reference/runbook.md:389-396`).
- Fumadocs app identity has multiple surfaces. `createDocsConfig()` does not wire `title` or `description` into HTML metadata; site metadata belongs in `app/layout.tsx`, while `DocsLayout.branding` controls chrome (`duet:reference/runbook.md:107`).
- Docs app build/dev should be opt-in, especially in monorepos. Reference repos either keep docs as a separate package or exclude docs packages from root build/dev while providing explicit `build:docs` and `dev:docs` entrypoints.
- Migration correctness includes repo-accuracy verification. Duet made current `main`, not a PR narrative, the source of truth; Honeycomb's final accuracy pass made about 19 evidence-backed drift fixes across docs clusters (`duet:discovery.md:43-46`, `honeycomb:implementation.md:215`).
- Agent-instruction surfaces are part of the scaffold, not an afterthought. The OAT pattern separates root `AGENTS.md` documentation pointers, docs-app `AGENTS.md` runtime guidance, and human-facing `docs/contributing.md`; Honeycomb verified these surfaces in Phase 6 (`honeycomb:implementation.md:204-213`).

## Bootstrap-time decisions

Decide these before invoking `oat docs init` or writing scaffold files:

- **New docs app or migration:** Ask whether existing MkDocs content should be migrated. If yes, inventory `mkdocs.yml`, `requirements.txt`, plugin/extension usage, docs tree shape, syntax features, generated files, package scripts, deploy workflows, docs indexing, OAT config, and source-to-doc reference systems before modifying files.
- **Docs app location:** Preserve an existing app path when CI, indexing, S3 buckets, package filters, or `.oat/config.json` already point to it. Honeycomb avoided a rename because existing integration surfaces referenced `apps/honeycomb-docs` (`honeycomb:discovery.md:69-70`).
- **Display title vs package name:** Collect a human site name separately from the package/app name. The site name affects metadata and chrome; the package name affects `pnpm --filter`, directory names, and workspace identity.
- **Generated root index strategy:** Decide where the generated root `index.md` lives, how it is regenerated, and how users will be warned not to hand-edit it. Duet's runbook treats the generated root index as committed but clobbered by generation (`duet:reference/runbook.md:184-185`, `duet:reference/runbook.md:385-386`).
- **Source tree layout:** For OAT/Fumadocs, authored docs live under the docs source tree; every content directory should have `index.md`; `overview.md` should not be a directory entrypoint (`oat:.agents/skills/oat-docs-analyze/references/quality-checklist.md:7-10`).
- **Navigation authoring:** Use per-directory `## Contents` sections with `.md`-suffixed relative links to sibling pages and `subdir/index.md` links to child directories. Run the nav/index generation command after structural changes (`oat:apps/oat-docs/AGENTS.md:13-15`).
- **Markdown vs MDX:** Default to `.md`. Use `.mdx` only for pages that need JSX/components; plain `.md` is easier for agents, linters, and grep-based navigation (`oat:apps/oat-docs/AGENTS.md:11`).
- **Legacy MkDocs syntax policy:** Decide which syntax is supported by OAT transforms and which must be converted. Honeycomb kept `=== "tab"` tabs and Mermaid, but converted admonitions and manually inlined/remediated snippet and macro usage where needed (`honeycomb:discovery.md:39-46`).
- **Package scripts and build/dev isolation:** Add docs app scripts that make the intended validation path obvious: `predev`, `dev`, `prebuild`, `build`, `start`, `docs:lint`, `docs:lint:fix`, `docs:format`, `docs:format:check`. In monorepos, root `build` and root `dev` should not build or start the docs app; expose explicit root `build:docs` and `dev:docs` commands for opting in. Also ensure root test/lint/type-check tasks do not unintentionally schedule the docs build.
- **Deploy and indexing integration:** Preserve existing deploy buckets, triggers, roles, and docs indexing where possible; only swap the build and output directory from MkDocs/Python to Fumadocs/Node when migrating (`honeycomb:discovery.md:47-52`).
- **OAT config update:** Validate `.oat/config.json` before and after changes. Set `documentation.tooling` to `fumadocs`, set an `index` path for the generated root index, and remove stale MkDocs config keys.

## Common gotchas

### Treating a migration like a blank scaffold

- **Seen in:** both
- **Evidence:** Duet began from an existing cloud-agent Fumadocs migration that needed reconciliation and accuracy auditing (`duet:discovery.md:26-46`); Honeycomb explicitly applied the Duet runbook to an existing MkDocs app with 122 files, 38 `overview.md` files, MkDocs tooling, CI, and OAT config to update (`honeycomb:discovery.md:28-56`).
- **Symptom:** The scaffold may build, but legacy content, old commands, stale configuration, or MkDocs-only syntax still leaks through.
- **Cause:** `oat docs init` creates an app shell; it does not prove that the legacy content model, syntax, links, CI, and source references have been migrated.
- **Bootstrap guidance:** If existing docs are detected, switch from pure bootstrap to a migration preflight. Record content counts, unsupported syntax, generated files, deploy workflows, source-reference tooling, and OAT config before any write.
- **Follow-up check:** After scaffold or migration, run a structural audit: no `overview.md`, every content directory has `index.md`, every index has `## Contents`, generated root index exists, and deploy/indexing files point at the Fumadocs output.

### App path and package name have integration gravity

- **Seen in:** honeycomb
- **Evidence:** Honeycomb kept `apps/honeycomb-docs` because deploy workflow, Docs MCP indexing, and `.oat/config.json` already referenced it (`honeycomb:discovery.md:69-70`).
- **Symptom:** A theoretically cleaner app path causes CI, docs indexing, OAT config, package filters, and bucket sync paths to drift.
- **Cause:** Docs app paths are usually embedded in multiple repo surfaces.
- **Bootstrap guidance:** Ask whether the target path is already referenced by workflows, `package.json`, `.oat/config.json`, Docs MCP indexing, or source doc-ref tooling. Prefer migration in place when existing integrations are correct.
- **Follow-up check:** Grep workflows and config for the old and new path; verify `pnpm --filter <docs-package> build` and deploy source directory both use the intended app.

### Authored `## Contents` is the source of truth, not generated navigation

- **Seen in:** both
- **Evidence:** OAT docs guidance says the nearest `index.md` `## Contents` section is the machine-readable local map and that generated navigation artifacts must not be hand-edited (`oat:apps/oat-docs/AGENTS.md:13-20`).
- **Symptom:** Pages exist but are invisible to agents/nav tooling, or changes to generated files disappear on the next build.
- **Cause:** Agents edit `mkdocs.yml`, a generated root `index.md`, or framework-side navigation instead of authored `docs/**/index.md` files.
- **Bootstrap guidance:** Teach this contract in the scaffolded docs-app `AGENTS.md` and `docs/contributing.md`. Generate navigation from authored `## Contents`; never use generated files as the authoring surface.
- **Follow-up check:** Run the nav/index generation command and inspect the diff. Generated artifacts should reflect authored `## Contents` changes with no manual-only edits.

### Legacy `overview.md` entrypoints create migration and reference churn

- **Seen in:** honeycomb
- **Evidence:** Honeycomb discovered 38 `overview.md` files (`honeycomb:discovery.md:28-29`), then later found the rename broke source `@docs` paths and doc-ref URL derivation for 80 files until tooling and overrides were repaired (`honeycomb:implementation.md:227`).
- **Symptom:** Directory entrypoints look correct in rendered docs but source comments, generated doc refs, or link checks fail after migration.
- **Cause:** OAT uses `index.md` as the entrypoint, while legacy MkDocs docs and source annotations may still point at `overview.md`.
- **Bootstrap guidance:** Detect `overview.md` during preflight and ask whether source-code doc references exist. Plan a separate reference-repair pass for `@docs`, generated docs-reference tooling, and route derivation.
- **Follow-up check:** Search source and docs for `overview.md`; run the repo's docs-reference checker if one exists.

### Frontmatter values beginning with `@` need YAML quoting

- **Seen in:** honeycomb
- **Evidence:** Honeycomb p02 review found an Important issue for six unquoted `@`-prefixed YAML title values; the fix verified zero frontmatter parse errors across 125 pages (`honeycomb:implementation.md:166-168`).
- **Symptom:** Fumadocs/frontmatter parsing fails on package overview pages such as `@honeycomb/core`.
- **Cause:** YAML treats some leading punctuation specially unless the scalar is quoted.
- **Bootstrap guidance:** Quote generated frontmatter strings, especially package names, scoped npm packages, colons, braces, brackets, hashes, or values starting with punctuation.
- **Follow-up check:** Run the docs build or a frontmatter parse sweep over every Markdown file.

### MkDocs syntax can compile while rendering incorrectly

- **Seen in:** both
- **Evidence:** Duet documented MkDocs-only syntax that did not render in Fumadocs/MDX; a relay page had 0 images despite 22 figure blocks until conversion (`duet:reference/invalid-references-to-remove.md:53-96`). Honeycomb had 29 files with `!!!`/`???` admonitions and confirmed render checks against `out/` were required (`honeycomb:discovery.md:39-46`, `honeycomb:implementation.md:194-199`).
- **Symptom:** Build passes but rendered pages show literal `!!!` syntax, missing images, missing callout titles, broken tabs, or dropped content.
- **Cause:** OAT transforms cover links, Mermaid, and tabs; they do not automatically support every MkDocs Material extension.
- **Bootstrap guidance:** Add a migration scan for `!!!`, `???`, `<figure markdown`, attr-list image widths, `--8<--`, Jinja/macros, and other MkDocs extensions. Convert or mark unsupported syntax before calling the docs complete.
- **Follow-up check:** Inspect exported HTML, not just build exit codes. Grep `out/` for literal MkDocs syntax and verify expected `<img>`, callout, Mermaid, and tab markers.

### Inline GFM callout titles are lost

- **Seen in:** honeycomb
- **Evidence:** Honeycomb p03 review found `oat docs migrate` emitted inline titles like `> [!TYPE] Title`; `remark-github-blockquote-alert` silently discarded 69 of 73 custom titles. The fix used `> [!TYPE]` followed by a bold lead line (`honeycomb:implementation.md:172-177`).
- **Symptom:** Rendered callouts keep type styling but lose the author-provided title.
- **Cause:** The renderer expects the callout marker by itself; inline text after `[!TYPE]` is not treated as a title.
- **Bootstrap guidance:** When converting MkDocs admonitions with titles, generate:
  - `> [!WARNING]`
  - `> **Title**`
  - `> Body text`
- **Follow-up check:** Grep for `^> \[![A-Z]+\] .+` and inspect rendered HTML for expected bold title text.

### Site metadata and chrome title are separate concerns

- **Seen in:** duet; applicable to all bootstraps
- **Evidence:** Duet's runbook warns that `createDocsConfig` `title`/`description` are not wired to the HTML head and that metadata must be set in `app/layout.tsx` (`duet:reference/runbook.md:107`).
- **Symptom:** The site header may show a name, but browser title, search previews, and social metadata are missing or generic.
- **Cause:** `DocsLayout.branding.title` controls UI chrome; Next.js metadata requires `export const metadata`.
- **Bootstrap guidance:** Collect `siteName` and `siteDescription` and write both `export const metadata` and `DocsLayout` branding coherently. Do not pass title/description to `createDocsConfig` and assume it works.
- **Follow-up check:** Read `app/layout.tsx` and verify both metadata export and branding title.

### Formatter settings can corrupt docs examples

- **Seen in:** both
- **Evidence:** Duet's runbook warns that `oxfmt`/Prettier can corrupt Markdown fences, URLs with placeholders, and list indentation, and recommends `embeddedLanguageFormatting: "off"` (`duet:reference/runbook.md:389-396`). Honeycomb p04 review found two Important oxfmt corruptions in `contributing.md`, then rewrote the page and verified lint/format stability (`honeycomb:implementation.md:183-192`).
- **Symptom:** `docs:format` changes fenced examples, nested code fences, placeholder URLs, or MkDocs-tutorial content into invalid examples.
- **Cause:** Markdown formatters may reformat embedded code blocks according to their language tag.
- **Bootstrap guidance:** Scaffold `.oxfmtrc.json` with `embeddedLanguageFormatting: "off"` and `proseWrap: "preserve"`. Teach authors to use `text` fences for paths, trees, and terminal output.
- **Follow-up check:** Run `docs:format:check`, then inspect a diff of complex code fences and docs-contributing pages.

### Docs app build/dev must be explicit and isolated

- **Seen in:** honeycomb; confirmed across reference repos
- **Evidence:** Honeycomb p05 review found root `turbo test` depended on `build`, pulling `@honeycomb/docs#build` into `pnpm test`; an app `turbo.json` override fixed it (`honeycomb:implementation.md:194-202`). Reference repos such as OpenAgent Toolkit, Duet, Honeycomb, Cyclone, and Stoa keep docs opt-in by excluding docs packages from default root build/dev paths and exposing docs-specific commands where applicable.
- **Symptom:** Running root `build`, `dev`, `test`, lint, or type-check unexpectedly starts or builds the Next/Fumadocs docs app.
- **Cause:** Root Turborepo scripts or task dependencies include the docs package in the default graph.
- **Bootstrap guidance:** In monorepos, root `build` and root `dev` should exclude the docs package. Add explicit root commands such as `build:docs` and `dev:docs` for opt-in docs work. Keep docs package scripts local to the docs app (`build`, `dev`, `prebuild`, `predev`) and avoid exposing docs app `test`, `lint`, or `type-check` scripts unless they are intentionally part of root tasks. Use app-level `turbo.json` overrides when root task dependencies would otherwise schedule the docs build.
- **Follow-up check:** Confirm root `build` and root `dev` do not schedule the docs package, while `build:docs` and `dev:docs` do. Also dry-run or run root `test`, lint, and type-check to confirm they do not pull in the docs build.

### `.oat/config.json` can block generation or point at stale tooling

- **Seen in:** both
- **Evidence:** Duet removed a trailing comma that made `.oat/config.json` invalid and blocked `oat docs generate-index` (`duet:reference/corrections-log.md:28`). Honeycomb preflight found an existing `documentation` block with `tooling: mkdocs` and a stale config key to replace (`honeycomb:discovery.md:55-56`).
- **Symptom:** `oat docs generate-index` fails, OAT lifecycle checks use the wrong docs app, or project completion gates point at MkDocs.
- **Cause:** `.oat/config.json` is both strict JSON and a source of truth for docs tooling.
- **Bootstrap guidance:** Parse `.oat/config.json` before edits; write valid JSON; update `documentation.root`, `documentation.tooling`, and `documentation.index`; remove obsolete MkDocs config pointers.
- **Follow-up check:** Parse `.oat/config.json` with `jq` or Node, then run the docs generation command.

### Stale architecture docs need deletion or rewrite, not link swaps

- **Seen in:** duet
- **Evidence:** Duet confirmed the Redis GraphQL response-cache subsystem was removed and rewrote/deleted the cache docs rather than pretending the old architecture still existed (`duet:reference/corrections-log.md:199-221`).
- **Symptom:** Migrated docs render correctly but describe removed systems, commands, environment variables, or workflows.
- **Cause:** Migration preserves old content unless an accuracy audit checks current source.
- **Bootstrap guidance:** For migrations, include an accuracy audit phase. If a subsystem is gone, rewrite to current behavior or delete the page; do not patch stale links without validating the underlying feature.
- **Follow-up check:** Verify commands, env vars, exports, routes, workflows, and deployment claims against current repo files.

## OAT convention checklist

- [ ] Authored docs live under the configured docs source tree.
- [ ] Every Markdown-bearing content directory has `index.md`.
- [ ] Every `index.md` has a useful `## Contents` section.
- [ ] `## Contents` maps sibling pages and immediate child directories.
- [ ] Authored links use `.md`-suffixed relative targets, including `subdir/index.md`.
- [ ] No `overview.md` file is used as a directory entrypoint.
- [ ] Plain `.md` is the default; `.mdx` appears only where JSX/components are required.
- [ ] Every page has non-empty `title` and `description` frontmatter.
- [ ] Frontmatter strings are quoted when values contain scoped package names or punctuation-sensitive YAML.
- [ ] Generated navigation/root index files are marked generated and not hand-edited.
- [ ] The docs generation/nav sync command is wired into `predev` and `prebuild`.
- [ ] `.oat/config.json` points at the docs app root, uses `tooling: fumadocs`, and has a generated `index` path.
- [ ] The docs app has explicit docs scripts: `docs:lint`, `docs:lint:fix`, `docs:format`, `docs:format:check`.
- [ ] Formatter config disables embedded-language formatting for Markdown.
- [ ] Markdown lint owns content/structure/accessibility; formatter owns whitespace/layout.
- [ ] Build/dev isolation is intentional: root `build` and root `dev` do not build or start docs; explicit `build:docs` and `dev:docs` commands opt in where applicable.
- [ ] Root test/lint/type-check do not accidentally schedule the docs build.
- [ ] Root `AGENTS.md`, docs-app `AGENTS.md`, docs-app `CLAUDE.md`, and human `docs/contributing.md` are coherent and not duplicative.
- [ ] Existing deploy workflows build the Fumadocs app and sync `out/`, preserving buckets/triggers/roles unless intentionally changed.
- [ ] Render verification checks exported HTML for callouts, images, tabs, Mermaid, and no literal MkDocs syntax.
- [ ] Migration handoff includes sources inspected, uncertainties, owner-review items, and follow-up tasks.

## Troubleshooting notes

| Symptom                                                             | Likely cause                                                         | Prior evidence                                                                                                                                                  | Fix                                                                                                                                                          | Verify                                                                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `oat docs generate-index` fails before Next build                   | Invalid `.oat/config.json`, such as trailing comma                   | Duet fixed an invalid trailing comma that blocked generation (`duet:reference/corrections-log.md:28`)                                                           | Parse/fix `.oat/config.json`; keep it strict JSON                                                                                                            | `jq . .oat/config.json` or equivalent, then rerun generation                                                |
| Build passes but diagrams/images are missing                        | MkDocs `<figure markdown>` or attr-list syntax survived              | Duet relay page had 0 images until figure conversion (`duet:reference/invalid-references-to-remove.md:95-96`)                                                   | Convert figures to plain Markdown images or supported components                                                                                             | Grep exported HTML for expected `<img>` counts                                                              |
| Callout styling appears but custom titles disappear                 | Inline callout titles generated as `> [!TYPE] Title`                 | Honeycomb lost 69 custom titles until converted to bold lead lines (`honeycomb:implementation.md:172-177`)                                                      | Use marker line plus bold lead title                                                                                                                         | Grep for inline callout openers; inspect rendered page                                                      |
| Frontmatter parse error near package name                           | Unquoted `@scope/package` title                                      | Honeycomb found six unquoted `@` title values (`honeycomb:implementation.md:166-168`)                                                                           | Quote YAML frontmatter values                                                                                                                                | Build or run frontmatter parser over all pages                                                              |
| Root `build`, `dev`, `test`, lint, or type-check starts/builds docs | Root scripts or task graph include docs package by default           | Honeycomb p05 fixed docs build coupling with app `turbo.json` override (`honeycomb:implementation.md:200-202`); reference repos keep docs opt-in                | Exclude docs from root `build`/`dev`, add explicit `build:docs`/`dev:docs`, and add app-level task overrides when root task dependencies would schedule docs | Dry-run root commands; confirm docs is absent from default tasks and present only in docs-specific commands |
| Generated root `index.md` changes unexpectedly                      | Generated file was hand-edited or generated from stale `## Contents` | OAT guidance says generated artifacts are rewritten on every build (`oat:apps/oat-docs/AGENTS.md:19-20`)                                                        | Edit authored `docs/**/index.md` `## Contents`, regenerate                                                                                                   | Diff shows generated output matches authored map                                                            |
| `docs:format` corrupts fenced examples                              | Formatter reformats embedded code in Markdown                        | Duet runbook and Honeycomb p04 both found formatter hazards (`duet:reference/runbook.md:389-396`, `honeycomb:implementation.md:183-192`)                        | Set `embeddedLanguageFormatting: "off"` and use `text` fences for non-code                                                                                   | Run format check and review diff of complex fences                                                          |
| Deploy workflow still publishes old output                          | MkDocs workflow not fully converted                                  | Honeycomb needed Python→Node build and `site/`→`out/` swap while preserving bucket (`honeycomb:discovery.md:47-51`)                                             | Update CI install/build/sync source directory                                                                                                                | CI dry-run or workflow inspection confirms `out/`                                                           |
| Docs reference checker fails after rename                           | `overview.md`→`index.md` broke source annotations or URL derivation  | Honeycomb had 80 failing files until doc-ref tooling and overrides were updated (`honeycomb:implementation.md:227`)                                             | Update source annotations, derivation rules, and overrides                                                                                                   | Run docs-reference checker                                                                                  |
| Markdown lint passes but content is stale                           | Migration did not include code accuracy audit                        | Duet and Honeycomb both made evidence-backed source-drift fixes after migration (`duet:reference/corrections-log.md:31-154`, `honeycomb:implementation.md:215`) | Verify commands, paths, exports, env vars, workflows, versions, and deploy claims against code                                                               | Build plus targeted grep/source checks                                                                      |

## Recommended updates to `oat-docs-bootstrap`

- **P0 — Add a migration-aware preflight mode.**
  - Evidence: Honeycomb required a full inventory before edits: 122 Markdown files, 38 `overview.md`, MkDocs syntax, deploy workflow, indexing, and stale OAT config (`honeycomb:discovery.md:28-56`).
  - Recommendation: If `mkdocs.yml`, `requirements.txt`, `setup-docs.sh`, existing docs app config, or populated docs trees are present, classify the run as migration/repair instead of blank bootstrap.
- **P0 — Ask and record app identity separately.**
  - Evidence: App path/package name integration mattered in Honeycomb (`honeycomb:discovery.md:69-70`); site metadata requires layout metadata, not `createDocsConfig` title args (`duet:reference/runbook.md:107`).
  - Recommendation: Collect `siteName`, `siteDescription`, `appName`, and `targetDir` explicitly; write coherent metadata and branding.
- **P0 — Generate frontmatter safely.**
  - Evidence: Honeycomb had build-affecting unquoted `@` titles (`honeycomb:implementation.md:166-168`).
  - Recommendation: Quote all generated YAML string values or use a YAML serializer. Add a post-scaffold frontmatter parse check.
- **P0 — Install render checks in the walkthrough.**
  - Evidence: Duet's build passed while images were missing (`duet:reference/invalid-references-to-remove.md:53-96`); Honeycomb required exported HTML checks (`honeycomb:implementation.md:194-199`).
  - Recommendation: Teach users to inspect `out/` and grep for literal MkDocs syntax after migration.
- **P1 — Scaffold formatter guardrails by default.**
  - Evidence: Duet documents formatter corruption and Honeycomb hit two Important p04 formatter corruptions (`duet:reference/runbook.md:389-396`, `honeycomb:implementation.md:183-192`).
  - Recommendation: Always scaffold `.oxfmtrc.json` with `embeddedLanguageFormatting: "off"` and `proseWrap: "preserve"` when oxfmt is selected.
- **P1 — Enforce docs build/dev isolation.**
  - Evidence: Honeycomb root `turbo test` scheduled the docs build until fixed (`honeycomb:implementation.md:200-202`). Reference repos consistently make docs build/dev opt-in: root `build` and root `dev` exclude docs packages in Turborepo monorepos, and root `build:docs` / `dev:docs` opt into docs.
  - Recommendation: After script generation, inspect root package scripts and Turborepo task dependencies. Patch known-safe root `build`/`dev` script shapes to exclude the docs package and add explicit `build:docs`/`dev:docs`; otherwise surface the exact manual diff. Also verify root test/lint/type-check do not schedule docs, using app-level `turbo.json` overrides when necessary.
- **P1 — Verify generated index and authored nav contract.**
  - Evidence: OAT convention makes authored `## Contents` the source of truth (`oat:apps/oat-docs/AGENTS.md:13-20`).
  - Recommendation: After scaffold, run nav/index generation and verify generated root index has an autogen warning, every docs directory has `index.md`, and no `overview.md` remains.
- **P1 — Scaffold coherent agent-instruction surfaces.**
  - Evidence: Honeycomb Phase 6 verified root/docs-app `AGENTS.md`, `CLAUDE.md`, stale refs, and commands (`honeycomb:implementation.md:204-213`).
  - Recommendation: Create docs-app `AGENTS.md`, `CLAUDE.md` shim, and concise human `docs/contributing.md`; avoid duplicating runtime agent rules in human docs.
- **P2 — Detect repo-specific source-to-doc reference systems.**
  - Evidence: Honeycomb's `overview.md` rename broke source `@docs` paths and doc-ref URL derivation (`honeycomb:implementation.md:227`).
  - Recommendation: Treat this as optional and repo-specific. If a repo has `@docs`, docs-reference tooling, generated doc maps, or custom link checkers, route the user to a follow-up repair step; otherwise omit it.
- **P2 — Add optional migration accuracy-audit prompt.**
  - Evidence: Duet and Honeycomb both found stale source claims after structural migration (`duet:reference/corrections-log.md:31-154`, `honeycomb:implementation.md:215`).
  - Recommendation: Offer an immediate `oat-docs-analyze` or migration-audit follow-up after scaffold when legacy content was migrated.

## Open questions

- Should `oat-docs-bootstrap` detect MkDocs migrations and hand off to the migration prompt, rather than grow a dedicated migration skill?
- Should the CLI quote all generated frontmatter strings by default, even when not strictly required?
- What exact root-script shapes are safe for `oat-docs-bootstrap` to auto-patch for `build`/`dev` isolation, and which should be surfaced as manual diffs?
- For repos with source-to-doc reference tooling, should migration prompts include a generic detection step only, or should target repos provide their own repair instructions?
- Should generated root `index.md` be committed by default for every Fumadocs app, or should that remain repo-policy dependent?
- Which package versions should future scaffolds prefer once OAT docs packages move beyond the `0.1.x` line used in these projects?
