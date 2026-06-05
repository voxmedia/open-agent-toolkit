---
title: Vox Mobile App documentation OAT Fumadocs improvement analysis
description: Improvement opportunities for the Vox Mobile App documentation OAT Fumadocs docs app.
---

# Agent prompt

You are working in `/Users/thomas.stang/Code/vox/vox-mobile-app/documentation` to improve the Vox Mobile App docs app based on the analysis below.

## Objective

Turn the existing strong maintainer/architecture docs into a more reliable OAT/Fumadocs surface with fresh generated navigation, `.md`-suffixed links, and task-oriented app-maintainer entrypoints.

## Required steps

1. Regenerate or repair generated manifest drift so `documentation/index.md` includes authored pages and sections such as Tooling, Video, Player, Embeds, PlayerToolbar, Android readiness, Error Monitoring, and Crashlytics MCP.
2. Convert authored internal relative links to `.md`-suffixed targets, including directory links as `subdir/index.md`.
3. Expand `documentation/docs/index.md` into a real app-maintainer landing page covering purpose, audience, local app setup, testing, release/deployment, dependencies, ownership, and next steps.
4. Disambiguate docs-site setup from mobile-app setup, either by renaming/splitting `getting-started.md` or adding a task-oriented local-development page.
5. Add a small task-oriented layer for How-to, Reference, and Operations, linking to existing strong architecture pages rather than duplicating them.
6. Replace opaque backlog/plan references in Android readiness and release automation docs with durable links or self-contained current-state summaries.
7. Add or enable docs checks for link suffixes, generated manifest freshness, unlabeled fences, and shell fence convention.
8. Refresh local authoring guidance with `.md` link suffix and analyze/apply workflow rules.

## Generated artifact guidance

Do not hand-edit `documentation/index.md` as the source of truth. If regeneration does not include authored pages, investigate whether extensionless authored links, generator behavior, or stale output caused the mismatch. Record generator/tooling issues separately from docs-source fixes.

## Validation

Run documented docs generation/build/format checks. Verify generated output includes every authored Contents target, all local links resolve with `.md` suffixes in source, new task-oriented pages are reachable from `## Contents`, and any operations/ownership claims are marked reviewed or unknown.

## Evidence

Use the full analysis below for file paths, line references, priorities, and owner-review notes.

# Vox Mobile App documentation OAT Fumadocs improvement analysis

## Scope

Assigned repository/docs app analyzed: `/Users/thomas.stang/Code/vox/vox-mobile-app/documentation`.

Use repo name in artifact: Vox Mobile App documentation.

This was a read-only analysis of the assigned docs app, except for writing this artifact. I did not edit the docs app.

Baseline and OAT/Fumadocs context inspected:

- Handoff prompt: `.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvement-analysis-prompt.md`
- Baseline authoring pack: `.oat/repo/reference/brainstorms/docs-authoring-skill/SKILL.md`, `01-principles.md`, `02-agent-workflow.md`, `03-information-architecture.md`, `04-page-types.md`, `05-writing-style.md`, `06-markdown-fumadocs.md`, `07-api-docs.md`, `08-cli-docs.md`, `09-app-service-docs.md`, `10-library-framework-docs.md`, `11-architecture-operations-docs.md`, `12-internal-vs-public.md`, `14-review-rubric.md`, and `16-docs-audit-prompts.md`
- OAT/Fumadocs convention references: `apps/oat-docs/AGENTS.md`, `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`, `.agents/skills/oat-docs-analyze/SKILL.md`, `.agents/skills/oat-docs-analyze/references/quality-checklist.md`, and `.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`

Vox Mobile App documentation files and artifacts inspected:

