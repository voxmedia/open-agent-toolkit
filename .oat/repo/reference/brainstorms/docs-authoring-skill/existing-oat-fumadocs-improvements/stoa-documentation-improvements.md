---
title: Stoa documentation OAT Fumadocs improvement analysis
description: Improvement opportunities for the Stoa documentation OAT Fumadocs docs app.
---

# Agent prompt

You are working in `/Users/thomas.stang/Code/stoa/apps/documentation` to improve the Stoa docs app based on the analysis below.

## Objective

Preserve Stoa's strong OAT/Fumadocs structure while fixing localized drift: stale generated output, a visible placeholder page, extensionless links, Markdown polish, and observability discoverability.

## Required steps

1. Add validation or guidance so ignored/generated `apps/documentation/index.md` is regenerated or checked before agents rely on it. Do not hand-edit stale generated paths.
2. Replace the visible “Consuming Stoa from Other Repos” placeholder with an actionable current-state guide, or remove it from visible `## Contents` until the workflow is ready.
3. Fix the scanned extensionless authored relative links by adding `.md` suffixes while preserving anchors.
4. Add language identifiers to unlabeled fenced code blocks and remove or fill the empty `System Context` heading in the architecture page.
5. Add a consolidated observability/alerts map, or explicitly state that external alerting is out of scope for the current Stoa deployment.
6. Consider enabling or documenting a docs structural check that catches stale generated output, extensionless links, missing fence languages, and empty headings.

## Generated artifact guidance

Because the generated root manifest may be ignored/local, treat it as disposable derived output. The authored `docs/**/index.md` tree is the source of truth. Regenerate or validate the manifest before using it as evidence, and never repair stale generated paths by editing the manifest directly.

## Validation

Run documented docs build/type-check/format checks. Verify the generated manifest no longer points to missing paths after regeneration, all local links resolve, placeholder user-guide content is either actionable or hidden, and Markdown fence/heading issues are fixed.

## Evidence

Use the full analysis below for file paths, line references, priorities, and owner-review notes.

# Stoa documentation OAT Fumadocs improvement analysis

## Scope

Analyzed the Stoa documentation app at `/Users/thomas.stang/Code/stoa/apps/documentation`.

Baseline and OAT/Fumadocs context inspected:

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

Stoa repository and docs app artifacts inspected:

- `/Users/thomas.stang/Code/stoa/AGENTS.md`
- `/Users/thomas.stang/Code/stoa/README.md`
- `/Users/thomas.stang/Code/stoa/package.json`
- `/Users/thomas.stang/Code/stoa/.oat/config.json`
- `/Users/thomas.stang/Code/stoa/apps/documentation/package.json`
- `/Users/thomas.stang/Code/stoa/apps/documentation/.oat/config.json`
- `/Users/thomas.stang/Code/stoa/apps/documentation/AGENTS.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/CLAUDE.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/.gitignore`
- `/Users/thomas.stang/Code/stoa/apps/documentation/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/next.config.js`
- `/Users/thomas.stang/Code/stoa/apps/documentation/source.config.ts`
- `/Users/thomas.stang/Code/stoa/apps/documentation/lib/source.ts`
- `/Users/thomas.stang/Code/stoa/apps/documentation/app/layout.tsx`
- `/Users/thomas.stang/Code/stoa/apps/documentation/app/[[...slug]]/page.tsx`
- `/Users/thomas.stang/Code/stoa/apps/documentation/app/api/search/route.ts`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/agent-guide/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/agent-guide/AGENTS.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/agent-guide/skills.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/engineering/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/engineering/AGENTS.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/engineering/architecture.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/engineering/development.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/engineering/contributing/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/engineering/contributing/documentation.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/engineering/contributing/markdown-features.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/engineering/contributing/docs-review-checklist.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/operations/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/operations/AGENTS.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/operations/configuration.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/operations/diagnostics.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/operations/digests.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/operations/runbooks/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/operations/runbooks/multi-machine-setup.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/operations/runbooks/vault-sync.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/operations/voice-recordings.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/reference/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/reference/AGENTS.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/reference/api.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/reference/cli.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/reference/cli-client.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/reference/cli-tool-commands.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/reference/vault-conventions.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/AGENTS.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/configuration/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/getting-started/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/getting-started/what-is-stoa.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/getting-started/install.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/getting-started/quickstart.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/integrations/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/integrations/consuming-from-other-repos.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/integrations/remote-mcp.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/integrations/raycast.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/integrations/slack.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/integrations/voicenotes.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/troubleshooting/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/troubleshooting/common-issues.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/troubleshooting/diagnostics.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/using-stoa/index.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/using-stoa/search.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/using-stoa/memory.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/using-stoa/capture.md`
- `/Users/thomas.stang/Code/stoa/apps/documentation/docs/user-guide/using-stoa/skills.md`

Read-only structural checks also inspected all 59 Markdown files under `/Users/thomas.stang/Code/stoa/apps/documentation/docs` for `index.md` coverage, `## Contents` presence, `overview.md`, `.mdx` usage, frontmatter, relative-link suffixes, missing Markdown targets, unlabeled fenced code blocks, and empty headings.

