---
oat_generated: true
oat_generated_at: 2026-08-31T06:55:41Z
oat_review_scope: p02
oat_review_type: code
oat_review_invocation: auto
oat_review_status: blocked
oat_project: .oat/projects/shared/recon-skill
oat_review_head_sha: c58c148136284cea9548e4398662e53585d674c1
---

# Final Code Re-review: p02

**Reviewed:** 2026-08-31T06:55:41Z
**Scope:** Phase p02, tasks p02-t01 through p02-t04; complete implementation and both fix commits in `0329604d4d45775bee37d5de1136678805b204e3..c58c148136284cea9548e4398662e53585d674c1`
**Reviewed base:** `0329604d4d45775bee37d5de1136678805b204e3`
**Original task head:** `133cf2e8d7e1700806827dfbee34114a64c441a6`
**Fix 1:** `5be0009ad5dabf92283ec937953a78ada8fb0159`
**Fix 2 / reviewed code head:** `c58c148136284cea9548e4398662e53585d674c1`
**Prior reviews:** `reviews/p02-code-review-2026-08-31T054704Z.md`; `reviews/p02-code-rereview-2026-08-31T062204Z.md`
**Files reviewed:** 26 implementation/test files, plus the project artifacts and prior review artifacts
**Commits:** 9 in the authoritative range: 4 planned task commits, 2 fix commits, and 3 intervening bookkeeping commits excluded from code judgment
**Reconnaissance:** not-attempted

## Summary

The second fix correctly adds claim-bearing verification, adversarial, and coverage briefs; same-run stage artifacts and receipts; source-state vocabulary; stronger common-claim reconciliation checks; coverage-gap records; and a fake workflow that invokes the production projector and reconciler on the happy path. The phase is still unsafe to accept: fresh direct probes produced publishable packets whose claim reviews had no accepted/completed receipt, whose approved lanes never ran, whose thorough-only passes were empty generic dossiers, whose reconciliation was bypassed or deleted a contested claim, and whose material coverage gap still left the affected claim `verified`.

Findings: 4 critical, 1 important, 0 medium, 0 minor

## Verdict

**Blocked.** The validator still permits multiple structurally valid paths to false `standard`/`thorough` rigor and false `verified` assurance. This is the last configured phase fix loop, so p02 must not advance; the root workflow should apply its terminal blocked-review policy rather than treating the green checked-in suites as acceptance.

## Critical/Important Block

- **Critical:** 4 unresolved false-assurance paths.
- **Important:** 1 honest-partial publication path is rejected despite an exact material gap and claim downgrade.
- **Decision:** p02 does not pass at `c58c148136284cea9548e4398662e53585d674c1`.

## Dispatch Evidence

`Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

Resolver schemaVersion 1; no notices. Request ID `recon-skill-p02-final-rereview-20260831T0700Z`.

## Prior Finding Dispositions

### Round 2 findings

| Prior finding                                                         | Disposition                 | Final re-review evidence                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review results can verify a claim absent from the immutable brief     | **Closed as stated**        | Semantic briefs now bind exact statement, evidence projections, locators, and sources; adversarial and coverage briefs bind exact claim ID/statement pairs. Empty or content-drifted briefs fail.                                                                                     |
| Achieved profiles trust unbound inline stage completion               | **Partial; still Critical** | Each stage now needs one same-run typed artifact and accepted/completed receipts, but claim-bearing review results need not be the receipted stage artifacts, approved lane topology is not reconciled, and thorough-only passes accept empty generic dossiers. See Critical 1 and 2. |
| Unavailable or invalid sources remain assurance-eligible              | **Partial; Important**      | Ineligible sources can no longer support `supported`/`verified`, but an exactly gapped stale source left in the auditable ledger makes an honestly downgraded partial structurally invalid. See Important 1.                                                                          |
| Reconciliation does not validate transitions against the prior ledger | **Partial; still Critical** | Common-claim state and content continuity is checked for revisions above one, but revision one skips reconciliation entirely and declared removals need no review authorization. See Critical 3.                                                                                      |
| Material coverage findings can be hidden from publication status      | **Partial; still Critical** | The selected coverage result now needs an exact manifest gap and reconciliation disposition, but an affected claim can remain `verified` under a material gap in a partial packet. See Critical 4.                                                                                    |
| Fake workflow does not execute production review/reconciliation       | **Partial**                 | Standard/thorough happy paths now call `createReviewBrief` and `reconcileLedger`, but the fake thorough run still accepts empty generic redundancy artifacts and does not cover the bypasses below. See Critical 1, 2, and 4.                                                         |

### Earlier closure confirmations

The prior closed findings remain closed: file/repository/URL/command/connected-resource locator identity checks, URL validator-state and whole-file variants, realpath/symlink containment, stale `packet.md` cleanup, and same-profile material-gap publication status all passed fresh inspection and tests. No regression was found in those fixes.

## Findings

### Critical

- **Claim-bearing reviews do not need the stage's accepted/completed dispatch receipts** (`.agents/skills/recon/scripts/validate-packet.mjs:1131`)
  - Issue: `validateAssurance` resolves each `claim.reviewIds` artifact and checks its brief, disposition, lane uniqueness, and result status, but never requires that review ID to be the artifact bound to the matching semantic/adversarial/coverage stage and its accepted/completed receipts. `stageArtifactIsComplete` validates a separate artifact chosen by `stage.artifactIds` (`validate-packet.mjs:586`). A fresh probe kept the receipted semantic stage on `review-semantic`, created an exact claim-bearing `review-semantic-unreceipted` on a new lane, used only the unreceipted result in the claim and reconciliation, and received `valid: true`, `publishable: true`, `achievedProfile: standard`.
  - Fix: bind each assurance-bearing review ID to exactly one matching complete stage, require that same review result ID in the stage's completed receipt, and require the reconciliation's incorporated review set to be the receipted stage-result set. Reject extra assurance-bearing results with no accepted/completed lane receipt.
  - Requirement: Independently reviewed categorical assurance and evidence-backed pass completion.

- **Approved lane topology and thorough-only semantics are not part of achieved-profile derivation** (`.agents/skills/recon/scripts/validate-packet.mjs:644`)
  - Issue: profile derivation reduces complete stages to a `Set` of mode names and requires only one stage per mode. It never compares stages with the approved envelope's planned waves/lanes, so a fresh standard probe added an approved gather lane that never received a stage or receipt and still validated as publishable `standard`. Thorough is weaker still: `redundant-verification` and `contradiction-resolution` are accepted as `recon.raw-dossier` artifacts (`validate-packet.mjs:581`) whose closed schema permits empty findings, contradictions, and gaps (`scripts/lib/contracts.mjs:733`). The checked-in thorough fixture contains exactly those empty dossiers and validates as publishable `thorough`.
  - Fix: close and validate the approval-envelope wave/lane schema; derive the exact required stage/lane multiset from the approved topology; require a terminal stage and accepted/completed receipt for every planned required lane; and give redundant verification and contradiction resolution claim-bearing typed results that bind their immutable inputs, claim dispositions, and affected contradictions. A mode's presence alone must never satisfy a profile.
  - Requirement: Validator-derived requested-versus-achieved rigor for all approved lanes, including real thorough redundancy.

- **Reconciliation can be bypassed at revision one and can delete contested claims by declaration alone** (`.agents/skills/recon/scripts/validate-packet.mjs:788`)
  - Issue: `validateReconciliation` returns immediately for every revision-one ledger, even when a standard/thorough packet claims a completed reconciliation stage. A fresh standard probe reset the final ledger to revision one, supplied syntactically legal initial transitions, and remained fully publishable. Separately, the validator calculates `expectedRemovals` but only compares it with the reconciliation's self-declared array (`validate-packet.mjs:832`); it never requires a typed disposition authorizing removal. A second probe deleted the prior contested claim, declared it in `removals`, and remained publishable `standard`. This lets reconciliation be skipped or erase adverse claims without evidence.
  - Fix: require standard/thorough canonical output to be the exact next revision of the reconciliation stage's bound prior ledger; prohibit the revision-one shortcut whenever reconciliation is required; and define allowed addition/removal transitions with exact review inputs and dispositions. Every prior claim must be preserved or have a typed, auditable disposition that authorizes its removal, especially contested/unresolved claims.
  - Requirement: Only reconciliation may produce a new canonical ledger through legal, complete, auditable transitions.

- **A material coverage gap can leave its affected claim verified** (`.agents/skills/recon/scripts/validate-packet.mjs:1010`)
  - Issue: coverage findings are matched to a manifest gap and an `accepted-gap` reconciliation entry, but that disposition is never connected to the affected claim's assurance. `validateAssurance` accepts the coverage result's independent `covered` disposition without checking its material findings (`validate-packet.mjs:1099`). A fresh probe added an exactly bound material coverage finding for `claim-1`, an exact material manifest gap, and the required reconciliation disposition; with honest `partial` status, validation returned `valid: true`, `publishable: true`, while `claim-1` remained `verified`. This contradicts the requirement that verified claims have adequate coverage and that partial packets record affected claim downgrades.
  - Fix: make material coverage findings participate in claim-state derivation. A material unresolved finding whose `claimIds` includes a claim must prevent `verified`; reconciliation must either resolve the finding with typed evidence or downgrade each affected claim to a legal state. Add positive partial tests that assert the exact downgraded state, not only packet status.
  - Requirement: Adequate coverage for `verified` and honest claim-state downgrade under material gaps.

### Important

- **An explicitly gapped stale source cannot produce the designed honest partial packet** (`.agents/skills/recon/scripts/validate-packet.mjs:241`)
  - Issue: `reopenEvidence` always emits the structural error `INELIGIBLE_SOURCE_STATE` before gap handling whenever a retained evidence source is unpinned, stale, invalid, or unavailable. A fresh quick probe changed the source and locator to stale, downgraded the supported claim to contested, added a material gap covering the source and every affected claim, and set status to partial; validation still returned `valid: false` solely with `INELIGIBLE_SOURCE_STATE`. The packet contract says ineligible states require an explicit affected-source/claim gap, and the design says stale evidence remains auditable while claims degrade honestly.
  - Fix: distinguish assurance ineligibility from structural invalidity. When an exact gap covers the ineligible source and all affected claims, retain the evidence as non-exact audit data without an error, require affected claims to be below `supported`, and permit an honest partial. Continue failing when the gap or downgrade is absent or incomplete.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** repository and `packages/cli/AGENTS.md`; `.oat/projects/shared/recon-skill/discovery.md`; complete `design.md`; complete `plan.md`; complete `implementation.md`; `.agents/agents/oat-reviewer.md`; both prior p02 review artifacts; the full authoritative diff and all post-image p02 implementation/test files. This is a quick-workflow project, so `spec.md` is intentionally absent.

### Requirements Coverage

| Requirement                                                        | Status      | Notes                                                                                                                                                        |
| ------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Provider-neutral controller and non-interactive leaf worker        | implemented | Approval, authority, context-firewall, leaf, and one-output prose contracts remain present.                                                                  |
| Versioned packet, ledger, artifact, source, and receipt validation | partial     | Top-level artifacts are substantially closed, but assurance reviews are not tied to their receipted stages and approved lane topology is not validated.      |
| Secret redaction and path/source safety                            | partial     | Redaction and symlink/realpath cases pass; correctly gapped stale sources cannot publish an honest partial.                                                  |
| Selectively blind immutable review projections                     | implemented | Exact claim-bearing verification/adversarial/coverage projections are deterministic and reject forbidden fields.                                             |
| Reconciliation-owned canonical ledger                              | partial     | Common-claim continuity is stronger, but revision-one bypass and unaudited removals remain.                                                                  |
| Deterministic rendering and atomic publication                     | implemented | Validation-first rendering, temporary sibling publication, and stale-output removal pass.                                                                    |
| Honest complete/partial/failed outcomes                            | partial     | Status derivation handles material packet gaps, but affected claims can retain false verified assurance and stale-source partials are rejected.              |
| Fake-dispatch end-to-end workflow                                  | partial     | Happy-path production projector/reconciler calls exist, but the fake thorough proof uses empty generic artifacts and omits the reproduced adversarial cases. |

### Extra Work (not in declared requirements)

None. The six substantive commits stay within the declared p02 controller, worker, packet helper, fixture/test, and focused CLI validation boundaries. The three intervening root commits only recorded review/bookkeeping state and were excluded from implementation judgment.

## Direct Probe Results

Fresh probes used independent temporary packet directories and updated every touched digest before validation:

| Probe                                                                                            | Result                                                                    |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Baseline standard and thorough fixtures                                                          | Both valid and publishable at the claimed profile.                        |
| Claim uses an exact unreceipted semantic result while the stage receipts bind a different result | **Accepted:** publishable standard.                                       |
| Approval envelope includes a lane with no stage or receipt                                       | **Accepted:** publishable standard.                                       |
| Thorough redundant verification and contradiction resolution use empty generic dossiers          | **Accepted:** publishable thorough.                                       |
| Final standard ledger reset to revision one                                                      | **Accepted:** publishable standard; reconciliation continuity skipped.    |
| Prior contested claim removed with only `removals: [claim-id]`                                   | **Accepted:** publishable standard.                                       |
| Exact material coverage finding/gap/disposition affects a still-verified claim                   | **Accepted:** publishable partial standard with the claim still verified. |
| Fully gapped stale source with affected claims downgraded                                        | **Rejected:** `INELIGIBLE_SOURCE_STATE`.                                  |

## Verification Commands

```bash
node --test .agents/skills/recon/tests/*.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm oat:validate-skills
pnpm test:skills
pnpm format
pnpm lint
git diff --check 0329604d4d45775bee37d5de1136678805b204e3..c58c148136284cea9548e4398662e53585d674c1
```

Fresh results: recon tests passed 68/68; focused CLI validation passed 164/164; canonical skill validation accepted 63 skills; the complete skill suite passed 663 tests with 0 failures; format, lint, and range whitespace checks passed. Turborepo replayed cached package tasks where reported, while the recon suite, focused Vitest suite, canonical skill validation, full skill suite, and direct mutation probes executed in this review.

## Recommended Next Step

Do not advance p02. Return this blocked final re-review to the root lifecycle workflow for its exhausted-fix-loop decision; any further implementation requires an explicit new correction authorization and a fresh independent review of the resulting head.
