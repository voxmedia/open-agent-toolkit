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

- {Outcome 1}
- {Outcome 2}
