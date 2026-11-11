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

Reconciled against dispatch base `d1df37b4ac6bbd2a8420ac3e9530ea7e626add6d`.
All 21 baseline skills contain an actual manual-write instruction. Added
`oat-project-reconcile` and `oat-wave-execute` (including its wrapper-plan asset):
**24 writing skills**. `oat-project-next` and `oat-project-progress` only read
state here, but also receive version bumps because they bundle the changed
shared gate record. **27 skill bumps**, plus the phase-implementer role bump.
Review M1 adds `oat-brainstorm`'s two project-promotion writes, omitted from the original 86-site mapping: **88 adjacent locations**. No baseline candidate was removed. Counts describe skills, not write sites.
Restrictive tool declarations gain the exact `Bash(oat project check-state:*)`
scope. Three existing `NG` metadata-line hashes in the shared autonomy
inventory are refreshed for those changed declarations; no prompt or policy
is added. Its eight linking skills are in the 27-skill bump set, including
`oat-project-autonomous/references/gate-inventory.md`, whose alias was missed
by the first filename-only enumeration. The committed-history version gate
identified that additional consumer; attempt 2 corrects its required bump.

Enumeration searched every canonical skill/reference/asset, not just the 21
baseline files: `rg -n 'state\.md' .agents/skills .agents/docs`, then write
verbs (`write`, `persist`, `set`, `update`, `record`, `clear`, `remove`,
`append`) and the lifecycle keys (`oat_blockers`, pointers, PR metadata, gate,
milestone, delivery, recovery and sequence fields). Each candidate's owning
paragraph/branch was inspected to distinguish a read, manual instruction, or
CLI/helper-owned write. Files under `tests/`, historical examples and generated
provider views are not canonical lifecycle producers.

### Manual write boundaries

Each locator below names the adjacent required invocation after the write.
`PROJECT_PATH` is the resolved containing project directory. For a conditional
write, invoke only when that branch actually writes; one successful invocation
covers the same write governed by several contracts. Stop, repair and recheck
on any nonzero result before committing or taking a later workflow effect.
The scoped multi-transition contracts below apply after **each individual
write**, not once at the end of the section.

