# Personal Wrapper Migration and Final RC Acceptance

This runbook is for the operator migrating
`~/.agents/skills/personal-explainer-kit`. The repository phase ships this
procedure; the operator performs the migration and acceptance outside this
repository.

## Preconditions and pins

- Confirm the rollback backup exists at
  `~/.agents/skills-backup/oat-explainer-kit-0.4.1` before changing the installed
  wrapper.
- Use the post-p06 final explainer-kit RC for acceptance. At final-RC freeze,
  replace all three placeholders below and retain them in the sanitized
  acceptance record:

  ```text
  FINAL_RC_ID=<pin final rcId at freeze>
  FINAL_RC_COMMIT=<pin final commit at freeze>
  FINAL_RC_SKILL_SUBTREE_SHA256=<pin final oat-explainer-kit subtree hash at freeze>
  ```

- The frozen f212d630 schemas remain the contract basis because p06 does not
  alter explainer schemas. Do not run acceptance against f212d630 itself.
- The gate-open RC recorded the `package/assets/skills/oat-explainer-kit`
  subtree as
  `sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654`.
  This is the contract-basis subtree pin; acceptance must use the corresponding
  subtree hash from the post-p06 final RC after that RC is frozen.

## Rebuild and verify the skill subtree

Acceptance pins the skill subtree, not the whole CLI tarball.

1. Create a temporary worktree at frozen commit
   `534a408eed0080bcf653a6dde3abc1dd612f0ccb`.
2. In that worktree, run:

   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   node tools/release/build-explainer-rc.mjs --output <tmp> --record <tmp>
   ```

3. Locate `package/assets/skills/oat-explainer-kit` in the rebuilt CLI package.
4. Verify its content hash using the RC tool's own rebuild record, or
   byte-compare the subtree against the rebuild. For the f212d630 contract basis,
   the result must be
   `sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654`.
5. For final acceptance, repeat the same procedure at `FINAL_RC_COMMIT` and
   require the rebuilt subtree hash to equal
   `FINAL_RC_SKILL_SUBTREE_SHA256`.

The rebuilt CLI tarball has whole-file hash
`sha256:296cfa27d678f269ff649b92ebd7…`, which differs from the whole-tarball hash
recorded in f212d630 `rc.json`. That upstream provenance question is tracked as
`msg_02337b3a27f4`. The skill subtree and all schema and recipe hashes match the
record; those are the inputs consumed by acceptance.

## Install and migrate the wrapper

1. Replace the installed wrapper's explainer-kit 0.4.1 content with the verified
   final-RC 1.0.0 content from
   `package/assets/skills/oat-explainer-kit`.
2. Change wrapper invocation to construct an
   `explainer-kit.run-request/v1` document. Its required keys are exactly:
   `schemaVersion, recipe, slug, outputRoot, factBase, mode`.
3. For supplied fact-base mode, construct an
   `explainer-kit.fact-base/v1` document whose required keys are exactly:
   `schemaVersion, generatedAt, mode, freshnessPolicy, sources, claims, unresolvedClaims, overrides`.
   Bind its file through the run request's `factBase` object using `mode:
"supplied"`, `freshnessPolicy: "live-wins"`, and `path`.
4. Replace all pre-1.0 response handling with consumption of the
   `explainer-kit.manifest/v1` document. Its required keys are exactly:
   `schemaVersion, runId, slug, recipe, createdAt, source, theme, artifacts, immutableHashes, outcome, buildRecord, warnings`.
   The wrapper must consume at least `runId`, `outcome`, `artifacts`, and
   `immutableHashes`.

## Run final-RC acceptance

Only after the post-p06 final RC is frozen and all placeholders are pinned, run:

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

Emit a sanitized `private-wrapper-result.json` containing the final RC pins, the
acceptance command, pass/fail status for each coverage item, verification time,
and evidence locators without private content or credentials. Store the result
as the verification record for both explainer-kit final-RC acceptance and this
project's p06-t03. This satisfies the stored-verification-record discipline: it
states what was verified, how it was verified, and where the evidence is
recorded.

## Rollback

If migration or acceptance fails, remove the migrated content and restore
`~/.agents/skills-backup/oat-explainer-kit-0.4.1`. Record the failed step and
sanitized evidence in `private-wrapper-result.json` before retrying.
