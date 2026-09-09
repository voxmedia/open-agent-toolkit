---
id: BL-260908-correct-the-factual-skill
title: Correct the factual skill-authoring claims and consolidate the duplicated
  guidance
status: closed
priority: medium
scope: task
scope_estimate: M
labels:
  - skills
  - documentation
  - authoring
assignee: null
created: 2026-09-08T16:54:22.908Z
updated: '2026-09-09T10:17:11Z'
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/277
external_plans:
  - .oat/repo/reference/external-plans/2026-09-08-correct-skill-authoring-facts.md
---

## Description

GitHub issue #277, the factual half (seven of nine proposals verified 2026-09-08 against `create-agnostic-skill` 1.4.3). Fix: the words-vs-tokens budget mismatch (`SKILL.md:72` vs `:271`, `.agents/docs/skills-guide.md:67`); the 'Codex enforces single-line ≤ 500 chars' claim (`SKILL.md:179`, `references/skill-template.md:203-204`, `skills-guide.md:82,244,423`) whose only in-repo backing is OAT's own validator (`packages/cli/src/validation/skills.ts:1273`) and whose cited Codex URL (`SKILL.md:430`) now redirects to a page stating no such limit — retain or explicitly revise OAT's own 500-character house rule; the one blanket unknown-field sentence (`SKILL.md:175`); the unconditional `oat sync` step and success criterion (`SKILL.md:232-238,464`; `create-oat-skill/SKILL.md:217`); the comma-vs-space `allowed-tools` separator across six files vs `skills-guide.md:58`; the approval-before-creating-files sentence (`SKILL.md:197`) replaced by scoped authorization; the 'skill appears in AGENTS.md' check (`SKILL.md:245`) that contradicts the repository's no-duplicated-inventory policy (`AGENTS.md:7-12`); one canonical frontmatter matrix in `skills-guide.md` and one home for the Detail Level table (`SKILL.md:395-403` = `skill-template.md:180-188`), with one dated provider-compatibility reference. Constraint: `DR-260906-standing-claims-in-skills-name`. Bumps 1.4.3 → 1.5.0 and 1.5.3 → 1.5.4; `named-skill-load-contract.test.ts:2595-2612` pins must not be disturbed.

## Acceptance Criteria

- [ ] `create-agnostic-skill/SKILL.md` and `.agents/docs/skills-guide.md` state the body budget in tokens consistently (no `<5k words`)
- [ ] No surface attributes a single-line ≤ 500-character description limit to Codex; OAT's own 500-character house rule (`packages/cli/src/validation/skills.ts:1273`) is either kept as an explicit OAT policy with its validator named as the backstop or revised, and the dead Codex docs URL is replaced by a dated reference (`DR-260906-standing-claims-in-skills-name`)
- [ ] The blanket 'other agents ignore unknown frontmatter fields' sentence is scoped to the providers with documented or tested behavior, in one dated compatibility reference rather than three divergent matrices; the Detail Level table has one home
- [ ] `oat sync` is a scoped, conditional step in both authoring skills and is not a success criterion; the `allowed-tools` separator is consistent across both skills, both templates, and the guide, matching the spec's space-delimited form or explicitly documenting the comma form as OAT's choice
- [ ] The approval-before-creating-files sentence is replaced by scoped authorization guidance; the 'skill appears in AGENTS.md' check is removed or reworded so it no longer contradicts `AGENTS.md`'s no-duplicated-inventory rule
- [ ] `create-agnostic-skill` 1.4.3 → 1.5.0 and `create-oat-skill` 1.5.3 → 1.5.4; the `named-skill-load-contract.test.ts` pins on `create-oat-skill` Step 2 stay untouched; `pnpm test:skills`, `check:skill-bumps`, and the bundled-docs contract pass
