---
title: Honeycomb docs OAT Fumadocs improvement analysis
description: Improvement opportunities for the Honeycomb docs OAT Fumadocs docs app.
---

# Agent prompt

You are working in `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs` to improve the Honeycomb docs app based on the analysis below.

## Objective

Keep the docs app's strong OAT/Fumadocs structure intact while closing production-operations and discoverability gaps.

## Required steps

1. Add Honeypot Forager runbook and troubleshooting coverage, using BigQuery Sync as the quality model. Include symptoms, first checks, dashboards/logs, rollback/disablement, queue retry guidance, verification, and owner-review notes.
2. Convert Operations “Future Topics” into concrete pages, sections, or explicitly owner-reviewed tracked gaps.
3. Reconcile CLI command discoverability so BullMQ commands are visible from the main `@honeycomb/cli` reference and mutating operations have safety notes.
4. Update docs authoring guidance to mention current `oat-docs-analyze` / `oat-docs-apply` flow, or explicitly map repo-specific aliases to those workflows.
5. Decide and document the local shell fence convention (`sh` versus `bash`) and clean up fragile long AWS console URLs where practical.

## Generated artifact guidance

The generated root manifest should remain derived output. If edits change authored Contents, regenerate through the documented package scripts and verify generated output matches the authored local maps. Do not hand-edit generated files as the source of truth.

## Validation

Run the repo's docs build/check commands. Verify all new pages are reachable from parent `## Contents`, generated output is fresh, CLI references cross-link correctly, and operations additions have owner-review status where thresholds or escalation paths are not yet confirmed.

## Evidence

Use the full analysis below for file paths, line references, priorities, and owner-review notes.

# Honeycomb docs OAT Fumadocs improvement analysis

## Scope

Assigned repository/docs app analyzed:

- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs`

This analysis only inspected the assigned Honeycomb docs app and directly related repo-level documentation metadata needed to evaluate documentation setup, navigation, authoring guidance, and representative content quality.

Baseline and OAT/Fumadocs context read:

- `.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvement-analysis-prompt.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/SKILL.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/01-principles.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/02-agent-workflow.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/03-information-architecture.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/04-page-types.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/05-writing-style.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/06-markdown-fumadocs.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/07-api-docs.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/08-cli-docs.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/09-app-service-docs.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/10-library-framework-docs.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/11-architecture-operations-docs.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/12-internal-vs-public.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/14-review-rubric.md`
- `.oat/repo/reference/brainstorms/docs-authoring-skill/16-docs-audit-prompts.md`
- `apps/oat-docs/AGENTS.md`
- `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`
- `.agents/skills/oat-docs-analyze/SKILL.md`
- `.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- `.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`

Honeycomb files and artifacts inspected:

- `/Users/thomas.stang/Code/vox/honeycomb/.oat/config.json`
- `/Users/thomas.stang/Code/vox/honeycomb/AGENTS.md`
- `/Users/thomas.stang/Code/vox/honeycomb/README.md`
- `/Users/thomas.stang/Code/vox/honeycomb/package.json`
- `/Users/thomas.stang/Code/vox/honeycomb/turbo.json`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/lambda-cyclone-invalidation-enqueuer/package.json`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/AGENTS.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/package.json`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/source.config.ts`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/next.config.js`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/lib/source.ts`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/app/api/search/route.ts`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/.markdownlint.jsonc`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/.oxfmtrc.json`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/turbo.json`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/getting-started.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/contributing/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/contributing/documentation.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/contributing/markdown-features.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/bigquery-sync/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/bigquery-sync/runbook.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/bigquery-sync/troubleshooting.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/deployment.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/observability.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/testing.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/cyclone-invalidation/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/cyclone-invalidation/troubleshooting.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/architecture/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/eventbridge/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/eventbridge/producers/cyclone.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/lambdas/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/observability/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/observability/datadog-metrics.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/observability/datadog-tracing.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/observability/sentry.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/production-releases.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/helm-charts.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/honeypot-engagement-replication.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/cli/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/worker/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/worker/cli.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/lambda-enqueuer/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/lambda-enqueuer/api-reference.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/honeypot-db/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/honeypot-db/api-reference.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/honeypot-db/release-and-consumption.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/tooling/index.md`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/ai/index.md`

Read-only checks performed:

- Listed top-level docs app files.
- Enumerated docs Markdown files and app config files.
- Checked `docs/` for missing `index.md`, missing `## Contents`, `overview.md`, missing Contents targets, and extensionless Contents links.
- Checked all authored Markdown links for missing local targets and extensionless relative links.
- Checked all Markdown files for frontmatter and opening code-fence language identifiers.
- Checked for `mkdocs.yml` or `mkdocs.yaml` under the assigned docs app.

