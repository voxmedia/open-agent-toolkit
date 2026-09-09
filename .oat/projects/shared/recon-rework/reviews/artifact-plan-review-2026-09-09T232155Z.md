---
oat_generated: true
oat_generated_at: 2026-09-09T23:21:55Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/recon-rework
oat_prior_review_artifact: .oat/projects/shared/recon-rework/reviews/archived/artifact-plan-review-2026-09-09T163711Z.md
---

# Artifact Review: plan (re-review)

**Reviewed:** 2026-09-09
**Scope:** `plan.md` at `daa07edc31421f93735feb5b07d1670d8b2c45c2` (branch `recon-rework`), against `discovery.md`, `design.md`, `handoff.md`, `references/source-context.md`, and the source item `BL-260908-restore-recon-s-cheap-fan-out` (issue #274)
**Files reviewed:** 5
**Reviewer:** root, inline (Tier 3 at the operator's request; reviewer class Fable ≥ the resolved Opus ceiling)
**Reconnaissance:** not-attempted

## Summary

The revision applied all twelve findings of the 2026-09-09 review, and each fix is verifiable in the artifact: the below-floor interpretation is recorded in `## Before Implementation` (74–80) and reconciled at closeout (598–601); the `quick` criterion has task steps (p03-t01.6, p03-t02.4); p01-t01 has an executable verify block with a stated pass condition (157–170); the four-party ownership split (p03-t01.1) and the `schemaVersion: 2` writer contract (p03-t01.4) are required steps; the ten-mode → seven-mode mapping is stated once and is correct against `contracts.mjs:44-55` and `recon-worker.md:12-13`; the Turbo evidence command matches `AGENTS.md`; the generated docs index is in p03-t02's write set with its owning command; the canonical Planning Checklist is restored; the source-context anchor resolves (`skills.test.ts:8405`). Every cited path, package script, decision record, and CLI flag reproduces on the live tree; `validate-plan` passes; the two files the plan lists as **Create** are the only ones absent. The plan is coherent and executable. One Important remains: the v1 compatibility promise (discovery decision 9; success criterion "valid v1 packets validate unchanged") is guarded by a control that can pass vacuously once p02-t02 changes the approval-fingerprint input.

Findings: 0 critical, 1 important, 2 medium, 3 minor

## Findings

### Critical

None.

### Important

- **The v1 fingerprint-stability promise has no non-vacuous control once p02-t02 changes `approvalFingerprintInput`** (`plan.md:187-188`, `plan.md:290-291`, `plan.md:214-215`, `.agents/skills/recon/scripts/lib/contracts.mjs:239`)
  - Issue: p01-t02.1 retains a v1 fixture "with its original flat execution fields and fingerprint algorithm" and lists "v1 accepted unchanged" as a control; p02-t02.6 then includes conditions, targets, and limits in the approval fingerprint. If the v1 fixture's fingerprint is recomputed at test time through the same `approvalFingerprintInput` (`fake-recon-run.mjs:10` imports it; `packet-fixture.mjs` references fingerprint once), a change that alters v1 hashing moves both sides of the assertion and "v1 accepted unchanged" stays green while every previously approved v1 packet in the wild stops validating. That would break decision 9 and the "valid v1 packets validate/render unchanged" success criterion in the refusing direction, undetected.
  - Fix: add to p01-t02 a pinned literal v1 approval fingerprint (computed once from the retained v1 fixture and stored as a string in the test), and to p02-t02's controls "the pinned v1 fingerprint literal is byte-identical after the v2 fingerprint gains conditions; the v2 fingerprint differs from a v2 manifest without conditions". Name the mutation control: change one v1 execution field → the literal no longer matches.
  - Requirement: discovery decision 9; success criterion 5; AC5 (lossless v1 normalization).

### Medium

- **p02-t03 requires the fixture to call production preview/check helpers, but p02-t01 describes them as a CLI** (`plan.md:236-238`, `plan.md:325-326`, `design.md:119-121`, `design.md:319-321`)
  - Issue: the design's API for preview and target checking is `node scripts/prepare-routing.mjs --manifest … --format … | --check-target …`. If the proposal and check logic live in that script's entry point, the fake workflow can only reach them by spawning a subprocess, and "must not contain a separate fake implementation of selection enforcement" becomes hard to satisfy without duplicating logic.
  - Fix: state in p02-t01 that the preview and target-check functions are exported from `routing.mjs` and that `prepare-routing.mjs` is a thin CLI over those exports; p02-t03 then imports them. One sentence in each task.
  - Requirement: AC2/AC3 test coverage; design component 2.
- **p01-t01's pass condition compares against an uncaptured baseline** (`plan.md:165-170`)
  - Issue: "the task passes when that set is unchanged apart from the new accepted record" requires the pre-task `pjm doctor --json` warning set to exist somewhere to compare against; the verify block runs doctor once, after the write. Today doctor exits 1 with `status: warn`, adoption `declared`, so the comparison is load-bearing.
  - Fix: add "capture `pjm doctor --json` to a `mktemp -d` file before step 5 and diff its warning set against the post-task run" as an explicit step; the pass condition then names both files.
  - Requirement: AC6 (decision record created through owning commands).

### Minor

- **`oat_plan_hill_phases` is tracked by the checklist but absent from the frontmatter** (`plan.md:1-15`, `plan.md:42-43`, `.oat/templates/plan.md:8`)
  - Issue: the template ships `oat_plan_hill_phases: []` (empty = pause after every phase); the plan omits the key and leaves the checklist item unchecked, which is honest, but a receiving agent reading the frontmatter alone sees no field to set.
  - Suggestion: carry the template key with a comment "unset — resolved at readiness", or note in Planning Status where it will be set.
- **A stale lockstep number in prose** (`plan.md:511`)
  - Issue: "Do not assume 0.2.66 remains available" — `origin/main` is at 0.2.69 today with 0.2.70 pending. The instruction (fetch and choose strictly greater) is correct; the number is not.
  - Suggestion: drop the number.
- **Three new sentence pins in `skill-contract.test.mjs` prove presence, not behavior** (`plan.md:388`, `plan.md:397`, `plan.md:403`)
  - Issue: the ownership contract, the writer contract, and the quick boundary are each "pinned" as prose; line 430–431 already says text pins alone do not prove behavior. Of the three, only the writer contract has a behavioral backstop (p02-t03's fixture producing a v2 manifest that `validate-packet` accepts).
  - Suggestion: keep the pins but say in p03-t01 what each proves (the sentence exists) and name p02-t03 as the behavioral check for the writer contract; do not add more.

## Spec/Design Alignment

### Requirements Coverage

| Requirement                                                                                                  | Status                               | Notes                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 — intent statement and four-party responsibility split                                                   | covered                              | p03-t01.1                                                                                                                                        |
| AC2 — per-wave floors, no run-wide maximum, cheap defaults, mechanical synthesis                             | covered                              | p02-t01.1, p03-t01.1–.2, .5                                                                                                                      |
| AC3 — per-wave escalation on named triggers inside one fingerprinted envelope                                | covered                              | p02-t01.2–.4, p02-t02.1–.6                                                                                                                       |
| AC4 — approved selection, no self-attested launch provenance                                                 | covered                              | p02-t01.4, p02-t03.7, p03-t02.3                                                                                                                  |
| AC5 — packet-contract v2 (`classFloor`, `target`), schema bump, v1 normalization, `contracts.mjs` validation | covered with recorded interpretation | p01-t02, p02-t02; "below-floor" = structural/identity validation per `design.md:308-312`, recorded at `plan.md:74-80` and reconciled at closeout |
| AC6 — decision superseding DR-260831 and amending DR-260904                                                  | covered                              | p01-t01 (verify block; see Medium 2)                                                                                                             |
| AC7 — `quick` documented as an evidence packet, no independent semantic pass                                 | covered                              | p03-t01.6, p03-t02.4                                                                                                                             |
| Discovery decision 9 — valid legacy v1 packets preserved                                                     | partial                              | p01-t02 retains v1; the control is vacuous after p02-t02 (Important 1)                                                                           |

### Necessity

Each added mechanism names a consumer: `routing.mjs` (validate-packet, prepare-routing, render-packet, the workflow fixture), `prepare-routing.mjs` (the recon controller, to present the approval envelope a human approves), the v2 manifest and conditional-wave validation (validate-packet and render-packet; required by AC3), the `references/verification/` notes (independent repetition of the negative controls). No artifact is written for a deferred reader. The conditional-escalation machinery is the largest addition and is a stated requirement, not a choice; the plan keeps it minimal (fixed identities, single activation, hard caps).

### Extra Work (not in declared requirements)

None.

## Verification Commands

```text
git -C recon-rework diff --stat f0e0f190b..HEAD -- .oat/projects/shared/recon-rework   # 6 files, +190/-83 (exit 0)
test -e <each of 23 cited paths>                                                        # all present; routing.mjs and prepare-routing.mjs absent as Create targets (exit 0)
python3 -c "…package.json scripts…"                                                     # cli, cli:source, check:skill-bumps, release:*, test:*, oat:validate-skills, lint, format present (exit 0)
pnpm run --silent cli:source -- pjm doctor --json                                       # exit 1, status warn, adoption declared (the plan's stated baseline)
pnpm run --silent cli:source -- docs generate-index --help                              # --docs-dir and --output present (exit 0)
pnpm run --silent cli:source -- project validate-plan --project-path .oat/projects/shared/recon-rework   # "Plan validation passed." (exit 0)
grep -n "waveModes" -A 12 .agents/skills/recon/scripts/lib/contracts.mjs               # ten modes (exit 0); recon-worker.md:12-13 seven modes
grep -n "describe('recon canonical contracts'" packages/cli/src/validation/skills.test.ts   # :8405 (exit 0)
python3 -c "…apps/oat-docs/package.json scripts…"                                      # check present (exit 0)
```

## Recommended Next Step

Run `oat-project-review-receive` on this artifact: apply the Important as a plan edit (a pinned v1 fingerprint literal in p01-t02 and the stability control in p02-t02), fold the two Mediums as one-sentence plan edits, and disposition the Minors; then the plan row may move to `passed` and readiness (dispatch policy is already declared; HiLL and gate choices remain) can proceed.