## Executive summary

- The Stoa documentation app is a mature OAT Fumadocs surface with a clear docs root, authored Markdown under `docs/`, OAT docs packages, static search, and generated root index tooling.
- The authored `docs/` tree strongly follows the OAT structural contract: all 59 Markdown files are plain `.md`, no `.mdx` files were found, no `overview.md` files were found, every content directory has an `index.md`, and every authored `index.md` includes a `## Contents` section.
- Authoring guidance is a standout strength: the app-level `AGENTS.md`, per-area `AGENTS.md` files, and contributor docs define audiences, routing rules, generated-file rules, validation commands, and cross-area update triggers.
- The user onboarding path is practical and evidence-rich: `what-is-stoa.md`, `install.md`, and `quickstart.md` explain purpose, current packaging constraints, prerequisites, commands, verification, and next steps.
- The reference and operations material is substantial, especially API, CLI, configuration, diagnostics, voice recordings, and multi-machine runbooks.
- The generated root `apps/documentation/index.md` is stale in the local filesystem and points to missing old paths, even though it is ignored and regenerated by `predev` / `prebuild`; this can still mislead agents that read it directly.
- A small set of authored relative links omit `.md`, diverging from the app's own OAT link guidance and weakening agent-friendly navigation.
- One visible user-guide integration page is an explicit placeholder, which is less useful than either a minimal current workflow or removal from visible Contents until the feature ships.
- Markdown polish gaps are repeatable: a scan found 45 fenced code blocks without language identifiers and one empty same-level heading in the architecture page.
- Operations coverage is strong but could better expose a single observability/alerting map or explicitly state that external alerting is out of scope for the current single-operator Stoa deployment.

## Detected setup

- **Docs app path:** `/Users/thomas.stang/Code/stoa/apps/documentation`
- **Docs source path:** `/Users/thomas.stang/Code/stoa/apps/documentation/docs`
- **Detected framework/tooling:** Next.js app using Fumadocs, `fumadocs-mdx`, and OAT docs packages. `source.config.ts:1` imports `@open-agent-toolkit/docs-config`, `source.config.ts:6-7` points `defineDocs` at the configured content directory, and `app/layout.tsx:1` plus `app/layout.tsx:12-18` wire `@open-agent-toolkit/docs-theme`, static search, and `source.pageTree`.
- **Generated artifacts:** `apps/documentation/index.md` is the generated repo-level manifest. The app guidance says it is generated by `oat docs generate-index` and should not be hand-edited (`apps/documentation/AGENTS.md:38-40`), package scripts regenerate it before dev/build (`apps/documentation/package.json:8`, `apps/documentation/package.json:10`), and `.gitignore` ignores it (`apps/documentation/.gitignore:14-15`). `.source/`, `.next/`, and `out/` are also generated/build output directories observed in the app root.
- **Docs scripts:** relevant scripts include `predev`, `dev`, `prebuild`, `build`, `type-check`, `docs:format`, and `docs:format:check` in `apps/documentation/package.json:8-16`. Repo-level docs scripts include `build:docs` and `dev:docs` in `/Users/thomas.stang/Code/stoa/package.json:9` and `/Users/thomas.stang/Code/stoa/package.json:15`.
- **Authoring guidance:** App-level docs guidance lives in `apps/documentation/AGENTS.md`; contributor docs live in `apps/documentation/docs/engineering/contributing/`; each top-level docs area has its own `AGENTS.md`; root pointers exist in `/Users/thomas.stang/Code/stoa/AGENTS.md:236-239` and `/Users/thomas.stang/Code/stoa/README.md:159-165`.

