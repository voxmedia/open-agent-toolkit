---
title: Existing OAT Fumadocs improvement analysis prompt
description: Handoff prompt for analyzing existing OAT Fumadocs docs apps against baseline documentation guidance.
---

# Existing OAT Fumadocs improvement analysis prompt

Use this prompt to send another agent through existing OAT Fumadocs documentation apps and identify docs improvements based on the emerging `authoring-docs` baseline guidance.

## Prompt

You are analyzing existing OAT Fumadocs documentation apps to identify concrete improvements that would make them better documentation surfaces.

This is a read-only analysis task except for writing the requested markdown artifact under the brainstorm directory.

## Goal

Analyze a set of repositories that already have OAT Fumadocs documentation apps. Identify what could be improved based on the baseline technical documentation guidance in `authoring-docs`, while respecting OAT/Fumadocs conventions.

This prompt is about improving existing docs apps. It is not primarily about designing the future `oat-docs-authoring` wrapper skill; that is handled by a separate analysis prompt.

## Inputs

The brainstorm/reference directory is:

`/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill`

Use the imported baseline research pack in that directory. Read at least:

- `SKILL.md`
- `01-principles.md`
- `02-agent-workflow.md`
- `03-information-architecture.md`
- `04-page-types.md`
- `05-writing-style.md`
- `06-markdown-fumadocs.md`
- `07-api-docs.md`
- `08-cli-docs.md`
- `09-app-service-docs.md`
- `10-library-framework-docs.md`
- `11-architecture-operations-docs.md`
- `12-internal-vs-public.md`
- `14-review-rubric.md`
- `16-docs-audit-prompts.md`

Use these OAT/Fumadocs conventions as authoritative OAT-specific context:

- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/apps/oat-docs/AGENTS.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/SKILL.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`

Analyze exactly these OAT Fumadocs implementations:

- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs`
- `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs`
- `/Users/thomas.stang/Code/vox/duet/apps/duet-docs`
- `/Users/thomas.stang/Code/vox/vox-mobile-app/documentation`
- `/Users/thomas.stang/Code/vox/cyclone-app/apps/documentation`
- `/Users/thomas.stang/Code/stoa/apps/documentation`

Do not discover additional repositories unless the user explicitly expands the scope.

## OAT/Fumadocs conventions to evaluate

Evaluate each docs app against these conventions:

- Authored docs live under the docs source tree.
- Every content directory should have an `index.md`.
- Every `index.md` should include a useful `## Contents` section mapping sibling pages and immediate child directories.
- Authored links should use `.md`-suffixed relative links, including links to `subdir/index.md`.
- Generated navigation is derived from authored `## Contents`; agents should not hand-edit generated navigation artifacts.
- Generated root indexes, when present, are not hand-authored and should not be edited directly.
- `overview.md` should not be used as a directory entrypoint.
- Plain `.md` is preferred; `.mdx` should be used only when a page needs JSX/components.
- Docs setup should include clear AGENTS/contributing guidance for ongoing authoring.
- Docs should remain useful to both humans and agents through explicit paths, commands, ownership, uncertainty, and source-of-truth links.

## What to inspect per repository

Inspect only enough to make evidence-backed recommendations. Prioritize:

- docs app location and configuration
- docs source tree
- authored `index.md` files and `## Contents` sections
- generated root index or generated nav files
- package scripts for docs build/dev/nav/index generation
- docs app `AGENTS.md`
- docs contributing/authoring pages
- root `AGENTS.md` documentation pointers
- old MkDocs config only if relevant to migration leftovers
- representative docs pages across major sections

Do not scan unrelated source code unless it is needed to verify a docs claim.

## Analysis questions

For each repository, answer:

1. Does the docs app follow the OAT/Fumadocs structural contract?
2. Are there navigation/index/local-map issues?
3. Are authored links agent-friendly and consistent?
4. Are there generated files that appear to be hand-edited or unclear?
5. Does the docs app have enough authoring guidance for future agents?
6. Do the pages follow the baseline documentation quality guidance?
7. Are important doc types missing for this repo type?
8. Are there stale, duplicated, vague, or unsafe docs patterns?
9. Are there repo-specific improvements that should become follow-up tasks?

## Required outputs

Write one improvement artifact per implementation. Create the output directory if needed:

`/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvements`

Write exactly these files:

- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvements/open-agent-toolkit-oat-docs-improvements.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvements/gizmo-slack-app-documentation-improvements.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvements/honeycomb-docs-improvements.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvements/duet-docs-improvements.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvements/vox-mobile-app-documentation-improvements.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvements/cyclone-app-documentation-improvements.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/existing-oat-fumadocs-improvements/stoa-documentation-improvements.md`

Do not modify any other files.

Use this structure for each per-repo artifact:

```md
---
title: <Repo name> OAT Fumadocs improvement analysis
description: Improvement opportunities for the <repo name> OAT Fumadocs docs app.
---

# <Repo name> OAT Fumadocs improvement analysis

## Scope

Identify the repository/docs app analyzed and list the exact files/artifacts inspected.

## Executive summary

Summarize the most important repo-specific improvement themes in 5-10 bullets.

## Detected setup

- **Docs app path:** `<path>`
- **Docs source path:** `<path>`
- **Detected framework/tooling:** short description
- **Generated artifacts:** generated root index/nav files, if present
- **Docs scripts:** relevant scripts or commands
- **Authoring guidance:** AGENTS/contributing docs found

## Overall assessment

Give a 2-4 sentence assessment of the docs app's strengths, risks, and readiness.

## Strong patterns

List good patterns worth preserving. For each pattern:

- **Pattern:** concise description
- **Evidence:** exact file references
- **Why it works:** connect to baseline guidance or OAT convention

## Improvement opportunities

List concrete improvements for this repo. For each improvement:

### <Improvement title>

- **Priority:** High, Medium, or Low
- **Evidence:** exact file references
- **Issue:** what is missing, stale, confusing, duplicated, unsafe, or inconsistent
- **Why it matters:** connect to baseline guidance or OAT convention
- **Recommended change:** concrete docs change or follow-up task
- **Suggested target:** file/path/section where the change should land
- **Owner review needed:** yes/no/unknown, with reason

## Baseline authoring guidance deltas

Identify where this docs app falls short of the `authoring-docs` baseline, grouped by relevant categories such as information architecture, page types, writing style, category-specific coverage, internal/public boundary, and review-rubric concerns.

## OAT/Fumadocs convention deltas

Identify where this docs app diverges from OAT/Fumadocs conventions.

## Recommended follow-up work

Prioritized list of concrete follow-up tasks. Each item should include:

- target files or area
- recommendation
- evidence
- suggested owner/review need, if known

## Candidate checks for `oat-docs-analyze`

List any repeatable checks suggested by this repo's issues that should potentially be added to `oat-docs-analyze`.

## Open questions

List repo-specific unresolved questions that require human input.
```

## Quality bar

- Cite exact files and line numbers where practical.
- Distinguish concrete evidence from inference.
- Prefer actionable recommendations over general criticism.
- Do not invent facts about repo behavior.
- Do not make docs edits.
- Keep each repository's recommendations in its own file.
- Call out both good patterns and improvement opportunities.

## Final response

After writing the output files, summarize:

- repositories analyzed
- output files written
- top 5 improvement themes
- any blockers or open questions
