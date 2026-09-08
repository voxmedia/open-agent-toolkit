---
id: BL-260908-correct-the-factual-skill
title: Correct the factual skill-authoring claims and consolidate the duplicated
  guidance
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - skills
  - documentation
  - authoring
assignee: null
created: 2026-09-08T16:54:22.908Z
updated: 2026-09-08T16:55:27.000Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/277
external_plans: []
---

## Description

GitHub issue #277, the factual half (seven of nine proposals verified 2026-09-08 against `create-agnostic-skill` 1.4.3). Fix: the words-vs-tokens budget mismatch (`SKILL.md:72` vs `:271`, `.agents/docs/skills-guide.md:67`); the 'Codex enforces single-line ≤ 500 chars' claim (`SKILL.md:179`, `references/skill-template.md:203-204`, `skills-guide.md:82,244,423`) whose only in-repo backing is OAT's own validator (`packages/cli/src/validation/skills.ts:1273`) and whose cited Codex URL (`SKILL.md:430`) now redirects to a page stating no such limit — retain or explicitly revise OAT's own 500-character house rule; the one blanket unknown-field sentence (`SKILL.md:175`); the unconditional `oat sync` step and success criterion (`SKILL.md:232-238,464`; `create-oat-skill/SKILL.md:217`); the comma-vs-space `allowed-tools` separator across six files vs `skills-guide.md:58`; the approval-before-creating-files sentence (`SKILL.md:197`) replaced by scoped authorization; the 'skill appears in AGENTS.md' check (`SKILL.md:245`) that contradicts the repository's no-duplicated-inventory policy (`AGENTS.md:7-12`); one canonical frontmatter matrix in `skills-guide.md` and one home for the Detail Level table (`SKILL.md:395-403` = `skill-template.md:180-188`), with one dated provider-compatibility reference. Constraint: `DR-260906-standing-claims-in-skills-name`. Bumps 1.4.3 → 1.5.0 and 1.5.3 → 1.5.4; `named-skill-load-contract.test.ts:2595-2612` pins must not be disturbed.

## Acceptance Criteria

- {Outcome 1}
- {Outcome 2}