## Overall assessment

Stoa documentation is one of the stronger examples in this review set: its information architecture, authoring instructions, and cross-area guidance already embody the OAT/Fumadocs contract. The main risks are not broad structural problems, but localized drift and maintenance gaps: stale generated output in the working tree, a visible placeholder page, several extensionless relative links, and Markdown style issues that could be caught automatically. The docs are useful to both humans and agents today, with follow-up work focused on making that usefulness more mechanically reliable.

## Strong patterns

- **Pattern:** Clear OAT/Fumadocs implementation with thin app shell and authored Markdown source.
  - **Evidence:** `apps/documentation/AGENTS.md:20-24` says the app uses Next.js, Fumadocs, OAT docs packages, and Markdown under `docs/`; `source.config.ts:1` imports OAT docs config; `source.config.ts:11-12` applies configured remark plugins; `app/layout.tsx:12-18` wires static search and `source.pageTree`.
  - **Why it works:** This keeps framework plumbing separate from authored documentation and matches the OAT convention that source content lives under the docs source tree.

- **Pattern:** Strong authored index contract and local maps.
  - **Evidence:** `apps/documentation/docs/index.md:10-16` maps the five top-level sections; app guidance requires every directory to have an `index.md` and `## Contents` (`apps/documentation/AGENTS.md:46-49`); the contributor guide repeats the same contract (`apps/documentation/docs/engineering/contributing/documentation.md:10-16`). A read-only structural scan found no missing `index.md` files and no authored `index.md` files missing `## Contents`.
  - **Why it works:** Local maps make the docs navigable for humans and machine-readable for agents, and they support generated navigation derived from authored content.

- **Pattern:** Rich authoring guidance for future agents.
  - **Evidence:** `apps/documentation/AGENTS.md:78-88` provides a top-level area router; `apps/documentation/AGENTS.md:90-94` requires checking user-guide impact for user-facing behavior; per-area guidance defines audience and scope, such as `docs/user-guide/AGENTS.md:11-25`, `docs/operations/AGENTS.md:11-25`, `docs/reference/AGENTS.md:11-24`, `docs/agent-guide/AGENTS.md:11-25`, and `docs/engineering/AGENTS.md:11-24`.
  - **Why it works:** The baseline emphasizes reader personas, source-of-truth links, and agent-readable constraints. This guidance tells future agents where content belongs and when related areas must be updated.

- **Pattern:** Practical user onboarding path.
  - **Evidence:** `docs/user-guide/getting-started/what-is-stoa.md:8-12` explains what Stoa is, where data lives, and how the pieces fit; `docs/user-guide/getting-started/install.md:8-14` states that install is currently clone-and-build and macOS-specific for launchd; `docs/user-guide/getting-started/quickstart.md:8-12` states assumptions, goal, and command form; `docs/user-guide/getting-started/quickstart.md:28` and `docs/user-guide/getting-started/quickstart.md:68` provide expected verification outcomes.
  - **Why it works:** The pages support task completion, identify prerequisites, mark current limitations honestly, and give users success checks.

- **Pattern:** Substantial reference and operations coverage.
  - **Evidence:** `docs/operations/configuration.md:8-16` explains config sources and a copyable setup path; `docs/operations/configuration.md:176-180` begins a structured config reference table; `docs/reference/api.md:8-23` introduces HTTP/MCP surfaces and the `/health` response; `docs/reference/cli-tool-commands.md:10-11` distinguishes operator commands from tool commands; `docs/operations/voice-recordings.md:435-447` includes rollout and rollback steps.
  - **Why it works:** Reference pages provide exact facts, and operations pages include concrete commands, diagnostics, rollout, and rollback where the behavior is production-impacting.

- **Pattern:** Root-level pointers make the docs easy to discover.
  - **Evidence:** `/Users/thomas.stang/Code/stoa/AGENTS.md:236-239` points agents to `apps/documentation/docs/`; `/Users/thomas.stang/Code/stoa/README.md:159-165` lists the full documentation path plus key pages.
  - **Why it works:** The baseline calls for exact paths and source-of-truth links. These pointers help both humans and agents find the canonical docs surface quickly.

## Improvement opportunities

### Regenerate or validate the ignored root manifest when present

