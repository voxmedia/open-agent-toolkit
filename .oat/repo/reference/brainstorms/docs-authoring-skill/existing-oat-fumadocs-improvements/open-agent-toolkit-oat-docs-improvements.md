---
title: Open Agent Toolkit / OAT docs OAT Fumadocs improvement analysis
description: Improvement opportunities for the Open Agent Toolkit / OAT docs OAT Fumadocs docs app.
---

# Agent prompt

You are working in `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs` to improve the OAT Fumadocs docs app based on the analysis below.

## Objective

Bring the OAT docs app back into alignment with its own OAT/Fumadocs contract and clarify generated-index guidance so future agents do not confuse Fumadocs generation with MkDocs nav-sync behavior.

## Required steps

1. Restore useful `## Contents` sections on every directory `index.md` that currently lacks the reserved local map.
2. Resolve the legacy `guide/` reachability mismatch: decide whether it remains a visible compatibility router or should be retired, then make authored `docs/index.md` and generated output agree.
3. Retire or redirect remaining `overview.md` pages by moving useful overview content into the corresponding directory `index.md` pages.
4. Clarify Fumadocs generation guidance versus MkDocs `oat docs nav sync` guidance in docs-index/commands/contributor docs.
5. Expand the CLI reference plan: keep the existing map, but add a follow-up path toward fuller command coverage for flags, outputs, exit behavior, non-interactive usage, and scripting safety.
6. Fix minor Markdown hygiene issues, including unlabeled code fences and any shell fence convention the repo decides to standardize.

## Generated artifact guidance

Do not hand-edit generated root manifests as the fix. Use authored docs source as the source of truth, then run the documented docs generation/build command so `apps/oat-docs/index.md` is regenerated. If generated output still diverges from authored `## Contents`, record that as an OAT tooling issue with exact evidence.

## Validation

Run the repo's documented docs checks/build commands after edits. At minimum verify all affected links resolve, every Markdown-bearing directory has `index.md`, every index has useful `## Contents`, no `overview.md` pages remain unless intentionally retained with owner approval, and generated output is fresh.

## Evidence

Use the full analysis below for file paths, line references, priorities, and owner-review notes.

# Open Agent Toolkit / OAT docs OAT Fumadocs improvement analysis

## Scope

Assigned repository/docs app analyzed: `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs`.

Shared baseline and OAT/Fumadocs context read before app analysis:

- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvement-analysis-prompt.md`
- Required baseline files in `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/`: `SKILL.md`, `01-principles.md`, `02-agent-workflow.md`, `03-information-architecture.md`, `04-page-types.md`, `05-writing-style.md`, `06-markdown-fumadocs.md`, `07-api-docs.md`, `08-cli-docs.md`, `09-app-service-docs.md`, `10-library-framework-docs.md`, `11-architecture-operations-docs.md`, `12-internal-vs-public.md`, `14-review-rubric.md`, and `16-docs-audit-prompts.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/apps/oat-docs/AGENTS.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/SKILL.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`

Assigned app files and artifacts inspected:

- `/Users/thomas.stang/Code/vox/open-agent-toolkit/AGENTS.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/package.json`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/AGENTS.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/package.json`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/source.config.ts`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/lib/source.ts`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/next.config.js`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/quickstart.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/cli-utilities/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/cli-utilities/overview.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/docs-tooling/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/docs-tooling/overview.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/docs-tooling/commands.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/guide/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/provider-sync/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/provider-sync/overview.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/workflows/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/workflows/overview.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/workflows/ideas/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/workflows/projects/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/workflows/skills/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/contributing/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/contributing/documentation.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/contributing/markdown-features.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/reference/index.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/reference/docs-index-contract.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/reference/cli-reference.md`
- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs/reference/troubleshooting.md`
- Read-only structural inventory artifact produced from the assigned docs source tree: 54 Markdown files, 11 content directories, 4 `overview.md` files, no relative Markdown links without `.md` or `.mdx` suffixes, and one opening code fence without a language identifier.

## Executive summary

- The docs app is a mature Fumadocs/Next.js surface with clear root and app-level agent guidance, generated-index boundaries, and good contributor workflow documentation.
- The documented OAT/Fumadocs contract is stronger than the current docs tree conformance: all content directories have `index.md`, but several directory indexes do not include a reserved `## Contents` section.
- The top-level authored map in `docs/index.md` omits `guide/index.md`, while the generated root index still exposes the Guide section; this creates a reachability and legacy-router ambiguity.
- Four `overview.md` pages remain even though the app-level authoring guidance explicitly deprecates `overview.md` in favor of `index.md` with `## Contents`.
- Fumadocs-specific generation guidance is partly blurred with MkDocs nav-sync guidance. The active app scripts run `fumadocs-mdx` and `oat docs generate-index`, while some reference text frames `oat docs nav sync` as the only machine-readable consumer of `## Contents`.
- The docs are strong for OAT concepts, contributor flow, and command-family routing, but the CLI reference remains intentionally shallow and does not yet satisfy the full baseline CLI reference bar for exact flags, output, exit codes, and scripting behavior across the whole CLI.
- Markdown hygiene is mostly good, but one unlabeled code fence and widespread `bash` shell fences diverge from the baseline preference for language identifiers and `sh` for shell commands.
- The app is useful to both humans and agents today, but structural cleanup would make the generated surface more predictable and reduce future agent navigation errors.

