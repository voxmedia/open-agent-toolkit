---
oat_generated: true
oat_generated_at: 2026-08-31T14:50:06Z
oat_review_scope: p-rev1
oat_review_type: code
oat_review_invocation: auto
oat_review_status: blocked
oat_project: .oat/projects/shared/recon-skill
oat_review_head_sha: 8fe8c43df249a9bae94af38fcc54d7bdd57ced9d
---

# Code Review: p-rev1 and Complete p02 Safety Closure

**Reviewed:** 2026-08-31T14:50:06Z
**Scope:** Tasks p02-t01 through p02-t04 and prev1-t01 through prev1-t02; authoritative range `0329604d4d45775bee37d5de1136678805b204e3..8fe8c43df249a9bae94af38fcc54d7bdd57ced9d`
**Files reviewed:** 36 range files plus governing artifacts and all four prior p02 review artifacts
**Commits:** 19
**Reconnaissance:** not-attempted

## Summary

Revision p-rev1 genuinely simplifies the implementation around one branded,
deeply immutable, non-persisted `ValidatedRun`: assurance and render cores
consume that graph, raw/partial inputs are rejected, and the range adds no new
schema version, profile, persisted intermediate, review pass, provider behavior,
integration, or generalized artifact framework. The five round-4 bypasses are
closed in their original forms, but two adjacent packet-safety paths remain:
source/output trust roots are not all bound and rechecked at publication, and a
receipt selection mismatch can silently downgrade a declared-complete stage into
a publishable partial packet without recording a failed pass or capping supported
assurance.

Findings: 0 critical, 2 important, 0 medium, 0 minor

## Verdict

**BLOCKED.** Decision 1 is **No**: the complete p02 implementation does not yet
satisfy the governing packet-safety contract with zero Critical/Important
findings, so p-rev1 does not pass and the full p02 blocking review history is not
closed. Decision 2 is **Yes**: the revision is a focused simplification around
one non-persisted immutable `ValidatedRun` boundary and does not introduce the
listed overengineering or non-goal surfaces.

## Dispatch Evidence

