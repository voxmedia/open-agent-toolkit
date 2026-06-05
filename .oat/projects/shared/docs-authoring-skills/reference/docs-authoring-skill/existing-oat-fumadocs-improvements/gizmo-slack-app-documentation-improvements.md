---
title: Gizmo Slack App documentation OAT Fumadocs improvement analysis
description: Improvement opportunities for the Gizmo Slack App documentation OAT Fumadocs docs app.
---

# Agent prompt

You are working in `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation` to improve the Gizmo Slack App docs app based on the analysis below.

## Objective

Preserve the app's strong OAT/Fumadocs structure while fixing concrete drift, broken links, and operational discoverability gaps.

## Required steps

1. Fix the broken relative links in `documentation/docs/engineering/getting-started.md` by removing the extra `engineering/` segment from targets.
2. Regenerate `documentation/index.md` with the documented generation path and compare it to authored `## Contents` order. If ordering still diverges, document whether generated output is an unordered inventory or file a tooling/config follow-up.
3. Add a compact owner, support, escalation, dashboard/logs/alerts, and source-of-truth summary to the operations entrypoint or runbook. Mark unknown values rather than guessing.
4. Add a general application rollback path separate from catalog/database rollback, with service-owner/SRE review for the actual rollback mechanism.
5. Add incident-speed summaries or a triage matrix for long operations/internal pages before splitting pages.
6. Normalize minor Markdown issues: missing fence languages, shell fence convention, and overlong descriptions if the local rule remains in force.

## Generated artifact guidance

Do not hand-edit `documentation/index.md` except through the documented generation workflow. The first task is to determine whether the generated-order mismatch is stale output, intentional unordered inventory behavior, `meta.json` interaction, or an OAT generator issue.

## Validation

Run the docs app's documented generation/build/format checks. Verify the generated manifest exists, broken links are fixed, all `## Contents` links resolve, and any operations ownership/rollback content has explicit owner-review status.

## Evidence

Use the full analysis below for file paths, line references, priorities, and owner-review notes.

# Gizmo Slack App documentation OAT Fumadocs improvement analysis

## Scope

Assigned repository/docs app analyzed: `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation`.
Baseline and OAT/Fumadocs convention references inspected:

- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvement-analysis-prompt.md`
- Required baseline pack in `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/`: `SKILL.md`, `01-principles.md`, `02-agent-workflow.md`, `03-information-architecture.md`, `04-page-types.md`, `05-writing-style.md`, `06-markdown-fumadocs.md`, `07-api-docs.md`, `08-cli-docs.md`, `09-app-service-docs.md`, `10-library-framework-docs.md`, `11-architecture-operations-docs.md`, `12-internal-vs-public.md`, `14-review-rubric.md`, and `16-docs-audit-prompts.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/apps/oat-docs/AGENTS.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/SKILL.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`
  Assigned repo/docs app files and artifacts inspected:
- Repo-level orientation and docs pointers: `/Users/thomas.stang/Code/vox/gizmo-slack-app/AGENTS.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/README.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/package.json`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/.oat/config.json`
- Docs app guidance and config: `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/AGENTS.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/package.json`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/.oat/config.json`
- Fumadocs/Next wiring: `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/lib/source.ts`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/lib/base-path.js`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/app/layout.tsx`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/app/[[...slug]]/page.tsx`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/app/api/search/route.ts`
- Generated and metadata artifacts: `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/index.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/meta.json`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/user-guide/meta.json`
- Authored index pages: `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/index.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/index.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/agent-internals/index.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/architecture/index.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/contributing/index.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/integrations/index.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/operations/index.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/testing/index.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/user-guide/index.md`
- Representative authored pages: `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/getting-started.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/contributing/documentation.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/contributing/commit-conventions.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/contributing/markdown-features.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/architecture/index.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/agent-internals/mode-orchestration.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/integrations/tracking-providers.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/operations/configuration.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/operations/deployment.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/operations/observability.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/operations/runbook.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/engineering/testing/unit-tests.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/user-guide/what-gizmo-does.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/user-guide/creating-tickets.md`, `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs/user-guide/examples.md`
- Read-only analysis checks over `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs`: inventory of all 40 Markdown files, directory/index/Contents coverage, `overview.md` usage, `## Contents` link resolution, relative Markdown link suffixes and target existence, code-fence language coverage, long-page line counts, and frontmatter description length.

