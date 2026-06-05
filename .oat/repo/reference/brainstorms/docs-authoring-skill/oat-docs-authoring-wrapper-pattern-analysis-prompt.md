---
title: OAT docs authoring wrapper pattern analysis prompt
description: Handoff prompt for extracting reusable OAT/Fumadocs conventions and wrapper-skill guidance from existing implementations.
---

# OAT docs authoring wrapper pattern analysis prompt

Use this prompt to send another agent through existing OAT Fumadocs documentation apps and extract durable takeaways for the future `oat-docs-authoring` wrapper skill.

## Prompt

You are analyzing existing OAT Fumadocs implementations to identify the reusable conventions, successful patterns, common friction points, and wrapper-skill guidance that should sit on top of the agnostic `authoring-docs` baseline.

This is a read-only analysis task except for writing the requested markdown artifact under the brainstorm directory.

## Goal

Produce a cross-repository pattern analysis that answers:

- What OAT/Fumadocs conventions already exist in practice?
- Which conventions are consistent enough to encode in `oat-docs-authoring`?
- Which conventions are still unsettled or repo-specific?
- What guidance should the wrapper provide when an agent authors, migrates, audits, or restructures OAT Fumadocs docs?
- What should remain in the agnostic `authoring-docs` baseline instead?

This prompt is not primarily about recommending improvements to each existing docs app. Repo-specific improvements are covered by a separate analysis prompt. Include repo-specific examples only when they support wrapper-skill conclusions.

## Inputs

The brainstorm/reference directory is:

`/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill`

Read the working brainstorm notes:

- `brainstorm-notes.md`

Use the imported baseline research pack in that directory. Read at least:

- `SKILL.md`
- `01-principles.md`
- `02-agent-workflow.md`
- `03-information-architecture.md`
- `04-page-types.md`
- `05-writing-style.md`
- `06-markdown-fumadocs.md`
- `14-review-rubric.md`
- `16-docs-audit-prompts.md`

Use these OAT/Fumadocs references as authoritative starting points:

- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/apps/oat-docs/AGENTS.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-bootstrap/SKILL.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-analyze/SKILL.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-docs-apply/SKILL.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.agents/skills/oat-project-document/SKILL.md`

Analyze exactly these OAT Fumadocs implementations:

- `/Users/thomas.stang/Code/vox/open-agent-toolkit/apps/oat-docs`
- `/Users/thomas.stang/Code/vox/gizmo-slack-app/documentation`
- `/Users/thomas.stang/Code/vox/honeycomb/apps/honeycomb-docs`
- `/Users/thomas.stang/Code/vox/duet/apps/duet-docs`
- `/Users/thomas.stang/Code/vox/vox-mobile-app/documentation`
- `/Users/thomas.stang/Code/vox/cyclone-app/apps/documentation`
- `/Users/thomas.stang/Code/stoa/apps/documentation`

Do not discover additional repositories unless the user explicitly expands the scope.

## What to inspect per repository

Inspect enough to identify implementation patterns and wrapper-skill implications. Prioritize:

- docs app directory shape
- docs source tree shape
- `index.md` local-map patterns
- `## Contents` style and depth
- link conventions
- generated root indexes and nav outputs
- docs scripts in `package.json`
- Fumadocs config files
- usage of OAT docs packages such as docs-config, docs-theme, and docs-transforms
- docs app `AGENTS.md`
- docs contributing/authoring docs
- troubleshooting notes or migration artifacts, if present
- examples of pages that represent good OAT/Fumadocs authoring patterns

You may inspect the two prior refactor lesson artifacts if they exist:

- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/oat-docs-bootstrap-gotchas.md`
- `/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/mkdocs-to-oat-fumadocs-refactor-guide.md`

Do not scan unrelated source code unless needed to understand a docs convention.

## Analysis questions

Answer these cross-repo questions:

1. What structural conventions appear consistently across OAT Fumadocs apps?
2. What conventions are explicit in OAT references but inconsistently applied in repos?
3. What useful patterns have emerged in individual repos but are not yet encoded in OAT guidance?
4. What pitfalls should the wrapper skill warn agents about?
5. What should the wrapper skill require before authoring or restructuring docs?
6. What should the wrapper skill delegate to `authoring-docs` instead of duplicating?
7. How should the wrapper interact with `oat-docs-bootstrap`, `oat-docs-analyze`, `oat-docs-apply`, and `oat-project-document`?
8. What should be considered part of the OAT/Fumadocs contract versus optional style guidance?

## Required output

Write exactly this file:

`/Users/thomas.stang/.superconductor/worktrees/open-agent-toolkit/sc-coupled-fermion-beae/.oat/repo/reference/brainstorms/docs-authoring-skill/oat-docs-authoring-wrapper-pattern-analysis.md`

Do not modify any other files.

Use this structure:

```md
---
title: OAT docs authoring wrapper pattern analysis
description: Cross-repository findings for designing the OAT/Fumadocs authoring wrapper skill.
---

# OAT docs authoring wrapper pattern analysis

## Scope

List repositories analyzed, how they were selected, and which files/artifacts were inspected.

## Executive summary

Summarize the most important wrapper-skill takeaways in 5-10 bullets.

## Existing OAT/Fumadocs contract

Summarize the conventions that are already authoritative based on OAT references and observed practice.

## Observed implementation patterns

Group patterns seen across repositories.

For each pattern:

### <Pattern title>

- **Seen in:** repo list
- **Evidence:** exact file references
- **Pattern:** what repos are doing
- **Assessment:** good, mixed, risky, or unsettled
- **Wrapper implication:** what `oat-docs-authoring` should say or do

## Wrapper skill boundary

Separate responsibilities into:

### Belongs in `authoring-docs`

Universal documentation guidance that should stay agnostic.

### Belongs in `oat-docs-authoring`

OAT/Fumadocs-specific rules and workflow guidance.

### Belongs in lifecycle skills

Guidance that should remain in `oat-docs-bootstrap`, `oat-docs-analyze`, `oat-docs-apply`, or `oat-project-document`.

## Proposed `oat-docs-authoring` contents

Recommend the wrapper skill structure, including likely reference files. Include:

- mode or purpose statement
- when to use
- what to read first
- OAT/Fumadocs contract
- authoring workflow
- migration/refactor workflow pointers
- restructuring guidance
- validation checklist
- anti-patterns
- handoff summary expectations

## Candidate wrapper rules

List specific rules that should be encoded in `oat-docs-authoring`.

For each rule:

- **Rule:** concise statement
- **Why:** rationale
- **Evidence:** OAT reference or repo examples
- **Strength:** required, recommended, or optional

## Candidate updates to existing lifecycle skills

List changes suggested for:

- `oat-docs-bootstrap`
- `oat-docs-analyze`
- `oat-docs-apply`
- `oat-project-document`

Each recommendation should include evidence and priority.

## Open design questions

List unsettled choices that need human decision before implementation.

## Suggested next steps

Recommend what to create or change first.
```

## Quality bar

- Cite exact files and line numbers where practical.
- Distinguish authoritative OAT rules from observed repo-specific habits.
- Distinguish required wrapper rules from optional style guidance.
- Do not overfit to one repository.
- Do not duplicate the full `authoring-docs` baseline; identify the wrapper boundary.
- Prefer actionable wrapper-skill design guidance over broad commentary.
- Do not make docs or code changes.

## Final response

After writing the output file, summarize:

- repositories analyzed
- output file written
- top 5 wrapper takeaways
- proposed next step for designing `oat-docs-authoring`