## Detected setup

- **Docs app path:** `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs`
- **Docs source path:** `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs/docs`
- **Detected framework/tooling:** Fumadocs/Next.js docs app. `source.config.ts` imports `createSourceConfig`, points Fumadocs at `sourceConfig.contentDir`, and uses `sourceConfig.remarkPlugins` (`apps/oat-docs/source.config.ts:1`, `apps/oat-docs/source.config.ts:7`, `apps/oat-docs/source.config.ts:12`). `next.config.js` configures the site title as `Open Agent Toolkit` and base path `/open-agent-toolkit` (`apps/oat-docs/next.config.js:4`, `apps/oat-docs/next.config.js:7`).
- **Generated artifacts:** Root app `index.md` is generated and explicitly marked do-not-edit (`apps/oat-docs/index.md:1`). Root repo guidance repeats that `apps/oat-docs/index.md` is regenerated by `oat docs generate-index` and should not be hand-edited (`AGENTS.md:161`).
- **Docs scripts:** Root scripts include `build:docs`, `dev:docs`, and `docs:check-links` (`package.json:11`, `package.json:17`, `package.json:18`). App scripts run `fumadocs-mdx` and `oat docs generate-index` on `predev` and `prebuild`, plus Markdown lint/format scripts (`apps/oat-docs/package.json:6`, `apps/oat-docs/package.json:8`, `apps/oat-docs/package.json:11`, `apps/oat-docs/package.json:12`).
- **Authoring guidance:** Root `AGENTS.md` has a `## Documentation` section for the docs app (`AGENTS.md:155`) and points to app-level authoring conventions (`AGENTS.md:162`). App-level `AGENTS.md` explains the docs app purpose, Markdown preference, `.md`-suffixed link contract, generated-file boundary, and `overview.md` deprecation (`apps/oat-docs/AGENTS.md:5`, `apps/oat-docs/AGENTS.md:11`, `apps/oat-docs/AGENTS.md:13`, `apps/oat-docs/AGENTS.md:47`, `apps/oat-docs/AGENTS.md:52`). Contributor docs document local commands and the index contract (`apps/oat-docs/docs/contributing/documentation.md:12`, `apps/oat-docs/docs/contributing/documentation.md:13`, `apps/oat-docs/docs/contributing/documentation.md:21`, `apps/oat-docs/docs/contributing/documentation.md:27`, `apps/oat-docs/docs/contributing/documentation.md:33`, `apps/oat-docs/docs/contributing/documentation.md:41`).

## Overall assessment

Open Agent Toolkit / OAT docs is a strong, agent-aware Fumadocs documentation surface with explicit conventions and useful adoption-lane organization. The main risk is not missing guidance, but drift between the documented structural contract and the current authored tree: several section landing pages are useful to humans but not encoded as reserved `## Contents` maps. Resolving the index/overview/navigation inconsistencies should be prioritized before broader content expansion, because those issues directly affect both generated artifacts and agent discoverability.

## Strong patterns

- **Pattern:** Clear app-level agent guidance for ongoing docs work.
  - **Evidence:** `apps/oat-docs/AGENTS.md` states that humans read the rendered site while agents read Markdown source and navigation structure (`apps/oat-docs/AGENTS.md:5`). It also tells agents to prefer `.md`, add frontmatter, update the nearest `index.md` `## Contents`, and use `.md`-suffixed links (`apps/oat-docs/AGENTS.md:11`, `apps/oat-docs/AGENTS.md:13`).
  - **Why it works:** This directly supports the baseline principle that documentation should be explicit enough for agents and gives maintainers a local source of truth for authoring behavior.

