# Legacy File-Backed Backlog Disposition

This ledger records the 2026-08-30 evidence review of the 24 records that were
still marked active in the pre-canonical `reference/backlog/` tree. The source
tree is preserved at `backlog/`. None of these records is an active canonical
PJM item unless separately promoted under `.oat/repo/pjm/backlog/items/`.

## Promotion candidates

These 13 gaps remain observable in current source. Promotion requires an
explicit canonical backlog decision, a new `BL-*` identity, and preservation of
the listed legacy ID.

| Legacy ID                        | Residual scope                                           | Current evidence                                                                                                 |
| -------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| bl-c745                          | Per-CLAUDE.md instruction-adoption opt-out               | Instruction sync still has only global strategy/force controls.                                                  |
| bl-7e68                          | Quick-mode resume routing consistency                    | Plan, progress, and next still route incomplete quick plans differently.                                         |
| BL-260627-cli-flag-p2-p3-cleanup | Residual CLI migration-semantics audit                   | PJM, docs, and decision migration still expose different mutation defaults.                                      |
| bl-af93                          | Config unset command                                     | Config exposes get, set, and adopt but no unset path.                                                            |
| bl-b5af                          | Documentation-aware discovery prerequisite policy        | Discovery still hardcodes staleness thresholds; GitHub #205 broadens the required policy.                        |
| bl-7d5b                          | Live oat-brainstorm dogfood                              | Recorded scenarios remain simulations rather than live Git-state runs.                                           |
| bl-074b                          | Live project-split entry-path dogfood                    | Deterministic tests exist, but the required live-agent evidence files do not.                                    |
| bl-28ce                          | Persist instruction sync strategy                        | Pointer remains a hardcoded default rather than stored configuration.                                            |
| bl-9fb8                          | Remote review respond/summarize residual                 | Provide/receive exist; four respond/summarize skills remain absent.                                              |
| bl-281c                          | Remaining control-plane-backed plan/implementation reads | State reads shipped; pure plan/implementation readers still parse directly.                                      |
| bl-f19a                          | Strict YAML skill validation                             | Skill validation still uses scalar extraction rather than the strict parser.                                     |
| bl-a7cd                          | Wire provide-remote skills to helper CLI                 | The review-remote helper still lacks a public command owner.                                                     |
| bl-e582                          | Bounded durable-reference reads in lifecycle skills      | Discover, plan, and review-provide do not yet consume canonical current state, decisions, and project summaries. |

## Product decisions required

These five ideas remain technically possible but are not approved current OAT
scope. They stay historical until a fresh product decision promotes them.

| Legacy ID | Decision                                                                                    |
| --------- | ------------------------------------------------------------------------------------------- |
| bl-ff5d   | Decide whether Jira backlog refinement belongs in generic OAT or a Vox-local pack.          |
| bl-931d   | Benchmark listProjects before approving a summary fast path.                                |
| bl-3327   | Decide whether dependency intelligence remains an OAT product capability.                   |
| bl-e6fc   | Re-evaluate same-target/model avoidance against the current family/provenance architecture. |
| bl-71a1   | Decide whether OAT owns a memory subsystem rather than integrating external memory tooling. |

## Historical closeouts

| Legacy ID | Disposition       | Evidence summary                                                                                  |
| --------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| bl-4b5a   | Shipped           | Docs and implementation now define deterministic generated-index ordering.                        |
| bl-0ace   | Shipped           | The project complete-state helper exists and the completion skill invokes it.                     |
| bl-c3d8   | Shipped           | Cursor is a registered enforcing dispatch-ceiling adapter with tests.                             |
| bl-b3f7   | Absorbed          | Current idea and brainstorm workflows cover promotion; only optional automatic detection remains. |
| bl-86e9   | Obsolete          | Root state is generated/local and gitignored, removing the tracked conflict class.                |
| bl-f9bd   | Deferred/obsolete | Its strict-staleness trigger never fired; GitHub #205 owns the nearer policy problem.             |

## Canonicalization rule

Do not point `oat-repo-improve` at this legacy tree. Promote one candidate at a
time through the canonical backlog workflow after confirming title, priority,
scope, estimate, current evidence, and acceptance criteria. Historical source
files must remain available for provenance after promotion.
