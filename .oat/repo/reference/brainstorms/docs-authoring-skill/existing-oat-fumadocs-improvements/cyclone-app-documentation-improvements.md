---
title: Cyclone App documentation OAT Fumadocs improvement analysis
description: Improvement opportunities for the Cyclone App documentation OAT Fumadocs docs app.
---

# Agent prompt

You are working in `/Users/thomas.stang/Code/vox/cyclone-app/apps/documentation` to improve the Cyclone App docs app based on the analysis below.

## Objective

Tighten generated navigation and local-map quality, then expand API and operations coverage for a production service monorepo.

## Required steps

1. Regenerate the generated root index and investigate why `apps/mod-server/background-jobs.md` and `integrations/modinator/warnings-and-messages.md` are missing if they still do not appear.
2. Add the missing `## Contents` section to the WordPress content sync index and replace placeholder-only Contents sections with useful child-page or section maps.
3. Turn the API overview into navigable GraphQL/API reference coverage with pages for schema/source of truth, auth, root operation groups, errors, codegen/client usage, and consumer examples where owner-reviewed.
4. Expand operations coverage beyond engagement replication by adding or scoping deployment, rollback, observability, alerts, and general runbook pages.
5. Refresh docs authoring guidance to include current OAT rules for plain `.md` preference and `.md`-suffixed relative links.
6. Add or document repeatable structural checks instead of relying on disabled lint/format placeholders.
7. Normalize shell command fences to `sh` unless a block is Bash-specific.

## Generated artifact guidance

Do not hand-edit `apps/documentation/index.md` as the fix. Regenerate it through the documented package scripts after authored source changes. If missing child pages persist, capture the generator behavior as an OAT tooling issue with exact evidence.

## Validation

Run documented docs build/check commands. Verify generated manifest freshness, useful Contents coverage, API pages linked from parent Contents, operations pages linked from parent Contents, and no new broken links.

## Evidence

Use the full analysis below for file paths, line references, priorities, and owner-review notes.

# Cyclone App documentation OAT Fumadocs improvement analysis

## Scope

Analyzed repository/docs app: `/Users/thomas.stang/Code/vox/cyclone-app/apps/documentation`, referred to below as Cyclone App documentation. Paths in findings are relative to `/Users/thomas.stang/Code/vox/cyclone-app` unless explicitly absolute.
Shared baseline and OAT/Fumadocs references inspected:

- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvement-analysis-prompt.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/SKILL.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/01-principles.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/02-agent-workflow.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/03-information-architecture.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/04-page-types.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/05-writing-style.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/06-markdown-fumadocs.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/07-api-docs.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/08-cli-docs.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/09-app-service-docs.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/10-library-framework-docs.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/11-architecture-operations-docs.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/12-internal-vs-public.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/14-review-rubric.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/16-docs-audit-prompts.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/apps/oat-docs/AGENTS.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/SKILL.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`
  Cyclone files/artifacts inspected:
- `AGENTS.md`
- `README.md`
- `package.json`
- `.github/workflows/deploy-docs.yml`
- `apps/documentation/AGENTS.md`
- `apps/documentation/package.json`
- `apps/documentation/next.config.js`
- `apps/documentation/source.config.ts`
- `apps/documentation/lib/source.ts`
- `apps/documentation/app/layout.tsx`
- `apps/documentation/index.md`
- `apps/documentation/docs/index.md`
- `apps/documentation/docs/getting-started.md`
- `apps/documentation/docs/contributing.md`
- `apps/documentation/docs/api/index.md`
- `apps/documentation/docs/apps/index.md`
- `apps/documentation/docs/apps/cyclone-server/index.md`
- `apps/documentation/docs/apps/cyclone-server/local-dev.md`
- `apps/documentation/docs/apps/cyclone-server/graphql-codegen.md`
- `apps/documentation/docs/apps/mod-server/index.md`
- `apps/documentation/docs/apps/mod-server/background-jobs.md`
- `apps/documentation/docs/architecture/index.md`
- `apps/documentation/docs/authorization/index.md`
- `apps/documentation/docs/data-model/index.md`
- `apps/documentation/docs/integrations/index.md`
- `apps/documentation/docs/integrations/modinator/index.md`
- `apps/documentation/docs/integrations/modinator/local-dev.md`
- `apps/documentation/docs/integrations/modinator/warnings-and-messages.md`
- `apps/documentation/docs/integrations/wordpress-content-sync/index.md`
- `apps/documentation/docs/operations/index.md`
- `apps/documentation/docs/operations/engagement-replication.md`
- `apps/documentation/docs/packages/index.md`
  Read-only structural checks performed over `apps/documentation/docs`: Markdown file inventory, directory `index.md` coverage, `## Contents` coverage, placeholder Contents detection, generated root index comparison, `overview.md` detection, `.mdx` detection, relative-link suffix scan, shell code-fence language scan, and frontmatter title/description check.