- **Pattern:** Generated root index is clearly marked and regenerated by app scripts.
  - **Evidence:** `apps/oat-docs/index.md` starts with an autogenerated do-not-edit warning (`apps/oat-docs/index.md:1`). The app `predev` and `prebuild` scripts regenerate it (`apps/oat-docs/package.json:6`, `apps/oat-docs/package.json:8`).
  - **Why it works:** This preserves the OAT convention that generated artifacts should not be hand-edited and makes the generation boundary visible to both humans and agents.

- **Pattern:** Root repo guidance points future agents to the docs app and conventions.
  - **Evidence:** Root `AGENTS.md` includes a `## Documentation` section (`AGENTS.md:155`), identifies the generated index and do-not-edit rule (`AGENTS.md:161`), and points to `apps/oat-docs/AGENTS.md` for authoring conventions (`AGENTS.md:162`).
  - **Why it works:** Agents starting at the repo root can locate the documentation surface without scanning or guessing.

- **Pattern:** User-facing adoption lanes make the broad OAT surface approachable.
  - **Evidence:** `docs/index.md` organizes the main surface into Quickstart, Provider Sync, Agentic Workflows, Docs Tooling, CLI Utilities, Contributing, and Reference (`apps/oat-docs/docs/index.md:16`, `apps/oat-docs/docs/index.md:18`, `apps/oat-docs/docs/index.md:19`, `apps/oat-docs/docs/index.md:24`). `quickstart.md` uses path choices for Provider Sync, Agentic Workflows, Docs Tooling, and CLI Utilities (`apps/oat-docs/docs/quickstart.md:12`, `apps/oat-docs/docs/quickstart.md:14`, `apps/oat-docs/docs/quickstart.md:28`, `apps/oat-docs/docs/quickstart.md:42`, `apps/oat-docs/docs/quickstart.md:56`).
  - **Why it works:** This follows the baseline information-architecture guidance to start from reader jobs rather than implementation layout.

- **Pattern:** Contributor docs include concrete validation commands.
  - **Evidence:** `docs/contributing/documentation.md` documents `pnpm dev:docs`, `pnpm build:docs`, link checking, Markdown linting, and index regeneration commands (`apps/oat-docs/docs/contributing/documentation.md:21`, `apps/oat-docs/docs/contributing/documentation.md:27`, `apps/oat-docs/docs/contributing/documentation.md:33`, `apps/oat-docs/docs/contributing/documentation.md:41`, `apps/oat-docs/docs/contributing/documentation.md:57`).
  - **Why it works:** The baseline emphasizes exact commands, verification, and source-of-truth links; this page gives contributors a practical local workflow.

## Improvement opportunities

### Restore `## Contents` sections on all directory index pages

- **Priority:** High
- **Evidence:** The read-only structural inventory found 11 content directories and confirmed that all have `index.md`, but these directory indexes lack `## Contents`: `cli-utilities/index.md`, `docs-tooling/index.md`, `guide/index.md`, `provider-sync/index.md`, `workflows/index.md`, and `workflows/projects/index.md`. Representative files currently use human-facing sections such as `## Start Here`, `## Common Tasks`, and `## Go Deeper` instead (`apps/oat-docs/docs/cli-utilities/index.md:22`, `apps/oat-docs/docs/cli-utilities/index.md:28`, `apps/oat-docs/docs/cli-utilities/index.md:35`, `apps/oat-docs/docs/docs-tooling/index.md:22`, `apps/oat-docs/docs/provider-sync/index.md:22`, `apps/oat-docs/docs/workflows/index.md:22`, `apps/oat-docs/docs/workflows/projects/index.md:16`, `apps/oat-docs/docs/workflows/projects/index.md:23`, `apps/oat-docs/docs/workflows/projects/index.md:31`). The local authoring contract says every `index.md` must include `## Contents` (`apps/oat-docs/docs/contributing/documentation.md:12`, `apps/oat-docs/docs/contributing/documentation.md:13`).
- **Issue:** The section landing pages are useful for readers, but the reserved machine-readable local map is missing on several directories.
- **Why it matters:** OAT/Fumadocs conventions treat `## Contents` as the local discovery source of truth for humans, agents, and generated navigation. Missing `## Contents` weakens agent path selection and makes the authored tree inconsistent with app-level guidance.
- **Recommended change:** Add a `## Contents` section to each affected directory `index.md` that lists sibling pages and immediate child directories with `.md`-suffixed relative links. Keep the existing `Start Here`, `Common Tasks`, and `Go Deeper` sections if they add human value, but make `## Contents` the canonical local map.
- **Suggested target:** `apps/oat-docs/docs/cli-utilities/index.md`, `apps/oat-docs/docs/docs-tooling/index.md`, `apps/oat-docs/docs/guide/index.md`, `apps/oat-docs/docs/provider-sync/index.md`, `apps/oat-docs/docs/workflows/index.md`, and `apps/oat-docs/docs/workflows/projects/index.md`.
- **Owner review needed:** no for mechanical map restoration; yes if changing page hierarchy or hiding/removing legacy pages.