## Executive summary

- The docs app is structurally close to the OAT/Fumadocs contract: every Markdown-bearing directory has an `index.md`, every index has a `## Contents` section, all `## Contents` links resolve, all checked relative Markdown links use `.md` suffixes, no `overview.md` files were found, and no authored `.mdx` pages were found in the docs source tree.
- The repo has unusually strong local authoring guidance for future agents: repo-level docs pointers, a docs-app `AGENTS.md`, and an authored docs contract page all distinguish authored docs from generated artifacts and reinforce the `## Contents` navigation contract.
- The docs cover both major audiences well: a user-facing Slack guide and an engineering section with architecture, internals, integrations, operations, testing, and contribution guidance.
- The generated `documentation/index.md` appears to diverge from the authored `## Contents` order in multiple places. Evidence suggests the generated manifest may be stale or generator order may not actually be derived from authored `## Contents`, which conflicts with the OAT convention this analysis was asked to evaluate.
- `documentation/docs/engineering/getting-started.md:162` contains three broken relative links caused by an extra `engineering/` path segment from that page's location.
- Operations docs are deep and concrete, but the inspected rendered docs do not provide a compact top-level owner/support/escalation summary, and general app rollback appears less explicit than database/catalog rollback.
- Several pages are long enough to be difficult under pressure: `engineering/operations/runbook.md` has 444 lines, `engineering/operations/configuration.md` has 369, `engineering/operations/observability.md` has 347, `engineering/agent-internals/sub-agents.md` has 332, and `engineering/agent-internals/mode-orchestration.md` has 291.
- Markdown style has small baseline drift: 10 opening code fences lack language identifiers, many shell examples use `bash` rather than the baseline-preferred `sh`, and five frontmatter descriptions exceed the local "under about 120 characters" guidance.

## Detected setup

- **Docs app path:** `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation`
- **Docs source path:** `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation/docs`
- **Detected framework/tooling:** Fumadocs on Next.js with MDX support. Evidence: `documentation/AGENTS.md:9` states "Fumadocs on Next.js + MDX"; `documentation/package.json:17-24` depends on `@open-agent-toolkit/docs-config`, `@open-agent-toolkit/docs-theme`, `@open-agent-toolkit/docs-transforms`, `fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`, `next`, and React; `documentation/app/layout.tsx:25-31` renders `DocsLayout` with `source.getPageTree()`; `documentation/app/[[...slug]]/page.tsx:20-25` wires `Mermaid`, `Tab`, `Tabs`, and image zoom components into MDX rendering.
- **Generated artifacts:** `documentation/index.md` is a generated machine-readable manifest. Evidence: `documentation/index.md:1` says it is autogenerated by `oat docs generate-index`; `documentation/AGENTS.md:61-64` says `documentation/index.md`, `.source/`, `.next/`, and `out/` are generated and should not be hand-edited; `documentation/docs/engineering/contributing/documentation.md:61-67` repeats the generated-file boundary.
- **Docs scripts:** `documentation/package.json:8-15` defines `predev` and `prebuild` as `fumadocs-mdx && oat docs generate-index --docs-dir docs --output index.md`, plus `dev`, `build`, `docs:format`, and `docs:format:check`.
- **Authoring guidance:** Repo root `AGENTS.md:109` points agents to `documentation/AGENTS.md`, identifies `documentation/docs/index.md` as the authored root, and warns that generated docs output/manifests should not be hand-edited. `documentation/AGENTS.md:28-39` captures the local authoring rules. `documentation/docs/engineering/contributing/documentation.md:12-18` publishes the navigation contract for rendered docs authors.

## Overall assessment