- Docs app config/tooling: `documentation/AGENTS.md`, `documentation/package.json`, `documentation/.oat/config.json`, `documentation/source.config.ts`, `documentation/lib/source.ts`, `documentation/app/layout.tsx`, and `documentation/index.md`
- Repo-level context: `AGENTS.md`, `README.md`, `package.json`, and `.oat/config.json`
- Authored docs indexes: `documentation/docs/index.md`, `documentation/docs/architecture/index.md`, `documentation/docs/components/index.md`, `documentation/docs/contributing/index.md`, `documentation/docs/features/index.md`, `documentation/docs/modules/index.md`, and `documentation/docs/tooling/index.md`
- Authoring/setup docs: `documentation/docs/getting-started.md`, `documentation/docs/contributing/documentation.md`, `documentation/docs/contributing/markdown-features.md`, and `documentation/docs/contributing/codebase.md`
- Representative content pages: `documentation/docs/architecture/android-production-readiness.md`, `documentation/docs/architecture/release-automation.md`, `documentation/docs/architecture/error-monitoring.md`, `documentation/docs/architecture/crashlytics-mcp.md`, `documentation/docs/architecture/data-layer.md`, `documentation/docs/architecture/duet-api.md`, `documentation/docs/features/video.md`, `documentation/docs/modules/player.md`, and `documentation/docs/components/player-toolbar.md`
- Generated/inventory checks: full `documentation/docs/**/*.md` inventory, authored relative-link scan, code-fence style scan, `overview.md` scan, `.mdx` scan, and generated-manifest drift comparison against authored index links

## Executive summary

- The docs app has a solid OAT/Fumadocs foundation: a scoped `documentation/` Fumadocs/Next app, explicit generated-file boundaries, local and root `AGENTS.md` guidance, all content directories represented by `index.md`, and no `overview.md` or unnecessary `.mdx` files.
- The largest structural issue is generated-manifest drift: `documentation/index.md` is marked auto-generated but currently omits multiple authored pages and one whole top-level section, including Tooling, Video, Player, Embeds, PlayerToolbar, Android readiness, Error Monitoring, and Crashlytics MCP.
- Authored internal links do not follow the OAT convention for `.md`-suffixed relative links. The generated manifest uses `.md` links, but authored `## Contents` sections and many cross-links use extensionless targets such as `features/video`, `tooling/`, and `error-monitoring`.
- The docs home page is mostly a map of implementation areas. It does not yet satisfy the baseline landing-page contract for a mobile app/service: purpose, audience, boundaries, local app setup, testing, deployment/release, dependencies, ownership, and next steps.
- The information architecture is weighted toward implementation directories (`Components`, `Features`, `Modules`, `Architecture`) rather than reader tasks (`Start here`, `How-to`, `Reference`, `Concepts`, `Operations`). This works for maintainers who already know the code shape, but it makes onboarding, operations, and incident response less discoverable.
- Strong architecture and operations-adjacent pages exist, especially `release-automation.md`, `error-monitoring.md`, `data-layer.md`, and `duet-api.md`; the follow-up should expose them through a clearer operations/how-to layer rather than rewrite them wholesale.
- Some operational references need owner review or stronger durable links. `android-production-readiness.md` includes a backlog key without a link, and `release-automation.md` refers to plan-phase curl recipes that are not available in the rendered docs page.
- Markdown quality is mostly usable, but repeatable style issues exist: several code fences are unlabeled, shell fences use `bash` instead of the baseline `sh`, and `documentation/package.json` has `docs:lint` disabled.

## Detected setup

- **Docs app path:** `/Users/thomas.stang/Code/vox/vox-mobile-app/documentation`
- **Docs source path:** `/Users/thomas.stang/Code/vox/vox-mobile-app/documentation/docs`
- **Detected framework/tooling:** Fumadocs on Next.js with MDX tooling and OAT docs packages. Evidence: `documentation/AGENTS.md:9`, `documentation/package.json:18-23`, `documentation/source.config.ts:1-14`, `documentation/lib/source.ts:1-8`, and `documentation/app/layout.tsx:1-34`.
- **Generated artifacts:** `documentation/index.md` is the generated machine-readable manifest. Evidence: `documentation/index.md:1`, `documentation/AGENTS.md:27`, `documentation/AGENTS.md:40-42`, `documentation/docs/contributing/documentation.md:57-64`, and `AGENTS.md:141-144`. The generated directories `documentation/.source/`, `documentation/.next/`, and `documentation/out/` are named as generated artifacts in `documentation/AGENTS.md:40-42`; they were not present in the working tree during this analysis.
- **Docs scripts:** `documentation/package.json:8-15` defines `predev` and `prebuild` as `fumadocs-mdx && oat docs generate-index --docs-dir docs --output index.md`, plus `dev`, `build`, `docs:format`, and `docs:format:check`. `docs:lint` is currently a no-op at `documentation/package.json:13`.
- **Authoring guidance:** The docs app has `documentation/AGENTS.md`, root `AGENTS.md` documentation conventions, and rendered authoring docs under `documentation/docs/contributing/`. Evidence: `documentation/AGENTS.md:24-36`, `documentation/docs/contributing/documentation.md:10-16`, `documentation/docs/contributing/documentation.md:66-77`, `documentation/docs/contributing/markdown-features.md:10-90`, and `AGENTS.md:138-153`.

