## Summary

On 2026-10-22 we surveyed 24 internal and personal repos that use OAT docs conventions, plus external docs exemplars, to see how the OAT docs layer holds up in practice: the docs skills (`oat-docs-bootstrap`, `oat-docs-analyze`, `oat-docs-apply`, `oat-docs-authoring`), the `oat docs` CLI, the `@open-agent-toolkit/docs-*` packages and the `authoring-docs` skill. Method: per-repo audits (structure, navigation, validation wiring, page shape), source review of the docs frameworks and the OAT skills at a pinned commit, and an independent cross-model review of the findings.

This umbrella issue collects 28 numbered proposals (P1 to P28) in five groups, followed by suggested sequencing and open questions.

A companion PR in this repo already fixes one item: https://github.com/voxmedia/open-agent-toolkit/pull/366 adds per-page `generateMetadata` to `apps/oat-docs` (part of P16).

> [!IMPORTANT]
> No OAT skill owns information architecture today. Bootstrap picks the container (framework, paths), analyze audits conformance and per-surface coverage, apply runs approved actions only, and authoring routes repo-wide work away (`oat-docs-authoring/SKILL.md:60-61`). Group A fills that gap; the rest removes friction around it.

## Contents

| Group                                                                                  | Proposals | P0    | P1     | P2    |
| -------------------------------------------------------------------------------------- | --------- | ----- | ------ | ----- |
| [A. Information architecture in the skills](#a-information-architecture-in-the-skills) | P1–P5     | 2     | 3      | 0     |
| [B. Scaffold and CLI](#b-scaffold-and-cli)                                             | P6–P19    | 1     | 8      | 5     |
| [C. Validation](#c-validation)                                                         | P20–P25   | 0     | 3      | 3     |
| [D. Page templates](#d-page-templates)                                                 | P26–P27   | 0     | 1      | 1     |
| [E. `authoring-docs` deltas](#e-authoring-docs-deltas)                                 | P28       | 1     | 0      | 0     |
| **Total**                                                                              | **28**    | **4** | **15** | **9** |

Companion changes to a separate house-conventions repo are being proposed there.

Also: [Suggested sequencing](#suggested-sequencing) and [Open questions](#open-questions).

## How to read this issue

- **Priority** uses its own scale, separate from the proposal numbers: P0 = blocks the IA workflow or is a silent correctness defect; P1 = high value and independently shippable; P2 = polish or consistency. **Effort**: S = under a day, M = a few days, L = a week or more. Priority and effort are estimates (inferred).
- Skill paths such as `oat-docs-bootstrap/SKILL.md:232` are relative to `.agents/skills/` at [c66f71a](https://github.com/voxmedia/open-agent-toolkit/tree/c66f71aacd3d329f34aeb52102f7ba723b3d4cfc) (2026-10-13). Other OAT paths are repo-relative at the same commit. Every OAT line cited here was re-opened in that snapshot on 2026-10-22.
- Evidence labels: documented (stated in a skill or doc), source (code, config, template), observed (measured), inferred (judgment). Observations about the other surveyed repos are reported in aggregate or anonymized.
- Group E uses delta IDs D1 to D9 for `authoring-docs`.

### Existing backlog items (reference, do not duplicate)

| Item                                    | Status       | Covers                                                                                                                                | Related proposals                      |
| --------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `BL-260911-make-docs-bootstrap-a-front` | open, high   | Existing-docs front door, plain Markdown as a first-class mode (partly shipped by #335), approval classes, docs package version drift | P1, P4                                 |
| `BL-261002-correct-docs-bootstrap-docs` | open, medium | E12 (bootstrap → apply "approved subset", venv claim, MkDocs index, `tooling` as object) and E13 (`allowed-tools` gaps)               | P4, P7                                 |
| `BL-261002-catch-hardcoded-docs-paths`  | open, medium | Skill tests that hardcode docs paths break when pages move                                                                            | P19                                    |
| `BL-260830-make-documentation-aware`    | open, medium | Configurable documentation-aware discovery prerequisites (#205)                                                                       | adjacent to P2 and P3, not a duplicate |

None of these covers IA selection, an external IA source, FP-patch retirement, the FP-11 regression, the Markdown validation bug, the `requireForProjectCompletion` misdescription or the `contributing.md` AGENTS pointer bug (source: the four item files under `.oat/repo/pjm/backlog/items/`).

## A. Information architecture in the skills

### P1. Add an IA discovery and proposal stage

- **Problem.** Bootstrap asks for framework, site name, package name, target directory, description, lint and format, and nothing about readers or structure (`oat-docs-bootstrap/SKILL.md:215-225`). Every run seeds the same two-page tree. Analyze cannot propose structure either: topic clustering is deferred (`oat-docs-analyze/SKILL.md:549-553`). Operators re-explain audience and IA on every bootstrap.
- **Evidence.** The template root Contents is Getting Started plus Contributing only (`.oat/templates/docs-app-fuma/docs/index.md:12-13`). Bootstrap, analyze and apply never reference `authoring-docs` (observed: no grep hits), so even the existing IA reference is unreachable during setup and audit. 21 of 24 surveyed repos chose a root other than the `authoring-docs` page-type model (observed).
- **Proposal.**
  1. Insert "Step 2.5: IA discovery and proposal" in bootstrap, for fresh setup and adoption, in Markdown and framework modes alike.
  2. Read repo signals: app manifests and navigators (UI journeys), CLI `bin`, routers, IaC, `e2e/` or `.maestro/`, existing `docs/`, monorepo units with independent consumers.
  3. Load IA guidance through the resolution order in P2 and `authoring-docs/references/information-architecture.md`.
  4. Ask only the questions whose answer changes a decision: reader work contexts (using, integrating, maintaining, operating, verifying), whether anyone other than the builders verifies behavior from the docs, which facts must stay canonical elsewhere, and which links must survive.
  5. Present two plausible structures, each with a two-level tree, 5–8 representative page placements and the nearest preset, using the IA Proposal template from P28 (D9). Do not ask the operator for an archetype label.
  6. Add the same stage as `oat-docs-analyze --ia` for existing trees, reusing analyze's artifact and review loop instead of a new skill.
  7. Load `authoring-docs` in bootstrap's IA step, analyze's quality pass (landing-page contract, one-purpose-per-page rule) and apply's content actions.
- **Benefit.** The recurring explanation becomes a reusable, reviewable step, and new docs start reader-first.
- **Priority / effort.** P0 / M.
- **Existing backlog item.** Extends `BL-260911-make-docs-bootstrap-a-front`: the front door routes existing docs to analyze; this adds the IA step that route lacks.

### P2. Accept an external IA guidance source, with a resolution order

- **Problem.** The skills accept only repo-local guidance, which does not exist at bootstrap time. A house IA playbook (for example, an internal docs-IA guidance pack) cannot be plugged in.
- **Evidence.** Analyze evidence sources are repo-local (`oat-docs-analyze/SKILL.md:153-166`), and it warns against inferring conventions from a small sample, treating the existing tree as the only convention source (`:165-166`). `OatDocumentationConfig` has `root`, `tooling`, `config`, `index`, `requireForProjectCompletion` and `excludes`, and no guidance key (`packages/cli/src/config/oat-config.ts:77-89`).
- **Proposal.** Resolve guidance highest first, in bootstrap, analyze and authoring:
  1. An explicit argument (`--ia-guidance <path|url>`) or a conversational instruction ("use the guidance in X").
  2. Repo config `documentation.guidance` (string or array of paths or URLs).
  3. User-scope config (`oat config set --scope user documentation.guidance <path>`), so a personal playbook applies across repos without committing machine paths.
  4. The built-in `authoring-docs` IA reference.

  A guidance source is Markdown with an `index.md` and `## Contents`, selection signals, exemplars and a bootstrap brief. Skills cite the resolved path in the analysis artifact, apply plan and bootstrap summary. Guidance is advisory: repo-local AGENTS and contributing pages stay authoritative for an existing tree, and conflicts surface as `ask_user` findings. Non-repo paths are read-only inputs; store only the path string.

- **Benefit.** One maintained playbook drives every repo, and "review this guidance and the repo, propose an IA" works without re-briefing.
- **Priority / effort.** P0 / S.
- **Existing backlog item.** None. Adjacent to `BL-260830-make-documentation-aware` (configurable discovery policy); keep separate.
- **Open.** Whether user-scope resolution covers `documentation.*` keys was not verified in `packages/cli/src/config/resolve.ts`.

### P3. Record the accepted IA in the repo and audit IA fit

- **Problem.** An accepted IA lives only in a conversation. Analyze has no IA-fit dimension and no IA-misrouting severity rule: its defaults run from Critical to Low and put "organization improvements" at Low (`oat-docs-analyze/SKILL.md:446-451`), so a root that misroutes readers defaults to a Low finding unless the reviewer escalates it under the broken-navigation or coverage-gap rules. Its coverage checklist covers app/service, API, CLI and operations only (`:342-356`), so Product, QA, consumer-guide and agent-guide surfaces are invisible.
- **Proposal.**
  1. On approval, write the IA decision into the target repo: a decision record (`oat decision new`) plus a short "Information architecture" section in the docs-app `AGENTS.md` or contributing page (tracks, organizing principle per track, placement rules, verification overlay). Later agents then need no access to the external guidance.
  2. Optionally mirror it in config as `documentation.ia` (preset, tracks, section paths, guidance reference) so checks can read it.
  3. Add an "Information Architecture Fit" section to the analysis artifact: the landing page routes each declared track, declared sections exist and are reachable, pages sit in the track that matches their reader and purpose, root breadth stays within limits (P20), and an app repo does not mirror its implementation directories.
  4. Add a Medium/High rule for "top-level IA misroutes a declared audience" and an `ask_user` finding when no IA is recorded.
  5. Add coverage surfaces driven by the recorded IA: Product (features, journeys, screens, states), QA (scenario tables with seeds and automation references), consumer guide, agent guide.
- **Benefit.** IA becomes durable and checkable, and delta runs catch drift.
- **Priority / effort.** P1 / M.
- **Existing backlog item.** None.
- **Open.** Config key, authored page, or both. An authored page is more reviewable; config is more checkable.

### P4. Add a `restructure` action to apply

- **Problem.** Apply's actions are `create / update / move / scaffold / sync-nav` (`oat-docs-apply/references/apply-plan-template.md:39`), and bulk conversion is deferred (`oat-docs-apply/SKILL.md:358-366`). An approved IA change becomes many single moves with no inbound-link repair and no plan for old URLs.
- **Proposal.** A `restructure` action carrying:
  - a source-to-destination map and parent Contents edits;
  - a grep-derived inbound-link rewrite list;
  - the old-URL plan: redirect, stub page with a pointer, or the `not-found.tsx` recovery OAT chose in `DR-261002-retire-moved-documentation`;
  - sidebar regeneration according to the repo's recorded sidebar owner (`nav sync` and `nav sync --check` where nav sync owns `meta.json`; a Contents-vs-`meta.json` membership and order check where it is hand-authored);
  - a re-run of `oat-docs-analyze` (the `oat docs analyze` command has no `--check`; it only prints a pointer to the skill, `packages/cli/src/commands/docs/analyze.ts:17-45`).

  Commit as one exact-path commit with one approval per block. Retired pages get a stub or archive pointer and a parent Contents update; never a silent delete.

- **Benefit.** P1 and P3 proposals become executable without breaking links.
- **Priority / effort.** P1 / M.
- **Existing backlog item.** Touches E12 in `BL-261002-correct-docs-bootstrap-docs` (bootstrap's "approved subset" has no apply input); one handoff contract should serve both.
- **Open.** Whether Fumadocs static export supports redirects was not checked.

### P5. Ship IA presets in bootstrap

- **Problem.** Even after P1 picks a structure, bootstrap can only emit the two-page tree.
- **Evidence.** The Product / Engineering / QA shape is rebuilt by hand per app, with drift: one surveyed mobile app's QA template asks for columns that no feature page uses, and neither surveyed app repo with this shape has an engineering feature template (observed).
- **Proposal.** Presets: Product/Engineering/QA, Consumer and Maintainer, Domain Engineering, Task Type, Toolkit and CLI, and the flat size outcome. Each preset scaffolds track and section `index.md` files with real purpose paragraphs (no empty leaf pages), the page templates from P26–P27 under `contributing/`, the root `AGENTS.md` track table, and preset-specific sentences (for example, a statement that an app's Engineering track is hybrid, as one surveyed app already writes). Below about 15 pages, emit one flat index with grouped `###` headings regardless of preset.
- **Benefit.** The proposal from P1 lands as a working tree, and templates stop drifting between repos.
- **Priority / effort.** P1 / L.
- **Existing backlog item.** None.

## B. Scaffold and CLI

### P6. Retire stale FP patches

- **Problem.** Most post-scaffold patches can no longer match the template but still fill the 1,185-line skill.
- **Evidence (source).** FP-12 (`oat-docs-bootstrap/SKILL.md:513`): the template already has `metadata` and `branding.title`, and `--site-name` exists. FP-13A (`:636`), FP-13B, FP-13C, FP-13D.2, FP-16 and FP-17: each fix is already in `.oat/templates/docs-app-fuma/`. FP-13D.1 (`:658`) is live only because the template lacks a "Generated files" section, and its text omits `meta.json` and `nav sync`. FP-13E (`:675`) is live by design. Plan-task IDs remain (`:382`, `:634`, `:734`). The exit summary lists FP-11, FP-12, FP-13 A–D and FP-15 and omits FP-13E, FP-16 and FP-17 (`:1097-1101`). The public guide still says patches carry `<!-- FP-12 patch -->` markers and calls FP-13 "four" fixes (`apps/oat-docs/docs/docs-tooling/add-docs-to-a-repo.md:72-75`), while the skill counts five.
- **Proposal.** Delete closed patches; move the "Generated files" section (with committed `meta.json` and `oat docs nav sync`) into the template; have the CLI render the detected Node version instead of FP-13E's hedge; route old-scaffold shapes to analyze findings; strip plan IDs; regenerate the exit summary from the remaining list; update `add-docs-to-a-repo.md`.
- **Benefit.** A shorter, correct skill with room for the IA stage, and one source of truth for scaffold content.
- **Priority / effort.** P1 / S.
- **Existing backlog item.** None.

### P7. Correct the remaining bootstrap contract errors

- **Evidence (source).**
  1. Step 2c says `framework` "must be `fumadocs` or `mkdocs`" (`oat-docs-bootstrap/SKILL.md:232`), while Step 2b offers Markdown (`:219`) and the type includes `'markdown'` (`:262`).
  2. `requireForProjectCompletion` is described as waiting for analyze to show no open recommendations (`:878-882`, `:930`). The real gate asks for `oat-project-document` or an explicit skip via `oat_docs_updated` (`oat-project-complete/SKILL.md:555-565`).
  3. `documentation.config` is called MkDocs-only (`oat-docs-bootstrap/SKILL.md:929`); OAT's own config sets it to `apps/oat-docs/next.config.js` (`.oat/config.json:32-33`).
  4. `oat docs analyze` and `apply` describe themselves as "Run the docs analysis workflow" (`packages/cli/src/commands/docs/analyze.ts:56`) and "Run the docs apply workflow" (`apply.ts:56`) but only print a pointer.
  5. `oat-docs-authoring` performs in-place edits, but its `allowed-tools` lists `Write` and not `Edit` (`oat-docs-authoring/SKILL.md:6`).
  6. `packages/docs-config/README.md:21` shows `createDocsConfig({ title: … })`, which bootstrap itself calls a no-op anti-pattern; the options type has only `basePath`.
- **Proposal.** Fix each statement against source.
- **Benefit.** Agents stop following instructions that contradict the CLI and config.
- **Priority / effort.** P1 / S.
- **Existing backlog item.** Fold into `BL-261002-correct-docs-bootstrap-docs` (same class as E12/E13).

### P8. Fix FP-11: add a `createDocsConfig` turbopack passthrough

- **Problem.** Path A requires a `turbopack` option that does not exist, so every nested-standalone Fumadocs bootstrap takes Path B. Path B replaces the wrapper with `{ reactStrictMode, turbopack }` and silently drops `output: 'export'`, `trailingSlash`, `images.unoptimized`, `basePath` and `NEXT_PUBLIC_BASE_PATH`.
- **Evidence (source).** [`next-config.ts:4-26`](https://github.com/voxmedia/open-agent-toolkit/blob/c66f71aacd3d329f34aeb52102f7ba723b3d4cfc/packages/docs-config/src/next-config.ts#L4-L26) (options are `{ basePath?: string }`); Path B at `oat-docs-bootstrap/SKILL.md:609-626`. The scaffold promises a static `out/` build (`.oat/templates/docs-app-fuma/docs/getting-started.md:33`). Path B also writes HTML-comment markers inside JS. Inferred, not run: both paths use `__dirname`, but the template is ESM (`package.json.template:3`, `"type": "module"`), where `__dirname` is undefined, so Path B may fail at config load rather than silently.
- **Proposal.** Add `turbopack?: { root?: string }` (or a generic Next config merge) to `createDocsConfig`; have the template pass `path.dirname(fileURLToPath(import.meta.url))` for nested-standalone repos; delete FP-11. Interim: Path B must spread the base config.
- **Benefit.** Prevents a static-export and base-path regression in a common repo shape.
- **Priority / effort.** P0 / S.
- **Existing backlog item.** None.

### P9. Scaffold the docs-app `AGENTS.md` from the CLI

- **Problem.** The CLI template has no `AGENTS.md` (`FUMA_TEMPLATE_FILES`, `packages/cli/src/commands/docs/init/scaffold.ts:47`); only the bootstrap FP-15 bridge writes one (`oat-docs-bootstrap/SKILL.md:562-566`). The template `contributing.md` says "See `AGENTS.md` in this directory" (`.oat/templates/docs-app-fuma/docs/contributing.md:70`), but the bridge writes `<appRoot>/AGENTS.md`, one level above `docs/`.
- **Evidence (observed).** The bridge template has no diagram section, while OAT's own docs-app `AGENTS.md` does (`apps/oat-docs/AGENTS.md:21-26`). Template residue that mentions MkDocs, or says apply runs nav sync, survives in five surveyed Fumadocs apps. OAT's own `AGENTS.md:3,68` points docs-app setup at the CLI user quickstart.
- **Proposal.** Move the bridge into the CLI template with `{{GENERATE_INDEX_CMD}}` rendered, framework-specific text only, the "When you add or change a diagram" section, the recorded IA section from P3, and a "How agents should use these docs" section (canonical pages, deprecated paths, approval-required actions, where QA journeys and reference live). Fix the contributing pointer to `../AGENTS.md`. Fix OAT's own setup pointer.
- **Benefit.** Every scaffold gets agent working rules, not only bootstrapped ones.
- **Priority / effort.** P1 / S.
- **Existing backlog item.** None. If keeping `AGENTS.md` out of the CLI template is intentional, record that decision; none was found.

### P10. Keep Getting Started for readers; move the toolchain page to contributing

- **Problem.** The template's Getting Started is "Set up the local docs toolchain and preview the site" and is the first root entry (`.oat/templates/docs-app-fuma/docs/index.md:12`). Five surveyed repos now ship it as their reader's Getting Started (observed).
- **Proposal.** Scaffold `contributing/docs-toolchain.md` (a shape one surveyed IaC repo already uses) and leave the root Contents to the P1 structure, or to a "Start here" stub that states the first safe result for a reader.
- **Benefit.** New sites open on the product, matching OAT's own reader-first pass (`DR-261002-reader-first-documentation`).
- **Priority / effort.** P1 / S.
- **Existing backlog item.** None.

### P11. Bring the contributing template to parity, including diagrams

- **Problem.** The template contributing page omits tabs, images, light/dark SVG pairs and generated `meta.json`. OAT's own pages drift too: `markdown-features.md:151-157` reminds authors to run `generate-index` but not `nav sync`, which `build:docs` requires, and `contributing/documentation.md:78` and the MkDocs template `contributing.md:116` keep the `## Agent guidance` section that the three-surfaces rule removes.
- **Proposal.** Ship a contributing skeleton:
  - docs contract (authored vs generated table, the dash-bullet Contents grammar from `nav/contents.ts:11-51`);
  - add, move and rename procedure;
  - Markdown features with Syntax and Rendered tabs;
  - a "not configured, do not document" list and the Markdown → transform → MDX ladder (as one surveyed mobile app already documents it);
  - diagram rules (Mermaid as source, same-commit SVG pairs, `role="img"`, `<title>`, `<desc>`, alt of at most about 155 characters);
  - the exact validation sequence;
  - a one-line pointer to the docs-app `AGENTS.md`.

  Shell fences use `bash`.

- **Benefit.** Contributors and agents learn the layer from the scaffold instead of from OAT's own site.
- **Priority / effort.** P1 / M.
- **Existing backlog item.** None.

### P12. Run nav sync at init and wire `nav sync --check` into the template prebuild

- **Problem.** The template prebuild is `fumadocs-mdx && {{GENERATE_INDEX_CMD}}` (`package.json.template:8-10`); `DR-261001-fumadocs-navigation-is-strict` says the scaffold "does not yet wire the check". Only OAT runs `nav sync --check` (`apps/oat-docs/package.json:9`). A fresh scaffold has no `meta.json`, and analyze flags that as a missing generated artifact (`oat-docs-analyze/SKILL.md:409-410`), so the first audit after bootstrap reports a defect bootstrap created.
- **Evidence (observed).** Without `meta.json`, Fumadocs orders the sidebar index first, then files, then folders, each by `localeCompare` on path (upstream `fumadocs-core` page-tree builder, fetched 2026-10-22). In 7 of 8 surveyed apps without `meta.json`, the root sidebar contradicts the authored Contents; in one, the two audience tracks appear in reverse order.
- **Proposal.** Run `oat docs nav sync` at the end of `oat docs init` and bootstrap; add `&& oat docs nav sync --check` to the template prebuild; record in the scaffolded contributing page that nav sync owns the sidebar (repos that keep hand-authored `meta.json` remove the check and validate without running sync). Ship after P13 so repos with hand-authored separators are not stripped.
- **Benefit.** The sidebar follows the authored reading path everywhere.
- **Priority / effort.** P1 / S.
- **Existing backlog item.** None.

### P13. Emit separators from `###` headings; accept string `root`

- **Problem.** Nav sync builds `pages` only from Contents links and replaces `pages` wholesale ([`fumadocs.ts:225-240`, `mergeMeta` at `:291-301`](https://github.com/voxmedia/open-agent-toolkit/blob/c66f71aacd3d329f34aeb52102f7ba723b3d4cfc/packages/cli/src/commands/docs/nav/fumadocs.ts#L291-L301)); `FUMADOCS_SEPARATOR` (`:51`) is used only to escape filenames. One surveyed repo's hand-authored `meta.json` splits a section into three `---Label---` groups, and another surveyed repo also uses separators; nav sync would drop both on first sync. Nav sync also treats a folder as root only when `root === true` (`:218`); Fumadocs `main` accepts a string `root` (not verified at the pinned 16.6–16.10 versions).
- **Proposal.** Treat `###` headings inside `## Contents` as groups and emit `---Label---` before each group; accept truthy `root`; document both in the Contents grammar.
- **Benefit.** One authored map yields grouped sidebars, so the "meta.json is hand-authored" exception goes away.
- **Priority / effort.** P1 / M.
- **Existing backlog item.** None.

### P14. Make `generate-index` honor authored order and titles, with a tooling-aware header

- **Problem.** The manifest sorts index first, directories before files, then `localeCompare` (`packages/cli/src/commands/docs/index-generate/generator.ts:261-273`). That is the opposite grouping from the Fumadocs sidebar and ignores the authored Contents order, so an agent reading the manifest first sees a different shape from the reader. One surveyed repo's manifest shows title-cased slugs instead of page titles. The header says changes are "clobbered on every `predev` / `prebuild`" (`index-generate/index.ts:31`), which is false for plain Markdown manifests.
- **Proposal.** Walk Contents order where an `index.md` exists (filesystem order only for unlisted pages, flagged), use index `title` frontmatter, and write tooling-specific header text.
- **Benefit.** Agents and readers see the same structure and titles.
- **Priority / effort.** P2 / M.
- **Existing backlog item.** None.

### P15. Add llms routes to `docs-config` and the template

- **Problem.** No surveyed docs site serves `llms.txt`, `llms-full.txt` or per-page `.md` routes (observed: 0 of 15 Fumadocs apps; no `llms*` files anywhere in the snapshots). The generated app-root `index.md` is already llms.txt-shaped but is not deployed.
- **Proposal.** Expose Fumadocs' documented `llms.txt`, `llms-full.txt` and per-page Markdown routes (https://www.fumadocs.dev/docs/integrations/llms, fetched 2026-10-22) through `@open-agent-toolkit/docs-config` and the template, as static route handlers compatible with `output: 'export'`. Put the "How agents should use these docs" text from P9 in the `llms.txt` header. Keep `.md` as the default page format: MDX pages are excluded from the OAT manifest and docs MCP indexing (documented in a surveyed repo's contributing reference).
- **Benefit.** Deployed docs become readable by agents without repo access, almost for free.
- **Priority / effort.** P1 / S.
- **Existing backlog item.** None.

### P16. Restore `generateMetadata` parity and add a template-parity test

- **Problem.** The template page exports `generateMetadata` (`.oat/templates/docs-app-fuma/app/[[...slug]]/page.tsx:26`); at the pinned commit OAT's own `apps/oat-docs` page does not, and neither do six surveyed consumer apps (observed). Every page then likely shares the site `<title>` (inferred; not checked in a browser), although nearly every page in those apps has `title` and `description` frontmatter (observed).
- **Proposal.** Add `generateMetadata` to OAT's app (done in #366); add a test that diffs `apps/oat-docs` against the template for owned files, so the flagship cannot drift from what consumers get; have analyze flag missing per-page metadata.
- **Benefit.** Per-page titles and descriptions reach browsers and search, and template drift is caught in CI.
- **Priority / effort.** P2 / S.
- **Existing backlog item.** None. The parity test and analyze rule remain open after #366.

### P17. Fix remark plugin ordering and add transform tests

- **Problem (inferred from source; verify with a fixture).** `createSourceConfig` runs `[remarkLinks, remarkTabs, remarkAlert, remarkMermaid]` (`packages/docs-config/src/source-config.ts:23`). Tab bodies are indented code until `remarkTabs` re-parses them, after `remarkLinks` has run, so a relative `page.md` link inside a `===` tab would ship with its `.md` href. `remarkTabs` scans only top-level `tree.children` (`packages/docs-transforms/src/remark-tabs.ts:47-83`), so nested tabs (demonstrated on OAT's `markdown-features.md`) and GFM tables inside tabs likely render literally. `remarkMermaid` has no tests (no `remark-mermaid.test.ts`).
- **Proposal.** Run `remarkTabs` first, or make it recurse and re-run link rewriting on re-parsed content; re-parse with `remark-gfm`; add tests for links, nesting and GFM inside tabs, and for `remarkMermaid`.
- **Benefit.** Tabbed content renders the same as untabbed content.
- **Priority / effort.** P2 / S. No current page has a link inside a tab, so the link bug is latent.
- **Existing backlog item.** None.

### P18. Refresh the MkDocs template pins and framework currency

- **Problem.** The MkDocs template pins `mkdocs==1.4.2` and `mkdocs-material==9.0.14` (`.oat/templates/docs-app-mkdocs/requirements.txt:1-4`); latest is 1.6.1 and 9.7.7 (PyPI, fetched 2026-10-22). Material is in maintenance mode with end of life on May 5, 2027, and its team now builds Zensical (https://squidfunk.github.io/mkdocs-material/changelog/, fetched 2026-10-22). The template's `test` script is an `echo`. No surveyed repo renders with MkDocs.
- **Proposal.** Bump the pins, or mark the MkDocs path legacy with the EOL date and a Zensical note; replace the echo test with the P20 check. Note in analyze that consumers on `@open-agent-toolkit/docs-theme ^0.1.x` (two surveyed consumers) lack `ZoomImage` and palette-aware Mermaid.
- **Benefit.** New MkDocs sites start on supported versions, or operators know the path is legacy.
- **Priority / effort.** P2 / S.
- **Existing backlog item.** Package drift reporting is already in `BL-260911-make-docs-bootstrap-a-front`.

### P19. Stop hardcoding OAT's own IA in shipped skills

- **Problem.** `oat-docs` embeds a topic table of OAT's own docs (`oat-docs/SKILL.md:94-108`), and `docs-completed-projects-gap-review` hardcodes `apps/oat-docs/...` paths while appearing in the public skills catalog. Authoring routes MkDocs migration to a guide that ships only inside a project folder.
- **Proposal.** Derive the `oat-docs` topic map from `~/.oat/docs/index.md` `## Contents` at run time; generalize gap-review to resolve `documentation.root` plus the recorded IA, or mark it repo-internal; package the migration guide in the docs pack.
- **Benefit.** Shipped skills keep working when OAT's own pages move and work in consumer repos.
- **Priority / effort.** P2 / S.
- **Existing backlog item.** Same failure class as `BL-261002-catch-hardcoded-docs-paths`; reference it.

## C. Validation

### P20. Add `oat docs check` with calibrated rules

- **Problem.** Docs checks are rare and often unwired. 11 of 24 surveyed repos have some docs check wired into CI; five more have checker or lint scripts that nothing calls (observed). Repos keep writing their own checkers: three surveyed repos have one, as does OAT (`apps/oat-docs/scripts/validate.ts`), and one repo added a table-parity rule after a malformed docs table reached on-call.
- **Proposal.** One `oat docs check` for Markdown, Fumadocs and MkDocs, reading `documentation.*` config, with `--json`. Errors fail; warnings report. Thresholds are calibrated from the 24-repo shape metrics so strong exemplars pass:

  | Rule                                                                                          | Warn                                                          | Error                                                                |
  | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
  | Every Markdown-bearing directory has `index.md` with a non-empty `## Contents` (dash bullets) | —                                                             | missing or 0 links                                                   |
  | Root entries                                                                                  | > 10 flat                                                     | > 14 flat                                                            |
  | Contents entries per index                                                                    | > 10 without `###`                                            | > 15 without `###` (catalog exemption: `catalog: true` or generated) |
  | Leaf folder size                                                                              | 2 pages                                                       | index-only leaf                                                      |
  | Folder size                                                                                   | > 12 pages without grouped index                              | > 20 pages without grouped index                                     |
  | Depth                                                                                         | 4                                                             | 5                                                                    |
  | Page length                                                                                   | non-reference > 500 lines; reference > 1,000 lines or > 40 H3 | overridable with a stated reason                                     |
  | Frontmatter description                                                                       | < 40 or > 160 characters                                      | missing                                                              |
  | Overview before Contents                                                                      | < 10 words                                                    | —                                                                    |
  | One H1 per page; links and anchors resolve; Contents description not truncated with `...`     | —                                                             | error                                                                |
  | Contents separator consistent within the repo                                                 | mixed                                                         | —                                                                    |

  Keep "about 7 root entries", "group past 8–10" and "2–4 sentence overview" as authoring targets, not lint levels: at 8, the grouping rule fires on 43 indexes, mostly in the exemplars (observed). Bootstrap wires `oat docs check` into PR CI with the build and manifest freshness.

- **Benefit.** One maintained checker replaces five unwired ones and catches the drift the survey found.
- **Priority / effort.** P1 / L.
- **Existing backlog item.** None.
- **Note.** One analysis lane recommended an em dash as the house Contents separator; the survey decision is the `-` template default with in-repo consistency only. The rule checks consistency, not the glyph.

### P21. Check `meta.json` against Contents

- **Problem.** In one surveyed repo, a section's `meta.json` lists two fewer pages than its `index.md` Contents; the missing pages are hidden from the sidebar, and CI passes because only `generate-index` freshness is checked (observed).
- **Proposal.** In `oat docs check` and analyze: when `meta.json` exists, its page membership and order match Contents (respecting P13 separators). This is `nav sync --check` without requiring nav sync ownership.
- **Benefit.** Pages cannot silently disappear from the sidebar.
- **Priority / effort.** P1 / S.
- **Existing backlog item.** None.

### P22. Check that commands named in contributing pages exist

- **Problem.** Contributing pages contradict their repo's tooling. One surveyed repo says lint runs on staged Markdown, but lint-staged runs only the formatter; another presents two scripts as separate checks although both run the same script; a third gives two incompatible command forms on sibling pages (observed).
- **Proposal.** A check that every `pnpm <script>` or `npm run <script>` in docs-about-docs pages resolves to a script in the relevant `package.json`, plus a warning on scripts that are `echo` stubs.
- **Benefit.** Contributor instructions stay runnable.
- **Priority / effort.** P2 / S.
- **Existing backlog item.** None.

### P23. Check diagrams: Mermaid parse, SVG pairs and accessibility

- **Problem.** About 195 rendered Mermaid diagrams exist across 17 surveyed repos; none uses `accTitle` or `accDescr` (observed). Mermaid in an inactive `=== "Mermaid source"` tab is not in the static export, so a passing build proves nothing about it. No docs skill mentions SVG pairs, `ZoomImage` or alt text.
- **Proposal.** Checks:
  - `mermaid.parse` over every fence, including indented tab content;
  - every `*-light.svg` has a `*-dark.svg` sibling, and pages reference both;
  - every diagram SVG has `role="img"`, `<title>` and `<desc>`, and a page that renders it through `<img>` also carries the long description in page text or an associated HTML description (SVG `<desc>` alone is not exposed);
  - warn on Mermaid without `accTitle`/`accDescr` (or have `remarkMermaid` lift the lead-in sentence into `accTitle`);
  - warn on empty, slug-like or over-155-character alt text;
  - flag a diff that changes a tabbed Mermaid block without touching its SVGs.
- **Benefit.** Diagrams stay valid, in sync with their source and accessible.
- **Priority / effort.** P2 / M.
- **Existing backlog item.** None.

### P24. Check Product / Engineering / QA triads and quoted literals against source

- **Problem.** In surveyed app repos, literals quoted in Product and QA pages drift from source, and nothing checks them. In one mobile app, a Product page quotes a user-facing string whose value differs from both the QA page and source; all three tracks name a control by a label that source no longer renders; and two QA rows for the same scenario contradict each other. In another, a feature folder exists in Product but not in Engineering or QA, so slug pairing fails. A roughly 30-line script found every case (observed, QA derivation trial).
- **Proposal.** When the recorded IA includes an accepted Product/Engineering/QA triad (not the agent-only, no-triad overlay), check:
  - triad slug parity across `product/`, `engineering/features/` and `quality-assurance/`;
  - `## Paired Documentation` present and resolving;
  - backticked literals on Product and QA pages found verbatim in source (entity-normalized) or marked as concepts;
  - test IDs found in the repo's test-ID registry;
  - no duplicate scenario IDs, and no rows with the same Given and When but a different Then;
  - templates not listed in reader Contents.
- **Benefit.** Product and QA pages become safe oracles for agent verification and E2E derivation.
- **Priority / effort.** P1 / M.
- **Existing backlog item.** None.

### P25. Check for project provenance and escaping links in reader pages

- **Problem.** Reader docs leak planning context: `.oat/` paths and backlog IDs, milestone codes, dated review-history headings, ticket IDs in index descriptions, and links that escape the docs root or the machine (`../../../../.agents/...`, `~/Code/...`). Several surveyed repos state rules against this, but none lints it (observed).
- **Proposal.** Warn on `.oat/` paths, `BL-`/`bl-` IDs, configurable ticket and milestone patterns, home-directory paths, and relative links that leave the docs root; allow an exemption list for decision pointer pages.
- **Benefit.** Reader pages stay about the product, not the project that produced them.
- **Priority / effort.** P2 / S.
- **Existing backlog item.** None.

## D. Page templates

### P26. Ship Product and QA page templates

- **Problem.** `authoring-docs` page types are Tutorial, How-to, Reference, Explanation and Runbook; app repos invent the rest per repo. A QA derivation trial found the fields an agent needs (seed, locators, ready signal, cleanup) missing in every journey: 11 of 30 cells missing (observed).
- **Proposal.** Templates under `contributing/templates/`, scaffolded by the app preset (P5):

  | Template            | Required sections                                                                                                                                                                                                  | Exemplar                                                                   |
  | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
  | Product feature     | Availability and entry points, expected journey, behavior rules, states and edge cases, external boundary, paired documentation, evidence and owner-review gaps                                                    | A surveyed mobile app's feature-guide template and another's feature pages |
  | Engineering feature | Routes and params, primary files, data and state, flags, failure modes and constraints, testing seams, paired documentation, source references                                                                     | A surveyed mobile app's feature pages (no template exists)                 |
  | QA validation       | Scope, named seeds, configuration matrix, scenario table `ID \| Priority \| Given \| When \| Then (exact copy) \| Evidence \| Automation`, ready signal, cleanup, platform deltas, external boundary, out of scope | Two surveyed mobile apps' validation template and QA pages, combined       |
  | Screen spec         | Route and params, entry points, visible states, locator table (test ID, a11y label, literal text, source path), transitions, back behavior; only when a screen serves several journeys                             | None yet (synthesized)                                                     |

  Templates carry the literal-versus-concept rule (backticks only for strings verbatim from source) and keep planned automation, implemented assertions and dated execution evidence separate.

- **Benefit.** App repos stop reinventing these pages, and QA pages carry what an agent needs to derive tests.
- **Priority / effort.** P1 / M.
- **Existing backlog item.** None.

### P27. Ship operations, reference and agent templates

- **Proposal.** Add these templates to `authoring-docs` and the relevant presets:

  | Template               | Shape                                                                                                                                                                                                                                                        | Exemplar                                                                  |
  | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
  | Alert runbook          | When to use and entry criteria, production context, ownership, first-five-minutes triage matrix, numbered steps each with a verify line, why this approach, destructive-command warnings with dry run, rollback, verification checklist, owner-reviewed gaps | Production runbooks in three surveyed service repos                       |
  | Solution record        | Frontmatter `symptoms` (verbatim errors), `root_cause`, `component`, `severity`, `date`; body Problem → Root cause → Fix → Prevention                                                                                                                        | A surveyed app monorepo's solution records                                |
  | Command reference      | `Source:` line, production impact, shared flags, per-command args, outputs and `--json`, exit codes, side effects, "unknown" when unknown, `Mutates` column on the group index                                                                               | OAT `reference/cli-reference.md`; a surveyed CLI repo's per-command pages |
  | Skill or command guide | Invocation, prerequisites, example scenario, what it does without asking, expected output, next step                                                                                                                                                         | OAT `skills/diagnostics.md`, `docs-tooling/workflows.md`                  |
  | Decisions pointer      | Where records live, how they are created, 3–8 records with one-line consequences, staleness flags, "not a ledger"                                                                                                                                            | A surveyed skills repo's decisions page                                   |
  | Per-area `AGENTS.md`   | Audience, voice, belongs here vs elsewhere, cross-area triggers, verification; excluded from reader nav                                                                                                                                                      | A surveyed service repo's per-area `AGENTS.md`                            |

- **Benefit.** Recurring page shapes that strong repos already converged on become reusable defaults.
- **Priority / effort.** P2 / M.
- **Existing backlog item.** None.

## E. `authoring-docs` deltas

### P28. Rewrite the `authoring-docs` IA reference (D1–D9)

- **Problem.** `references/information-architecture.md` prescribes one Standard Top-Level Model (`Start here / How-to guides / Reference / Concepts / Operations`, lines 12-32) and a size dial: "Medium repos should use the standard structure" (lines 66-77). Only 3 of 24 surveyed repos use it at the root, all small single-audience repos; elsewhere the same section set reappears inside each audience track (observed). Four surveyed repos of similar size (56 to 65 pages) chose four different shapes. All 11 vendored copies carry a byte-identical IA reference, so the divergence is author choice, not skill drift.
- **Proposal.**

  | ID  | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
  | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | D1  | Replace the Standard Top-Level Model with a three-question method: who must succeed and in what work context; what is the reader's entry key inside each track; what is each page's one job. Add the two dials the survey needed: whether anyone outside the builders verifies behavior from the docs, and the size gate (under about 15 pages, one flat index with grouped headings).                                                                                       |
  | D2  | Keep the old model as a per-track Standard Section Set with observed labels: Start here, Tasks (How-to, Workflows), Reference, Explanation (Architecture, Concepts), Operations (Delivery, Runbooks), Contributing. Docs-about-docs lives under Contributing, never as its own track.                                                                                                                                                                                        |
  | D3  | Add a presets table (single track by page type, consumer + maintainer, Product + Engineering + QA, capability lanes, domain catalog, unit catalog) with "choose when" signals. Exemplars belong in external guidance (P2), not in the portable skill. Note that a UI alone does not justify three tracks.                                                                                                                                                                    |
  | D4  | Rewrite the scale rule: page count chooses how much structure to materialize, not which structure. Root about seven entries; group past about 8–10; a unit catalog is the allowed exception to "avoid organizing by implementation directory" when every unit uses the same page set.                                                                                                                                                                                        |
  | D5  | Add a section-entry rule: every section has an entry page with a purpose and one-line-described links; "Directory map for X" is not a description.                                                                                                                                                                                                                                                                                                                           |
  | D6  | Add placement rules: one canonical page per fact; routing pages own no facts; runbooks live with their domain, and shared Operations holds deployment-wide procedures; shared contracts live in one Reference; planning and evidence stay out of reader docs.                                                                                                                                                                                                                |
  | D7  | Revise the landing contract: the root answers what, why, who and where to start, and routes the rest by track, job, capability or page type.                                                                                                                                                                                                                                                                                                                                 |
  | D8  | Add short guidance for agent-guide tracks and Product/QA tracks (filename parity, paired links).                                                                                                                                                                                                                                                                                                                                                                             |
  | D9  | Companion edits: new page types (feature guide, validation matrix, solution, decision record) and smell-test rows; Feature, QA validation and IA Proposal templates; `workflow.md` maps personas to tracks; `writing-style.md:96` changes "Use `sh`" to `bash` unless POSIX-only; `SKILL.md:78` and the rubric "Predictable IA" row (`review-rubric.md:60`) point at the method; bump `metadata.version` 1.0.1 → 1.1.0 and normalize the five 1.0.0-lineage vendored copies. |

- **Benefit.** The portable baseline matches what good repos do and gives the OAT skills (P1, P3) a standard to cite.
- **Priority / effort.** P0 / M.
- **Existing backlog item.** None. Ship with P1 so the skills and the baseline agree.
- **Contradiction to resolve.** One surveyed repo's checker enforces `sh` fences, while OAT and the house conventions say `bash`; D9 makes `bash` the default and allows local overrides.

## Suggested sequencing

1. **Unblock the IA workflow:** P28 (authoring-docs method) together with P2 (guidance input) and P1 (IA discovery stage). Until these land, agents work around the gap with a manual bootstrap brief from an internal docs-IA guidance pack.
2. **Fix silent defects:** P8 (FP-11 export regression), then P6 and P7 in one bootstrap cleanup PR, folding P7 into `BL-261002-correct-docs-bootstrap-docs`.
3. **Make the scaffold reader-first:** P10, P9 and P11 in one template PR, plus P16's parity test so the template and OAT's own app stay aligned.
4. **Navigation:** P13 before P12, so separators survive when nav sync becomes the default; then P21.
5. **Persist and audit:** P3 (record the IA, IA-fit section), then P4 (restructure action) so audits can be acted on.
6. **Validation:** P20 as `oat docs check`, absorbing P21, P22, P25 and later P23; then P24 for app repos with a verification overlay.
7. **Presets and templates:** P26 and P27, then P5, which scaffolds them.
8. **Agent readiness and polish:** P15, P14, P17, P18, P19.

## Open questions

- Should the recorded IA live in `.oat/config.json`, an authored page, or both (P3)?
- Is keeping `AGENTS.md` out of the CLI template intentional (P9)? No decision record was found.
- Should the Contents grammar accept `*` bullets, or is dash-only a contract (`nav/contents.ts:11-51`)?
- Do consumer apps eventually get OAT's `validate.ts` checks, or does `oat docs check` (P20) replace them?
- One umbrella issue or several? This issue follows the survey decision (one umbrella issue with numbered proposals that reference existing backlog items); split by group if that suits triage better.