### Resolve the legacy Guide section reachability mismatch

- **Priority:** High
- **Evidence:** Authored top-level `docs/index.md` `## Contents` lists Quickstart, Provider Sync, Agentic Workflows, Docs Tooling, CLI Utilities, Contributing, and Reference (`apps/oat-docs/docs/index.md:16`, `apps/oat-docs/docs/index.md:18`, `apps/oat-docs/docs/index.md:19`, `apps/oat-docs/docs/index.md:24`), but omits `guide/index.md`. The generated root index still includes Guide and User Guide (`apps/oat-docs/index.md:27`). `guide/index.md` describes itself as a compatibility router and says the old catch-all guide is being retired (`apps/oat-docs/docs/guide/index.md:8`, `apps/oat-docs/docs/guide/index.md:20`). The structural inventory also reported `guide/index.md` missing from the top-level `## Contents` section.
- **Issue:** The Guide bucket is neither clearly in the authored top-level map nor fully removed from generated discovery. This creates ambiguity about whether the section is intentionally hidden, still supported, or pending migration.
- **Why it matters:** The baseline recommends visible deprecation and replacement paths, while OAT conventions rely on authored `## Contents` for navigation. A compatibility router should either be explicitly listed with its retirement purpose or removed after its remaining content is migrated.
- **Recommended change:** Decide whether `guide/` remains a supported compatibility entry. If yes, add it to `docs/index.md` `## Contents` with a description that it is a legacy router. If no, migrate or delete the remaining `guide/concepts.md` content and remove the generated exposure by updating the docs tree accordingly.
- **Suggested target:** `apps/oat-docs/docs/index.md`, `apps/oat-docs/docs/guide/index.md`, and `apps/oat-docs/docs/guide/concepts.md`.
- **Owner review needed:** yes, because the decision affects user-facing navigation and legacy compatibility.

### Retire `overview.md` pages in favor of directory `index.md` entrypoints

- **Priority:** Medium
- **Evidence:** App-level guidance explicitly says not to create `overview.md` files because they are deprecated in favor of `index.md` with `## Contents` (`apps/oat-docs/AGENTS.md:52`). Existing overview pages remain at `cli-utilities/overview.md`, `docs-tooling/overview.md`, `provider-sync/overview.md`, and `workflows/overview.md`; each is exposed in the generated index (`apps/oat-docs/index.md:9`, `apps/oat-docs/index.md:24`, `apps/oat-docs/index.md:35`, `apps/oat-docs/index.md:65`) and has its own title/frontmatter (`apps/oat-docs/docs/cli-utilities/overview.md:1`, `apps/oat-docs/docs/docs-tooling/overview.md:1`, `apps/oat-docs/docs/provider-sync/overview.md:1`, `apps/oat-docs/docs/workflows/overview.md:1`).
- **Issue:** The docs app retains a deprecated pattern in important top-level sections.
- **Why it matters:** The OAT convention says directory entrypoints should be `index.md`; keeping sibling `overview.md` pages invites future agents to copy the deprecated pattern and fragments overview content between two pages per section.
- **Recommended change:** Fold each overview page's unique explanation into the corresponding directory `index.md`, then remove or redirect the `overview.md` page according to the site's redirect capabilities. Pair this with adding `## Contents` to the affected `index.md` pages.
- **Suggested target:** `apps/oat-docs/docs/cli-utilities/index.md`, `apps/oat-docs/docs/docs-tooling/index.md`, `apps/oat-docs/docs/provider-sync/index.md`, `apps/oat-docs/docs/workflows/index.md`, and the four sibling `overview.md` files.
- **Owner review needed:** yes for deletion/redirect decisions; no for identifying the deprecated pattern.