## Executive summary

- The docs app is a scaffolded OAT/Fumadocs Next.js app with OAT config/theme/transforms wired through `apps/documentation/package.json`, `source.config.ts`, `next.config.js`, `lib/source.ts`, and `app/layout.tsx`.
- Strong foundation: all 21 authored docs pages inspected use plain `.md`, all have title/description frontmatter, every Markdown directory has an `index.md`, and no `overview.md` files were found in the docs tree.
- High-priority navigation drift: the generated root index at `apps/documentation/index.md` omits two pages that are linked from authored Contents: `apps/mod-server/background-jobs.md` and `integrations/modinator/warnings-and-messages.md`.
- Several `## Contents` sections are placeholders instead of useful local maps, and `integrations/wordpress-content-sync/index.md` has no `## Contents` section at all.
- The API section is useful as an overview but not yet a true GraphQL/API reference: it names a large schema surface while keeping all detail inline and having no child pages.
- The operations section has one strong, concrete replication runbook, but broader deployment, observability, alerts, runbook, and rollback coverage remains thin for a production service monorepo.
- Authoring guidance is present, but it appears older than the current OAT template because it does not explicitly say to prefer `.md` over `.mdx` or require `.md`-suffixed authored relative links.
- Low-level Markdown style drift exists: shell commands use `bash` fences where the baseline recommends `sh` for shell commands.

## Detected setup

- **Docs app path:** `/Users/thomas.stang/Code/vox/cyclone-app/apps/documentation`
- **Docs source path:** `/Users/thomas.stang/Code/vox/cyclone-app/apps/documentation/docs`
- **Detected framework/tooling:** Fumadocs/Next.js documentation app. Evidence: docs package scripts run `fumadocs-mdx` and `next build` in `apps/documentation/package.json:8-11`; `source.config.ts` uses `createSourceConfig`, `defineDocs`, and `sourceConfig.remarkPlugins` in `apps/documentation/source.config.ts:1-13`; `next.config.js` uses `createDocsConfig` in `apps/documentation/next.config.js:1-9`; page loading uses `fumadocs-core/source` in `apps/documentation/lib/source.ts:1-8`; the layout uses `DocsLayout` with Cyclone branding in `apps/documentation/app/layout.tsx:12-18` and `apps/documentation/app/layout.tsx:33-38`.
- **Generated artifacts:** `apps/documentation/index.md` is generated from `docs/` by `oat docs generate-index --docs-dir docs --output index.md` on `predev` and `prebuild` according to `apps/documentation/package.json:8-10` and `apps/documentation/AGENTS.md:49` and `apps/documentation/AGENTS.md:63`. No `mkdocs.yml` was found in the inspected app/root file inventory.
- **Docs scripts:** root `package.json` provides `build:docs` with `turbo run build --filter=documentation...` at `package.json:10-12`. The docs app provides `predev`, `dev`, `prebuild`, `build`, and `start` at `apps/documentation/package.json:8-12`; docs lint/format scripts are placeholders at `apps/documentation/package.json:13-15`.
- **Authoring guidance:** repo-root documentation pointer exists at `AGENTS.md:127-132`; docs-app guidance exists in `apps/documentation/AGENTS.md:13-17` and `apps/documentation/AGENTS.md:47-63`; contributor guidance exists in `apps/documentation/docs/contributing.md:12-15` and `apps/documentation/docs/contributing.md:72-74`.

## Overall assessment

Cyclone App documentation is a useful and relatively mature internal docs surface with strong scaffolding, explicit authoring guidance, and several high-quality operational/integration pages. The main readiness risks are navigation/index drift, placeholder local maps, and incomplete API/operations reference coverage for a production service monorepo. The docs are already helpful to humans and agents, but tightening generated navigation, Contents quality, and category-specific reference coverage would make the surface much safer for onboarding, operations, and future agent work.