## Overall assessment

The Vox Mobile App documentation app is a strong maintainer reference surface with unusually good architecture and operational context for a mobile app. Its main readiness risk is not lack of content; it is discoverability and contract drift: the generated manifest is stale, authored links are extensionless, and the home page does not yet guide a new maintainer or agent through first success, safe release work, or operations. The best follow-up is to tighten the OAT/Fumadocs contract and add task-oriented entry points around the existing high-value pages.

## Strong patterns

- **Pattern:** Clear generated-versus-authored file boundary.
  - **Evidence:** `documentation/index.md:1` marks the manifest as auto-generated; `documentation/AGENTS.md:26-28` tells agents to write human content under `documentation/docs/` and not hand-edit `documentation/index.md`; `documentation/docs/contributing/documentation.md:57-64` repeats the same distinction in rendered docs.
  - **Why it works:** This directly supports the OAT convention that generated navigation artifacts are derived output and should not replace authored `## Contents` maps.

- **Pattern:** Complete content-directory index coverage.
  - **Evidence:** Authored indexes exist for the root and each content section: `documentation/docs/index.md:10-18`, `documentation/docs/architecture/index.md:10-19`, `documentation/docs/components/index.md:10-15`, `documentation/docs/contributing/index.md:10-14`, `documentation/docs/features/index.md:10-15`, `documentation/docs/modules/index.md:15-19`, and `documentation/docs/tooling/index.md:10-12`.
  - **Why it works:** This matches the OAT/Fumadocs contract that every content directory should expose an `index.md` with a `## Contents` local map.

- **Pattern:** Strong local and root agent guidance.
  - **Evidence:** `documentation/AGENTS.md:7-14` gives a docs-app snapshot; `documentation/AGENTS.md:16-22` lists docs commands; `documentation/AGENTS.md:24-36` defines authoring rules; `AGENTS.md:138-153` points repo-wide agents to the docs app and documents generated/authored index distinctions.
  - **Why it works:** Future humans and agents can quickly identify the docs source tree, generated manifest, and validation commands.

- **Pattern:** Architecture pages name concrete source paths and contracts.
  - **Evidence:** `documentation/docs/architecture/data-layer.md:10-18` maps layers to source directories; `documentation/docs/architecture/data-layer.md:41-54` documents transport behavior; `documentation/docs/architecture/duet-api.md:10-21` documents Duet base URL selection and override; `documentation/docs/architecture/duet-api.md:97-131` documents auth headers and rollout status.
  - **Why it works:** The baseline emphasizes exact paths, config keys, and source-of-truth links for both humans and agents.

- **Pattern:** Operational safety is documented in some high-risk areas.
  - **Evidence:** `documentation/docs/architecture/release-automation.md:24-57` documents EAS lanes and environment contracts; `documentation/docs/architecture/release-automation.md:115-151` documents submit behavior, notification wording, and versioning rules; `documentation/docs/architecture/error-monitoring.md:13-27` documents Crashlytics/Sentry ownership; `documentation/docs/architecture/error-monitoring.md:44-58` documents privacy boundaries; `documentation/docs/architecture/crashlytics-mcp.md:98-109` warns against committing credentials and leaking sensitive transcripts.
  - **Why it works:** These pages avoid vague operational guidance and include concrete constraints, limitations, and safety boundaries.

- **Pattern:** Plain Markdown is used throughout the authored docs source.
  - **Evidence:** The `documentation/docs/**/*.md` inventory found authored Markdown files only and no `.mdx` files; the `overview.md` scan found no `overview.md` files.
  - **Why it works:** This matches the OAT guidance to prefer plain `.md` unless JSX/components are required and to avoid `overview.md` as a directory entrypoint.

## Improvement opportunities

