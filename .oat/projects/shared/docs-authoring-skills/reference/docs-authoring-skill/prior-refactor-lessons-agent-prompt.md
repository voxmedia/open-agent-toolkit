---
title: Prior refactor lessons agent prompt
description: Handoff prompt for extracting MkDocs to OAT Fumadocs lessons from prior archived projects.
---

# Prior refactor lessons agent prompt

Use this prompt to send another agent through the two recently shipped Fumadocs refactor projects and produce durable guidance for future docs bootstrap and migration work.

## Prompt

You are researching prior MkDocs-to-OAT-Fumadocs refactors so future agents can avoid known pitfalls.

Your task is read-only except for writing the two requested markdown artifacts under the brainstorm directory in the OpenAgent Toolkit worktree.

## Context

OpenAgent Toolkit is developing two related docs authoring skills:

- `authoring-docs`: an agnostic baseline skill for technical documentation authoring.
- `oat-docs-authoring`: an OAT/Fumadocs wrapper skill that layers on OAT-specific documentation conventions.

The brainstorm/reference directory is:

`/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill`

Use the research pack already imported in that directory as baseline documentation standards. Read at least:

- `SKILL.md`
- `01-principles.md`
- `02-agent-workflow.md`
- `03-information-architecture.md`
- `06-markdown-fumadocs.md`
- `14-review-rubric.md`
- `16-docs-audit-prompts.md`

Also read the OAT/Fumadocs conventions from the OpenAgent Toolkit repo. Use these as the authoritative OAT-specific rules:

- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/apps/oat-docs/AGENTS.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/SKILL.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/references/directory-assessment-criteria.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-bootstrap/SKILL.md`

The two prior refactor projects to study are:

- `/Users/thomas.stang/Code/vox/duet/.oat/projects/archived/fumadocs-refactor`
- `/Users/thomas.stang/Code/vox/honeycomb/.oat/projects/archived/fumadocs-refactor`

These projects migrated existing MkDocs documentation apps to OAT Fumadocs documentation apps. Extract the problems, gotchas, decisions, troubleshooting notes, and follow-up opportunities that were documented while those projects were implemented.

## What to inspect

For each archived project, read all available OAT lifecycle artifacts, including whichever of these exist:

- `state.md`
- `discovery.md`
- `spec.md`
- `design.md`
- `plan.md`
- `implementation.md`
- `summary.md`
- `reviews/`
- `pr/`

Then inspect the corresponding repository only as needed to understand the documented issues. Prioritize high-signal docs migration files rather than scanning the whole repo:

- docs app files and config
- `AGENTS.md` files related to docs
- docs source tree indexes
- generated root indexes
- package scripts related to docs
- Fumadocs config
- MkDocs config or removed legacy docs config
- OAT docs transform/config package usage
- any troubleshooting notes referenced by the project artifacts

Do not invent issues. If a lesson is inferred rather than explicitly documented, label it as inferred and cite the evidence that supports it.

## OAT/Fumadocs conventions to keep in mind

Future guidance should reflect these conventions:

- Authored docs live under the docs source tree.
- Every content directory should have an `index.md`.
- Every `index.md` should include a useful `## Contents` section that maps sibling pages and immediate child directories.
- Authored links should use `.md`-suffixed relative links, including links to `subdir/index.md`.
- Generated navigation is derived from authored `## Contents`; agents should not hand-edit generated navigation artifacts.
- The generated root index, when present, is not hand-authored and should not be edited directly.
- `overview.md` should not be used as a directory entrypoint.
- Plain `.md` is preferred; `.mdx` should be used only when a page actually needs JSX/components.
- Run the appropriate OAT docs nav/index generation commands after structural changes.
- Keep docs useful to both humans and agents: explicit paths, commands, ownership, uncertainty, and source-of-truth links.
- Prefer linking to canonical setup/config docs over duplicating long details everywhere.

## Required outputs

Write exactly these two files:

1. `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/oat-docs-bootstrap-gotchas.md`
2. `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md`

Do not modify any other files.

## Output 1: `oat-docs-bootstrap-gotchas.md`