## Strong patterns

- **Pattern:** OAT docs app guardrails are present in both repo-root and docs-app guidance.
  - **Evidence:** The root AGENTS pointer declares docs root, framework, and index file at `AGENTS.md:127-132`. The docs app tells agents to update `## Contents`, create `index.md` for new directories, and regenerate derived navigation at `apps/documentation/AGENTS.md:13-17`; it also warns not to hand-edit generated files at `apps/documentation/AGENTS.md:49`.
  - **Why it works:** This aligns with the OAT convention that authored `## Contents` sections are the source of truth and generated navigation artifacts are derived, not manually maintained.
- **Pattern:** The authored tree mostly follows the structural contract.
  - **Evidence:** Read-only structural inventory found 21 Markdown files under `apps/documentation/docs`, all authored as `.md`; every Markdown directory had an `index.md`; no `overview.md` and no `.mdx` files were found. The frontmatter check found every inspected Markdown page had both `title:` and `description:`.
  - **Why it works:** Plain Markdown and consistent frontmatter make pages portable, searchable, and agent-readable, matching the baseline Fumadocs guidance.
- **Pattern:** Several pages are grounded in source-of-truth links instead of copying unsupported facts.
  - **Evidence:** `docs/authorization/index.md` identifies middleware and directive source paths at `apps/documentation/docs/authorization/index.md:8-13`, includes a stale-role warning at `apps/documentation/docs/authorization/index.md:38-41`, and maps middleware behavior in a table beginning at `apps/documentation/docs/authorization/index.md:43-48`. `docs/data-model/index.md` links repository conventions and migration steps to server docs/source paths at `apps/documentation/docs/data-model/index.md:35-46` and `apps/documentation/docs/data-model/index.md:50-55`.
  - **Why it works:** The baseline emphasizes grounded documentation and explicit uncertainty; these pages cite code/docs sources and call out known drift rather than smoothing it over.
- **Pattern:** The engagement replication page is a strong operations/runbook example.
  - **Evidence:** It states source-table ownership and migration safety constraints at `apps/documentation/docs/operations/engagement-replication.md:10`, provides a source contract table at `apps/documentation/docs/operations/engagement-replication.md:12-23`, names ownership layers at `apps/documentation/docs/operations/engagement-replication.md:62-68`, lists prerequisites at `apps/documentation/docs/operations/engagement-replication.md:72-80`, and gives recovery guidance at `apps/documentation/docs/operations/engagement-replication.md:122-133`.
  - **Why it works:** It follows the architecture/operations baseline by documenting ownership, verification context, recovery, and operational boundaries.
- **Pattern:** The modinator local-development page supports task completion and troubleshooting.
  - **Evidence:** It lists prerequisites and startup commands at `apps/documentation/docs/integrations/modinator/local-dev.md:17-29`, documents required env vars at `apps/documentation/docs/integrations/modinator/local-dev.md:66-80`, calls out a known limitation at `apps/documentation/docs/integrations/modinator/local-dev.md:91-94`, and gives symptom-first troubleshooting at `apps/documentation/docs/integrations/modinator/local-dev.md:96-100`.
  - **Why it works:** It gives readers exact commands, config keys, caveats, and troubleshooting paths, which supports both human task completion and agent reliability.

## Improvement opportunities

### Fix generated root index drift for authored child pages

- **Priority:** High
- **Evidence:** `apps/documentation/docs/apps/mod-server/index.md:12-14` lists `[Background jobs](background-jobs.md)`, but generated `apps/documentation/index.md:10-11` shows only the `mod-server` section entry and omits `apps/mod-server/background-jobs.md`. `apps/documentation/docs/integrations/modinator/index.md:16-19` lists both `local-dev.md` and `warnings-and-messages.md`, but generated `apps/documentation/index.md:20-22` includes `modinator` and `Local dev` only. A read-only generated-index comparison found `apps/mod-server/background-jobs.md` and `integrations/modinator/warnings-and-messages.md` missing from generated links.
- **Issue:** Generated navigation appears stale or incomplete relative to authored `## Contents`. Evidence is concrete for the generated artifact; the cause is an inference and needs verification against the generator or a fresh generation run.
- **Why it matters:** OAT convention treats generated root indexes as derived from authored Contents. Missing generated entries make pages harder for agents and humans to discover and can hide operationally important pages such as background jobs and warning/message lifecycle.
- **Recommended change:** Do not hand-edit `apps/documentation/index.md`. Run the documented generation path and, if the omissions persist, investigate whether `oat docs generate-index` is skipping specific nested leaf links or whether the authored Contents shape needs adjustment.
- **Suggested target:** `apps/documentation/docs/apps/mod-server/index.md`, `apps/documentation/docs/integrations/modinator/index.md`, generated `apps/documentation/index.md`, and the OAT generate-index behavior if regeneration does not resolve it.
- **Owner review needed:** yes, because this may be either stale generated output or a generator behavior/contract issue.