### Regenerate or repair the generated manifest drift

- **Priority:** High
- **Evidence:** `documentation/index.md:1` says it is auto-generated. The generated manifest includes Architecture children only through Release Automation at `documentation/index.md:4-10`, while authored `documentation/docs/architecture/index.md:12-19` also lists Android Production Readiness, Error Monitoring, and Crashlytics MCP. The generated manifest includes only BookmarkButton and ContentCard under Components at `documentation/index.md:11-14`, while `documentation/docs/components/index.md:12-15` also lists Embeds and PlayerToolbar. The generated manifest includes only Article, Podcasts, and Saved Articles under Features at `documentation/index.md:20-24`, while `documentation/docs/features/index.md:12-15` also lists Video. It includes only Identity and Push Notifications under Modules at `documentation/index.md:25-28`, while `documentation/docs/modules/index.md:17-19` also lists Player. `documentation/docs/index.md:14` lists Tooling, but there is no Tooling section in `documentation/index.md:3-29`.
- **Issue:** The generated manifest is not current with authored `## Contents` maps. OAT tooling and agents that rely on `documentation/index.md` may miss real docs pages.
- **Why it matters:** The root `.oat/config.json` points documentation discovery at `documentation/index.md`, while the docs app `.oat/config.json` points the rendered source at `docs/index.md`. If the generated manifest is stale, humans using the rendered site may still see some pages, but agents and OAT tooling can get an incomplete map.
- **Recommended change:** Regenerate `documentation/index.md` from `documentation/docs/**/index.md` and add a freshness check that fails when the generated manifest differs from source maps. If regeneration still omits pages, investigate whether extensionless authored links or directory links are confusing `oat docs generate-index`.
- **Suggested target:** `documentation/index.md`, `documentation/package.json`, and the docs CI/check path that runs docs validation.
- **Owner review needed:** No for regeneration and freshness check; yes if the generator itself needs a behavior change or if omitted pages were intentionally excluded.

### Convert authored internal links to `.md`-suffixed relative links

- **Priority:** High
- **Evidence:** Authored links are extensionless across local maps and content pages, such as `documentation/docs/index.md:12-18`, `documentation/docs/architecture/index.md:12-19`, `documentation/docs/components/index.md:12-15`, `documentation/docs/features/index.md:12-15`, `documentation/docs/modules/index.md:17-19`, and `documentation/docs/tooling/index.md:12`. Cross-links are also extensionless, such as `documentation/docs/architecture/error-monitoring.md:179`, `documentation/docs/architecture/crashlytics-mcp.md:31`, `documentation/docs/architecture/data-layer.md:165`, and `documentation/docs/modules/player.md:186`.
- **Issue:** The authored docs diverge from the OAT/Fumadocs convention that internal links should include `.md`, including child directory links as `subdir/index.md`.
- **Why it matters:** Extensionless links render in Fumadocs, but they force agents and simple static tooling to infer file targets. They also make generated-index drift harder to diagnose.
- **Recommended change:** Update authored `## Contents` sections and cross-links to use `.md`-suffixed relative paths, for example `getting-started.md`, `tooling/index.md`, `components/embeds.md`, and `architecture/error-monitoring.md`. Keep external links unchanged.
- **Suggested target:** All authored Markdown under `documentation/docs/`, starting with every `index.md` and then cross-links reported by a link scan.
- **Owner review needed:** No, if build output is verified; this is a convention alignment change.

### Expand the docs landing page into a real app-maintainer entrypoint