The Gizmo Slack App documentation app is a strong OAT/Fumadocs implementation with clear authored/generated boundaries, complete index coverage, and useful audience separation. Its main risks are not missing structure, but drift between authored navigation and generated manifest output, a small set of broken links, and operations information that is rich but not always summarized for incident-speed use. With a targeted pass on generated-index behavior, link correctness, ownership/rollback clarity, and Markdown style checks, this docs app would be a good reference implementation.

## Strong patterns

- **Pattern:** Complete `index.md` and `## Contents` coverage across the authored docs tree.
  - **Evidence:** The read-only directory check over `documentation/docs` found 40 Markdown files across 9 Markdown-bearing directories, with `index.md` and `## Contents` present in every directory. Representative source evidence: `documentation/docs/index.md:12-15`, `documentation/docs/engineering/index.md:13-20`, `documentation/docs/engineering/operations/index.md:12-17`, and `documentation/docs/user-guide/index.md:12-23`.
  - **Why it works:** This matches the OAT contract that `index.md` is the local map and that `## Contents` makes sibling pages and child sections discoverable to humans, Fumadocs, and agents.
- **Pattern:** Strong local authoring contract for agents and humans.
  - **Evidence:** `documentation/AGENTS.md:28-39` lists authored-source, generated-file, `index.md`, `## Contents`, `.md` link, `meta.json`, frontmatter, `.md`/`.mdx`, and `overview.md` rules. `documentation/docs/engineering/contributing/documentation.md:12-18` repeats the navigation contract in rendered docs.
  - **Why it works:** The same rules are available both to agents editing the repo and to engineers reading the rendered documentation, reducing drift between hidden workflow guidance and published authoring guidance.
- **Pattern:** Authored/generated boundary is explicit and repeated in the right places.
  - **Evidence:** `documentation/index.md:1` has an autogenerated warning; `documentation/AGENTS.md:61-64` identifies generated files and directories; `documentation/docs/engineering/contributing/documentation.md:61-67` tells authors that `documentation/index.md` is generated and that `documentation/docs/index.md` is the human-authored home page.
  - **Why it works:** This directly supports the OAT/Fumadocs convention that generated root indexes and derived artifacts should not be hand-edited.
- **Pattern:** Good audience split between user guide and engineering docs.
  - **Evidence:** `documentation/docs/index.md:8-15` introduces Gizmo and splits the site into User Guide and Engineering. `documentation/docs/user-guide/index.md:8-23` explicitly targets people using Gizmo from Slack. `documentation/docs/engineering/index.md:8-20` explicitly targets contributors reading or editing code.
  - **Why it works:** This follows baseline information architecture guidance: organize around reader jobs, not only implementation directories.
- **Pattern:** Operations docs include concrete production commands, secrets handling, observability boundaries, and rollback for catalog/database mode.
  - **Evidence:** `documentation/docs/engineering/operations/runbook.md:12-17` lists production context; `documentation/docs/engineering/operations/runbook.md:21-88` gives Datadog and kubectl log recipes; `documentation/docs/engineering/operations/deployment.md:70-126` documents ExternalSecrets and redacted credential shape; `documentation/docs/engineering/operations/deployment.md:150-176` documents rollback from database catalog mode; `documentation/docs/engineering/operations/observability.md:42-56` defines telemetry payload boundaries.
  - **Why it works:** These pages are grounded, operationally useful, and careful about redaction and privacy boundaries.

## Improvement opportunities

### Align generated manifest order with authored `## Contents`