- **Priority:** Medium
- **Evidence:** `apps/documentation/index.md:1` marks the file autogenerated; `apps/documentation/AGENTS.md:38-40` says it is generated and clobbered on build; `apps/documentation/package.json:8` and `apps/documentation/package.json:10` regenerate it during `predev` and `prebuild`; `.gitignore` ignores it at `apps/documentation/.gitignore:14-15`. The local generated file still lists missing old paths such as `user-guide/setup.md`, `user-guide/vault-conventions.md`, `mobile-capture.md`, `remote-mcp-access.md`, `slack-setup.md`, and `stoa-remind-me.md` at `apps/documentation/index.md:34-39`; a read-only link check confirmed those targets are absent under `docs/`.
- **Issue:** The generated root manifest is ignored and likely local/stale, but it still sits in the working tree and can mislead agents that read `apps/documentation/index.md` directly rather than running the generator first.
- **Why it matters:** OAT/Fumadocs guidance says generated root indexes should not be hand-edited and should derive from authored `## Contents`. A stale generated artifact undermines the same agent navigation story that the authored tree otherwise handles well.
- **Recommended change:** Add an explicit lightweight validation step to docs lint/type-check or contributor guidance: if `apps/documentation/index.md` exists, verify generated links resolve or regenerate it before analysis/build handoff. Keep the fix generator-driven; do not hand-edit the generated file.
- **Suggested target:** `apps/documentation/package.json` `docs:lint` or a docs validation script; optionally mention the validation in `apps/documentation/docs/engineering/contributing/documentation.md`.
- **Owner review needed:** No for the validation behavior; yes only if the team wants ignored generated output to remain allowed to be stale between builds.

### Replace the visible cross-repo integration placeholder with an actionable first pass or remove it from visible Contents

- **Priority:** Medium
- **Evidence:** `docs/user-guide/integrations/index.md:15` labels "Consuming Stoa from Other Repos" as a placeholder; the page itself says "This page will cover..." at `docs/user-guide/integrations/consuming-from-other-repos.md:8` and "Full content is coming once the session hot cache (`bl-e1d6`) ships" at `docs/user-guide/integrations/consuming-from-other-repos.md:10`.
- **Issue:** A visible user-guide page advertises a workflow but does not yet let the reader complete it. It also references backlog IDs without summarizing enough current user value.
- **Why it matters:** The baseline discourages stale roadmap language and prioritizes task completion over planned coverage. A visible placeholder is especially costly for agents because it looks like a valid target but contains no executable workflow.
- **Recommended change:** Either write a minimal current-state page that explains what can be done today and what remains blocked, or remove the page from `docs/user-guide/integrations/index.md` until the hot-cache-backed workflow ships. If retained, include a safe snippet, prerequisites, verification, and explicit unsupported limitations.
- **Suggested target:** `docs/user-guide/integrations/consuming-from-other-repos.md` and `docs/user-guide/integrations/index.md`.
- **Owner review needed:** Yes. The page depends on the current status and intended scope of `bl-e1d6` / `bl-2cc5`, which should be confirmed by the Stoa owner.

### Fix extensionless relative links in authored docs

- **Priority:** Medium
- **Evidence:** App guidance requires `.md`-suffixed relative links in `## Contents` and explains why (`apps/documentation/AGENTS.md:50-53`); contributor docs repeat the convention (`docs/engineering/contributing/documentation.md:15`). A read-only link scan found extensionless authored links at `docs/operations/runbooks/multi-machine-setup.md:340`, `docs/operations/voice-recordings.md:455`, and `docs/reference/cli-tool-commands.md:11`, `docs/reference/cli-tool-commands.md:910`, `docs/reference/cli-tool-commands.md:911`, and `docs/reference/cli-tool-commands.md:912`.
- **Issue:** The scanned links point to local Markdown pages but omit `.md`, requiring target inference.
- **Why it matters:** OAT/Fumadocs convention prefers `.md`-suffixed relative links so agents and simple tooling can follow links without guessing. The build pipeline can strip extensions for rendered routes, so the authored `.md` form remains both render-safe and agent-friendly.
- **Recommended change:** Change the six links to include `.md`, preserving any anchors. Examples include `../voice-recordings.md`, `diagnostics.md`, `cli-client.md`, `api.md`, and `vault-conventions.md`.
- **Suggested target:** The six cited link sites.
- **Owner review needed:** No. This is a mechanical convention fix.