- **Priority:** High
- **Evidence:** `documentation/docs/index.md:8` says the file is a map to the documentation site, and `documentation/docs/index.md:10-18` lists sections. It does not answer the baseline landing-page questions about what the app does, who uses it, non-goals, local app setup, testing, deployment, dependencies, ownership, or where to go for operations. `documentation/docs/getting-started.md:8-49` is a docs-site setup guide, not an app setup guide. The root README does contain app-local setup and CI checks at `README.md:5-70`, plus release and operations material at `README.md:107-193`, `README.md:226-285`, and `README.md:287-328`.
- **Issue:** A new app maintainer or agent entering through the docs site gets implementation-area navigation but not a first-success path for the mobile app itself.
- **Why it matters:** The baseline landing-page contract asks every repo docs entrypoint to explain purpose, audience, boundaries, setup, test, deploy/release, dependencies, ownership, and next steps. The current docs home is useful as a map, but too thin as a landing page.
- **Recommended change:** Expand `documentation/docs/index.md` with a concise orientation section and add or repurpose a first-run guide for the mobile app. Preserve `documentation/docs/getting-started.md` as either “Docs app getting started” or rename/split it so “Getting Started” is not ambiguous.
- **Suggested target:** `documentation/docs/index.md`, `documentation/docs/getting-started.md`, and possibly a new `documentation/docs/how-to/local-development.md` if task-oriented IA is added.
- **Owner review needed:** Yes for ownership, escalation, and deployment/release wording; no for linking existing README-backed setup commands.

### Add task-oriented how-to, reference, and operations entrypoints

- **Priority:** Medium
- **Evidence:** The current top-level authored map is `Getting Started`, `Contributing`, `Tooling`, `Components`, `Features`, `Modules`, and `Architecture` at `documentation/docs/index.md:12-18`. Release and monitoring content exists but is nested under Architecture (`documentation/docs/architecture/index.md:17-19`). `documentation/docs/architecture/release-automation.md:178-188` lists limitations and follow-up work, but there is no dedicated operations/runbook/rollback/observability section. `documentation/docs/architecture/error-monitoring.md:152-172` documents alert ownership categories but not concrete alert links, thresholds, dashboards, first checks, mitigation, or escalation.
- **Issue:** The IA is implementation-centered rather than reader-task-centered. Operations material is present but buried and not organized as runbooks or task guides.
- **Why it matters:** Baseline app/service docs should help readers run, change, deploy, observe, and recover the system. Agents also need predictable destinations for local development, testing, configuration, release, observability, troubleshooting, and rollback.
- **Recommended change:** Introduce a small task-oriented layer without discarding existing architecture pages. Candidate entrypoints: `how-to/local-development.md`, `how-to/testing.md`, `how-to/release-preview-build.md`, `reference/commands.md`, `reference/environment-variables.md`, `operations/index.md`, `operations/release-runbook.md`, `operations/observability.md`, and `operations/rollback.md`. Link existing pages from these entrypoints instead of duplicating all details.
- **Suggested target:** `documentation/docs/index.md`, new `documentation/docs/how-to/`, `documentation/docs/reference/`, and `documentation/docs/operations/` directories, each with `index.md` and `## Contents` if created.
- **Owner review needed:** Yes for operations, rollback, dashboards, alerts, and escalation details.

### Strengthen Android readiness and release validation follow-through

- **Priority:** Medium
- **Evidence:** `documentation/docs/architecture/android-production-readiness.md:8-10` describes the page as an index of gaps with detail in linked tracking artifacts, but the only concrete entry at `documentation/docs/architecture/android-production-readiness.md:16` ends with `Tracked: bl-fc4a` rather than a navigable link. Empty categories remain at `documentation/docs/architecture/android-production-readiness.md:18-28`. `documentation/docs/architecture/release-automation.md:213` tells readers to use curl invocations in “the plan's Phase 4 section” as the canonical recipe, but that plan is not linked on the page.
- **Issue:** Some operational guidance points to tracking artifacts or planning recipes without durable, directly navigable docs links.
- **Why it matters:** The baseline warns against relying on Slack/ticket archaeology or project-provenance details without summarizing the durable decision. A reader performing release validation needs exact, accessible steps and sources.
- **Recommended change:** Link `bl-fc4a` to the actual backlog/Linear artifact if it is safe to expose in rendered internal docs, or spell out that the link is unavailable and owner verification is required. Move repeatable host-validation curl recipes into a durable docs section or link to a durable reference artifact that is safe for rendered docs.
- **Suggested target:** `documentation/docs/architecture/android-production-readiness.md`, `documentation/docs/architecture/release-automation.md`, and any new operations/release runbook.
- **Owner review needed:** Yes, because tracking artifact visibility and release-validation recipes may depend on internal ownership and safety boundaries.

### Add automated docs quality checks for link and Markdown conventions