| Canonical instruction / check locator                                             | Manual write boundary                                                                            | Required check                                                                                 |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `.agents/skills/oat-brainstorm/SKILL.md:528`                                      | Lite promotion routing state                                                                     | `oat project check-state "$PROMOTED_PROJECT"`; stop on nonzero before commit/continuation      |
| `.agents/skills/oat-brainstorm/SKILL.md:594`                                      | Quick/spec-driven promotion discovery state                                                      | `oat project check-state "$PROMOTED_PROJECT"`; stop on nonzero before commit/continuation      |
| `.agents/skills/oat-project-brief/SKILL.md:205`                                   | Consolidated scaffold metadata                                                                   | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-brief/SKILL.md:218`                                   | Initial brief metadata                                                                           | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-brief/SKILL.md:342`                                   | Project dispatch policy                                                                          | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-brief/SKILL.md:379`                                   | Disabled lifecycle gate choices                                                                  | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-brief/SKILL.md:584`                                   | Plan-complete routing                                                                            | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-capture/SKILL.md:165`                                 | Capture metadata                                                                                 | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-capture/SKILL.md:247`                                 | Completed capture routing                                                                        | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-capture/SKILL.md:263`                                 | In-progress capture routing                                                                      | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-complete/SKILL.md:680`                                | Documentation skip: required or optional policy branch                                           | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-complete/SKILL.md:1027`                               | Retirement-sweep fix to another active project (check its containing directory)                  | `oat project check-state "$AFFECTED_PROJECT_PATH"`; stop on nonzero before commit/continuation |
| `.agents/skills/oat-project-complete/SKILL.md:1209`                               | PR observation timestamp after CLI complete-state                                                | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-design/SKILL.md:814`                                  | Design completion and folded spec HiLL state                                                     | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-discover/SKILL.md:578`                                | Discovery completion and HiLL state                                                              | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-document/SKILL.md:487`                                | No-recommendations early exit                                                                    | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-document/SKILL.md:507`                                | Operator skip: before commit and early exit                                                      | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-document/SKILL.md:581`                                | Apply success/failure documentation metadata                                                     | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-goal/SKILL.md:318`                                    | Consolidated scaffold metadata                                                                   | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-goal/SKILL.md:334`                                    | Initial goal metadata                                                                            | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-goal/SKILL.md:425`                                    | Project dispatch policy                                                                          | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-goal/SKILL.md:462`                                    | Disabled lifecycle gate choices                                                                  | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-goal/SKILL.md:643`                                    | Approved milestone plan carrier                                                                  | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-goal/SKILL.md:658`                                    | Plan-complete routing                                                                            | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-goal/SKILL.md:707`                                    | Milestone activation and projected PR observation                                                | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-goal/SKILL.md:757`                                    | Next milestone pointer before activation                                                         | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-goal/SKILL.md:789`                                    | Terminal declaration/audit before commit                                                         | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-goal/SKILL.md:801`                                    | Audit repair before rechecking closeout                                                          | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/completion-and-closeout.md:19`   | Task blocker metadata                                                                            | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/completion-and-closeout.md:120`  | Milestone exit carrier, including blocked/no-gate/disabled outcomes                              | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/completion-and-closeout.md:138`  | Milestone exit freshness and stale-subject result                                                | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/completion-and-closeout.md:148`  | Milestone or recovery review-stage transition before handoff commit                              | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/completion-and-closeout.md:159`  | Terminal PR-step delivery-coverage satisfaction before other steps                               | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/completion-and-closeout.md:233`  | Pre-closeout task-completion baseline                                                            | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/completion-and-closeout.md:662`  | Shared Step 14 contract: each gate transition (expanded below)                                   | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/completion-and-closeout.md:1266` | Shared Step 15 contract: each sequence transition (expanded below)                               | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/completion-and-closeout.md:1459` | Implementation completion and HiLL state                                                         | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md:298`     | Managed, uncapped or inherited project dispatch-policy persistence                               | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/phase-execution.md:301`          | Shared recovery reservation, completed/failed marker and root-settlement contract                | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/phase-execution.md:1179`         | Pre-review resume/last-commit metadata, settled recovery marker and legacy-key removal           | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/phase-execution.md:1256`         | Post-review resume/last-commit metadata                                                          | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/plan-and-resume.md:438`          | Approved resume-pointer drift repair                                                             | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/plan-and-resume.md:478`          | Task-mode implementation initialization                                                          | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-implement/references/plan-and-resume.md:489`          | Brief/goal phase-pointer initialization                                                          | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-import-plan/SKILL.md:346`                             | Project dispatch policy                                                                          | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-import-plan/SKILL.md:395`                             | Disabled lifecycle gate choices                                                                  | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-import-plan/SKILL.md:496`                             | Import or accepted-lite completion routing                                                       | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-lite/SKILL.md:189`                                    | Consolidated scaffold metadata                                                                   | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-lite/SKILL.md:348`                                    | Project dispatch policy (shared plan-writing contract)                                           | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-lite/SKILL.md:379`                                    | Disabled lifecycle gate choices                                                                  | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-lite/SKILL.md:510`                                    | Plan-complete routing                                                                            | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-plan-writing/SKILL.md:502`                            | Shared disabled-gate posture persistence                                                         | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-plan-writing/SKILL.md:620`                            | Shared project dispatch-policy persistence                                                       | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-plan/SKILL.md:492`                                    | Project dispatch policy                                                                          | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-plan/SKILL.md:578`                                    | Disabled lifecycle gate choices                                                                  | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-plan/SKILL.md:763`                                    | Plan-complete routing and HiLL state                                                             | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-pr-final/SKILL.md:825`                                | Synced PR-open metadata before second push                                                       | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-pr-final/SKILL.md:887`                                | Ready/open PR metadata before continuation                                                       | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-pr-progress/SKILL.md:474`                             | Stale exit/review evidence: active or older delivery recovery before stop                        | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-pr-progress/SKILL.md:493`                             | Already-registered delivery: clearance, delivered status and PR projection                       | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-pr-progress/SKILL.md:514`                             | Registering delivery, reciprocal replacement/correction links and evidence before commit/create  | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-pr-progress/SKILL.md:531`                             | Created/attached delivery member and open status before commit                                   | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-pr-progress/SKILL.md:550`                             | Older delivery recovery clearance; active branch reuses the already-registered write             | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-pr-progress/SKILL.md:613`                             | Synced PR-open metadata before second push                                                       | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-promote-spec-driven/SKILL.md:142`                     | Spec-driven promotion metadata and phase alignment                                               | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-quick-start/SKILL.md:271`                             | Initial quick metadata, including absorbed scaffolds in the same write                           | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-quick-start/SKILL.md:382`                             | Promotion to spec-driven before dashboard/commit/exit                                            | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-quick-start/SKILL.md:593`                             | Lightweight-design completion before pause/plan                                                  | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-quick-start/SKILL.md:773`                             | Project dispatch policy                                                                          | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-quick-start/SKILL.md:820`                             | Disabled lifecycle gate choices                                                                  | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-quick-start/SKILL.md:1261`                            | Plan-complete routing                                                                            | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-reconcile/SKILL.md:212`                               | Interrupted goal-recovery stage repair after confirmation                                        | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-reconcile/SKILL.md:224`                               | Confirmed delivery attachment after ambiguous lookup                                             | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-reconcile/SKILL.md:747`                               | Reconciled resume pointer, last commit and timestamp (task, brief or active-goal scope)          | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-review-provide/SKILL.md:1670`                         | Goal recovery: receiving stage and exact review artifact before commit                           | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-review-receive-remote/SKILL.md:272`                   | Remote-review fix routing before commit/handoff                                                  | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-review-receive/SKILL.md:557`                          | Queued-fix exit/review evidence invalidation                                                     | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-review-receive/SKILL.md:569`                          | Queued-fix active pointer/status or older recovery record                                        | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-review-receive/SKILL.md:589`                          | Clean-receive registered evidence rebinding before first commit                                  | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-review-receive/SKILL.md:606`                          | Clean-receive active/older delivering transition or stale exit invalidation before second commit | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-review-receive/SKILL.md:888`                          | Queued-fix routing, with brief/goal phase pointer override                                       | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-review-receive/SKILL.md:1102`                         | Execute-now status before handoff                                                                | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-revise/SKILL.md:243`                                  | Goal inline revision evidence invalidation and active/older recovery                             | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-revise/SKILL.md:299`                                  | Inline revision pointer                                                                          | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-revise/SKILL.md:319`                                  | Artifact/remote revision status before delegation                                                | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-project-spec/SKILL.md:425`                                    | Spec completion and HiLL state                                                                   | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-wave-execute/SKILL.md:218`                                    | Wrapper scaffold metadata and delayed plan-ready state; check after each actual write            | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |
| `.agents/skills/oat-wave-execute/assets/wrapper-plan-template.md:55`              | Generated wrapper execution contract: blocker frontmatter before any continuation                | `oat project check-state "$PROJECT_PATH"`; stop on nonzero before commit/continuation          |

### Shared carrier and transition coverage

The shared gate-core write rule is in
`.agents/docs/gate-approval-record.md`, immediately before `## Carriers`:
`oat project check-state "$PROJECT_PATH" || exit 1`. It covers brief and quick
outcome writes, including disabled, blocked and stop paths. The goal plan and
exit carrier instructions also reference this core; their adjacent call in the
table above satisfies it once, without a second call. All six symlink consumers
(brief, goal, implement, quick-start, next, progress) are bumped and the bundle
materializes the linked file.

