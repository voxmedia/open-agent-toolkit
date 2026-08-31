---
oat_generated: true
oat_generated_at: 2026-08-31T15:33:29Z
oat_review_scope: p-rev1
oat_review_type: code
oat_review_invocation: auto
oat_review_status: blocked
oat_project: .oat/projects/shared/recon-skill
oat_review_head_sha: 784cfaba271e080598d6c829c317651461558cc5
oat_review_range: 8fe8c43df249a9bae94af38fcc54d7bdd57ced9d..784cfaba271e080598d6c829c317651461558cc5
oat_prior_review_artifact: .oat/projects/shared/recon-skill/reviews/p-rev1-code-review-2026-08-31T145006Z.md
oat_prior_review_head_sha: 8fe8c43df249a9bae94af38fcc54d7bdd57ced9d
---

# Code Re-review: p-rev1 and Complete p02 Safety Closure

**Reviewed:** 2026-08-31T15:33:29Z
**Scope:** Tasks p02-t01 through p02-t04 and prev1-t01 through prev1-t02; authoritative range `0329604d4d45775bee37d5de1136678805b204e3..784cfaba271e080598d6c829c317651461558cc5`; narrowed correction range `8fe8c43df249a9bae94af38fcc54d7bdd57ced9d..784cfaba271e080598d6c829c317651461558cc5`
**Files reviewed:** 8 narrowed correction files, the 37-file authoritative range inventory, governing artifacts, and all five prior p02/p-rev1 review artifacts
**Commits:** narrowed fix commit `784cfaba271e080598d6c829c317651461558cc5`; complete p02-through-revision history retained as acceptance context
**Reconnaissance:** not-attempted

## Summary

The receipt/outcome correction closes the second prior Important finding: every accepted and completed receipt selection-axis drift now makes a declared-complete stage structurally invalid, lower-profile partials require explicit failed/omitted outcomes, supported assurance cannot survive without achieved quick rigor, and rendering uses normalized topology. The publication-identity correction closes aliases and post-compilation retargets for assurance-eligible sources, packet root, and the declared output root, but stale/invalid/unavailable audit-only sources return before canonical identity capture; fresh mutations across all five filesystem source classes still accept aliases and publish after retargeting.

Findings: 0 critical, 1 important, 0 medium, 0 minor

## Verdict

**BLOCKED.** p-rev1 does not pass at `784cfaba271e080598d6c829c317651461558cc5`. The full p02 blocking review history is not closed, and root must not mark either p-rev1 or p02 passed until the remaining Important canonical-root gap is fixed and independently re-reviewed.

The revision still passes its simplification/non-goal assessment: it remains one small, non-persisted immutable `ValidatedRun` boundary and adds no schema version, profile, persisted intermediate, review pass, provider behavior, integration, or generalized framework.

## Dispatch Evidence

`Dispatch: scope=p-rev1 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-5-6-sol-high`

- Model axis: `selected:gpt-5.6-sol`
- Effort axis: `selected:high`
- Dispatch policy / ceiling: `high` / `high`
- Policy source: project state

## Authoritative Range and Provenance

| Boundary                         | Commit                                     |
| -------------------------------- | ------------------------------------------ |
| Complete p02 implementation base | `0329604d4d45775bee37d5de1136678805b204e3` |
| Round-4 prior reviewed head      | `cf4e5fbf17743825484460ed32f1f522075eb552` |
| p-rev1 prior reviewed head       | `8fe8c43df249a9bae94af38fcc54d7bdd57ced9d` |
| Round-1 fix / authoritative head | `784cfaba271e080598d6c829c317651461558cc5` |

Coverage outside the narrowed correction range is inherited from
`reviews/p-rev1-code-review-2026-08-31T145006Z.md` and the four earlier p02
review artifacts. This pass independently re-probed both prior Important
findings and all five round-4 finding classes against the post-image before
assigning dispositions.

## Prior Important Finding Dispositions

| Prior p-rev1 finding                                                                                  | Disposition                  | Fresh evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publication rechecks only the packet root, leaving source and declared output identities retargetable | **Partial; still Important** | Eligible repository, file, URL capture, command-output capture, and connected-resource capture aliases reject, and all five identities are retained and rechecked before publication. Packet alias/retarget and `request.outputPath` alias also reject. However, `reopenEvidence` returns immediately for a gapped ineligible audit source before `retainFilesystemIdentity` (`validate-packet.mjs:283-285`). Fresh stale-source probes for all five source kinds accepted pre-validation aliases and published after post-compilation retargets.        |
| Receipt selection drift silently downgrades a declared-complete stage into a dishonest partial        | **Closed**                   | A fresh 28-case matrix changed every one of seven selection axes in both accepted and completed receipts under both complete and partial run statuses. Every mutation produced `INCOMPLETE_DECLARED_STAGE`; partial mutations also produced `PROFILE_ASSURANCE_EXCEEDED` when supported assurance remained without achieved quick. Honest standard-to-quick partials validate only with explicit failed/omitted stage messages and matching material `PASS_FAILED`/`PASS_OMITTED` gaps. Rendered failure lists match normalized `ValidatedRun.topology`. |