- **Priority:** Medium
- **Evidence:** `documentation/package.json:13` sets `docs:lint` to `echo 'docs lint disabled'`; `documentation/package.json:14-15` only format/check Markdown. The style scan found blank code fences in pages including `documentation/docs/features/video.md:14`, `documentation/docs/components/player-toolbar.md:25`, and `documentation/docs/modules/player.md:16`; it found shell fences labeled `bash` in `documentation/docs/getting-started.md:19`, `documentation/docs/contributing/documentation.md:33`, and `documentation/docs/contributing/markdown-features.md:87`.
- **Issue:** Current checks do not enforce the most important docs contracts: `.md`-suffixed internal links, generated-manifest freshness, all code fences labeled, and preferred `sh` for shell snippets.
- **Why it matters:** These are easy to regress and hard to notice manually. They directly affect agent readability and generated navigation freshness.
- **Recommended change:** Add or document a docs check that validates authored links, generated index freshness, missing code-fence languages, and shell fence conventions. If `docs:lint` remains intentionally disabled, add a separate `docs:check` or OAT analyze recommendation so contributors know what is enforced.
- **Suggested target:** `documentation/package.json`, `documentation/docs/contributing/documentation.md`, `documentation/docs/contributing/markdown-features.md`, and/or `oat-docs-analyze` checks.
- **Owner review needed:** No for checks that only report; yes if the team wants non-blocking warnings instead of CI failures.

### Add the missing OAT authoring guidance details to local docs guidance

- **Priority:** Low
- **Evidence:** `documentation/AGENTS.md:24-36` and `documentation/docs/contributing/documentation.md:10-16` document the `index.md` and `## Contents` contract, but they do not mention `.md`-suffixed authored links. `documentation/docs/contributing/documentation.md:73-77` tells agents to treat `index.md` as the discovery source of truth and regenerate through the normal build flow, but does not mention `oat-docs-analyze` or `oat-docs-apply` for audits/bulk changes.
- **Issue:** The local guidance is close to the OAT template, but omits two important conventions: `.md` link suffixes and the analyze/apply flow for broad docs changes.
- **Why it matters:** Agents are likely to preserve nearby style. If the local guide omits `.md` suffix rules, agents will continue extensionless links even after a one-time cleanup.
- **Recommended change:** Add a short rule to `documentation/AGENTS.md` and `documentation/docs/contributing/documentation.md` requiring `.md`-suffixed relative links, including `subdir/index.md` for child directories. Add a concise note that broad audits should start with `oat-docs-analyze` and approved bulk changes should go through `oat-docs-apply` if that workflow is available in this repo.
- **Suggested target:** `documentation/AGENTS.md` and `documentation/docs/contributing/documentation.md`.
- **Owner review needed:** No for convention text; yes if workflow availability differs for this repository.

## Baseline authoring guidance deltas

- **Information architecture:** The current top-level IA is useful for maintainers who already think in source directories, but it does not match the baseline Start here / How-to / Reference / Concepts / Operations model. Evidence: `documentation/docs/index.md:12-18`. A mobile app/service docs surface should make local development, testing, configuration, release, observability, troubleshooting, and ownership easier to find.
- **Landing page contract:** `documentation/docs/index.md:8-18` is a site map, not a full landing page. It should answer app purpose, audience, non-goals, common tasks, local setup, testing, deployment/release, dependencies, ownership, and next steps. Some of that content exists in `README.md:1-70`, `README.md:107-193`, `README.md:226-285`, and `README.md:287-328`, but not in the rendered docs entrypoint.
- **Page types:** Many pages are strong explanations or reference-style inventories, such as `documentation/docs/architecture/data-layer.md:10-18` and `documentation/docs/features/video.md:12-51`. The docs set has fewer explicit task guides with prerequisites, steps, verification, and rollback.
- **Writing style and Markdown:** The prose is generally direct and concrete, but code-fence conventions drift from the baseline. Examples include blank fences at `documentation/docs/features/video.md:14`, `documentation/docs/components/player-toolbar.md:25`, and `documentation/docs/modules/player.md:16`, plus `bash` shell fences at `documentation/docs/getting-started.md:19`, `documentation/docs/contributing/documentation.md:33`, and `documentation/docs/contributing/markdown-features.md:87`.
- **App/service coverage:** Architecture, data layer, Duet API, release automation, and monitoring are strong. Gaps are mainly in task-oriented app operation: local app setup in rendered docs, testing guide, configuration/environment-variable reference, release runbook, observability dashboards/alerts, rollback, and ownership/escalation.
- **Internal/public boundary:** The docs are clearly internal maintainer docs. They include sensible privacy and credential guidance in `documentation/docs/architecture/error-monitoring.md:44-58` and `documentation/docs/architecture/crashlytics-mcp.md:98-109`. The main boundary delta is durable linking: `documentation/docs/architecture/android-production-readiness.md:16` names `bl-fc4a` without a link or access context.
- **Review-rubric concerns:** Generated-manifest drift and disabled linting are the strongest maintainability concerns. Evidence: `documentation/index.md:1`, `documentation/package.json:8-15`, and the generated-manifest drift findings above.

