# Candidate manual state writers

Initial bounded reconnaissance baseline, recorded during brief review remediation on 2026-11-10 (source tree `303910aa99c0eb63dde0cae121ce17d36576a5ab`). Each cited instruction was reopened by the root before recording this table. These are 21 candidate skills, not a complete inventory of every write site. Line numbers are baseline orientation references and will move during implementation.

The cited sites direct manual state writes or establish a shared instruction to do so. A skill may also contain CLI-owned writes, other manual sites, and early-exit paths. p01 must enumerate those boundaries, classify ownership, and record the actual invocation or shared contract that checks each manual write. Do not add a duplicate parse call merely because one shared contract serves several skills.

| Skill                             | Baseline file and line                                                   | Ownership at cited site      | Write / inspection note                                                   |
| --------------------------------- | ------------------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------- |
| oat-project-brief                 | `.agents/skills/oat-project-brief/SKILL.md:207`                          | Manual instruction           | Initial brief metadata                                                    |
| oat-project-capture               | `.agents/skills/oat-project-capture/SKILL.md:156`                        | Manual instruction           | Capture metadata                                                          |
| oat-project-complete              | `.agents/skills/oat-project-complete/SKILL.md:564`                       | Manual instruction           | Documentation skip metadata; complete-state is a separate CLI-owned write |
| oat-project-design                | `.agents/skills/oat-project-design/SKILL.md:797`                         | Manual instruction           | Design completion state                                                   |
| oat-project-discover              | `.agents/skills/oat-project-discover/SKILL.md:567`                       | Manual instruction           | Discovery state                                                           |
| oat-project-document              | `.agents/skills/oat-project-document/SKILL.md:507`                       | Manual instruction           | Documentation skip metadata                                               |
| oat-project-goal                  | `.agents/skills/oat-project-goal/SKILL.md:320`                           | Manual instruction           | Initial goal metadata; later activation also writes state                 |
| oat-project-implement             | `.agents/skills/oat-project-implement/references/plan-and-resume.md:436` | Manual instruction           | Resume pointer; inspect other shared implementation references            |
| oat-project-import-plan           | `.agents/skills/oat-project-import-plan/SKILL.md:479`                    | Manual instruction           | Imported project mode and metadata                                        |
| oat-project-lite                  | `.agents/skills/oat-project-lite/SKILL.md:493`                           | Manual instruction           | Plan completion state                                                     |
| oat-project-plan                  | `.agents/skills/oat-project-plan/SKILL.md:743`                           | Manual instruction           | Plan routing state                                                        |
| oat-project-plan-writing          | `.agents/skills/oat-project-plan-writing/SKILL.md:614`                   | Shared manual-write contract | Shared project dispatch-policy persistence contract                       |
| oat-project-pr-final              | `.agents/skills/oat-project-pr-final/SKILL.md:823`                       | Manual instruction           | PR metadata                                                               |
| oat-project-pr-progress           | `.agents/skills/oat-project-pr-progress/SKILL.md:600`                    | Manual instruction           | Progress PR metadata                                                      |
| oat-project-promote-spec-driven   | `.agents/skills/oat-project-promote-spec-driven/SKILL.md:135`            | Manual instruction           | Mode promotion metadata                                                   |
| oat-project-quick-start           | `.agents/skills/oat-project-quick-start/SKILL.md:261`                    | Manual instruction           | Initial quick metadata                                                    |
| oat-project-review-provide        | `.agents/skills/oat-project-review-provide/SKILL.md:1666`                | Manual instruction           | Goal recovery stage and review artifact                                   |
| oat-project-review-receive        | `.agents/skills/oat-project-review-receive/SKILL.md:863`                 | Manual instruction           | Fix routing metadata                                                      |
| oat-project-review-receive-remote | `.agents/skills/oat-project-review-receive-remote/SKILL.md:265`          | Manual instruction           | Remote review routing metadata                                            |
| oat-project-revise                | `.agents/skills/oat-project-revise/SKILL.md:291`                         | Manual instruction           | Revision phase and pointer                                                |
| oat-project-spec                  | `.agents/skills/oat-project-spec/SKILL.md:411`                           | Manual instruction           | Specification completion state                                            |

## Additional pointers from the brief gate

The original baseline above remains unchanged. The gate identified another manual write at `.agents/skills/oat-project-complete/SKILL.md:1078–1081`: after CLI-owned `complete-state`, the skill directs a manual `oat_pr_status_observed_at` write. Include it in p01's per-write-site reconciliation. Root verified this instruction on 2026-11-10.

For p02's required documentation update, `apps/oat-docs/docs/workflows/projects/closeout/closeout-skills.md:623` restates the goal-mode per-run bookkeeping-PR request rule; update that restatement with the accepted authority realignment.

## p01 coverage reconciliation

Pending implementation. Preserve the baseline above and record the final per-write-site mapping here, with added/reclassified/removed candidates, manual versus CLI-owned ownership, and the check invocation or shared instruction that covers each manual boundary. The plan-review grep reported 31 matching directories, but its broad text matching included non-lifecycle references and is not a competing authoritative count.

## Evidence limits

No shared check has been implemented yet. This inventory is planning evidence, not verification that manual writes are guarded. Implementation and review must inspect the final consumers, including bundled shared references and skills' version-bump dependencies.
