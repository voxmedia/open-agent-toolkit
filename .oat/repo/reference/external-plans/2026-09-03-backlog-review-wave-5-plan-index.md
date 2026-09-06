---
oat_generated: true
oat_external_plan_index: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/reference/project-summaries/20260903-tool-pack-scope-provider-truthfulness.md
oat_external_plan_commit: dd41adb9bed53aa2389e911b601615fc2b26f0b7
oat_external_plan_date: '2026-09-03'
created: '2026-09-04T03:55:32Z'
---

# External Plan Index: Backlog review Wave 5 (truthfulness residue)

This index records selection and ordering. It is not an executable plan and is
not an `oat-project-import-plan` target.

## Selection

- Selected: three of the eight `BL-260903-*` items PR #255 created, plus
  issue #258 (skill versioning against the Agent Skills spec), the terminal
  project-status item from PR #248's retro, and issue #203's resolution-time
  diagnostic, all added on 2026-09-04: the
  openly recorded provider-reachability gap (medium/M), the pr-final archive
  ordering defect from the project retro (medium/S), and the pre-existing
  `__proto__` config-key drop found in its final gate review (low/S, cheap,
  uncontended). All were verified against `origin/main` at `dd41adb9b`.
- Deferred/rejected: `BL-260903-retire-deprecated-pack` runs after provider
  reachability lands (it then shrinks to placement retirement);
  `BL-260903-close-claude-runtime-lineage`, `-close-manual-only-agents-md`,
  and `-project-document-should-prompt` are low-priority residue or policy
  choices; `BL-260903-verify-the-packs-inventory` is a documentation check,
  not a plan; `BL-260904-stabilize-the-collection` needs a reproduction
  before planning.
- Unaudited or out of scope: implementation, plan import, PR creation, and
  issue mutation.

## Recommended order

| Order | Plan                                                                                                                                               | Source item                                | Execution | Depends on                                                                                  | Rationale                                                                                                                             |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [Populate provider reachability evidence across pack and lifecycle surfaces](./2026-09-03-populate-provider-reachability-evidence.md)              | `BL-260903-populate-provider-reachability` | READY     | PR #255 satisfied; consume, do not reshape, the sync JSON owned by the W4 restamp plan      | Known gap PR #255 recorded openly; also fixes list/info managed-role divergence.                                                      |
| 2     | [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md) | `BL-260903-pr-final-archives-reviews`      | READY     | After W5 lanes that edit the two shared contract-test files; PR #190 soft (autonomy mirror) | Retro-filed workflow defect; skill prose plus two contract tests.                                                                     |
| 3     | [Preserve `__proto__`-named config keys through JSON parsing](./2026-09-03-preserve-proto-named-config-keys.md)                                    | `BL-260903-preserve-proto-named-config`    | READY     | PR #190 soft (gate consumer)                                                                | Pre-existing parser drop; uncontended surface; includes the document-instead alternative.                                             |
| 4     | [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md)                                         | `BL-260904-honor-metadata-version`         | READY     | After the pr-final lane (shared `validation/skills.test.ts` pins)                           | Issue #258: spec conformance for skill versioning; resolver, findings, templates, docs.                                               |
| 5     | [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md)         | `BL-260901-make-terminal-project-status`   | READY     | After the active-pointer and quick-route lanes (shared pins file and `next` skill)          | High/S from PR #248's retro: terminal projects with revision phases misreport totals and recommend resuming. Scheduled in W5 group 4. |
| 6     | [Diagnose canonical skills missing from a provider view at resolution time](./2026-09-04-diagnose-canonical-skills-missing-from-provider-views.md) | `BL-260904-diagnose-canonical-skills`      | READY     | After the provider-reachability lane (shared `info-tool.ts`)                                | Issue #203's remaining half; hosted in `oat tools info`, status untouched. Scheduled in W6 group 2.                                   |

## Dependency notes

- Plans 1–3 share no source file and run as one parallel group. Plan 4
  follows plan 2 because both edit the version pins in
  `validation/skills.test.ts`; its bulk-migration follow-up
  (`BL-260904-migrate-bundled-skills-from`) is deliberately outside the
  program.
- Plan 2 edits `validation/skills.test.ts` and
  `review-skill-contracts.test.ts`, which several W5 lanes also extend; W6
  runs after W5 so those seams are settled.
- Plan 5 edits the control-plane parser and recommender and, since the
  2026-09-05 review, `oat-project-next/SKILL.md` Step 5.2 with its version pin
  in `validation/skills.test.ts`; it is scheduled into W5 group 4 after the
  active-pointer lane (shared pins file) and after the group-1 quick-route
  lane (shared `next` skill). Plan 6 follows plan 1 because both edit
  `oat tools info`; it deliberately stays out of `status/index.ts`, which the
  W4 restamp lane and plan 1 own.
- Plans 2, 3, and 4 carry a landing-event row for draft PR #190 (it edits
  `validation/skills.test.ts` and `gate/index.ts`); plans 1, 5, and 6 are not
  affected by it. The truthfulness merge is these plans' baseline, not an
  event.