`Dispatch: scope=p-rev1 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

## Authoritative Range

| Boundary                            | Commit                                     |
| ----------------------------------- | ------------------------------------------ |
| Complete p02 implementation base    | `0329604d4d45775bee37d5de1136678805b204e3` |
| Round-4 prior reviewed head         | `cf4e5fbf17743825484460ed32f1f522075eb552` |
| p-rev1 design simplification        | `9e8a92e48761ce4db5fc95239270498a8bc101ca` |
| p-rev1 implementation/reviewed head | `8fe8c43df249a9bae94af38fcc54d7bdd57ced9d` |

The authoritative range contains the four original p02 task commits, all three
p02 corrections, their review/bookkeeping commits, and both p-rev1 commits.
Tracking-only files were read for lifecycle context but were not treated as
implementation evidence.

## Prior-Finding Dispositions

| Round-4 finding                                                                | Disposition                  | Fresh evidence                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------ | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required approval and receipt-selection axes can be deleted                    | **Closed as stated**         | Deleting each of the 13 canonical envelope axes and each of the 7 receipt-selection axes is rejected. Complete envelope/selection equality is enforced for accepted and completed receipts.                     |
| Shadow reconciliation can authorize removal against a forged prior ledger      | **Closed**                   | An added forged-prior reconciliation is rejected with `SHADOW_RECONCILIATION`; validation resolves one terminal reconciliation and passes its one prior-ledger identity into review binding and removal checks. |
| Secret-bearing stale/unavailable/invalid audit evidence can persist and render | **Closed**                   | Stale, invalid, and unavailable mutations are rejected with `UNREDACTED_SECRET`; diagnostics do not echo the secret-like value and `packet.md` is absent after render rejection.                                |
| Caller can mark an ineligible-source gap non-material under complete status    | **Closed**                   | The direct mutation is rejected with `SOURCE_GAP_REQUIRES_MATERIAL_PARTIAL`; affected claims must be below `supported`.                                                                                         |
| Trust-root symlink aliases and retargets are accepted                          | **Partial; still Important** | Packet/repository aliases and packet-root retargeting are rejected, but declared output aliases and post-validation repository/file/capture retargets remain publishable (Important 1).                         |

Earlier review findings covering exact source/locator identity, closed artifact
shapes, claim-bearing review briefs, receipted assurance results, required lane
topology, next-revision reconciliation, typed removal authorization, material
coverage downgrades, honest ineligible-source audit retention, selective
blindness, and stale-render cleanup remain closed under the fresh 86-test recon
suite and direct probes. No prior finding is treated as closed solely because a
prior artifact claimed it was fixed.

## Findings

### Critical

None.

### Important

- **Publication rechecks only the packet root, leaving source and declared output identities retargetable** (`.agents/skills/recon/scripts/lib/validated-run.mjs:43`)
  - Issue: `ValidatedRun` stores only `packetRootIdentity`, and
    `renderValidatedPacket` rechecks only that identity before publication at
    `.agents/skills/recon/scripts/render-packet.mjs:188`. Source reopening checks
    canonicality at read time but does not retain repository, file, or capture
    identities for the publication boundary. The manifest contract also checks
    `request.outputPath` only as a string at
    `.agents/skills/recon/scripts/lib/contracts.mjs:374`; it never binds that
    declared output root to the canonical packet/publication root. Fresh probes
    compiled valid quick packets, then replaced the repository root, file source,
    or capture path with a symlink to its moved original; all three still
    published. A separate packet declared a symlink alias as
    `request.outputPath`; validation returned valid and rendering succeeded.
    Exact locators may therefore be stale at the moment of publication, and the
    packet may claim an unvalidated destination identity.
  - Fix: Capture the canonical filesystem identity used for every repository,
    file, capture, command-output, packet, and publication root in the
    `ValidatedRun`; require `request.outputPath` to equal the canonical packet
    root; and recheck all identities immediately before temporary write and
    promotion. Reject any alias or device/inode change. Add alias and
    post-validation retarget tests for every source discriminator plus the
    declared output/publication path.
  - Requirement: Design invariant 4; packet-contract canonical-root boundary;
    prev1-t02 Step 1.

- **Receipt selection drift silently downgrades a declared-complete stage into a dishonest partial** (`.agents/skills/recon/scripts/validate-packet.mjs:635`)
  - Issue: `stageArtifactIsComplete` correctly returns false for receipt
    selection/envelope mismatches, but `validateStageTopology` merely omits that
    stage from `completeArtifactIdsByMode` and emits no error when the manifest
    still declares the stage `complete`. The partial-status branch at
    `.agents/skills/recon/scripts/validate-packet.mjs:1676` then accepts a lower
    derived profile. A fresh quick mutation changed one accepted receipt's model,
    updated its artifact digest, and set the run to `partial` with achieved
    profile `null`; validation and rendering succeeded, the affected stage still
    reported `complete`, a `supported` claim remained, and the handoff listed no
    failed or omitted passes. Exact selection drift is thus hidden as an honest
    downgrade instead of failing closed, and assurance is not capped by the
    actually achieved profile.
  - Fix: Emit a structural packet error whenever a stage declared `complete`
    fails its exact artifact/receipt/selection contract. Accept lower-profile
    partials only from stages explicitly recorded as failed or omitted with the
    required safe gap/diagnostic evidence. Also derive the rendered failed-pass
    list from normalized topology and prohibit `supported` assurance unless the
    quick profile is actually achieved. Add selection-drift mutations for every
    accepted/completed receipt axis under complete and partial statuses.
  - Requirement: Exact approved selection/no-substitution contract; honest
    partial publication; p02-t02 and prev1-t02.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** repository root and `packages/cli/AGENTS.md`;
`.oat/projects/shared/recon-skill/discovery.md`; `design.md`; `plan.md`;
`implementation.md`; `.agents/agents/oat-reviewer.md`;
`.agents/skills/recon/SKILL.md`; packet, profile, and worker contracts; the
complete authoritative diff and post-image implementation/tests; and all four
prior p02 reviews. This is a quick-mode project, so `spec.md` is intentionally
absent and was not required.

### Requirements Coverage

| Requirement                                                                     | Status          | Notes                                                                                                                                                                               |
| ------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete canonical approval envelope and exact accepted/completed selection     | **Partial**     | Required axes and equality are closed, but a mismatched receipt can silently lower achieved profile while its stage remains declared complete (Important 2).                        |
| Exact approved wave/lane topology and one typed stage/receipt resolution        | **Partial**     | Required lanes, typed artifacts, and receipt pairs are bound; invalid declared-complete receipt evidence is not itself a structural error (Important 2).                            |
| One terminal reconciliation and one immutable prior-ledger identity             | **Implemented** | Extra reconciliation results are rejected and removal/review binding uses the terminal reconciliation's prior ledger.                                                               |
| Canonical roots and identity stability through publication                      | **Partial**     | Packet aliases/retargeting and pre-validation source aliases are rejected; source retargets after compilation and declared output aliases remain open (Important 1).                |
| Secret safety before assurance, audit, gap, and render branches                 | **Implemented** | Global persisted-data scanning precedes evidence eligibility; stale/invalid/unavailable secret probes reject without diagnostic or rendered leakage.                                |
| Source ineligibility derives material gaps, partial status, and claim downgrade | **Implemented** | Non-material or complete mutations reject; exact material partials with affected claims below supported remain valid.                                                               |
| Assurance/render consume only immutable normalized data                         | **Implemented** | `ValidatedRun` is branded in-memory, deeply frozen, not persisted, and raw/partial objects cannot enter assurance or render cores.                                                  |
| Honest complete/partial/failed outcomes                                         | **Partial**     | Normal complete/material-gap/source-gap paths are derived correctly, but receipt drift can create a partial whose declared stage and handoff omit the actual failure (Important 2). |

### Overengineering and Non-Goal Assessment

**Passes.** The p-rev1 substantive range creates one small internal
`validated-run.mjs` module and centralizes existing validation/render behavior.
It retains schema version 1 and the existing `quick`, `standard`, and `thorough`
profiles. No new persisted artifact, saved validation policy/profile, review
pass, provider dispatch behavior, research-pack distribution change,
documentation integration, project hook, or generalized plugin/artifact
framework was introduced. `ValidatedRun` is absent from the packet directory and
is exposed only as a branded frozen process-local value.

### Extra Work (not in declared requirements)

None. The p-rev1 substantive files are limited to the recon packet contract,
design, validation/reconciliation/render helpers, fixtures, and focused tests.
Plan/implementation/state changes are lifecycle bookkeeping.

## Fresh Probe and Check Results

All mutation probes used newly created temporary packet roots and post-image
helpers; touched digests were recomputed so failures were attributable to the
target invariant rather than incidental hash mismatch.

| Probe/check                                                                | Result                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Delete each required approval-envelope axis                                | Rejected for all 13 axes                                                             |
| Delete each required receipt-selection axis                                | Rejected for all 7 axes                                                              |
| Forged-prior shadow reconciliation versus terminal prior ledger            | Rejected: `SHADOW_RECONCILIATION`                                                    |
| Secret-bearing stale, invalid, and unavailable audit evidence              | Rejected: `UNREDACTED_SECRET`; diagnostics redacted; no `packet.md`                  |
| Non-material ineligible-source gap under `complete`                        | Rejected: `SOURCE_GAP_REQUIRES_MATERIAL_PARTIAL`                                     |
| Repository/file/capture symlink aliases before validation                  | Rejected                                                                             |
| Packet-root symlink alias and post-validation retarget                     | Rejected                                                                             |
| Repository/file/capture retarget after `ValidatedRun` compilation          | **Incorrectly published** (Important 1)                                              |
| Symlink alias in `manifest.request.outputPath`                             | **Incorrectly valid and rendered** (Important 1)                                     |
| Raw manifest/ledger passed to render core                                  | Rejected: `Expected an immutable ValidatedRun`                                       |
| Receipt model drift with declared-complete stage and lower partial profile | **Incorrectly valid/rendered with supported claim and no failed pass** (Important 2) |
| `node --test .agents/skills/recon/tests/*.test.mjs`                        | Passed: 86/86                                                                        |
| Focused CLI skill validation                                               | Passed: 164/164                                                                      |
| `pnpm test:skills`                                                         | Passed: 681/681                                                                      |
| `pnpm oat:validate-skills`                                                 | Passed: 63 skills                                                                    |
| Plan validation                                                            | Passed                                                                               |
| `pnpm lint`                                                                | Passed; direct `.agents/skills` lint executed                                        |
| `pnpm format`                                                              | Passed; direct skill formatting check executed                                       |
| CLI `tsc --noEmit`                                                         | Passed                                                                               |
| `pnpm check`                                                               | Passed; package checks, docs markdownlint, and skill validation executed             |
| Authoritative range whitespace check                                       | Passed                                                                               |

Turborepo replayed cached build dependencies where reported; recon tests,
focused CLI tests, the complete skill suite, direct skill lint/format coverage,
canonical skill validation, and adversarial probes executed in this review.
Known p03 bundle materialization and release-version work was not evaluated as a
p-rev1 defect because this range did not introduce or claim that pending scope.

## Verification Commands

```bash
node --test .agents/skills/recon/tests/*.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm test:skills
pnpm oat:validate-skills
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/recon-skill
pnpm lint
pnpm format
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
pnpm check
git diff --check 0329604d4d45775bee37d5de1136678805b204e3..8fe8c43df249a9bae94af38fcc54d7bdd57ced9d
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the two Important findings into
bounded correction tasks. Root must not mark p-rev1 or p02 passed until both are
fixed and a fresh independent review confirms zero Critical/Important findings.