### Clarify Fumadocs generation versus MkDocs nav-sync guidance

- **Priority:** Medium
- **Evidence:** The active Fumadocs app scripts run `fumadocs-mdx` and `oat docs generate-index` on `predev` and `prebuild` (`apps/oat-docs/package.json:6`, `apps/oat-docs/package.json:8`). The generated artifact is root `apps/oat-docs/index.md` (`apps/oat-docs/index.md:1`). Meanwhile, `docs-index-contract.md` says `## Contents` is the only machine-readable source used by `oat docs nav sync` and describes regenerating `mkdocs.yml` nav entries (`apps/oat-docs/docs/reference/docs-index-contract.md:14`, `apps/oat-docs/docs/reference/docs-index-contract.md:35`). `docs-tooling/commands.md` similarly describes `oat docs nav sync` as regenerating the `nav:` block in `mkdocs.yml` (`apps/oat-docs/docs/docs-tooling/commands.md:25`, `apps/oat-docs/docs/docs-tooling/commands.md:145`).
- **Issue:** Some guidance is accurate for MkDocs or for the cross-framework contract, but it can be read as if Fumadocs uses `nav sync` as the active generation step. The assigned app's scripts show that Fumadocs currently relies on `generate-index` for the generated root index.
- **Why it matters:** Future agents may run or recommend the wrong regeneration command after Fumadocs-only edits, or overstate how `## Contents` feeds Fumadocs routing versus generated index artifacts.
- **Recommended change:** Split the docs-index contract into framework-neutral rules plus framework-specific generation notes. State that Fumadocs in this app runs `fumadocs-mdx` and `oat docs generate-index` through `predev`/`prebuild`, while MkDocs uses `oat docs nav sync` to regenerate `mkdocs.yml` navigation.
- **Suggested target:** `apps/oat-docs/docs/reference/docs-index-contract.md`, `apps/oat-docs/docs/docs-tooling/commands.md`, and `apps/oat-docs/docs/contributing/documentation.md`.
- **Owner review needed:** no for aligning docs with package scripts; yes if the intended future behavior is to make Fumadocs consume `## Contents` more directly.

### Expand or generate full CLI reference coverage

- **Priority:** Medium
- **Evidence:** `reference/cli-reference.md` states that it is intentionally shallow and points to owning pages rather than providing full command-by-command docs (`apps/oat-docs/docs/reference/cli-reference.md:7`). It includes command groups and a list of notable commands (`apps/oat-docs/docs/reference/cli-reference.md:23`, `apps/oat-docs/docs/reference/cli-reference.md:39`). The docs-tooling page documents one command family in more detail, including primary docs commands and supported flags for docs commands (`apps/oat-docs/docs/docs-tooling/commands.md:16`, `apps/oat-docs/docs/docs-tooling/commands.md:18`, `apps/oat-docs/docs/docs-tooling/commands.md:24`).
- **Issue:** For a CLI-heavy project, the current reference map is helpful but does not fully meet the baseline CLI documentation bar for each command: arguments, flags, defaults, output shapes, JSON output, exit codes, non-interactive behavior, side effects, and scripting guidance.
- **Why it matters:** OAT is itself a CLI and workflow toolkit. Users and agents need precise command contracts to automate safely and avoid inferring behavior from prose or source code.
- **Recommended change:** Keep `reference/cli-reference.md` as the command-family map, but add a generated or semi-generated full CLI command reference. Include JSON output contracts and exit-code behavior where the source makes them explicit; mark unknown exit-code behavior rather than inventing it.
- **Suggested target:** New or expanded pages under `apps/oat-docs/docs/reference/` or per owning section, linked from `reference/cli-reference.md`.
- **Owner review needed:** yes, because command behavior and exit-code contracts should be verified against CLI source/tests before publishing.

### Normalize code fence languages and shell fence style