## Executive summary

- Honeycomb docs strongly follows the OAT/Fumadocs structural contract: the docs source has `index.md` local maps, `.md`-suffixed Contents links, no `overview.md` entrypoints found, and a generated root `index.md`.
- The docs app has unusually clear authoring guidance for agents and humans, including commands, generated-file warnings, Fumadocs/MkDocs migration notes, frontmatter requirements, and Markdown feature support.
- The strongest content improvement opportunity is operational completeness for production worker apps: BigQuery Sync has a good runbook/troubleshooting pattern, but Honeypot Forager has no dedicated runbook or troubleshooting page despite deployment, observability, queue, database, and dependency guidance.
- The top-level Operations section still exposes “Future Topics” for staging/production differences, BullMQ health, escalation templates, dashboards, and alerts; those should become concrete pages, sections, or owner-reviewed gaps.
- The `@honeycomb/cli` documentation is split in a way that can hide BullMQ command coverage: the main CLI page says it is unified but lists only Lambda and EventBridge command groups, while BullMQ commands live under `packages/worker/cli.md`.
- Honeycomb’s local authoring guidance references `read-relevant-docs` and `docs-update`; OAT’s scaffold guidance now names `oat-docs-analyze` and `oat-docs-apply`, so future agents may miss the current audit/apply flow unless the local guidance is updated or explains the repo-specific aliases.
- The docs use `bash` fences pervasively. That is renderable and consistent locally, but it diverges from the imported baseline default of `sh` for shell commands.
- One representative EventBridge page includes a very long AWS CloudWatch console URL in prose. The query itself is useful, but the encoded URL is fragile and hard for agents to validate.

## Detected setup