### Replace placeholder or missing Contents sections with useful local maps

- **Priority:** High
- **Evidence:** `apps/documentation/docs/integrations/wordpress-content-sync/index.md:6-12` jumps from the H1 and intro to `## Contract` with no `## Contents`. Placeholder-only Contents comments appear in `apps/documentation/docs/api/index.md:10-12`, `apps/documentation/docs/authorization/index.md:15-17`, `apps/documentation/docs/packages/index.md:12-14`, and were also detected at `apps/cyclone-server/graphql-codegen.md:14`, `apps/cyclone-server/local-dev.md:12`, `architecture/index.md:12`, `data-model/index.md:12`, and `integrations/modinator/local-dev.md:14`.
- **Issue:** Several `index.md` files technically contain `## Contents` but do not provide a useful local map. One index page lacks `## Contents` entirely.
- **Why it matters:** The OAT/Fumadocs contract says every `index.md` should include a useful `## Contents` section that maps sibling pages and immediate child directories. For single-page directories, a useful section-level map can still help agents jump to task-relevant sections.
- **Recommended change:** Add a `## Contents` section to `integrations/wordpress-content-sync/index.md`. Replace placeholder comments with either linked child pages where siblings exist, or a short section map to major headings where the page remains intentionally single-page.
- **Suggested target:** `apps/documentation/docs/integrations/wordpress-content-sync/index.md`, `apps/documentation/docs/api/index.md`, `apps/documentation/docs/authorization/index.md`, `apps/documentation/docs/packages/index.md`, plus the placeholder-containing files listed above.
- **Owner review needed:** no for mechanical Contents maps; yes if fixing the map requires splitting pages or changing scope.

### Turn the API overview into navigable GraphQL/API reference coverage

- **Priority:** High
- **Evidence:** `apps/documentation/docs/api/index.md:10-12` has a placeholder Contents section. The same page states that the canonical GraphQL schema is about 1,462 lines with `Query`, `Mutation`, around 60 object types, and 18 enums at `apps/documentation/docs/api/index.md:14-22`, then continues inline into resolver/context/auth/error/codegen summaries.
- **Issue:** The API section currently orients readers but does not provide the reference depth expected for a large API surface: operations, auth expectations by operation, request/response examples, error shapes, pagination/idempotency/rate-limit notes where applicable, and generated-schema/source-of-truth boundaries.
- **Why it matters:** The baseline API guidance treats API docs as a contract. A large GraphQL schema summarized on one page leaves consumers and future agents needing to inspect schema/resolver source for routine integration details.
- **Recommended change:** Keep `api/index.md` as the API overview and add child pages for the most important API reference slices, such as GraphQL schema/source of truth, authentication/authorization for API consumers, root Query/Mutation groups, errors, codegen/client usage, and service-only routes if they belong in API rather than Integrations.
- **Suggested target:** `apps/documentation/docs/api/index.md` and new child pages under `apps/documentation/docs/api/`.
- **Owner review needed:** yes, to confirm consumer priorities and avoid inventing operation-level contract details.

### Expand broader operations coverage beyond the single strong replication runbook