- **Priority:** Low
- **Evidence:** A read-only fence scan found one opening fence without a language identifier at `apps/oat-docs/docs/workflows/projects/implementation-execution.md:32`. The same scan found 54 opening fences using `bash`, including examples at `apps/oat-docs/docs/cli-utilities/bootstrap.md:57`, `apps/oat-docs/docs/contributing/code.md:14`, and `apps/oat-docs/docs/docs-tooling/commands.md:70`. The imported baseline recommends language identifiers for all fenced code blocks and `sh` for shell commands.
- **Issue:** The docs mostly provide language identifiers, but one unlabeled fence and inconsistent shell language labels diverge from the shared baseline.
- **Why it matters:** Language identifiers improve rendering, linting, and agent parsing. Consistent `sh` shell fences make examples portable across docs surfaces.
- **Recommended change:** Add the missing fence language at `implementation-execution.md:32`. Consider a broader low-risk formatting pass from `bash` to `sh` only if the repo wants to align strictly with the imported baseline; otherwise document `bash` as an accepted local style.
- **Suggested target:** `apps/oat-docs/docs/workflows/projects/implementation-execution.md` first; optional broader pass across `apps/oat-docs/docs/**/*.md`.
- **Owner review needed:** no for the missing fence language; unknown for changing shell fence style globally because local style may intentionally use `bash`.

## Baseline authoring guidance deltas

- **Information architecture:** The top-level adoption-lane model is strong, but several directory landing pages do not expose the baseline/OAT local-map shape because they lack `## Contents`. The legacy `guide/` router is not listed in top-level `docs/index.md` but remains generated, creating a deprecation/navigation ambiguity.
- **Page types:** Section indexes mix orientation, task routing, and deeper links effectively for humans, but the missing `## Contents` means the machine-readable page type contract is incomplete. CLI docs are strongest for docs tooling and weaker as a full CLI reference surface.
- **Writing style:** The docs are mostly direct and path-specific. Minor style deltas include one unlabeled code fence and shell examples using `bash` instead of the baseline-preferred `sh`.
- **CLI coverage:** OAT's CLI reference is intentionally shallow. The baseline CLI guidance calls for exact flags, output, JSON output, exit codes, non-interactive behavior, scripting behavior, examples, troubleshooting, and safe production usage. Existing docs partially cover this through owning pages, but there is no single full command reference evidenced in the inspected files.
- **Internal/public boundary:** The docs appear written as public-facing project docs, and no secrets were observed in the inspected pages. Ownership/support path expectations are not clear from the inspected files; this should be confirmed rather than inferred.
- **Review-rubric concerns:** Accuracy and maintainability are helped by generated markers and exact commands. The main maintainability risk is divergence between stated conventions and actual tree structure.

## OAT/Fumadocs convention deltas

- Every inspected content directory has an `index.md`; this part conforms.
- Several `index.md` files do not include a `## Contents` section, which diverges from `apps/oat-docs/AGENTS.md`, `docs/contributing/documentation.md`, and the OAT docs-analysis checklist.
- Authored relative Markdown links appear to follow the `.md`/`.mdx` suffix convention; the structural link scan found no local relative Markdown links without a `.md` or `.mdx` suffix.
- Generated root `apps/oat-docs/index.md` is clearly marked and should not be hand-edited; this conforms.
- Four `overview.md` files remain in the authored docs tree, which diverges from the app-level rule that `overview.md` is deprecated in favor of directory `index.md` entrypoints.
- The generated root index includes all discovered pages, including legacy/overview pages; this can expose pages that are not reachable from authored `## Contents` maps.
- Plain `.md` is used throughout the inspected docs source; no unnecessary `.mdx` pages were found in the inventory.

## Recommended follow-up work

- **Target files or area:** `apps/oat-docs/docs/cli-utilities/index.md`, `apps/oat-docs/docs/docs-tooling/index.md`, `apps/oat-docs/docs/guide/index.md`, `apps/oat-docs/docs/provider-sync/index.md`, `apps/oat-docs/docs/workflows/index.md`, `apps/oat-docs/docs/workflows/projects/index.md`
  - **Recommendation:** Add reserved `## Contents` sections that map sibling pages and immediate child directories while preserving useful human-facing routing sections.
  - **Evidence:** Missing `## Contents` found by structural inventory; local contract requires it (`apps/oat-docs/docs/contributing/documentation.md:12`, `apps/oat-docs/docs/contributing/documentation.md:13`).
  - **Suggested owner/review need:** docs maintainer review only if link ordering or page hierarchy changes.

