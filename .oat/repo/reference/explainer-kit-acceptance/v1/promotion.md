# Explainer-kit v1 promotion decision

**Decision:** approved for promotion
**Recorded:** 2026-07-19

## Frozen identity

- RC ID:
  `sha256:7fea9e53033608ec1e7bf3d07d6124e32f5f7b9e91af61fd3e2799cfae501903`
- Source commit: `1f9be47e94ccda5d7304e66502f8bb1b88aa06d3`
- Exact CLI tarball:
  `sha256:ec3ff847440b1471cd093a3f2a54175edac348d8356e248d6581a3c4b3291390`
- Core `explainer-kit` subtree:
  `sha256:ea933187cfca91d475770391f49fd93446153fb1a69a41c54087ea8c977fa03a`
- `oat-explainer-kit` subtree:
  `sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654`

The candidate was frozen from merged `main` after PR #166. No candidate input
changed between freeze, private-wrapper acceptance, packaged publish
acceptance, and this promotion decision.

## External acceptance

- Private wrapper: passed all six operator-owned gates through packaged
  `scripts/run.mjs`; the validator confirms `built-durable` with a bound
  post-run publish receipt.
- S3/CDN smoke: passed through packaged `scripts/publish.mjs`; one declared
  artifact was published, its public bytes matched the manifest hash, the
  run-unique sentinel was verified and deleted, and no undeclared object was
  overwritten or deleted.
- Combined validator:
  `validate-explainer-acceptance.mjs --gate all` passed both gates against the
  same frozen RC ID above.

## Repository gates

The final chained command completed with exit code 0:

```bash
node tools/release/validate-explainer-acceptance.mjs \
  .oat/repo/reference/explainer-kit-acceptance/v1 --gate all &&
pnpm release:validate &&
pnpm test
```

- All five public `0.2.6` package archives passed release validation.
- Browser-backed explainer visual validation passed with 65 measurements.
- Tests passed across all six workspace packages.
- The root smoke suite passed 129/129 tests with zero failures, skips, or
  cancellations.

## Recorded deviations

None for the post-merge `0.2.6` candidate. Both external gates passed on their
first operator attempts with the exact retained tarballs. Earlier `0.2.3`
candidate deviations remain historical and are not evidence for this RC.

## Promotion

The v1 acceptance contract is satisfied. The frozen RC above may be promoted
unchanged; any change to its package, skill, schema, recipe, or bundle-input
identity requires a new RC and rerun of both external gates.