- **Priority:** Medium
- **Evidence:** The operations index lists one child page at `apps/documentation/docs/operations/index.md:10-13`. It provides deployment summary details and the docs-site deploy workflow at `apps/documentation/docs/operations/index.md:47-65`; the GitHub workflow confirms docs build and S3 sync at `.github/workflows/deploy-docs.yml:43-47`. The engagement replication runbook is detailed, but no separate `deployment.md`, `observability.md`, `alerts.md`, `rollback.md`, or general incident runbook page was found under `apps/documentation/docs/operations`.
- **Issue:** The section has useful operational facts, but most production operations categories remain inline or absent. Evidence supports that the docs tree lacks dedicated pages; it does not prove those procedures are undocumented elsewhere.
- **Why it matters:** The architecture/operations baseline expects production systems to document deployment, rollback, health checks, dashboards/logs/metrics/traces, alerts, failure modes, and escalation. Inline summaries are hard to use during incidents.
- **Recommended change:** Promote production-critical operations into dedicated pages, starting with deployment/rollback and observability/runbook coverage for `cyclone-server` and `mod-server`. Mark unknown dashboards, alert thresholds, and escalation paths explicitly instead of inventing them.
- **Suggested target:** `apps/documentation/docs/operations/index.md`, new `apps/documentation/docs/operations/deployment.md`, `observability.md`, `alerts.md`, `rollback.md`, and/or `runbook.md`.
- **Owner review needed:** yes, because deployment, rollback, dashboards, alerts, and escalation details require operational owner confirmation.

### Refresh docs authoring guidance to match the current OAT template

- **Priority:** Medium
- **Evidence:** The docs app AGENTS add-page guidance covers `index.md`, frontmatter, Contents, and nav regeneration at `apps/documentation/AGENTS.md:13-17`. Its “What not to do” section covers generated files, Contents, analyze/apply, `overview.md`, and site renaming at `apps/documentation/AGENTS.md:47-53`. The contributor page covers `index.md`, Contents, and `overview.md` at `apps/documentation/docs/contributing.md:12-15`. The current OAT convention reference adds two important rules not present in those cited Cyclone sections: prefer plain `.md` unless JSX is required, and author relative docs links with `.md` suffixes.
- **Issue:** The actual docs tree follows those newer conventions today, but the local authoring guidance does not explicitly teach them.
- **Why it matters:** Future contributors and agents rely on local AGENTS/contributing docs. Missing guidance can reintroduce `.mdx` overuse or extensionless links even if the current tree is clean.
- **Recommended change:** Update `apps/documentation/AGENTS.md` and `apps/documentation/docs/contributing.md` with the current OAT scaffold language for `.md` preference and `.md`-suffixed relative links, including `subdir/index.md` for directories.
- **Suggested target:** `apps/documentation/AGENTS.md` and `apps/documentation/docs/contributing.md`.
- **Owner review needed:** no for convention refresh; yes only if Cyclone intentionally wants a different docs authoring policy.

### Add repeatable docs checks instead of disabled lint/format placeholders

- **Priority:** Medium
- **Evidence:** Docs scripts include `docs:lint`, `docs:format`, and `docs:format:check`, but each currently only echoes that the check is disabled at `apps/documentation/package.json:13-15`. The contributor guide repeats that linting and formatting are disabled at `apps/documentation/docs/getting-started.md:38-39` and `apps/documentation/docs/contributing.md:31-37`.
- **Issue:** The docs app depends on human/agent discipline for index coverage, generated-index drift, link suffixes, and code fence style. There is no script-level check for the issues observed in this analysis.
- **Why it matters:** The review rubric favors maintainable docs with automated or repeatable checks for links, structure, and generated artifacts. The current drift and placeholder Contents issues are exactly the kind of regression a lightweight check can catch.
- **Recommended change:** Add or document a repeatable check, such as an `oat docs analyze` invocation or a small docs-structure script, that validates `index.md`/Contents coverage, generated index freshness, `.md` link suffixes, and no `overview.md`/unnecessary `.mdx` files. If formatting remains disabled intentionally, say so separately from structural validation.
- **Suggested target:** `apps/documentation/package.json`, `apps/documentation/docs/contributing.md`, and possibly CI for docs changes.
- **Owner review needed:** yes, to decide whether this belongs in package scripts, CI, or the OAT analyze/apply workflow only.

### Normalize shell command fences to `sh`

