# p06-t03 verification record — private-wrapper migration and final-RC acceptance

Stored-verification-record (B5) for the personal-wrapper migration support
task. Executed 2026-07-19 by a fresh laptop agent (no wave/explainer session
context) per the runbook `personal-wrapper-migration.md` @ `7a4b5a21`, with
every personal seam supplied or approved by the operator.

## What was verified

The migrated `~/.agents/skills/personal-explainer-kit` wrapper, running
against the frozen final RC, passed all six acceptance gates: vault output,
Google Docs output, presets, personal destinations (end-to-end publish,
operator-enabled), manifest consumption, and rollback. Overall: **pass**.

## How it was verified

- **RC pins held exactly.** The retained CLI tarball's whole-file hash matched
  `sha256:dc1f2d82885f21d2aa649330c6b6f75962e79e689f47138aafb539caae5793b1`
  before use (no rebuild substituted); its `oat-explainer-kit` subtree
  re-hashed with the RC tool's own `hashTree` algorithm to the required
  `sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654`,
  and the core `explainer-kit` subtree to the recorded
  `sha256:ea933187cfca91d475770391f49fd93446153fb1a69a41c54087ea8c977fa03a`.
  Both re-verified after install. rcId
  `sha256:985d0abdac8245376d56dc16d5f263324ffb070d4157f51e0a65504eddee62bb`,
  commit `da1e7a713adac4743368addf206aa780a94871ba`.
- **Runbook sequence followed.** Preflight confirmed the 0.4.1 backup (and
  that the installed 0.4.1 was byte-identical to it) before replacement;
  packaged 1.0.0 skills installed; scaffold installed; seams filled into
  untracked `config.json` — non-personal seams by the agent, every personal
  seam (vault root, gdocs wiring, per-preset publish blocks, publish gate) by
  the operator. Fresh-agent usability note: the runbook was executable cold;
  the only judgment call it left open was that `packagedSkillRoot` must point
  at the core `explainer-kit` (whose `run.mjs --request` contract the harness
  invokes), not the `oat-explainer-kit` adapter (whose CLI is
  `--context`-shaped and requires an OAT project invocation).
- **Acceptance harness** (`scripts/acceptance.mjs`) run with the publish leg
  operator-enabled for this run; sanitized result written as
  `private-wrapper-result.json` (retained alongside this record; verified free
  of personal paths/credentials/identifiers).
- **Publish leg exercised the packaged s3-static connector for real**:
  sentinel uploaded, publicly verified, deleted; the built artifact verified
  live at the personal public root (HTTP 200, hash match) under a dedicated
  date-scoped acceptance prefix. Receipt retained explainer-side.

## Deviations

- First publish-enabled attempt failed with AccessDenied: the personal
  publishing IAM user lacked `s3:DeleteObject`, which the connector's
  sentinel cleanup requires. Operator granted it; orphaned sentinels cleaned;
  rerun passed all gates. Environment permission gap, not an RC defect.
- Publish gate restored to `allowPublish=false` immediately after the run.

## Where the evidence is recorded

- Sanitized six-gate result: `references/private-wrapper-result.json` (this
  project) — same document delivered to the explainer-kit RC acceptance.
- Full evidence pack (validator-shaped wrapper-acceptance record, retained run
  manifest, publish receipt, e2e narrative): explainer-kit repo
  `.oat/repo/reference/explainer-kit-acceptance/v1/` (commit `7c465083`,
  branch `tkstang/explainer-kit`); wrapper gate validated by
  `tools/release/validate-explainer-acceptance.mjs --gate wrapper` → passed.
- Operator-side durable copies: the acceptance run package under the vault
  project's explainers folder; rollback backup retained at
  `~/.agents/skills-backup/oat-explainer-kit-0.4.1`.