## Round-4 Finding Dispositions

| Round-4 finding                                                                     | Disposition                  | Fresh evidence                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required approval and receipt-selection axes can be deleted                         | **Closed**                   | All 13 approval-envelope axes and all seven receipt-selection axes are required; the focused mutation group passed and the 28 drift cases fail structurally.                                                                    |
| Shadow reconciliation can authorize removal against a forged prior ledger           | **Closed**                   | The forged-prior shadow mutation rejects with `SHADOW_RECONCILIATION`; terminal prior identity is used for review binding, transition, and removal checks.                                                                      |
| Secret-bearing stale, invalid, and unavailable audit evidence can persist/render    | **Closed**                   | Fresh stale, invalid, and unavailable secret-bearing mutations reject with `UNREDACTED_SECRET`, diagnostics redact the value, and no consumer packet is eligible.                                                               |
| Caller can downgrade an ineligible-source gap to non-material under complete status | **Closed**                   | The direct mutation rejects with `SOURCE_GAP_REQUIRES_MATERIAL_PARTIAL`; every affected claim must be below `supported`.                                                                                                        |
| Trust-root aliases and retargets are accepted                                       | **Partial; still Important** | Packet root, output root, and assurance-eligible source aliases/retargets are closed. The ineligible-audit early return leaves every source-kind path identity unchecked and absent from the immutable publication recheck set. |

## Findings

### Critical

None.

### Important

- **Ineligible audit sources bypass canonical identity capture and publication rechecks** (`.agents/skills/recon/scripts/validate-packet.mjs:283`)
  - Issue: `reopenEvidence` returns `false` immediately when a source is stale, invalid, unavailable, or otherwise ineligible and an exact material audit gap exists. That return occurs before repository/file/capture canonicalization and before `retainFilesystemIdentity`; `compileValidatedRun` visits filesystem sources only through evidence reopening, then serializes only the identities collected on that path. The packet contract requires every declared path trust root to be a canonical absolute realpath and explicitly rejects symlink aliases and retargeted roots, including for stale/invalid/unavailable canonical sources retained as audit evidence. Fresh probes made each of repository root, file path, URL capture, command-output capture, and connected-resource capture a symlink alias in an honestly gapped partial packet; all five validated with no errors. Separate probes compiled each honest partial, retargeted the same five paths through symlinks, and all five packets published. These packets do not regain `supported` or `verified` assurance, but their retained audit provenance can name an alias or change identity after validation, so the prior Important trust-root contract is not fully closed.
  - Fix: Separate source assurance eligibility from path-identity validation. Canonicalize and retain every declared filesystem trust root before the ineligible-audit branch, including unused declared source paths and command working-directory/output identities where applicable. Carry those identities in `ValidatedRun` and recheck all of them before temporary write and promotion; only skip exact content reopening/assurance for a correctly gapped ineligible source. Add alias and post-compilation retarget mutations for stale, invalid, and unavailable variants of all five source discriminators.
  - Requirement: Design invariant 4; `packet-contract.md` canonical trust-root boundary; prior p-rev1 Important 1.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** repository root and `packages/cli/AGENTS.md`;
`.oat/projects/shared/recon-skill/discovery.md`; `design.md`; `plan.md`;
`implementation.md`; `.agents/agents/oat-reviewer.md`;
`.agents/skills/recon/references/packet-contract.md`; the post-image validation,
safe-path, immutable-run, rendering, fixture, and test files; and all five prior
p02/p-rev1 code review artifacts. This is a quick-mode project, so `spec.md` is
intentionally absent and not required.

### Requirements Coverage

| Requirement                                                                 | Status                           | Notes                                                                                                                                                             |
| --------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete canonical approval envelope and exact accepted/completed selection | **Implemented in narrowed pass** | Axis deletion remains rejected; all 28 accepted/completed selection-drift combinations fail structurally under complete and partial statuses.                     |
| Exact approved topology and honest lower-profile partial outcomes           | **Implemented in narrowed pass** | Declared-complete invalid receipt evidence fails; lower-profile partials require explicit failed/omitted stage outcomes and matching material diagnostics.        |
| Supported assurance requires achieved quick rigor                           | **Implemented in narrowed pass** | A supported claim with derived achieved profile `null` emits `PROFILE_ASSURANCE_EXCEEDED`.                                                                        |
| Normalized rendering of failed and omitted passes                           | **Implemented in narrowed pass** | Document and compact handoff consume frozen `ValidatedRun.topology.stages`, not raw manifest stage declarations.                                                  |
| Canonical roots and identity stability through publication                  | **Partial**                      | Packet/output and eligible source identities are bound and rechecked; ineligible audit source paths bypass canonicalization and identity retention (Important 1). |
| One terminal reconciliation and immutable prior identity                    | **Inherited; re-probed closed**  | Forged-prior shadow reconciliation rejects and no adjacent bypass was reproduced.                                                                                 |
| Secret safety and source-derived material gaps                              | **Inherited; re-probed closed**  | Secret-bearing ineligible audit records reject; non-material complete source gaps reject.                                                                         |
| Assurance/render consume only immutable normalized data                     | **Implemented**                  | Assurance receives the branded frozen `ValidatedRun`; render cores reject raw or partially validated input and consume normalized topology/data.                  |