- **Priority:** Low
- **Evidence:** Read-only scan found `bash` fences at `apps/documentation/docs/getting-started.md:19`, `apps/documentation/docs/getting-started.md:27`, `apps/documentation/docs/getting-started.md:35`, `apps/documentation/docs/apps/cyclone-server/local-dev.md:23`, `apps/documentation/docs/apps/cyclone-server/local-dev.md:30`, `apps/documentation/docs/integrations/modinator/local-dev.md:25`, `apps/documentation/docs/integrations/modinator/local-dev.md:68`, and `apps/documentation/docs/operations/engagement-replication.md:93`, `:106`, and `:116`.
- **Issue:** The baseline Markdown guidance recommends `sh` for shell commands. This is a style consistency issue, not a correctness issue.
- **Why it matters:** Consistent fence languages improve lintability and cross-repo consistency for humans and agents.
- **Recommended change:** Replace `bash` fences with `sh` unless a specific command block uses Bash-only syntax that readers need to recognize as Bash-specific.
- **Suggested target:** The files/lines listed above.
- **Owner review needed:** no.

## Baseline authoring guidance deltas

- **Information architecture:** The top-level structure is coherent, but local maps need cleanup. Evidence: all directories have `index.md`, but one index lacks `## Contents` and several Contents sections are placeholder comments rather than maps. Generated root index drift also weakens the navigation model.
- **Page types:** Several pages mix overview, reference, and how-to material in a single page. This is acceptable for a first pass, but the API overview is now too broad for the schema size cited in `apps/documentation/docs/api/index.md:16-22`; operations coverage also needs separate runbook/observability/deployment/rollback pages if this site is the primary internal operations surface.
- **Writing style:** Many pages are direct and evidence-backed. Main style deltas are placeholder Contents comments and `bash` fences where the baseline recommends `sh` for shell commands.
- **Application/service coverage:** Local development and integration docs are useful, but broader service docs are incomplete for deployment, observability, alerts, rollback, failure modes, and ownership. The engagement replication runbook shows the right level of detail for future operations pages.
- **API coverage:** GraphQL/API documentation is not yet contract-grade for consumers. It lacks navigable operation groups and detailed reference sections for request/response shapes, errors, auth/permissions, versioning/deprecation, pagination/rate limits/idempotency where applicable, and examples grounded in the schema.
- **Library/framework/package coverage:** `apps/documentation/docs/packages/index.md:8-14` explicitly says packages are deferred and remains a placeholder. That is honest, but it should either stay clearly out of scope or gain per-package docs when package manifests/task ownership become active.
- **Internal/public boundary:** The docs appear internal-facing and appropriately include internal paths, deployment bucket details, and operational caveats. No secrets were observed in the inspected docs. Ownership and escalation are explicit in the engagement replication page but not consistently documented across the whole site.
- **Review-rubric concerns:** Accuracy is mostly grounded in source links, but maintainability is weakened by disabled docs checks, generated-index drift, and placeholder local maps.

## OAT/Fumadocs convention deltas

- **Index coverage:** Every Markdown directory has `index.md`, which matches the contract. Delta: `apps/documentation/docs/integrations/wordpress-content-sync/index.md` lacks `## Contents`.
- **Useful Contents sections:** Multiple indexes contain placeholder comments instead of useful local maps, including `api/index.md`, `authorization/index.md`, `packages/index.md`, and other files listed in the structural check.
- **Generated navigation:** `apps/documentation/index.md` appears to omit authored child-page links for `apps/mod-server/background-jobs.md` and `integrations/modinator/warnings-and-messages.md`; do not hand-edit the generated file, but investigate regeneration/generator behavior.
- **Relative links:** The scan did not find extensionless docs-page relative links. Anchor links use `.md#anchor` patterns, which should be accepted by checks as `.md`-suffixed docs links with anchors.
- **Generated artifacts:** The generated root index is correctly documented as regenerated on `predev`/`prebuild`, but current generated content has drift evidence.
- **`overview.md`:** No `overview.md` files were found.
- **Plain Markdown vs MDX:** No `.mdx` files were found, which is good. Delta: local authoring guidance should explicitly preserve this by saying to prefer `.md` unless JSX is required.
- **Authoring guidance:** AGENTS and contributing docs exist, but they lag the current template on `.md` preference and `.md`-suffixed relative links.

## Recommended follow-up work