- **Priority:** High
- **Evidence:** `documentation/index.md:1` says the file is generated. Authored root contents list User Guide before Engineering in `documentation/docs/index.md:12-15`, but generated output lists Engineering first at `documentation/index.md:4-39` and User Guide later at `documentation/index.md:40-50`. Authored engineering contents put Getting Started first in `documentation/docs/engineering/index.md:14`, but generated output places Getting Started after Testing at `documentation/index.md:39`. Authored user-guide contents start with What Gizmo does in `documentation/docs/user-guide/index.md:14`, but generated output starts the User Guide children with Admin commands at `documentation/index.md:42`.
- **Issue:** Evidence suggests the generated manifest is not preserving the authored `## Contents` order, or it is stale relative to the authored local maps.
- **Why it matters:** The OAT/Fumadocs convention under evaluation says generated navigation is derived from authored `## Contents`. If the generated manifest disagrees, agents using `documentation/index.md` may navigate in a different order from the human-authored information architecture.
- **Recommended change:** Regenerate `documentation/index.md` with the configured command and verify whether the mismatch persists. If it persists, treat this as an OAT docs tooling/config follow-up: either update generation to preserve `## Contents` order or document that this generated manifest is an unordered inventory rather than navigation.
- **Suggested target:** `documentation/index.md` regeneration path, `documentation/package.json:8-10`, and possibly the `oat docs generate-index` implementation outside this repo.
- **Owner review needed:** Yes. The right fix may be in shared OAT docs tooling rather than this docs app.

### Fix broken relative links in Getting Started

- **Priority:** High
- **Evidence:** `documentation/docs/engineering/getting-started.md:162` links to `engineering/operations/configuration.md`, `engineering/integrations/tracking-providers.md`, and `engineering/operations/observability.md`. From `documentation/docs/engineering/getting-started.md`, those resolve under `documentation/docs/engineering/engineering/...`; the target pages actually live at `documentation/docs/engineering/operations/configuration.md`, `documentation/docs/engineering/integrations/tracking-providers.md`, and `documentation/docs/engineering/operations/observability.md`.
- **Issue:** The page uses repo-root-like docs paths from a nested page instead of paths relative to the current page.
- **Why it matters:** Broken links undermine the local-development path and are easy for agents to follow incorrectly.
- **Recommended change:** Replace the three targets with `operations/configuration.md`, `integrations/tracking-providers.md`, and `operations/observability.md`.
- **Suggested target:** `documentation/docs/engineering/getting-started.md:162`
- **Owner review needed:** No. This is a mechanical link correction.

### Add a compact ownership, support, and escalation summary

- **Priority:** Medium
- **Evidence:** The runbook opens with production context in `documentation/docs/engineering/operations/runbook.md:12-17`, but that context lists Kubernetes context, namespace, and log shape rather than owner, support channel, and escalation path. The observability alert table includes destinations and owners for tracking configuration alerts in `documentation/docs/engineering/operations/observability.md:289-305`, and root `AGENTS.md:82-91` says repo work is tracked in Linear under Applied AI, but the rendered operations entry points do not provide a single service ownership summary.
- **Issue:** Ownership and escalation information is present only partially and contextually, not as an obvious service summary for an operator.
- **Why it matters:** Baseline service/operations docs should identify owner, support channel, escalation path, dashboards, logs, and alerts up front so humans and agents know who to involve during incidents.
- **Recommended change:** Add a small service summary section near the top of `operations/runbook.md` or `operations/index.md` with owner, support channel, escalation path, production location, dashboards, logs, alerts, and source-of-truth links. Mark unknown fields explicitly instead of guessing.
- **Suggested target:** `documentation/docs/engineering/operations/runbook.md` near `## Production context`, or `documentation/docs/engineering/operations/index.md`
- **Owner review needed:** Yes. Human maintainers should confirm owner/support/escalation values before publishing.

### Document general application rollback separately from catalog/database rollback

- **Priority:** Medium
- **Evidence:** `documentation/docs/engineering/operations/deployment.md:184-197` documents CI and deploy flow, and `documentation/docs/engineering/operations/deployment.md:150-176` documents rollback from database catalog mode to static mode. `documentation/docs/engineering/operations/runbook.md:418-444` documents Gizmo app database rollback. In the inspected rendered operations docs, I found catalog/database rollback details but not a general rollback path for a bad application image/deploy.
- **Issue:** Operators have concrete rollback guidance for database/catalog incidents, but general app deploy rollback appears absent or at least not obvious from the inspected operations entry points.
- **Why it matters:** The baseline operations guidance treats rollback as safety equipment. A production service should make the general bad-deploy rollback path easy to find, even if the exact workflow needs owner verification.
- **Recommended change:** Add a "Rollback an app deployment" section that documents the approved GitHub Actions, Helm, or image-tag rollback flow, plus verification and escalation. If the workflow is not currently known, add an explicit note saying owner verification is required.
- **Suggested target:** `documentation/docs/engineering/operations/deployment.md` near the CI/CD section, with a cross-link from `documentation/docs/engineering/operations/runbook.md`
- **Owner review needed:** Yes. Deployment rollback steps should be confirmed by the service owner or SRE.

