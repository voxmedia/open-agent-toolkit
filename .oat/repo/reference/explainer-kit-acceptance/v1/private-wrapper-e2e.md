# Private-wrapper E2E acceptance — post-merge final RC 7fea9e53

Retest of the migrated personal wrapper against the post-merge final explainer
RC, executed 2026-07-19 (evening) by the laptop operator-acceptance agent.
Supersedes the 0.2.3-era evidence (RC `985d0abd…`), which is historical and
not reused for this RC.

## RC identity

- rcId: `sha256:7fea9e53033608ec1e7bf3d07d6124e32f5f7b9e91af61fd3e2799cfae501903`
- commit: `1f9be47e94ccda5d7304e66502f8bb1b88aa06d3` (merged main)
- RC record: `.oat/repo/reference/explainer-kit-acceptance/v1/rc.json` at
  `35897e47` (`origin/tkstang/explainer-kit-rc`); pins confirmed to match the
  dispatch exactly before any install.
- Artifacts: the EXACT retained 0.2.6 tarball set — all five whole-file hashes
  re-verified against `rc.json` before installation; CLI
  `sha256:ec3ff847440b1471cd093a3f2a54175edac348d8356e248d6581a3c4b3291390`.
  No rebuild substituted.
- Skill subtrees re-hashed from the extracted CLI tarball with the RC tool's
  `hashTree` algorithm and again after installation:
  `oat-explainer-kit` = `sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654`,
  `explainer-kit` = `sha256:ea933187cfca91d475770391f49fd93446153fb1a69a41c54087ea8c977fa03a`
  — both exact pin matches (identical content to the prior RC; the packaged
  skills are unchanged between 0.2.3 and 0.2.6).

## Setup

- Reused the already-migrated wrapper at
  `~/.agents/skills/personal-explainer-kit` and its untracked, operator-filled
  `config.json`. Config changes for this retest only: the `finalRc` block
  repinned to the values above, the acceptance preset repointed to the
  run-specific prefix `explainers/acceptance-rc-7fea9e53` (personal roots
  unchanged otherwise), and `allowPublish` flipped to `true` for the run.
- Packaged core and adapter reinstalled from the verified 0.2.6 tarball.
- Rollback backup (`oat-explainer-kit-0.4.1`) untouched and exercised by the
  rollback gate.

## Acceptance run

Sanitized command:
`node ~/.agents/skills/personal-explainer-kit/scripts/acceptance.mjs`
(publish leg enabled for this run; `allowPublish` restored to `false`
immediately after).

Six-gate result — **overall: pass** (raw harness output retained as
`private-wrapper-harness-result.json`, sanitized through the config seams
map):

| Gate                      | Result                                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| vault-destination         | pass — run copied under the vault explainers root; manifest hash verified                                                                 |
| google-docs-destination   | pass — configured export wiring exited 0 for the run manifest                                                                             |
| presets                   | pass — 3 presets structurally valid                                                                                                       |
| personal-destinations-e2e | pass — packaged s3-static connector published to the run-specific prefix; sentinel uploaded, publicly verified, deleted; receipt retained |
| manifest-consumption      | pass — all 12 schema-required keys present; 5 immutable hashes verified                                                                   |
| rollback                  | pass — 0.4.1 backup restores cleanly; restored SKILL.md byte-matches                                                                      |

- Core run: `run-5510b6de-ba63-41a8-b6fd-d166247f2506`, packaged entry
  `scripts/run.mjs`, exit 0, `built-not-durable` at build time; durability
  then achieved and verified through the retained publish receipt.
- Independent post-run verification (outside the connector): `curl` of the
  receipt's public URL returned HTTP 200 `text/html; charset=utf-8` with byte
  hash `sha256:4f59d3d2502da483376ce4ae40942f2e980cdb66bb370d5de15c7e49fb3edcce`
  (exact manifest match); `head-object` on the sentinel key returned 404
  (deletion confirmed server-side); a recursive listing of the run prefix
  shows exactly the one declared artifact.
- Validation: `validate-explainer-acceptance.mjs --gate wrapper` (validator and
  contract module taken from RC record commit `35897e47`) run against this
  evidence set plus `rc.json` → `passed`, durability `built-durable`, post-run
  receipt validated, referencing exactly rcId `7fea9e53…`.

## Deviations

None. All six gates passed on the first run against this RC.

## Files

- `private-wrapper-result.json` — `explainer-kit.wrapper-acceptance/v1`
  record (validator-shaped; hashes bound to the retained manifest/receipt).
- `private-wrapper-harness-result.json` — raw sanitized harness output.
- `private-wrapper-manifest.json` — retained core run manifest.
- `private-wrapper-publish-receipt.json` — wrapper publish receipt.

Integration: Sol copies these into
`.oat/repo/reference/explainer-kit-acceptance/v1/` on
`tkstang/explainer-kit-rc` (this agent did not check out or mutate that
branch) and re-runs the wrapper gate there.
