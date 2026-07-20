# Personal Wrapper Migration and Final RC Acceptance

This runbook migrates `~/.agents/skills/personal-explainer-kit`. The
repository ships the migration CODE as an installable scaffold at
`.oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/`
(`SKILL.md` + `scripts/acceptance.mjs` + `config.seams.example.json`); it is
installed, seam-filled, and acceptance-run on the operator's laptop, outside
this repository.

## Executor model (operator-decided 2026-07-18)

- **Runbook executor: a FRESH agent on the laptop** (no prior context from the
  wave or explainer sessions). Executing cold is deliberate — it removes
  producer-acceptance conflict (the explainer agent must not accept its own
  deliverable) and doubles as a usability test of this runbook and scaffold.
- **Operator supervises the seams:** every value in `config.seams.example.json`
  that touches personal credentials, vault paths, document ids, or publish
  destinations is supplied or approved by the operator; the fresh agent never
  invents them. The operator also blesses the final
  `private-wrapper-result.json` before the RC promotes.
- **Explainer agent's role is upstream/downstream only:** it freezes the
  post-p06 final RC (which supplies the `finalRc` pins below) and consumes the
  blessed acceptance result for its promotion record. It does not execute this
  runbook.
- **Result fan-out:** the sanitized `private-wrapper-result.json` goes to the
  explainer project (RC acceptance record) and to the wave project
  (`wave-skills-promotion` p06-t03 verification record).

## Preconditions and pins

- Confirm the rollback backup exists at
  `~/.agents/skills-backup/oat-explainer-kit-0.4.1` before changing the installed
  wrapper.
- Use the post-PR-#166 final explainer-kit RC for acceptance. At final-RC freeze,
  fill all three placeholders in the installed wrapper's `config.json`
  `finalRc` block (`rcId`, `commit`, `subtreeSha256`); the acceptance harness
  reads them from there and carries them into the sanitized acceptance record.
- Final-RC pins:

  ```json
  {
    "rcId": "sha256:7fea9e53033608ec1e7bf3d07d6124e32f5f7b9e91af61fd3e2799cfae501903",
    "commit": "1f9be47e94ccda5d7304e66502f8bb1b88aa06d3",
    "subtreeSha256": "sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654"
  }
  ```

- The frozen f212d630 schemas remain the contract basis because p06 does not
  alter explainer schemas. Do not run acceptance against f212d630 itself.
- The gate-open RC recorded the `package/assets/skills/oat-explainer-kit`
  subtree as
  `sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654`.
  This is the contract-basis subtree pin and remains unchanged in the final
  post-merge RC.

## Rebuild and verify the skill subtree

Acceptance pins the skill subtree, not the whole CLI tarball.

1. Create a temporary worktree at frozen commit
   `1f9be47e94ccda5d7304e66502f8bb1b88aa06d3`.
2. In that worktree, run:

   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   node tools/release/build-explainer-rc.mjs --output <tmp> --record <tmp>
   ```

3. Locate `package/assets/skills/oat-explainer-kit` in the rebuilt CLI package.
4. Verify its content hash using the RC tool's own rebuild record, or
   byte-compare the subtree against the rebuild. The result must be
   `sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654`.
5. For acceptance, use the exact retained CLI tarball whose whole-file hash is
   `sha256:ec3ff847440b1471cd093a3f2a54175edac348d8356e248d6581a3c4b3291390`.
   Do not substitute a rebuilt whole tarball.

Previous cross-machine investigation established that whole-tarball rebuilds
can differ through semantically benign TypeScript declaration ordering even
when runtime and explainer surfaces match. Two same-machine builds of this
final RC produced byte-identical records and tarballs. Acceptance therefore
uses the exact retained CLI bytes and independently verifies the unchanged
explainer subtree rather than substituting a rebuild.

## Install and migrate the wrapper

1. Install the packaged skill: replace the installed explainer-kit 0.4.1
   content with the verified final-RC 1.0.0 content from
   `package/assets/skills/oat-explainer-kit`.
2. Install the wrapper scaffold: copy the shipped tree from
   `.oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/`
   to `~/.agents/skills/personal-explainer-kit`, replacing the 0.4.1 wrapper
   content (the backup remains the rollback source).
3. Fill the seams: copy `config.seams.example.json` to `config.json` in the
   installed wrapper and fill every seam (vault root, Google Docs wiring,
   CloudFront/preset identifiers, backup path, acceptance inputs) from the
   0.4.1 backup's configuration. Never commit or share a filled `config.json`.
4. Pin the final RC: when the explainer-kit agent freezes the post-p06 final
   RC, fill the `finalRc` block (`rcId`, `commit`, `subtreeSha256`) in
   `config.json`.

The installed wrapper's contract surface (enforced by `SKILL.md` and exercised
by the acceptance harness):

- It constructs an `explainer-kit.run-request/v1` document. Its required keys
  are exactly:
  `schemaVersion, recipe, slug, outputRoot, factBase, mode`.
- For supplied fact-base mode, it uses an `explainer-kit.fact-base/v1`
  document whose required keys are exactly:
  `schemaVersion, generatedAt, mode, freshnessPolicy, sources, claims, unresolvedClaims, overrides`.
  The file binds through the run request's `factBase` object using `mode:
"supplied"`, `freshnessPolicy: "live-wins"`, and `path`.
- It replaces all pre-1.0 response handling with consumption of the
  `explainer-kit.manifest/v1` document. Its required keys are exactly:
  `schemaVersion, runId, slug, recipe, createdAt, source, theme, artifacts, immutableHashes, outcome, buildRecord, warnings`.
  The wrapper must consume at least `runId`, `outcome`, `artifacts`, and
  `immutableHashes`.

## Run final-RC acceptance

Only after the post-p06 final RC is frozen and the `finalRc` block is pinned,
run:

```bash
~/.agents/skills/personal-explainer-kit/scripts/acceptance.mjs
```

Run against that exact final RC. Acceptance must cover:

- vault output;
- Google Docs output;
- presets;
- personal destinations;
- manifest consumption; and
- rollback.

The harness emits a sanitized `private-wrapper-result.json` (`rcId`, `commit`,
`startedAt`, `finishedAt`, per-test `results[]` with `{name, status,
evidence}`, and `overall`) with all personal paths, credentials, and document
identifiers redacted through the config seams map. Deliver the result to BOTH
the explainer-kit RC acceptance and this project's p06-t03 verification record
(stored-verification-record discipline, B5): it states what was verified, how
it was verified, and where the evidence is recorded.

## Rollback

If migration or acceptance fails, remove the migrated content (both the
packaged skill and the wrapper scaffold) and restore
`~/.agents/skills-backup/oat-explainer-kit-0.4.1`. Record the failed step and
sanitized evidence in `private-wrapper-result.json` before retrying.