### Improve incident-speed navigation for long operations and internals pages

- **Priority:** Medium
- **Evidence:** The read-only line-count check found long pages: `documentation/docs/engineering/operations/runbook.md` has 444 lines, `documentation/docs/engineering/operations/configuration.md` has 369, `documentation/docs/engineering/operations/observability.md` has 347, `documentation/docs/engineering/agent-internals/sub-agents.md` has 332, and `documentation/docs/engineering/agent-internals/mode-orchestration.md` has 291. The runbook already contains many incident classes and operational drills in one page, including provider credential triage, provider evidence gaps, rate-limit handling, rollback/disablement, dispatch failures, Slack token rotations, startup verification, database availability, object ownership, admin write failures, alert validation, export/recovery, restore drill, and database rollback.
- **Issue:** The pages are information-rich but may be hard to use under pressure, especially the 444-line runbook.
- **Why it matters:** Baseline operations docs should support fast triage. Long mixed runbooks benefit from a top "symptom -> first check -> mitigation" map, or from splitting recurring incidents into child pages while preserving `index.md`/`## Contents`.
- **Recommended change:** Add a short triage matrix at the top of the runbook and consider splitting large incident classes into an `operations/runbooks/` subdirectory with its own `index.md` if the page continues to grow.
- **Suggested target:** `documentation/docs/engineering/operations/runbook.md` first; possibly a future `documentation/docs/engineering/operations/runbooks/index.md`
- **Owner review needed:** Yes for splitting, no for adding a summary map from existing headings.

### Normalize code fence language identifiers and shell fence style

- **Priority:** Low
- **Evidence:** The corrected read-only fence scan found 10 opening fences without language identifiers: `documentation/docs/engineering/contributing/commit-conventions.md:29`, `documentation/docs/engineering/contributing/markdown-features.md:51`, `documentation/docs/engineering/contributing/markdown-features.md:110`, `documentation/docs/engineering/testing/unit-tests.md:25`, and `documentation/docs/user-guide/examples.md:12`, `:28`, `:44`, `:59`, `:74`, `:88`. Many shell blocks use `bash`, including `documentation/docs/engineering/getting-started.md:16-18` and `documentation/docs/engineering/operations/deployment.md:14-16`, while the baseline authoring guidance prefers `sh` for shell commands.
- **Issue:** The docs mostly use language identifiers, but a few prompt/file-tree examples are untyped. The shell fence label is also inconsistent with the imported baseline.
- **Why it matters:** Language identifiers improve rendering, linting, and agent parsing. The `sh` convention is minor, but consistency makes cross-repo docs easier to maintain.
- **Recommended change:** Add language identifiers such as `txt` for Slack prompt examples and file trees, `md` for Markdown examples, and either standardize shell fences on `sh` or explicitly document that this repo prefers `bash`.
- **Suggested target:** Files listed above, plus `documentation/docs/engineering/contributing/markdown-features.md` for the local convention.
- **Owner review needed:** No, unless the team intentionally prefers `bash`.

### Trim overlong frontmatter descriptions or revise the local limit