### Normalize fenced code block languages and remove one empty architecture heading

- **Priority:** Low
- **Evidence:** A read-only Markdown scan found 45 fenced code blocks without language identifiers. Representative examples include `docs/engineering/architecture.md:12`, `docs/operations/voice-recordings.md:18`, `docs/reference/cli-tool-commands.md:34`, `docs/user-guide/getting-started/quickstart.md:76`, and `docs/user-guide/troubleshooting/common-issues.md:137`. A heading scan found `docs/engineering/architecture.md:27` (`## System Context`) immediately followed by another `##` heading at `docs/engineering/architecture.md:29`, leaving the section empty.
- **Issue:** Unlabeled fences diverge from the baseline Markdown/Fumadocs rule that code blocks should specify a language. The empty `System Context` section creates a navigation heading without content.
- **Why it matters:** Language identifiers improve rendered highlighting, copy behavior, and agent interpretation. Empty headings weaken skim structure and generated table-of-contents usefulness.
- **Recommended change:** Add appropriate fence languages (`sh`, `txt`, `json`, `jsonc`, `md`, `mermaid`, or `text` for slash-command examples) and either add a short system-context summary under `## System Context` or remove/reparent the heading.
- **Suggested target:** Start with the representative files above, then apply the same rule across `docs/**/*.md`.
- **Owner review needed:** No for language identifiers; maybe yes if rewriting the architecture `System Context` summary to ensure the system boundary description is accurate.

### Add an explicit observability and alerting map or mark external alerting out of scope

- **Priority:** Low
- **Evidence:** Operations Contents lists configuration, digests, diagnostics, security, vault context, voice recordings, local docs bundle, and runbooks at `docs/operations/index.md:10-18`. Diagnostics and health detail exist: `docs/reference/api.md:69-71` points from API reference to diagnostics, `docs/operations/diagnostics.md:1-2` describes health diagnostics and `stoa doctor`, and `docs/operations/voice-recordings.md:435-447` includes rollout/rollback steps for a subsystem.
- **Issue:** Operational material exists, but there is no single page or Contents entry that answers "How do I observe Stoa, what alerts exist, and what should I check first?" across logs, diagnostics, launchd status, scheduler health, and subsystem signals. External alerting may simply be out of scope for a personal/self-hosted system, but that boundary is not stated in the top-level operations map.
- **Why it matters:** The baseline treats operations docs as safety equipment. Even for a single-user system, operators and agents benefit from a stable "health and observability" entry point that distinguishes built-in diagnostics from absent external dashboards or alerting.
- **Recommended change:** Add `operations/observability.md` or expand `operations/diagnostics.md` plus `operations/index.md` to explicitly map health checks, logs, diagnostics, scheduler/admin surfaces, and any alerting/non-alerting boundary. If no external alerts exist, state that directly and link to `stoa doctor` and relevant runbooks.
- **Suggested target:** `docs/operations/index.md`, `docs/operations/diagnostics.md`, and optionally a new `docs/operations/observability.md`.
- **Owner review needed:** Yes, to confirm whether external dashboards/alerts are intentionally absent or documented elsewhere outside the repo.

### Turn disabled docs lint into contract checks

- **Priority:** Medium
- **Evidence:** `apps/documentation/package.json:14` currently defines `docs:lint` as `echo 'docs lint disabled'`; separate read-only scans found convention issues that are easy to automate: stale generated manifest links, extensionless Markdown links, unlabeled code fences, and an empty same-level heading.
- **Issue:** The docs app documents a strong contract but does not have a first-class lint command enforcing the most important mechanical parts of that contract.
- **Why it matters:** The baseline favors maintainable, source-backed docs and OAT uses analyze/apply flows to prevent silent drift. Automated checks would catch low-friction regressions before agents or reviewers need to rediscover them manually.
- **Recommended change:** Replace the disabled lint script with a docs contract checker, or add a new script and wire it into `docs:lint`. At minimum, check index coverage, `## Contents` coverage, generated-index link resolution, `.md`-suffixed authored relative links, frontmatter, and fenced-code languages.
- **Suggested target:** `apps/documentation/package.json`, a new validation script if the repo convention allows one, and `docs/engineering/contributing/documentation.md` for usage guidance.
- **Owner review needed:** No for adding non-mutating checks; yes if deciding whether the checks should be blocking in CI.

