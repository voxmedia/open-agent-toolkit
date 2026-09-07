---
id: BL-260906-repair-the-stray-fence-in-oat
title: Repair the stray fence in oat-project-review-provide and tighten the
  fence rule repo-wide
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - skills
  - contract-tests
assignee: null
created: 2026-09-06T08:30:41.038Z
updated: 2026-09-06T08:30:41.038Z
associated_issues: []
external_plans: []
---

## Description

p04 review findings (wave 2). oat-project-review-provide/SKILL.md:1057 opens a bare four-backtick fence after prose that swallows lines 1057-1167 (Steps 8.5, 9, 9.5 render as code; the review-artifact template at :1013-1055 renders as live headings). The repair is indivisible with the contract matrix: insert an opener before :1013, narrow :1167 to three backticks, delete the coupled row in packages/cli/src/validation/named-skill-load-contract.test.ts (anchor Recommended Next Step), tighten findFenceDefects with the fence-length >= 4 discriminator, and bump review-provide (1.5.3) plus its skills.test.ts pin. Three more spurious fences of the same class sit outside the bounded surface (oat-repo-knowledge-index/SKILL.md:514, oat-repo-improve/references/plan-template.md:149, a create-oat-skill reference); run the rule over all of .agents/skills/\*\*.

## Acceptance Criteria

- [ ] `oat-project-review-provide/SKILL.md` renders Steps 8.5, 9, and 9.5 as prose and the review-artifact template as a fenced block (opener before the template, closer narrowed to three backticks)
- [ ] `findFenceDefects` in `named-skill-load-contract.test.ts` catches a bare fence of length >= 4 that swallows a `#{2,6}` heading, without firing on the three-backtick printed template in `oat-project-document/SKILL.md`
- [ ] The coupled matrix row (anchor `Recommended Next Step`) is deleted in the same commit and the contract suite passes
- [ ] `oat-project-review-provide` version bumped once with its `skills.test.ts` pin updated
- [ ] The fence rule (or a repo-wide balance check) runs over all of `.agents/skills/**` and the three out-of-surface instances are repaired