- **Docs app path:** `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs`
- **Docs source path:** `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs`
- **Detected framework/tooling:** Fumadocs on Next.js, wrapped by OAT packages. The app guidance states it is a “Fumadocs (Next.js + MDX) documentation site,” fully Node-based, with source pages under `docs/`, static output exported to `out/`, and OAT packages wrapping Fumadocs/Next wiring (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/AGENTS.md:14`, `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/AGENTS.md:16`). The OAT config records `documentation.root` as `apps/honeycomb-docs/docs`, `tooling` as `fumadocs`, and `index` as `apps/honeycomb-docs/index.md` (`/Users/thomas.stang/Code/vox/honeycomb/.oat/config.json:21-25`).
- **Generated artifacts:** `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/index.md` is generated. The file starts with an autogenerated warning (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/index.md:1`), and `predev` / `prebuild` regenerate it with `oat docs generate-index --docs-dir docs --output index.md` (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/package.json:8-10`).
- **Docs scripts:** `dev`, `build`, `docs:lint`, `docs:lint:fix`, `docs:format`, and `docs:format:check` are defined in the docs app package (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/package.json:7-16`). The repo root exposes `pnpm build:docs` and `pnpm dev:docs` in agent guidance (`/Users/thomas.stang/Code/vox/honeycomb/AGENTS.md:62-63`).
- **Authoring guidance:** Repo-level documentation pointers live in `/Users/thomas.stang/Code/vox/honeycomb/AGENTS.md:60-65`. Docs-app workflow guidance lives in `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/AGENTS.md`, including key files, Contents navigation, generated index warnings, and definition of done (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/AGENTS.md:18-36`, `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/AGENTS.md:42-61`). In-site authoring pages live under `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/contributing/`.

## Overall assessment

Honeycomb docs is structurally ready and agent-friendly: it uses authored `index.md` maps, a generated whole-tree index, plain Markdown, clear frontmatter, and strong local authoring guidance. The main risks are not scaffolding risks; they are coverage and maintenance risks in production-facing content, especially uneven runbook/troubleshooting coverage and operational pages that still expose future-topic placeholders. The docs are useful today, but a few targeted follow-ups would make them safer for incidents and easier for agents to navigate without tribal knowledge.

## Strong patterns

- **Pattern:** The OAT/Fumadocs docs root and generated index are declared in repo metadata.
  - **Evidence:** `.oat/config.json` sets `documentation.root`, `tooling`, and `index` (`/Users/thomas.stang/Code/vox/honeycomb/.oat/config.json:21-25`). Repo-level `AGENTS.md` identifies `apps/honeycomb-docs/docs/` as the canonical docs surface and tells agents that the generated root index is regenerated on build and should not be hand-edited (`/Users/thomas.stang/Code/vox/honeycomb/AGENTS.md:62-65`).
  - **Why it works:** This matches the OAT convention that authored docs live under the docs source tree and generated navigation artifacts are derived from authored Contents sections.

- **Pattern:** The generated root index is clearly marked and regenerated by package scripts.
  - **Evidence:** The generated root index begins with `AUTOGENERATED by oat docs generate-index` and warns not to hand-edit it (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/index.md:1`). `predev` and `prebuild` run `fumadocs-mdx && oat docs generate-index --docs-dir docs --output index.md` (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/package.json:8-10`).
  - **Why it works:** This makes the generated artifact’s provenance explicit and protects the authored `docs/**/index.md` Contents contract from sidebar drift.

- **Pattern:** The authored docs tree follows the index/Contents contract.
  - **Evidence:** A read-only structural scan of `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs` found 127 `.md` files, 0 `.mdx` files, 43 content directories, no missing `index.md`, no `index.md` without `## Contents`, no `overview.md`, no missing Contents targets, and no extensionless Contents links. The top-level authored landing page has a clear `## Contents` section with `.md`-suffixed links to each major section (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/index.md:15-24`).
  - **Why it works:** This is the core OAT/Fumadocs convention: every directory is navigable by agents through an authored local map, and generated navigation can be derived from those maps.

- **Pattern:** In-site authoring guidance teaches the same local-map rules used by the tooling.
  - **Evidence:** The contributing page requires every documentation directory to have an `index.md`, every `index.md` to have `## Contents`, and Contents links to use `.md` suffixes (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/contributing/documentation.md:46-57`). It also explains the monorepo taxonomy for Apps and Packages (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/contributing/documentation.md:59-65`).
  - **Why it works:** It preserves the contract for future human and agent edits without forcing contributors to reverse-engineer the generated index.

- **Pattern:** Markdown feature docs explicitly document Fumadocs-supported syntax and MkDocs migration hazards.
  - **Evidence:** The Markdown Features page names the OAT remark stack, tabs, GFM alerts, and Mermaid support (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/contributing/markdown-features.md:9-16`). It also lists unsupported MkDocs-only syntax and tells authors not to use it (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/contributing/markdown-features.md:135-141`).
  - **Why it works:** Migration-specific warnings prevent old MkDocs syntax from silently rendering as broken prose in Fumadocs.

- **Pattern:** BigQuery Sync provides a good app-level operations template.
  - **Evidence:** Its overview links Deployment, Observability, PubSub Integration, Production Runbook, and Troubleshooting (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/bigquery-sync/index.md:14-18`). The runbook names roles and ownership (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/bigquery-sync/runbook.md:27-30`), has a required preflight checklist (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/bigquery-sync/runbook.md:32-44`), and includes rollback steps (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/bigquery-sync/runbook.md:75-84`).
  - **Why it works:** This aligns with the baseline guidance that production services need purpose, dependencies, validation, rollback, observability, and ownership.

## Improvement opportunities

### Add Honeypot Forager runbook and troubleshooting coverage

- **Priority:** High
- **Evidence:** Honeypot Forager’s Contents list Architecture, Configuration, Deployment, Observability, and Testing, but no runbook or troubleshooting page (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/index.md:12-16`). Its deployment guide already contains staging smoke checks and failure hints for unpublish/delete flows (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/deployment.md:115-130`). Its observability page documents ownership split, dashboard coverage, queue visibility, and practical checks (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/observability.md:10-29`, `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/observability.md:112-154`). BigQuery Sync demonstrates the stronger pattern with explicit runbook and troubleshooting links (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/bigquery-sync/index.md:14-18`).
- **Issue:** The docs contain the ingredients for operating Honeypot Forager, but incident response is spread across deployment and observability pages. Under pressure, an operator needs a symptom-first page and a go/no-go/rollback page.
- **Why it matters:** The baseline operations guidance treats runbooks as safety equipment. Honeypot Forager writes to Honeypot storage and depends on EventBridge, Lambda, BullMQ, Duet, Cyclone, Postgres, Sentry, Datadog, and Bull Board; missing a dedicated recovery path increases incident risk.
- **Recommended change:** Add `docs/apps/honeypot-forager/runbook.md` and `docs/apps/honeypot-forager/troubleshooting.md`, or one combined `runbook.md` if the team prefers fewer pages. Include symptoms, impact, first checks, dashboard/log links, rollback or trigger-disable steps, dependency escalation, queue retry guidance, verification, and owner-review notes for unknown thresholds. Update `docs/apps/honeypot-forager/index.md` Contents and Related Documentation.
- **Suggested target:** `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/index.md`, plus new `runbook.md` and `troubleshooting.md` under the same directory.
- **Owner review needed:** Yes. Runbook thresholds, rollback steps, and escalation paths need platform/SRE, app owner, and data/Honeypot owner confirmation.

### Convert Operations “Future Topics” into concrete pages or tracked gaps

- **Priority:** High
- **Evidence:** The Operations Contents currently links Helm Charts, Production Releases, Honeypot Engagement Replication, and Observability (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/index.md:12-15`). The same page then lists future topics: staging vs production differences, BullMQ health and queue depth, escalation templates, and Datadog dashboards/alerting (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/index.md:58-63`). The Observability overview provides quick environment variable examples but not dashboard URLs, monitor thresholds, or alert ownership (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/observability/index.md:49-75`).
- **Issue:** “Future Topics” accurately identifies missing operational docs, but it leaves high-value operational tasks as placeholders in the live docs surface.
- **Why it matters:** The baseline advises making operational uncertainty explicit, but production-facing gaps should be actionable. Operators and agents need exact dashboards, thresholds, first checks, escalation paths, and rollback/mitigation links.
- **Recommended change:** Replace the `## Future Topics` list with either concrete links to new pages or explicit “needs owner review” notes tied to target pages. Good targets are `operations/runbook.md`, `operations/alerts.md`, `operations/environments.md`, and an expanded `operations/observability/index.md` that links service-specific dashboards and monitor definitions where available.
- **Suggested target:** `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/index.md` and `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/observability/index.md`.
- **Owner review needed:** Yes. Alert thresholds, dashboards, and escalation templates should be reviewed by the teams that operate production services.

### Reconcile Honeycomb CLI command reference and BullMQ command discoverability

- **Priority:** Medium
- **Evidence:** The main CLI page describes `@honeycomb/cli` as a unified CLI (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/cli/index.md:8`) and says the section is a single page (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/cli/index.md:10-12`). Its command sections cover Lambda and EventBridge (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/cli/index.md:26-28`, `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/cli/index.md:83-103`). Its architecture diagram lists only `lambda` and `eventbridge` groups (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/cli/index.md:148-160`). BullMQ commands are documented separately under Worker CLI Tools, which says `@honeycomb/cli` provides BullMQ management commands (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/worker/cli.md:8-16`) and includes mutating `clean` options such as `--dry-run` and `--force` (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/worker/cli.md:83-118`).
- **Issue:** Readers who start from the CLI package page may miss BullMQ commands, even though the package is described as unified. The BullMQ page also documents potentially destructive cleanup operations outside the main CLI reference.
- **Why it matters:** CLI docs should make every command group, side effect, output mode, scripting behavior, and safety caveat discoverable. Mutating queue operations are operationally risky and should be easy to find from the CLI landing page.
- **Recommended change:** Add a BullMQ command group section or prominent cross-link on `packages/cli/index.md`, and update the architecture block to include `bullmq`. Consider splitting command reference into subpages if the CLI surface continues to grow. Add explicit exit-code behavior, JSON output guarantees, non-interactive/CI behavior, and production safety notes where source behavior is known.
- **Suggested target:** `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/cli/index.md`; optionally link to or move material from `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/worker/cli.md`.
- **Owner review needed:** Yes. Command behavior and safety notes should be checked against CLI source and operator expectations before publication.

### Update authoring guidance to mention current OAT analyze/apply flow

- **Priority:** Medium
- **Evidence:** Honeycomb’s docs app guidance tells agents to use `read-relevant-docs` for task-relevant docs and `docs-update` to add or edit pages (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/AGENTS.md:32-36`). Repo-level guidance repeats the `read-relevant-docs` and `docs-update` workflow (`/Users/thomas.stang/Code/vox/honeycomb/AGENTS.md:64-65`). The OAT scaffold template now tells agents to use `oat-docs-analyze` for audits and `oat-docs-apply` for approved recommendations (`.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template:25-30`).
- **Issue:** Honeycomb’s guidance may be intentionally repo-specific, but it does not mention the OAT analyze/apply flow used by the current OAT docs tooling. Future agents may choose an older path for bulk edits or audits.
- **Why it matters:** OAT convention prefers analyze/apply for sweeping documentation changes because it separates read-only assessment from approved edits. Missing the current names can cause workflow drift.
- **Recommended change:** Add a short “Auditing or bulk edits” section to `apps/honeycomb-docs/AGENTS.md` and the in-site contributing guide. State whether `read-relevant-docs` / `docs-update` are still canonical repo-specific aliases or legacy names, and map them to `oat-docs-analyze` / `oat-docs-apply` where appropriate.
- **Suggested target:** `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/AGENTS.md` and `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/contributing/documentation.md`.
- **Owner review needed:** Unknown. Needs confirmation from whoever maintains Honeycomb’s local skills.

### Decide whether `bash` shell fences are an accepted local convention

- **Priority:** Low
- **Evidence:** The imported baseline recommends `sh` for shell commands and `txt` for terminal output (`.oat/repo/reference/brainstorms/docs-authoring-skill/06-markdown-fumadocs.md:51-54`). A read-only scan of Honeycomb docs found 1,096 opening code fences, 0 opening fences without a language, and 369 opening `bash` fences. Representative examples include Honeycomb docs commands (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/observability/index.md:53-58`) and CLI examples (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/cli/index.md:34-46`).
- **Issue:** This is a baseline-style mismatch, not a broken-rendering problem. Honeycomb is consistent about specifying languages, but the baseline default is `sh`.
- **Why it matters:** Consistent code-fence languages help linting, syntax highlighting, and future automated checks. If Honeycomb intentionally prefers `bash`, local docs should say that explicitly so `oat-docs-analyze` does not produce noisy style findings.
- **Recommended change:** Either update Honeycomb authoring guidance to state that `bash` is accepted for shell examples, or gradually normalize shell command fences to `sh` where Bash-specific syntax is not required.
- **Suggested target:** `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/contributing/markdown-features.md` and future lint/analyze configuration.
- **Owner review needed:** No for documenting the local convention; unknown if bulk-normalizing fences because it could create a large noisy diff.

### Replace fragile long console URLs with query-first operational links

- **Priority:** Low
- **Evidence:** The Cyclone Events page includes a reusable CloudWatch Logs Insights query (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/eventbridge/producers/cyclone.md:27-36`) followed by a very long encoded AWS Console link (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/eventbridge/producers/cyclone.md:38`). The next paragraph already points agents to skills for richer querying (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/eventbridge/producers/cyclone.md:40`).
- **Issue:** The query itself is valuable, but the encoded console URL is hard to review, hard for agents to validate, and likely to become stale if log groups or account contexts change.
- **Why it matters:** Baseline guidance favors copyable commands, expected context, and source-of-truth links. Long encoded console URLs are brittle and obscure the operational contract.
- **Recommended change:** Keep the plain Logs Insights query, then replace the long URL with either a short stable internal dashboard/runbook link or step-by-step instructions for selecting the log group and pasting the query. If the console link is retained, add a short note that it is an internal convenience link and may require the correct AWS account/session.
- **Suggested target:** `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/eventbridge/producers/cyclone.md`.
- **Owner review needed:** No for link hygiene; yes if changing the canonical CloudWatch log group or dashboard destination.

## Baseline authoring guidance deltas

- **Information architecture:** Strong overall. The docs tree follows the `index.md`/Contents contract and groups by Apps, Packages, Lambdas, AI, EventBridge, Architecture, Tooling, and Operations (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/index.md:15-24`). The main IA delta is not structure but operational completeness: top-level Operations still lists missing future topics (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/index.md:58-63`).
- **Page types:** App and package pages are generally well placed, but some pages mix overview, reference, and operations. The CLI page is the clearest reference gap because the command surface is split between `packages/cli/index.md` and `packages/worker/cli.md`.
- **Writing style:** Most sampled pages are direct and specific. Deltas include future-topic placeholder language, generic “reach out in slack!” feedback guidance on the landing page (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/index.md:53-54`), and long encoded console URLs.
- **Application/service coverage:** Strong for BigQuery Sync and Cyclone Invalidation; thinner for Honeypot Forager incident response because no dedicated runbook/troubleshooting page is linked from its Contents.
- **CLI coverage:** The baseline CLI guidance expects command reference, flags, output, JSON output, exit codes, scripting behavior, CI behavior, side effects, dry-run behavior, and production safety. Honeycomb has useful examples and options, but the main CLI page omits BullMQ from its command-group map and does not visibly cover exit codes or scripting guarantees.
- **Operations coverage:** Production Releases and Honeypot Engagement Replication are strong targeted operational pages. Cross-cutting Operations still needs explicit dashboards, alert thresholds, environment differences, queue health checks, escalation paths, and communication templates.
- **Internal/public boundary:** The docs include internal S3 bucket names, AWS console links, Slack references, private repository links, dashboards, and operational commands. That is appropriate if Honeycomb docs are internal-only, but the site should keep an explicit internal/public stance if it can be published beyond the internal audience.
- **Review-rubric concerns:** No harmful structural issues found. The main rubric risks are operational safety gaps, hidden CLI command discoverability, and unresolved ownership/escalation details.

## OAT/Fumadocs convention deltas

- **Authored docs under source tree:** No delta found. OAT config and repo guidance identify `apps/honeycomb-docs/docs` as the source tree (`/Users/thomas.stang/Code/vox/honeycomb/.oat/config.json:21-25`, `/Users/thomas.stang/Code/vox/honeycomb/AGENTS.md:62`).
- **Every content directory has `index.md`:** No delta found in the read-only structural scan.
- **Every `index.md` has useful `## Contents`:** No missing `## Contents` found in the read-only scan. Some single-page section indexes use prose such as “This section contains a single page,” which is acceptable but could be made more actionable if those areas grow.
- **`.md`-suffixed relative links:** No extensionless local docs links found in Contents. A full authored-link scan found no real relative-link suffix issue; the only flagged item was a long external AWS console autolink.
- **Generated navigation derived from authored Contents:** Strong. The generated root index is marked autogenerated and package scripts regenerate it (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/index.md:1`, `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/package.json:8-10`).
- **No hand-editing generated artifacts:** Strong. Root and app guidance warn not to hand-edit generated `index.md` (`/Users/thomas.stang/Code/vox/honeycomb/AGENTS.md:64`, `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/AGENTS.md:44`, `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/AGENTS.md:51`).
- **No `overview.md` entrypoints:** No `overview.md` found in the docs source scan.
- **Plain `.md` preferred:** Strong. The docs source scan found 127 `.md` files and 0 `.mdx` files. Markdown Features also states that supported patterns work in plain `.md` and `.mdx` should be reserved for embedded JSX (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeycomb-docs/contributing/markdown-features.md:15-16`).
- **Clear authoring guidance:** Strong, with one naming delta: local guidance references `read-relevant-docs` and `docs-update`, while current OAT scaffold guidance references `oat-docs-analyze` and `oat-docs-apply`.
- **Useful to humans and agents:** Strong in navigation, source links, and exact paths. Improvement areas are operational thresholds, owners, dashboard links, and fewer placeholder/future-topic notes.

## Recommended follow-up work

- **Target files or area:** `docs/apps/honeypot-forager/`
  - **Recommendation:** Add a production runbook and troubleshooting guide, or a combined incident-response page, and link it from `index.md`.
  - **Evidence:** Current Contents omit runbook/troubleshooting (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/index.md:12-16`), while deployment and observability already contain incident-relevant fragments (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/deployment.md:115-130`, `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/apps/honeypot-forager/observability.md:10-29`).
  - **Suggested owner/review need:** Honeypot Forager app owner plus platform/SRE review.

- **Target files or area:** `docs/operations/index.md`, `docs/operations/observability/`
  - **Recommendation:** Replace `## Future Topics` with concrete pages, owner-reviewed notes, or links to existing canonical operational sources.
  - **Evidence:** Future-topic bullets list missing environment, queue health, escalation, dashboard, and alerting guidance (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/operations/index.md:58-63`).
  - **Suggested owner/review need:** Platform/SRE and service owners.

- **Target files or area:** `docs/packages/cli/index.md` and `docs/packages/worker/cli.md`
  - **Recommendation:** Make BullMQ commands discoverable from the main CLI page and document side effects, JSON output, exit codes, and scripting expectations where known.
  - **Evidence:** Main CLI command map lists only Lambda and EventBridge (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/cli/index.md:148-160`), while BullMQ commands live in Worker CLI Tools (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/packages/worker/cli.md:8-16`).
  - **Suggested owner/review need:** CLI/package owner review.

- **Target files or area:** `apps/honeycomb-docs/AGENTS.md`, root `AGENTS.md`, and docs contributing pages
  - **Recommendation:** Clarify whether `read-relevant-docs` / `docs-update` are still canonical, and add OAT `oat-docs-analyze` / `oat-docs-apply` guidance for audits and bulk edits.
  - **Evidence:** Honeycomb guidance names local skills (`/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/AGENTS.md:32-36`), while OAT scaffold guidance names analyze/apply (`.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template:25-30`).
  - **Suggested owner/review need:** Docs tooling owner.

- **Target files or area:** Markdown style conventions and future lint/analyze checks
  - **Recommendation:** Decide whether `bash` fences are accepted locally or whether future edits should normalize to `sh`.
  - **Evidence:** Baseline recommends `sh` for shell commands (`.oat/repo/reference/brainstorms/docs-authoring-skill/06-markdown-fumadocs.md:51-54`); Honeycomb uses `bash` in many sampled command blocks.
  - **Suggested owner/review need:** Low-risk docs convention decision.

- **Target files or area:** `docs/eventbridge/producers/cyclone.md`
  - **Recommendation:** Replace the long encoded CloudWatch URL with query-first instructions or a stable dashboard/runbook link.
  - **Evidence:** Long AWS console link at `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs/docs/eventbridge/producers/cyclone.md:38`.
  - **Suggested owner/review need:** Optional operations review if the destination changes.

## Candidate checks for `oat-docs-analyze`

- Check each `docs/apps/<app>/index.md` for production-readiness coverage: deployment, observability, testing, troubleshooting, and runbook, or an explicit “not applicable” note.
- Check top-level `operations/index.md` for `Future Topics`, `TODO`, `TBD`, or placeholder gap headings and require a suggested target page or owner-review note.
- Check main CLI/package overview pages for command groups mentioned in title/description but not represented in Contents, command sections, or related links.
- Check for mutating CLI commands such as `clean`, `delete`, `deploy`, `force`, or `production` and require safety notes, verification, and rollback/undo guidance when applicable.
- Check docs-app `AGENTS.md` and in-site contributing pages for current OAT analyze/apply guidance, while allowing repo-specific aliases when explicitly mapped.
- Check for very long external URLs, especially encoded AWS console links, and suggest query-first or dashboard-link alternatives.
- Make shell fence language policy configurable: flag `bash` only when the repo opts into baseline `sh`, otherwise accept it as a local convention.
- Keep the existing structural checks for missing `index.md`, missing `## Contents`, `overview.md`, missing Contents targets, and extensionless relative links; Honeycomb currently performs well on these.

## Open questions

- Is Honeycomb docs intended to remain internal-only? The docs include internal AWS, S3, GitHub, Slack, dashboard, and operational references; that is useful internally but would need a public-readiness review before broader publication.
- Are `read-relevant-docs` and `docs-update` still the preferred Honeycomb-specific docs skills, or should the guidance now direct audits and bulk edits to `oat-docs-analyze` / `oat-docs-apply`?
- Who should own Honeypot Forager runbook thresholds, rollback approval, queue retry policy, and dependency escalation paths?
- Should the Operations section become a cross-service runbook section, or should cross-cutting operations remain thin and push most incident content into app-specific runbooks?
- Does the team prefer keeping `bash` fences for syntax highlighting familiarity, or should new docs follow the imported baseline default of `sh`?