## Baseline authoring guidance deltas

- **Information architecture:** The IA is strong and consistent with the baseline. The main IA delta is not missing sections but discoverability refinement: a visible placeholder page under `user-guide/integrations/` and no explicit top-level observability/alerting map under `operations/`.
- **Page types:** Most sampled pages have clear page jobs: install and quickstart are tutorials/how-tos; API, CLI, and configuration are references; architecture is explanation; runbooks are operational how-tos. The placeholder `docs/user-guide/integrations/consuming-from-other-repos.md` is the clearest page-type failure because it is visible but not yet task-completable.
- **Writing style:** The docs mostly use direct, concrete prose with commands and exact paths. The notable delta is future-oriented placeholder language in `docs/user-guide/integrations/consuming-from-other-repos.md:8-10`.
- **Markdown/Fumadocs style:** The authored tree uses plain `.md` throughout and has frontmatter on all scanned pages. Deltas are unlabeled fenced code blocks, one empty heading, and extensionless relative links outside some `## Contents` sections.
- **CLI/API docs:** API and CLI coverage is substantial. The CLI tool-command reference includes output format and exit codes near the top, which aligns with the CLI baseline. No broad missing CLI/API surface was established from this scoped docs-only review.
- **Application/service operations docs:** Stoa has configuration, diagnostics, security, runbooks, voice-recording operations, and multi-machine setup. The main baseline gap is a single consolidated observability/alerts entry point or an explicit "no external alerts" boundary.
- **Architecture docs:** The architecture page has strong package and runtime explanations, but `## System Context` is currently empty before the remote-connector section begins. A short system-context paragraph or diagram would better satisfy the architecture baseline.
- **Internal vs public boundary:** The docs appear to target a personal/self-hosted project and use safe example placeholders such as `/Users/you` and `<secret>` rather than real secrets. No concrete sensitive-data leak was found in the scoped sample.
- **Review-rubric concerns:** Purpose, structure, and agent usefulness are generally strong. Maintainability would improve if the disabled docs lint script enforced the documented contract mechanically.

## OAT/Fumadocs convention deltas

- **Index coverage:** No delta found in authored source. A read-only structural scan found every Markdown-containing directory under `docs/` has an `index.md`, and every authored `index.md` includes `## Contents`.
- **Useful Contents sections:** Mostly strong. Top-level and section-level indexes map sibling pages and immediate child directories, such as `docs/index.md:10-16`, `docs/user-guide/index.md:8-14`, `docs/operations/index.md:10-18`, and `docs/reference/index.md:8-13`. The exception is that `docs/user-guide/integrations/index.md:15` includes a placeholder page that is not yet useful.
- **`.md`-suffixed relative links:** Partial delta. Contents links inspected use `.md`, but six non-Contents authored links omit `.md` at the cited locations in operations and reference pages.
- **Generated navigation/root index:** Partial delta. The generated root manifest is correctly marked generated and ignored, but the local file is stale and links to missing paths at `apps/documentation/index.md:34-39`.
- **No hand-editing generated navigation artifacts:** No evidence of hand-editing was found. The issue is stale generated output in the working tree, not authored edits.
- **`overview.md` not used:** No `overview.md` files were found under the docs source tree.
- **Plain `.md` preferred:** Fully aligned in the inspected tree; no `.mdx` files were found under `docs/`.
- **Clear authoring guidance:** Strongly aligned. App-level, per-area, and contributor guidance all exist and cross-reference the same contract.
- **Useful to humans and agents:** Strongly aligned overall due to exact paths, commands, scripts, audience routing, and generated/artifact warnings. The stale generated manifest and extensionless links are the main agent-readability deltas.

## Recommended follow-up work

1. **Target files or area:** `apps/documentation/index.md`, `apps/documentation/package.json`, and docs validation tooling.
   - **Recommendation:** Add or run a generated-index freshness check so an existing ignored `apps/documentation/index.md` does not point to missing docs paths.
   - **Evidence:** Generated file is stale at `apps/documentation/index.md:34-39`; generation is defined at `apps/documentation/package.json:8` and `apps/documentation/package.json:10`; generated file is ignored at `.gitignore:14-15`.
   - **Suggested owner/review need:** Docs tooling owner; no content owner review needed.

