---
name: personal-explainer-kit
version: 1.0.0
description: Thin personal wrapper over the packaged oat-explainer-kit — constructs run requests from filled config seams, consumes manifests, and routes built artifacts to personal destinations with publishing human-gated.
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Personal Explainer-Kit Wrapper

This is a user-scope wrapper skill installed at
`~/.agents/skills/personal-explainer-kit`. It layers personal configuration and
destination routing over the packaged `oat-explainer-kit` skill. It contains no
credentials and no personal values in its shipped form: every personal value is
a seam in `config.json`, which the operator fills at install from
`config.seams.example.json` and the 0.4.1 backup.

## Configuration

Read `config.json` at the skill root before any run. The example file
`config.seams.example.json` documents every seam and its provenance. Required
seams: the packaged skill root, the vault root, Google Docs wiring, publishing
identifiers and presets, the rollback backup path, acceptance inputs, and the
`finalRc` pin block (placeholders until the post-p06 final RC freezes).

Never write a filled `config.json` or any personal value back into a repository
or a shared artifact. Sanitized outputs redact all seam values.

## Run Flow

1. **Synthesize or select the fact base.** A supplied fact base must be a valid
   `explainer-kit.fact-base/v1` document. Its required keys are exactly:
   `schemaVersion, generatedAt, mode, freshnessPolicy, sources, claims, unresolvedClaims, overrides`.
2. **Construct the run request** as an `explainer-kit.run-request/v1` document.
   Its required keys are exactly:
   `schemaVersion, recipe, slug, outputRoot, factBase, mode`.
   Set `recipe` to an object with exactly `id` and `version` (for example
   `{ "id": "project-recap", "version": "1" }`). Bind the fact-base file
   through `factBase` with the required keys `mode, freshnessPolicy`, using
   `mode: "supplied"`, `freshnessPolicy: "live-wins"`, and `path` pointing at
   the fact-base file. Set `outputRoot` under the configured personal output
   root.
3. **Invoke the packaged run flow** — `node <packagedSkillRoot>/scripts/run.mjs
--request <request.json>` per the packaged skill's core run contract. The
   wrapper never bypasses the packaged entry point.
4. **Consume the manifest.** Read back the `explainer-kit.manifest/v1` document
   from the run package. Its required keys are exactly:
   `schemaVersion, runId, slug, recipe, createdAt, source, theme, artifacts, immutableHashes, outcome, buildRecord, warnings`.
   Verify `runId` is present, `outcome` is one of the manifest's outcome
   values, `artifacts` lists the built entries, and every `immutableHashes`
   entry matches the bytes on disk before routing anything.

## Destination Routing

Route only manifest-declared built artifacts, per the destination contract
shipped with the packaged skill (`destination-contract.md`):

- **Vault:** copy rendered artifacts and the manifest under the configured
  vault root.
- **Google Docs:** invoke the configured export wiring with the manifest and
  run root; the wiring owns credentials and document targets.
- **Personal published destinations (CloudFront/presets):** construct an
  `explainer-kit.publish-request/v1` through the configured publish wiring.

**Publishing is human-gated.** The wrapper never publishes implicitly: a
publish run requires the operator's explicit confirmation flag, and the
packaged connector's own `--confirm-publish` gate remains in force. Building
stays `built-not-durable` until durability evidence is verified.

## Acceptance

`scripts/acceptance.mjs` is the operator-run acceptance harness. It executes
the six-test matrix (vault, Google Docs, presets, personal destinations,
manifest consumption, rollback), continues past failures, and writes a
sanitized `private-wrapper-result.json` whose RC identifiers come from the
config `finalRc` block. See the migration runbook
(`personal-wrapper-migration.md` in the promoting project's references) for
install sequencing and final-RC pinning.