- **Priority:** Low
- **Evidence:** `documentation/AGENTS.md:35` says page descriptions should stay under about 120 characters. The read-only frontmatter check found five descriptions over 120 characters: `documentation/docs/engineering/agent-internals/index.md`, `documentation/docs/engineering/agent-internals/sub-agents.md`, `documentation/docs/engineering/architecture/state-layer.md`, `documentation/docs/engineering/contributing/markdown-features.md`, and `documentation/docs/index.md`.
- **Issue:** Existing descriptions slightly exceed the local authoring rule.
- **Why it matters:** The docs app states that descriptions feed search previews and sibling summaries; concise descriptions make generated navigation and search results more scannable.
- **Recommended change:** Either shorten those descriptions or relax the documented limit if the current prose is intentional.
- **Suggested target:** The five listed frontmatter blocks and `documentation/AGENTS.md:35`
- **Owner review needed:** No for small copy edits; yes if changing the rule.

## Baseline authoring guidance deltas

- **Information architecture:** Strong overall. The authored source tree follows the expected `index.md`/`## Contents` model and has a clear User Guide versus Engineering audience split. Delta: generated manifest order appears to diverge from authored local maps, which weakens agent-facing IA if `documentation/index.md` is treated as navigation.
- **Page types:** Strong coverage of tutorials/how-to/reference/explanation. The user guide covers task-oriented Slack usage, engineering covers architecture and internals, and operations covers deployment, configuration, observability, and runbook content. Delta: the runbook has grown into a large mixed operations reference; it would benefit from a symptom-first triage map or split child runbooks.
- **Writing style:** Mostly direct, concrete, and evidence-oriented. Delta: several prompt/file-tree examples lack code-fence language identifiers, and shell blocks use `bash` instead of the baseline-preferred `sh`.
- **Application/service coverage:** Strong purpose, local development, testing, configuration, dependencies, deployment, observability, and troubleshooting coverage. Delta: compact ownership/support/escalation and general app rollback are not obvious in the inspected rendered operations pages.
- **Architecture and operations:** Architecture and observability are unusually detailed. Delta: long operations pages should expose faster first-response paths and a general rollback workflow.
- **Internal/public boundary:** Strong redaction and telemetry-boundary treatment. Evidence includes redacted credential examples in `documentation/docs/engineering/operations/deployment.md:105-126` and telemetry exclusions in `documentation/docs/engineering/operations/observability.md:42-56`. Delta: user-guide examples mention real pilot-channel patterns in `documentation/docs/user-guide/examples.md:8`; if the site is ever published outside the intended internal audience, that wording should be reviewed.
- **Review-rubric concerns:** The highest-impact issues are maintainability and navigation drift rather than factual invention. Broken links and generated-manifest order drift are the main concrete risks found.

## OAT/Fumadocs convention deltas

- **Satisfied:** Authored docs live under `documentation/docs`; root guidance identifies that path in `documentation/AGENTS.md:11` and root `AGENTS.md:109`.
- **Satisfied:** Every Markdown-bearing content directory has an `index.md` and a `## Contents` section, based on the docs-tree inventory and representative index pages.
- **Satisfied:** `## Contents` links are `.md`-suffixed relative links and resolved during the read-only check.
- **Satisfied:** No `overview.md` files were found in the authored docs tree.
- **Satisfied:** Plain `.md` is the authored content default; the file inventory found no authored `.mdx` pages under `documentation/docs`.
- **Satisfied:** Generated file boundaries are documented in `documentation/index.md:1`, `documentation/AGENTS.md:61-64`, and `documentation/docs/engineering/contributing/documentation.md:61-67`.
- **Delta:** The generated `documentation/index.md` order appears not to follow the authored `## Contents` order in root, engineering, or user-guide sections. This is the main OAT/Fumadocs convention concern.
- **Delta:** `documentation/docs/engineering/getting-started.md:162` has broken relative docs links even though the `## Contents` links are clean.
- **Delta:** `meta.json` is documented as optional and additive in `documentation/AGENTS.md:34` and `documentation/docs/engineering/contributing/documentation.md:18`, but repeatable checks should ensure `meta.json`, generated manifests, and `## Contents` do not create conflicting navigation orders.

## Recommended follow-up work

1. Target files or area: `documentation/docs/engineering/getting-started.md:162`
   - Recommendation: Fix the three broken relative links to remove the extra `engineering/` segment.
   - Evidence: Read-only link audit and the target paths under `documentation/docs/engineering/operations/` and `documentation/docs/engineering/integrations/`.
   - Suggested owner/review need: No owner review needed.