### Overengineering and Non-Goal Assessment

**Passes.** The revision still consists of one small process-local
`validated-run.mjs` representation plus centralized validation/rendering. It
does not persist `ValidatedRun`, add a schema/profile/review pass, change provider
dispatch or research-pack behavior, add an integration, or create a generalized
validation framework. The remaining finding asks the existing identity invariant
to apply before the existing ineligible-audit branch; it does not justify a new
abstraction or artifact.

### Extra Work (not in declared requirements)

None. The narrowed fix changes only the existing p-rev1 validation, rendering,
fixture, fake-run, and focused test surfaces. Pending p03 bundle materialization
and p04 release-version work were not treated as defects and were not introduced
by the authoritative code range.

## Fresh Probe and Check Results

All mutation probes created new temporary packet roots and recomputed every
touched artifact digest so outcomes were attributable to the target invariant.

| Probe/check                                                                      | Result                                                                                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Eligible repository/file/URL/command-output/connected-resource source aliases    | Rejected: `SYMLINK_ESCAPE` (5/5)                                                                                    |
| Eligible source post-compilation retargets                                       | Publication rejected (5/5)                                                                                          |
| Packet-root alias and post-compilation retarget                                  | Rejected                                                                                                            |
| `manifest.request.outputPath` alias                                              | Rejected: `OUTPUT_ROOT_MISMATCH`                                                                                    |
| Ineligible-audit source aliases across all five source kinds                     | **Incorrectly valid** (5/5; Important 1)                                                                            |
| Ineligible-audit source post-compilation retargets across all five source kinds  | **Incorrectly published** (5/5; Important 1)                                                                        |
| Every accepted/completed receipt selection-axis drift under complete and partial | Rejected with `INCOMPLETE_DECLARED_STAGE` (28/28)                                                                   |
| Supported assurance with no achieved quick profile                               | Rejected: `PROFILE_ASSURANCE_EXCEEDED`                                                                              |
| Honest lower-profile partial with explicit failed/omitted outcomes               | Valid; removing outcome evidence rejects with `MISSING_STAGE_OUTCOME_EVIDENCE`                                      |
| Rendered failed/omitted pass list                                                | Matches normalized frozen topology                                                                                  |
| Approval/receipt axis deletion mutation group                                    | Passed                                                                                                              |
| Forged-prior shadow reconciliation                                               | Rejected: `SHADOW_RECONCILIATION`                                                                                   |
| Secret-bearing stale/invalid/unavailable audit evidence                          | Rejected: `UNREDACTED_SECRET`; no secret in diagnostic                                                              |
| Caller-downgraded stale-source gap materiality under complete                    | Rejected: `SOURCE_GAP_REQUIRES_MATERIAL_PARTIAL`                                                                    |
| `node --test .agents/skills/recon/tests/*.test.mjs`                              | Passed: 99/99                                                                                                       |
| Focused CLI skill validation                                                     | Passed: 164/164                                                                                                     |
| `pnpm test:skills`                                                               | Passed: 694/694 tests across 650 subtests                                                                           |
| `pnpm oat:validate-skills`                                                       | Passed: 63 canonical OAT skills                                                                                     |
| `pnpm lint`                                                                      | Passed; direct skill lint executed, package tasks included cache replay                                             |
| `pnpm format`                                                                    | Passed; direct skill formatting executed, package tasks included cache replay                                       |
| CLI `tsc --noEmit`                                                               | Passed                                                                                                              |
| `pnpm check`                                                                     | Passed; package checks, docs markdownlint, and skill validation completed, with package cache replay where reported |
| Plan validation                                                                  | Passed                                                                                                              |
| Authoritative range whitespace check                                             | Passed                                                                                                              |

## Verification Commands

```bash
node --test .agents/skills/recon/tests/*.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts
pnpm test:skills
pnpm oat:validate-skills
pnpm lint
pnpm format
pnpm --filter @open-agent-toolkit/cli exec tsc --noEmit
pnpm check
pnpm run cli -- project validate-plan --project-path .oat/projects/shared/recon-skill
git diff --check 0329604d4d45775bee37d5de1136678805b204e3..784cfaba271e080598d6c829c317651461558cc5
```

## Recommended Next Step

Run `oat-project-review-receive` to convert the remaining Important finding into
one bounded correction task, then perform a fresh independent p-rev1 re-review.
Do not mark p-rev1 or p02 passed until that re-review reports zero Critical and
zero Important findings.