## OAT/Fumadocs convention deltas

- **Authored `.md` links:** Diverges. Authored `## Contents` and cross-links use extensionless links, for example `documentation/docs/index.md:12-18`, `documentation/docs/architecture/index.md:12-19`, and `documentation/docs/contributing/documentation.md:8`. OAT convention expects `.md`-suffixed relative links and `subdir/index.md` for directories.
- **Generated manifest freshness:** Diverges. `documentation/index.md` is generated and marked not to hand-edit at `documentation/index.md:1`, but it omits pages listed in authored indexes, including `documentation/docs/tooling/index.md:12`, `documentation/docs/features/index.md:15`, `documentation/docs/modules/index.md:18`, and `documentation/docs/components/index.md:14-15`.
- **Every content directory has `index.md`:** Conforms. Inspected content directories under `documentation/docs/` all have indexes with `## Contents` sections.
- **Useful `## Contents` sections:** Mostly conforms. The section indexes are concise and useful, but they should use `.md`-suffixed links. The root `documentation/docs/index.md:15-18` is dense; consider shorter summaries plus child index links to reduce cognitive load.
- **Generated artifacts not hand-edited:** Appears to conform by guidance. I found clear generated markers and guidance at `documentation/index.md:1`, `documentation/AGENTS.md:27`, and `documentation/docs/contributing/documentation.md:57-64`. I did not find evidence of hand edits; the observed issue is staleness/drift, not provenance.
- **No `overview.md`:** Conforms. The scan found no `overview.md` files under the docs app.
- **Plain `.md` preferred:** Conforms. The scan found authored docs as `.md` and no `.mdx` pages under `documentation/docs/`.
- **Clear authoring guidance:** Mostly conforms. `documentation/AGENTS.md` and `documentation/docs/contributing/` are useful, but should add `.md` link suffix guidance and OAT analyze/apply audit flow.
- **Useful to humans and agents:** Mostly conforms for architecture and implementation reference, but discoverability is weakened by generated-manifest drift, extensionless links, and the lack of task-oriented entrypoints.

## Recommended follow-up work

1. **Target files or area:** `documentation/index.md`, `documentation/package.json`, generated-index workflow.
   - **Recommendation:** Regenerate the manifest and add a freshness check that compares `documentation/index.md` to the current authored `## Contents` graph.
   - **Evidence:** `documentation/index.md:1`, `documentation/package.json:8-10`, `documentation/docs/index.md:14-18`, `documentation/docs/architecture/index.md:12-19`, `documentation/docs/components/index.md:14-15`, `documentation/docs/features/index.md:15`, and `documentation/docs/modules/index.md:18`.
   - **Suggested owner/review need:** Docs/tooling owner; owner review only if generator behavior needs changing.

2. **Target files or area:** All authored Markdown under `documentation/docs/`.
   - **Recommendation:** Convert internal relative links to `.md`-suffixed targets, including child directories as `subdir/index.md`.
   - **Evidence:** `documentation/docs/index.md:12-18`, `documentation/docs/architecture/index.md:12-19`, `documentation/docs/components/index.md:12-15`, `documentation/docs/features/index.md:12-15`, `documentation/docs/modules/index.md:17-19`, and cross-links such as `documentation/docs/architecture/error-monitoring.md:179`.
   - **Suggested owner/review need:** Docs maintainer; verify with docs build.

