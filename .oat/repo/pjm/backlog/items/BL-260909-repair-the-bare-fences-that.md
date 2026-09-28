---
id: BL-260909-repair-the-bare-fences-that
title: Repair the bare fences that swallow headings outside .agents/skills
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - agents
  - templates
  - wave-7-followup
assignee: null
created: 2026-09-09T04:30:47.401Z
updated: 2026-09-09T04:30:47.401Z
associated_issues: []
external_plans: []
---

## Description

Wave-7 p10 (`2026-09-08-repair-stray-fences-in-lifecycle-skills.md`) repaired the stray fences inside `.agents/skills` and widened the fence scanner, but its scope stopped at the skills tree. Five bare-fence-swallows-heading instances remain live outside it, each verified at the wave-7 p10 head: `.agents/agents/oat-codebase-mapper.md:246`, `.agents/agents/oat-reviewer.md:475` and `:507` (the latter swallows `## Structured-Output Mode` in the reviewer's own contract), `.agents/agents/skeptical-evaluator.md:81`, and `.oat/templates/docs-app-mkdocs/docs/contributing.md:107`. Repair each with the same three-part treatment (opener, narrowed closers, balanced info strings), bump any versioned asset once, and extend the fence-scan inventory floor in `packages/cli/src/validation/named-skill-load-contract.test.ts` to cover `.agents/agents` and `.oat/templates` so the class cannot recur there either. Also consider narrowing the scanner's `^\s*` indent laxity and column-0 heading anchor toward CommonMark (proven latent, not live, by the p10 root review) and reducing the 25-file inventory headroom.

## Acceptance Criteria

- Each of the five listed bare-fence instances is re-located at the current head (line numbers have drifted) and repaired with the wave-7 p10 treatment (opener, narrowed closers, balanced info strings); the swallowed headings, including `## Structured-Output Mode` in `oat-reviewer.md`, render as headings again.
- The fence-scan inventory in `packages/cli/src/validation/named-skill-load-contract.test.ts` covers `.agents/agents` and `.oat/templates`, and fails on a seeded bare fence that swallows a heading in each tree (negative control, then restored).
- Each changed versioned asset is bumped once (`oat-reviewer.md`, `oat-codebase-mapper.md`, and `skeptical-evaluator.md` top-level `version:`), plus the lockstep packages for the `.oat/templates` change.
- The indent-laxity and heading-anchor narrowing and the inventory-headroom reduction are either done with tests or explicitly left out with a one-line reason.

## Notes

- 2026-09-27 (backlog-wave-2 p04-t01): the `^\s*` indent laxity, column-0 heading anchor, and inventory headroom are left as they are because the wave-7 p10 root review proved them latent, not live, and the headroom is already one file (live 247, floor 246); reintroduce the narrowing when a heading-swallowing fence the current scanner misses is found.
