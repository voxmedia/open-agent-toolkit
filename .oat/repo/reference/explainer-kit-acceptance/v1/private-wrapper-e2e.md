# Private-wrapper E2E acceptance (p05-t02)

Operator-owned acceptance of the frozen final RC through the migrated personal
wrapper, executed 2026-07-19 by a fresh laptop agent per the migration runbook
(`personal-wrapper-migration.md`, wave-skills-promotion references @ `7a4b5a21`)
with every personal seam supplied or approved by the operator.

## RC identity

- rcId: `sha256:985d0abdac8245376d56dc16d5f263324ffb070d4157f51e0a65504eddee62bb`
- commit: `da1e7a713adac4743368addf206aa780a94871ba`
- CLI tarball consumed: the EXACT retained laptop artifact
  (`sha256:dc1f2d82885f21d2aa649330c6b6f75962e79e689f47138aafb539caae5793b1`),
  verified whole-file before use; no rebuild was substituted. All five retained
  package tarballs re-hashed on-machine and byte-match `rc.json`.
- `oat-explainer-kit` subtree re-hashed from the tarball with the RC tool's own
  `hashTree` algorithm: `sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654`
  (exact pin match). Core `explainer-kit` subtree likewise matches the recorded
  `sha256:ea933187cfca91d475770391f49fd93446153fb1a69a41c54087ea8c977fa03a`.
  Both were re-verified again after installation to `~/.agents/skills/`.
- Cross-machine CLI whole-tarball provenance: resolved BENIGN — ordering-only
  text variance in three generated `.d.ts` files (see
  `explainer-rc-985d0abd/verification-2026-07-19.md`, Resolution section).

## Migration record

- Preflight: rollback backup `~/.agents/skills-backup/oat-explainer-kit-0.4.1`
  confirmed present and byte-identical to the previously installed 0.4.1
  wrapper before replacement.
- Installed from the verified tarball: core `explainer-kit` 1.0.0 and adapter
  `oat-explainer-kit` 1.0.0 under `~/.agents/skills/`; wrapper scaffold
  installed to `~/.agents/skills/personal-explainer-kit`.
- `config.seams.example.json` copied to untracked `config.json`; non-personal
  seams (packaged skill root, backup path, `finalRc` pins) filled by the agent;
  all personal seams (vault root, Google Docs export wiring, per-preset publish
  blocks including the personal CloudFront distribution, publish gate) supplied
  or explicitly approved by the operator. No personal value was invented and no
  filled `config.json` enters any repository.
- Per operator direction, the wrapper carries separate work and personal
  publish presets with no shared publish values; preset choice is an explicit
  per-run decision, never a silent default.

## Acceptance run

Sanitized command: `node ~/.agents/skills/personal-explainer-kit/scripts/acceptance.mjs`
(publish leg enabled by the operator for this run only; the persisted config
default remains `allowPublish=false`).

Six-gate result (harness output retained as
`private-wrapper-harness-result.json`, sanitized through the config seams map):

| Gate                      | Result                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| vault-destination         | pass — run copied under the operator-designated vault explainers root; manifest hash verified                                                                                                   |
| google-docs-destination   | pass — operator-approved `gog` export wiring exited 0 for the run manifest                                                                                                                      |
| presets                   | pass — 3 presets structurally valid (work + personal + dedicated acceptance preset)                                                                                                             |
| personal-destinations-e2e | pass — packaged s3-static connector published to the dedicated acceptance prefix; sentinel uploaded, publicly verified, deleted; artifact live over the personal CDN with hash match (HTTP 200) |
| manifest-consumption      | pass — all 12 schema-required manifest keys present; 5 immutable hashes verified                                                                                                                |
| rollback                  | pass — 0.4.1 backup restores cleanly to a scratch target; restored SKILL.md byte-matches                                                                                                        |

- Core run: `run-7dec5351-5b79-4268-817d-478e669acb56`, packaged entry
  `scripts/run.mjs`, exit 0, outcome `built-not-durable` at build time;
  durability then achieved and verified through the retained publish receipt
  (`private-wrapper-publish-receipt.json`).
- Evidence hashes (canonical-JSON): recorded in
  `private-wrapper-result.json` under `hashes` and bound to the retained
  `private-wrapper-manifest.json` and `private-wrapper-publish-receipt.json`.
- Validation: `node tools/release/validate-explainer-acceptance.mjs
.oat/repo/reference/explainer-kit-acceptance/v1 --gate wrapper` → `passed`,
  referencing exactly the frozen RC.

## Deviations and notes

- First publish-enabled attempt failed: the personal publishing IAM user
  lacked `s3:DeleteObject` on the acceptance prefix, which the connector's
  sentinel cleanup requires (connector error `E_PUBLISH_AWS`; AccessDenied on
  DeleteObject). The operator granted the permission; orphaned sentinels were
  cleaned; the rerun passed all six gates. No RC defect — environment
  permission gap only.
- The harness emits `private-wrapper-result.json` in the runbook's sanitized
  shape (`rcId, commit, startedAt, finishedAt, results[], overall`); this
  directory stores that file as `private-wrapper-harness-result.json` and the
  validator-shaped `explainer-kit.wrapper-acceptance/v1` record as
  `private-wrapper-result.json`.
- Post-run cleanup: publish gate restored to `allowPublish=false`; the
  acceptance publish used a dedicated date-scoped prefix so cleanup is a
  one-prefix delete, left in place as durable evidence.

## Operator verdict

Passed. Seams supplied/approved by the operator during the run; publish leg
explicitly enabled by the operator for the acceptance run and re-gated after.
No credentials or private content are recorded here; personal identifiers are
limited to the operator-approved publish roots already present in the retained
receipt.

Fan-out: this result is also recorded as the wave project's p06-t03
verification record (`wave-skills-promotion`
`references/p06-t03-private-wrapper-acceptance-2026-07-19.md`).