2. Target files or area: `documentation/index.md`, `documentation/package.json:8-10`, and OAT `oat docs generate-index`
   - Recommendation: Regenerate and investigate why the generated manifest order differs from authored `## Contents`; fix tooling/config or document the manifest semantics.
   - Evidence: `documentation/index.md:1`, `documentation/docs/index.md:14-15`, `documentation/docs/engineering/index.md:14-20`, `documentation/docs/user-guide/index.md:14-23`, and `documentation/index.md:4-50`.
   - Suggested owner/review need: OAT docs tooling owner or repo maintainer review needed.
3. Target files or area: `documentation/docs/engineering/operations/runbook.md`, `documentation/docs/engineering/operations/deployment.md`, `documentation/docs/engineering/operations/index.md`
   - Recommendation: Add service ownership/support/escalation summary and general app rollback path.
   - Evidence: `documentation/docs/engineering/operations/runbook.md:12-17`, `documentation/docs/engineering/operations/deployment.md:184-197`, `documentation/docs/engineering/operations/deployment.md:150-176`, and `documentation/docs/engineering/operations/observability.md:289-305`.
   - Suggested owner/review need: Service owner and SRE review needed.
4. Target files or area: `documentation/docs/engineering/operations/runbook.md`
   - Recommendation: Add a top-level triage matrix and consider splitting future incident classes into child runbook pages if growth continues.
   - Evidence: Read-only line-count check found a 444-line runbook and several other long operations/internal pages.
   - Suggested owner/review need: Maintainer review for information architecture; low risk if only adding a summary map.
5. Target files or area: Markdown style across `documentation/docs`
   - Recommendation: Add missing language identifiers, decide whether to standardize shell fences on `sh` or document `bash`, and trim frontmatter descriptions that exceed the local guideline.
   - Evidence: Missing fences at the listed line numbers, `documentation/AGENTS.md:35`, and the frontmatter description-length check.
   - Suggested owner/review need: No owner review needed for mechanical cleanup; review if changing local authoring rules.

## Candidate checks for `oat-docs-analyze`

- Compare generated root index/manifests against authored `## Contents` order and nesting; flag mismatches as navigation drift or stale generated output.
- Resolve all relative Markdown links from each page's actual directory, not only links in `## Contents`; flag broken links like `engineering/getting-started.md:162`.
- Ignore illustrative placeholder links inside inline code or documented examples when checking link targets; the docs contract page intentionally shows `[Title](page.md)` and `[Section](subdir/index.md)` patterns.
- Check opening code fences for language identifiers, with suggested fixes (`txt` for prompts/output/file trees, `md` for Markdown examples, `sh` for shell commands unless the repo opts into `bash`).
- Check frontmatter descriptions against the docs app's local limit when an `AGENTS.md` or contributing page declares one.
- Flag very long operations/runbook pages and recommend a symptom-first triage map before recommending a split.
- For app/service docs, check whether operations entry points include owner, support channel, escalation path, dashboards/logs/alerts, deployment, rollback, and verification sections.
- Compare `meta.json` page order with the nearest `index.md` `## Contents` order, and distinguish intentional sidebar separators from accidental ordering drift.

## Open questions

- Is `documentation/index.md` intended to preserve authored `## Contents` order, or is it intentionally an unordered/generated inventory? The current file reads as generated navigation but does not match authored local maps.
- What is the canonical service owner, support channel, and escalation path for Gizmo? Evidence points toward Applied AI and `#gizmo-dev` in specific contexts, but the rendered docs should not publish guessed ownership.
- What is the approved rollback path for a bad application image or Helm release, separate from catalog/database rollback?
- Should the user-guide examples continue referencing `#gizmo-pilot`, or should that wording be generalized for a broader internal audience?
- Should the Gizmo docs app adopt the imported baseline's `sh` shell-fence convention, or intentionally keep `bash` and document that local preference?