2. **Target files or area:** `docs/user-guide/integrations/consuming-from-other-repos.md` and `docs/user-guide/integrations/index.md`.
   - **Recommendation:** Replace the placeholder with a useful current-state guide or remove it from visible Contents until it can support a task.
   - **Evidence:** Placeholder is advertised at `docs/user-guide/integrations/index.md:15`; the page says "will cover" and "Full content is coming" at `docs/user-guide/integrations/consuming-from-other-repos.md:8-10`.
   - **Suggested owner/review need:** Stoa owner review needed to confirm hot-cache status and intended workflow.

3. **Target files or area:** Authored relative links in operations/reference.
   - **Recommendation:** Add `.md` suffixes to extensionless local Markdown links.
   - **Evidence:** Extensionless links found at `docs/operations/runbooks/multi-machine-setup.md:340`, `docs/operations/voice-recordings.md:455`, and `docs/reference/cli-tool-commands.md:11`, `docs/reference/cli-tool-commands.md:910-912`.
   - **Suggested owner/review need:** No owner review; mechanical fix.

4. **Target files or area:** `docs/**/*.md`.
   - **Recommendation:** Add language identifiers to unlabeled fenced code blocks and fix the empty `## System Context` section.
   - **Evidence:** 45 unlabeled fences from read-only scan, with examples at `docs/engineering/architecture.md:12`, `docs/operations/voice-recordings.md:18`, `docs/reference/cli-tool-commands.md:34`, `docs/user-guide/getting-started/quickstart.md:76`; empty heading at `docs/engineering/architecture.md:27`.
   - **Suggested owner/review need:** Mechanical for fences; architecture owner review if adding substantive system-context prose.

5. **Target files or area:** `docs/operations/` and `docs/operations/index.md`.
   - **Recommendation:** Add an observability/alerts map or explicitly document that external alerts are out of scope.
   - **Evidence:** Operations Contents lacks an observability/alerts entry at `docs/operations/index.md:10-18`, while health/diagnostics details already exist in `docs/operations/diagnostics.md` and are linked from `docs/reference/api.md:69-71`.
   - **Suggested owner/review need:** Stoa owner/operator review needed to confirm actual alerting expectations.

6. **Target files or area:** `apps/documentation/package.json` and possible docs validation script.
   - **Recommendation:** Replace `docs:lint` disabled placeholder with non-mutating contract checks.
   - **Evidence:** `apps/documentation/package.json:14` currently says `docs lint disabled`; this analysis found multiple automatable convention gaps.
   - **Suggested owner/review need:** Docs tooling owner; CI blocking decision may need owner approval.

## Candidate checks for `oat-docs-analyze`

- Check generated root index artifacts, when present, for links that point to missing docs-source files; report as generated-artifact drift and recommend regeneration rather than hand editing.
- Extend relative-link checking beyond `## Contents` sections so any authored local Markdown link without `.md` or `subdir/index.md` is flagged.
- Flag visible `## Contents` entries whose target page contains obvious placeholder language such as "placeholder", "will cover", or "coming soon".
- Check fenced code blocks for missing language identifiers and suggest `sh`, `txt`, `json`, `jsonc`, `md`, `mermaid`, or `text` based on nearby content.
- Check for empty headings where one heading is followed by another heading at the same or higher level without intervening content.
- Flag docs apps whose `docs:lint` or equivalent script is disabled when the app otherwise documents a strict docs contract.
- Add an optional service-doc coverage heuristic that notes when a production/self-hosted service has diagnostics docs but no consolidated observability/alerts entry point or explicit "no external alerts" boundary.

## Open questions

- Should `docs/user-guide/integrations/consuming-from-other-repos.md` remain visible before the session hot cache work ships, or should it be hidden from Contents until it can document an actionable current workflow?
- Is the absence of external dashboards/alerts intentional for Stoa's current personal self-hosted deployment model, or are alerting/observability details documented outside the repo?
- Should the ignored generated root `apps/documentation/index.md` be expected to remain current in developer worktrees, or is staleness acceptable as long as `predev` / `prebuild` regenerate it?
- Should docs lint become a blocking CI check, or should `oat-docs-analyze` remain the primary enforcement surface for docs contract drift?
- Should slash-command examples use `text`, `txt`, or another preferred language identifier across Stoa docs?
