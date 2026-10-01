---
id: BL-261001-make-recon-s-packet-validator
title: Make recon's packet validator accept what its own helpers produce
status: open
priority: high
scope: feature
scope_estimate: M
labels:
  - recon
  - skills
  - correctness
assignee: null
created: 2026-10-01T04:38:13.057Z
updated: 2026-10-01T04:38:13.057Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/333
external_plans: []
---

## Description

A live `recon` 1.1.5 standard-profile run (GitHub issue #333) finished all nine
worker lanes with schema-valid artifacts, then failed final packet validation
with 75 errors, so no packet could be published. The production helpers and
the final validator disagree in three places (confirmed on `main` at
`8f6d5b1d2`):

- Source binding (36 errors, `REVIEW_BRIEF_MISMATCH`). `create-review-brief.mjs`
  builds one verification brief with the union of all selected claims'
  sources, projected through a field allowlist. `reviewBriefBindsClaim` in
  `validate-packet.mjs` (around line 1352) instead requires `brief.sources` to
  equal the full manifest source objects for one claim's evidence. Any brief
  with more than one source fails every claim.
- Coverage (31 errors, `MATERIAL_COVERAGE_ASSURANCE_EXCEEDED`, around line
  1878). The reconciler accepts a material question-coverage gap and
  downgrades the affected claims. The validator also requires the original
  coverage reviewer disposition for each affected claim to be `gap`, so a
  reviewer that marks statements `covered` while reporting a missing question
  fails publication even after the downgrade.
- Unresolved issues (8 errors, `REVIEW_DISPOSITION_MISMATCH`, around line
  2186). The reconciler applies a semantic reviewer's `uncertain` per claim.
  The validator rejects every verified claim when the review has any
  `unresolvedIssues`, so one uncertain claim blocks all affirmed ones.

Why the tests missed it: `packet-validation.test.mjs` and
`workflow.integration.test.mjs` never call `createReviewBrief`. The validator
is tested against hand-built briefs, so the generator and the validator never
meet. The issue's local recovery adapter shows each rule can be made
consistent without disabling the gates (negative checks still reject a
fabricated excerpt, a verified upgrade on an incomplete claim, and an unscoped
semantic issue).

Related: `BL-260928-settle-codex-read-authority` (Codex recon lanes on the
released CLI). The dispatch-capacity half of #333 is
`BL-261001-recover-recon-lanes-after` (with mixed-route records deferred to
`BL-261001-record-mixed-native-and-cli`); the setup and preflight friction is
`BL-261001-make-recon-controller-setup`.

## Acceptance Criteria

- The brief generator, reconciler, and packet validator share one
  implementation of source projection and binding. A brief binds when its
  source union matches its projected claims, and each claim binds to its own
  source subset. Briefs stay blind: no full manifest or worker provenance is
  added to fix this.
- One documented coverage contract, applied identically by artifact
  acceptance, reconciliation, and publication. Either a material question
  omission with per-statement `covered` is rejected at acceptance with a
  precise cross-field diagnostic, or it reconciles to an honest publishable
  partial with the affected claims downgraded. Material gaps stay visible
  either way.
- `unresolvedIssues` gain structure: affected claim IDs, or an explicit global
  scope. Claim-scoped issues downgrade only those claims; global issues block
  every claim they cover. Reconciliation and publication use the same rule.
- An end-to-end test runs the production helpers (`create-review-brief`,
  `reconcile-ledger`, `validate-packet`) on a synthetic two-source ledger with
  a partially uncertain semantic review and a material coverage gap. It
  publishes the unaffected verified claims and downgrades the rest.
- Negative controls still fail closed: an edited brief statement, evidence,
  locator, or descriptor; a fabricated excerpt; a verified upgrade on a
  materially incomplete claim; and a global semantic issue. Each negative
  test is shown to pass a bad state when its guard is neutralized.
- `recon` `metadata.version` bumped; release notes say packets that failed
  only on these three codes now validate.