3. **Target files or area:** `documentation/docs/index.md` and `documentation/docs/getting-started.md`.
   - **Recommendation:** Turn the docs entrypoint into an app-maintainer landing page and disambiguate docs-site setup from mobile-app setup.
   - **Evidence:** `documentation/docs/index.md:8-18`, `documentation/docs/getting-started.md:8-49`, and app setup content in `README.md:5-70`.
   - **Suggested owner/review need:** App owner for purpose, audience, ownership, and release/deployment wording.

4. **Target files or area:** New or existing `documentation/docs/how-to/`, `documentation/docs/reference/`, and `documentation/docs/operations/` sections.
   - **Recommendation:** Add a small task-oriented layer for local development, testing, commands, env vars, release preview builds, observability, runbook, and rollback; link to existing architecture pages for deeper detail.
   - **Evidence:** Current top-level implementation IA at `documentation/docs/index.md:12-18`; operations-adjacent material at `documentation/docs/architecture/release-automation.md:24-57`, `documentation/docs/architecture/release-automation.md:115-188`, and `documentation/docs/architecture/error-monitoring.md:152-172`.
   - **Suggested owner/review need:** App/release/ops owner review needed for runbook, rollback, dashboards, alerts, and escalation.

5. **Target files or area:** `documentation/docs/architecture/android-production-readiness.md` and `documentation/docs/architecture/release-automation.md`.
   - **Recommendation:** Replace opaque tracking references and plan-phase references with durable links or self-contained summary steps safe for rendered internal docs.
   - **Evidence:** `documentation/docs/architecture/android-production-readiness.md:8-16` and `documentation/docs/architecture/release-automation.md:190-213`.
   - **Suggested owner/review need:** Owner review needed for tracking-link visibility and release-validation recipes.

6. **Target files or area:** `documentation/package.json`, `documentation/docs/contributing/documentation.md`, and `documentation/docs/contributing/markdown-features.md`.
   - **Recommendation:** Add or document checks for link suffixes, generated-manifest freshness, unlabeled fences, and shell fence language; update authoring guidance to match.
   - **Evidence:** `documentation/package.json:13-15`, `documentation/docs/contributing/documentation.md:27-55`, `documentation/docs/contributing/markdown-features.md:83-90`, and code-fence scan findings.
   - **Suggested owner/review need:** Docs/tooling owner; no product owner review needed unless checks become blocking in CI.

## Candidate checks for `oat-docs-analyze`

- Compare generated root manifests such as `documentation/index.md` against the authored `docs/**/index.md` `## Contents` graph and flag omitted pages or sections.
- Flag authored internal links that are extensionless or directory-only, and suggest `.md` or `subdir/index.md` replacements.
- Distinguish generated-manifest drift from missing authored-index coverage so recommendations do not tell agents to hand-edit generated output.
- Flag local `AGENTS.md` or contributing guidance that documents `index.md`/`## Contents` but omits `.md` link suffix rules.
- Flag docs apps whose `docs:lint` script is disabled or absent while link/style checks are not covered elsewhere.
- Flag unlabeled fenced code blocks and shell fences labeled `bash` when the baseline prefers `sh`.
- For app/service docs, flag docs homes that are only maps and do not link to local development, testing, deployment/release, configuration, observability, troubleshooting, and ownership.
- Flag rendered docs pages that reference opaque tracking IDs or project-phase artifacts without durable links or in-page summary context.

## Open questions

- Is the stale `documentation/index.md` caused by the manifest not being regenerated after recent page additions, or by `oat docs generate-index` not following extensionless/directory links in the current authored maps?
- Should the rendered docs app become the primary app-maintainer onboarding surface, or should the root README remain the primary “run the app” guide with the docs app focused on technical reference?
- What is the canonical public/internal link target for `bl-fc4a` in `documentation/docs/architecture/android-production-readiness.md:16`, and should it be exposed in rendered internal docs?
- Where should ownership, dashboards, alert thresholds, and escalation paths be documented for release automation and monitoring: existing architecture pages or a new operations section?
- Should `Getting Started` mean “run the mobile app” or “run the docs app”? The current page is docs-app setup only, which is accurate but potentially surprising from the docs home.
- Are the host-validation curl recipes referenced by `documentation/docs/architecture/release-automation.md:213` stored in a durable artifact that can be linked safely, or should the repeatable recipe be moved into the docs page?