Purpose: supplemental guidance for the `oat-docs-bootstrap` skill so new OAT Fumadocs setups start from a better place.

Use this structure:

```md
---
title: OAT docs bootstrap gotchas and considerations
description: Lessons from prior OAT Fumadocs refactors that should inform new docs bootstrap runs.
---

# OAT docs bootstrap gotchas and considerations

## Source projects reviewed

List the two projects and the specific artifacts inspected.

## Executive summary

Summarize the highest-value lessons in 5-8 bullets.

## Bootstrap-time decisions

Document decisions the bootstrap skill or user should make early, such as docs app location, generated index strategy, package scripts, nav generation, Markdown vs MDX, source tree layout, and whether legacy MkDocs content is being migrated.

## Common gotchas

For each gotcha:

### <Gotcha title>

- **Seen in:** `duet`, `honeycomb`, or both
- **Evidence:** exact file/artifact references
- **Symptom:** what went wrong or was confusing
- **Cause:** why it happened
- **Bootstrap guidance:** what `oat-docs-bootstrap` should do or ask up front
- **Follow-up check:** how to verify the setup is correct

## OAT convention checklist

Checklist for new docs apps, grounded in the OAT conventions.

## Troubleshooting notes

Symptom-first troubleshooting table for failures encountered in the prior refactors.

## Recommended updates to `oat-docs-bootstrap`

Actionable recommendations, each with evidence and priority.

## Open questions

List anything that needs confirmation before being encoded into a skill.
```

## Output 2: `mkdocs-to-oat-fumadocs-refactor-guide.md`

Purpose: a migration/refactoring guide that can be handed to an agent converting an existing MkDocs docs app into an OAT Fumadocs docs app.

Use this structure:

```md
---
title: MkDocs to OAT Fumadocs refactor guide
description: Agent handoff guide for migrating an existing MkDocs docs app to OAT Fumadocs using lessons from prior refactors.
---

# MkDocs to OAT Fumadocs refactor guide

## Source projects reviewed

List the two projects and the specific artifacts inspected.

## When to use this guide

Explain that this is for migrating existing MkDocs docs apps to OAT Fumadocs, not for bootstrapping a brand-new docs surface.

## Migration principles

Capture the durable principles from the prior refactors and the docs standards.

## Preflight inventory

Checklist of what an agent should inspect before editing:

- existing MkDocs config and nav
- docs tree shape
- generated or authored index files
- links and extensions
- plugin/extension usage
- code examples and Markdown features
- package scripts
- OAT docs tooling/config packages
- docs AGENTS/contributing files

## Recommended migration sequence

Step-by-step flow from inventory to implementation to validation.

## Mapping MkDocs concepts to OAT Fumadocs

Explain how nav, indexes, plugins/extensions, generated files, Markdown syntax, and local maps should translate.

## Known pitfalls from prior refactors

For each pitfall:

### <Pitfall title>

- **Seen in:** `duet`, `honeycomb`, or both
- **Evidence:** exact file/artifact references
- **Risk:** what can break if ignored
- **Recommended handling:** concrete migration guidance
- **Validation:** command or inspection step to verify

## Content migration guidance

Guidance for preserving useful existing docs while reshaping them into OAT/Fumadocs conventions.

## Link and navigation migration guidance

Specific guidance for `.md` links, `index.md`, `## Contents`, generated root indexes, nav sync, and avoiding `overview.md`.

## Validation checklist

Commands and manual checks an agent should run before calling the migration complete.

## Handoff summary template

Template the migration agent should use at the end, including files changed, sources inspected, uncertainties, and follow-up tasks.

## Open questions

List anything not resolved by the prior refactors.
```

## Quality bar

- Cite exact files and line numbers where practical.
- Distinguish documented issues from inferred lessons.
- Prefer concrete guidance over abstract advice.
- Include both problems and successful patterns.
- Keep the two output files useful as standalone handoff docs.
- Do not copy huge blocks from project artifacts; synthesize and cite.
- Do not make code changes or alter either archived project.

## Final response

After writing the two files, summarize:

- files written
- projects/artifacts inspected
- top 5 lessons found
- open questions that need human confirmation