- **Target files or area:** `apps/documentation/index.md`, `apps/documentation/docs/apps/mod-server/index.md`, `apps/documentation/docs/integrations/modinator/index.md`
  - **Recommendation:** Regenerate the root index and investigate why two authored child links are absent if regeneration does not include them.
  - **Evidence:** `apps/documentation/docs/apps/mod-server/index.md:12-14`, `apps/documentation/docs/integrations/modinator/index.md:16-19`, and generated `apps/documentation/index.md:10-22`.
  - **Suggested owner/review need:** Docs/OAT tooling owner review if generator behavior persists.
- **Target files or area:** `apps/documentation/docs/**/index.md`
  - **Recommendation:** Add missing `## Contents` to WordPress content sync and replace placeholder Contents comments with useful child-page or section maps.
  - **Evidence:** `apps/documentation/docs/integrations/wordpress-content-sync/index.md:6-12`, `apps/documentation/docs/api/index.md:10-12`, `apps/documentation/docs/authorization/index.md:15-17`, `apps/documentation/docs/packages/index.md:12-14`.
  - **Suggested owner/review need:** Docs owner for structural updates; domain owner if sections are split.
- **Target files or area:** `apps/documentation/docs/api/`
  - **Recommendation:** Add GraphQL/API reference pages for major operation groups, auth, errors, codegen/client usage, and schema-source boundaries.
  - **Evidence:** `apps/documentation/docs/api/index.md:14-24`.
  - **Suggested owner/review need:** Cyclone API/domain owner review.
- **Target files or area:** `apps/documentation/docs/operations/`
  - **Recommendation:** Add or split out deployment, rollback, observability, alerts, and general runbook pages. Use the engagement replication runbook as the quality model.
  - **Evidence:** `apps/documentation/docs/operations/index.md:10-13`, `apps/documentation/docs/operations/index.md:47-65`, `.github/workflows/deploy-docs.yml:43-47`, and `apps/documentation/docs/operations/engagement-replication.md:62-68` plus `:122-133`.
  - **Suggested owner/review need:** Operational owner/SRE review.
- **Target files or area:** `apps/documentation/AGENTS.md`, `apps/documentation/docs/contributing.md`
  - **Recommendation:** Refresh local authoring guidance with current OAT docs-app template language for `.md` preference and `.md`-suffixed relative links.
  - **Evidence:** Existing guidance at `apps/documentation/AGENTS.md:13-17` and `apps/documentation/docs/contributing.md:12-15` lacks those rules.
  - **Suggested owner/review need:** Docs owner; low risk.
- **Target files or area:** `apps/documentation/package.json`, docs CI/workflow, `apps/documentation/docs/contributing.md`
  - **Recommendation:** Add or document a repeatable structural docs check for index/Contents coverage, generated-index freshness, link suffixes, and no `overview.md`/unnecessary `.mdx`.
  - **Evidence:** Disabled docs scripts at `apps/documentation/package.json:13-15` and current drift found by this analysis.
  - **Suggested owner/review need:** Docs/OAT tooling owner.

## Candidate checks for `oat-docs-analyze`

- Flag any `index.md` without `## Contents`, including single-page directories.
- Flag `## Contents` sections that contain only comments or no markdown links/section links.
- Compare generated root index links against authored `## Contents` links and report authored child pages absent from generated navigation.
- Treat `.md#anchor` links as compliant `.md`-suffixed links with anchors; flag extensionless docs links separately.
- Detect local AGENTS/contributing guidance that predates current OAT template requirements for `.md` preference and `.md`-suffixed relative links.
- Report shell command fences using `bash` when they contain only portable shell commands and could use the baseline `sh` language.
- Report docs lint/format/check scripts that are placeholders when structural drift is present, with a recommendation to wire `oat docs analyze` or an equivalent structural check.

## Open questions

- Is `apps/documentation/index.md` expected to include every authored Contents-linked leaf page, or is the current generator intentionally omitting some nested leaves? The observed omissions need OAT/tooling owner confirmation.
- Should `integrations/wordpress-content-sync/index.md` be treated as API reference, integration documentation, or operations documentation for follow-up structure? It has elements of all three.
- Who owns production operations review for deployment, rollback, observability, alerts, and escalation details across Cyclone and modinator?
- Should the placeholder `packages/index.md` remain visible while packages are deferred, or should it be hidden until packages graduate into the active workspace scope?
- Should the docs app add structural checks to package scripts/CI, or should the expected workflow remain manual `oat docs analyze` before bulk changes?