- **Target files or area:** `apps/oat-docs/docs/index.md`, `apps/oat-docs/docs/guide/index.md`, `apps/oat-docs/docs/guide/concepts.md`
  - **Recommendation:** Decide whether `guide/` remains a compatibility section or should be migrated away; then make the authored top-level map and generated output agree.
  - **Evidence:** Authored map omits guide while generated index includes it (`apps/oat-docs/docs/index.md:16`, `apps/oat-docs/index.md:27`); guide calls itself a compatibility router (`apps/oat-docs/docs/guide/index.md:8`).
  - **Suggested owner/review need:** owner review needed for compatibility and migration decision.

- **Target files or area:** `apps/oat-docs/docs/*/overview.md` and corresponding section `index.md` pages
  - **Recommendation:** Fold overview content into the directory `index.md` entrypoints and remove or redirect `overview.md` pages.
  - **Evidence:** App guidance deprecates `overview.md` (`apps/oat-docs/AGENTS.md:52`), while generated index still exposes four overview pages (`apps/oat-docs/index.md:9`, `apps/oat-docs/index.md:24`, `apps/oat-docs/index.md:35`, `apps/oat-docs/index.md:65`).
  - **Suggested owner/review need:** owner review needed for redirects/deletion.

- **Target files or area:** `apps/oat-docs/docs/reference/docs-index-contract.md`, `apps/oat-docs/docs/docs-tooling/commands.md`, `apps/oat-docs/docs/contributing/documentation.md`
  - **Recommendation:** Clarify the distinction between Fumadocs generated-index behavior and MkDocs `nav sync` behavior.
  - **Evidence:** Fumadocs app scripts run `generate-index` (`apps/oat-docs/package.json:6`, `apps/oat-docs/package.json:8`), while current docs emphasize `nav sync` and `mkdocs.yml` (`apps/oat-docs/docs/reference/docs-index-contract.md:35`, `apps/oat-docs/docs/docs-tooling/commands.md:145`).
  - **Suggested owner/review need:** docs/tooling maintainer review recommended.

- **Target files or area:** CLI reference pages under `apps/oat-docs/docs/reference/` and owning command sections
  - **Recommendation:** Add or generate a full CLI command reference, keeping `reference/cli-reference.md` as the shallow command-family map.
  - **Evidence:** The current CLI reference explicitly says it is intentionally shallow (`apps/oat-docs/docs/reference/cli-reference.md:7`).
  - **Suggested owner/review need:** CLI maintainer review needed to verify flags, output, JSON contracts, and exit behavior.

- **Target files or area:** `apps/oat-docs/docs/workflows/projects/implementation-execution.md` and optional Markdown style pass
  - **Recommendation:** Add the missing fence language at line 32; optionally normalize shell fence language or document `bash` as local style.
  - **Evidence:** Fence scan found the unlabeled opening fence at `apps/oat-docs/docs/workflows/projects/implementation-execution.md:32`.
  - **Suggested owner/review need:** no for missing language; optional style decision for global shell-fence normalization.

## Candidate checks for `oat-docs-analyze`

- Detect any content directory whose `index.md` exists but lacks a reserved `## Contents` section, even when it has equivalent human-facing headings like `Start Here`, `Common Tasks`, or `Go Deeper`.
- Detect generated root index entries that are not reachable from authored parent `## Contents` maps, such as a generated `guide/index.md` entry omitted from `docs/index.md`.
- Detect `overview.md` files inside docs trees that already have directory `index.md` entrypoints.
- Detect Fumadocs docs apps whose scripts run `docs generate-index` while in-repo guidance describes only `docs nav sync`/`mkdocs.yml`, and recommend framework-specific wording.
- Detect opening code fences with no language identifier.
- Optionally report shell fence language style drift when a repo adopts a preferred language such as `sh`.
- Detect compatibility-router language such as “being retired” and require either explicit top-level discoverability or a documented removal/migration plan.

## Open questions

- Should `apps/oat-docs/docs/guide/` remain as a visible compatibility router, or should its remaining content be migrated fully into the top-level adoption lanes?
- Does the project intend to keep `bash` as the local shell-fence language, or should OAT docs align with the imported baseline preference for `sh`?
- Is there an intended public support or ownership path for Open Agent Toolkit docs that should be visible on the landing page or contributing docs?
- Should Fumadocs eventually derive visible navigation from authored `## Contents`, or is `## Contents` primarily an agent/local-map contract plus generated-root-index input for this app?