| Actual manual instruction family                                                                                                                      | Shared check that applies after every write                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Brief Gate Execution: allowed/passed, bookkeeping-only passed, warned, prompt-approved, blocked, project-disabled; commit before stop or approval     | Shared gate-core write rule                                                                                                       |
| Quick-start Gate Execution: same terminal outcomes, including disabled branch before completion                                                       | Shared gate-core write rule                                                                                                       |
| Implement Step 14: resolved pending generation; allowed/no-gate; allowed/project-disabled                                                             | Step 14 scoped check                                                                                                              |
| Implement Step 14: launch intent; accepted marker/run; result envelope; not-accepted evidence                                                         | Step 14 scoped check                                                                                                              |
| Implement Step 14: missing/ambiguous result or acceptance; blocked reconciliation failure                                                             | Step 14 scoped check before stop                                                                                                  |
| Implement Step 14: receive intent/correlation (the incident boundary)                                                                                 | Step 14 scoped check before commit/receiver                                                                                       |
| Implement Step 14: received receipt/commit/completion; receive reconciliation failure                                                                 | Step 14 scoped check before policy/stop                                                                                           |
| Implement Step 14: terminal passed, bookkeeping-only passed, warned, prompt-approved, blocked and decided_at                                          | Step 14 scoped check before sequence/stop                                                                                         |
| Implement Step 14: remediation attempt increment; stale basis; updated pending basis                                                                  | Step 14 scoped check before remediation/relaunch                                                                                  |
| Implement Step 14: stale override/fingerprint generation; rolling freshness checkpoint after corroborated boundary or merge/base update               | Step 14 scoped check before reuse/commit                                                                                          |
| Implement Step 14: explicit operator waiver append                                                                                                    | Step 14 scoped check before checkpoint commit                                                                                     |
| Implement Step 15: lite/configured/autonomous initial immutable snapshot                                                                              | Step 15 scoped check before snapshot commit/first child                                                                           |
| Implement Step 15: malformed/missing snapshot repair; child-altered snapshot restoration and failed step                                              | Step 15 scoped check before stop/commit                                                                                           |
| Implement Step 15: each child result and completed step; pre/post-approval failure context                                                            | Step 15 scoped check before next child/stop                                                                                       |
| Implement Step 15: lite terminal complete; non-lite awaiting approval, explicit approved/post-approval, no-checkpoint not_required, terminal complete | Step 15 scoped check before each commit/dispatch                                                                                  |
| Implement Step 15: autonomous awaiting approval and approved/post-approval                                                                            | Step 15 scoped check before each commit/dispatch                                                                                  |
| Implement Step 15: rolling gate freshness after each sequence/final-HiLL/completion boundary                                                          | Step 15 scoped check before checkpoint commit                                                                                     |
| Recovery: increment/reserve; completed marker; failed marker before or after candidate; root terminal-marker clearing                                 | Recovery-ledger scoped check in phase-execution and canonical phase-implementer role before edit/commit/verification/continuation |

