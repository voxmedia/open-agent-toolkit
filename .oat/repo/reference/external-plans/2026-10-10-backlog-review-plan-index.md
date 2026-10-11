---
oat_generated: true
oat_external_plan_index: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
oat_external_plan_commit: 0702df1305492a4886ee5d97be744b35a3633e55
oat_external_plan_main_commit: 0702df1305492a4886ee5d97be744b35a3633e55
oat_external_plan_date: '2026-10-10'
created: '2026-10-11T00:17:45Z'
---

# External Plan Index: Approved October 10 backlog subset

This index records selection and ordering. It is not an executable plan or an
`oat-project-import-plan` target. Plans are authored from live file inspection
at the SHA above, with fetched origin/main and merge-base equal to that SHA.
The worktree was clean before plan writes.

## Implementation update — 2026-10-10

All three selected capabilities are implemented on `feat/october-backlog-fixes`
and their source items are archived in this PR. The selection evidence below
records the original planning state. Independent review, merge, and publication
remain pending; the individual plans retain their authored provenance.

## Selection and review coverage

Only the three operator-approved OAT items were considered. All are open,
unassigned, have settled acceptance criteria, and had empty `external_plans`.
No alternatives were substituted. The September 26 living review and August 30
priority alignment are historical context: alignment predates every selected
item and is explicitly labelled stale by the review. No rankings or ownership
claims from those artifacts were assumed current.

| Item                                                                                                        | Review coverage and current evidence                                                                                                                                                                            | Value / effort / risk / confidence | plan_ready | execution_ready |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- | --------------- |
| BL-260907-ignore-backslash-escaped — Ignore backslash-escaped emphasis in skill-script reference extraction | Explicit review row 216; guard absent at `skill-script-references.ts:146-147`; current criteria unchanged.                                                                                                      | Low / XS / low / high              | yes        | yes             |
| BL-260928-serialize-concurrent-agents-md — Serialize concurrent AGENTS.md guidance appends                  | Created after review and not considered there. Independently verified `agents-md.ts:801-829` stale classification window and existing safety suite.                                                             | Low / S / medium / high            | yes        | yes             |
| BL-260927-add-a-side-effect-free-dry-run — Add a side-effect-free dry run to oat project log append         | Created September 27 UTC / September 26 CDT and explicitly included at row 136, consistent with the local review date. Live code has no flag and mutates lock state before validation. Issue #314 remains open. | Low / S / medium / high            | yes        | yes             |

The serializer is selected on independently settled criteria and current code,
not its timestamp. Dry-run is explicitly covered by the living review; its UTC creation timestamp
falls on September 26 in America/Chicago, matching the review date. Requirements
were rechecked independently. No selected item
was found materially changed beyond review coverage, except the serializer's
later creation, recorded above.

## Recommended order

| Order | Plan                                                                                    | Source item                                                                                                        | Depends on | Tracking and rationale                                                                                                       |
| ----- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1     | [Ignore escaped emphasis](./2026-10-10-ignore-escaped-emphasis-in-script-references.md) | [BL-260907-ignore-backslash-escaped](../../pjm/backlog/archived/BL-260907-ignore-backslash-escaped.md)             | None       | Smallest bounded false-positive fix.                                                                                         |
| 2     | [Serialize guidance appends](./2026-10-10-serialize-agents-md-guidance-appends.md)      | [BL-260928-serialize-concurrent-agents-md](../../pjm/backlog/archived/BL-260928-serialize-concurrent-agents-md.md) | None       | Independent target; retain all filesystem defenses.                                                                          |
| 3     | [Preview log appends](./2026-10-10-preview-project-log-appends-without-side-effects.md) | [BL-260927-add-a-side-effect-free-dry-run](../../pjm/backlog/archived/BL-260927-add-a-side-effect-free-dry-run.md) | None       | Existing [issue #314](https://github.com/voxmedia/open-agent-toolkit/issues/314); shared validation and zero-write boundary. |

## Dependency notes

These implementation surfaces are disjoint. Execution can be independent, but
release manifests/lockfile and any integration bookkeeping need one owner.
All plans are READY; no unsatisfied hard dependency was found. Guidance safety
and log validation are existing prerequisites, not new projects to launch.

## Ownership and existing-plan checks

- Checked empty item backlinks and searched all current external-plan files
  for the three IDs and equivalent outcomes, then examined related predecessor
  plans. No matching plan owns an approved outcome; no broken backlink exists.
- [Validate script references](./2026-09-02-validate-skill-script-references-against-pack-manifests.md)
  introduced the extractor but does not specify the escaped-emphasis follow-up.
- [Instruction-sync pointers](./2026-09-02-keep-instruction-sync-pointers-out-of-docs-trees.md)
  mentions the guidance helper without planning concurrent append serialization.
- [Gate log retry](./2026-09-02-retry-gate-project-log-finalization-across-index-locks.md)
  and [completion seal](./2026-09-08-make-the-completion-seal-idempotent.md) address
  distinct mutation/recovery outcomes, not a side-effect-free probe.
- Current project artifacts contain no exact-ID or same-outcome claim. Some
  state files still report historically open PRs; the live GitHub inventory is
  authoritative: only #357, #190, and #125 are open. The #190 file inventory has
  no selected implementation-file overlap. #314 is an issue, not an open PR.
- Historical reviews cite merged waves; none is treated as active ownership of
  these follow-ups. Recheck exact execution HEAD and PR inventory before work.

## Skipped and excluded

No allowlisted item was skipped. No existing same-outcome plan required
exclusion. All other backlog items, broad audits, new items, implementation,
project import, issue publication, and deployment were outside this stage.
Default content exclusions remain `.agents/`, `.claude/`, `.codex/`, `.cursor/`
at every depth, plus credentials, runtime stores, dependencies, and build
outputs. Only bounded guidance reads and source-cited verification were used.
No excluded directory was used to invent findings or additional candidates.

## Validation and handoff

Planning used `oat pjm doctor --json` (declared adoption, exit 1 only for the
pre-existing completed-unarchived warning affecting 11 other items), clean-tree
and provenance Git reads, current GitHub PR/issue reads, source/test inspection,
and plan/frontmatter/link conservation checks. No source fix, behavioral regression test,
production probe, or generated-plan execution occurred. The coordinating
workflow runs the root Definition of Done gates and records exact results;
this index does not claim full-CI success. Review corrections run only the
existing focused external-plan acceptance test; that test checks these planning
contracts, not the proposed fixes. Individual plans name future
focused regressions and all implementation gates.

Plan writes and exact reverse links are the only product of this stage. Do not
create duplicate backlog records. New backlog-item creation and GitHub issue
publication were declined under the wave's plans-only policy. Each plan may be
executed directly once authorized or optionally imported using
`oat-project-import-plan`; this run performs neither handoff.