`oat-project-pr-final` goal Step 1.5 loads and follows pr-progress Step 5.5's
registration steps as written, including their checks; it adds no parallel
manual writer. The brief contract's goal transition/ownership tables (sections
12.2–12.9) describe the same owner writes above, not separate execution steps.
The plan-writing shared posture/policy instructions similarly serve their
calling plan producers; one call after the actual write satisfies both.

### Exclusions and ownership

| Candidate / path                                                                                                                                              | Classification and reason                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `oat-project-new`; scaffold creation in brief/goal/lite/quick/import/capture; `oat project promote`; `oat project set-mode`; split/new child lifecycle fields | CLI-owned writes; subsequent manual metadata writes are guarded above                                               |
| Discovery `complete-discovery`, completion `complete-state`, project archive; synced project pull/push; log append                                            | CLI-owned writes; the later manual completion observation timestamp is separately guarded                           |
| Delivery refresh/waive, link refresh, CLI gate/review commands                                                                                                | CLI-owned writes; manual carrier/evidence/registry writes around them remain guarded above                          |
| Explainer/recap intent via `persistIntent(...)` and its optimistic-concurrency helper in autonomous/plan/implement/complete                                   | Executable helper owns the state write and validation; no manual setter migration or duplicate call                 |
| New/open/clear-active/worktree bootstrap pointer commands                                                                                                     | Configuration writes, not project frontmatter writes                                                                |
| Next/progress                                                                                                                                                 | Read-only lifecycle state consumers; shared-doc bump only                                                           |
| Project review-provide-remote and ad-hoc review family                                                                                                        | Explicitly prohibit local lifecycle artifact mutations; remote receiver owns writes                                 |
| Summary/retro/retro-file, docs/repo analysis and PJM skills                                                                                                   | Read project state or write other artifacts; no manual project-state frontmatter instruction found                  |
| Plan/source/promotion/HiLL metadata in `plan.md`, `implementation.md`, discovery/spec/design, review artifacts and README bodies                              | Other frontmatter or prose, outside this parse-only state boundary; same-transaction state writes are checked above |
| `.oat/state.md` dashboard refresh                                                                                                                             | Generated and tolerant, not a strict check or manual project-state boundary                                         |
| `references/docs/*` skill symlinks and packaged copies                                                                                                        | Shared canonical owners, counted once; all linking skill versions tracked                                           |

### Incident and executable evidence

The historical source is available:
`a323ee7ce:.oat/projects/shared/goal-delivery-freshness/state.md`. Its parent
parses; the incident fails with `BAD_INDENT` at YAML line 49. The write
uncommented an indented `gate_run_id` beneath a still-commented
`receive_correlation` parent. Preserve the smallest verbatim excerpt at
`packages/cli/src/commands/project/__tests__/fixtures/manual-state-bad-indent.md`
(source lines 49, 79–80 and 108; omissions are documented in its body). It
retains the same `BAD_INDENT` category at reduced YAML line 2.

`probe-state-check.mjs` needs only Node, Git, an explicit CLI executable, and
that fixture path. From the repository root:

```bash
node .oat/projects/shared/complete-after-merge-and-state-parse/references/research/probe-state-check.mjs /absolute/path/to/oat/dist/index.js packages/cli/src/commands/project/__tests__/fixtures/manual-state-bad-indent.md
```

Use the **pre-fix** CLI build and add `--baseline` to repeat the original
unchecked path: `validate-plan` accepts the same malformed input and Git
commits it. Without `--baseline`, the shipped check must return 1 with
`code: BAD_INDENT`; the fail-stop shell sequence creates neither a commit nor
a continuation marker. A literal valid commented mapping returns 0, remains
byte-identical, and permits the continuation marker. The script removes its
temporary repository. It runs from that unrelated directory, using the given
absolute executable; it imports no repository dependencies.

These probes establish command and representative shell behavior. The inventory
and reviewed prose establish the instructions; neither claims that an actual
agent obeyed every branch. Exact outputs, packed-install evidence, parent/full
historical checks, runtime, tested revision and required gate results are in the
p01 journal and `.oat/analysis/complete-state-parse-p01/` (local-only logs).
